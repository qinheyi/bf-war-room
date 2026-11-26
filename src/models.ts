// Model wiring for the Mozaik runtime.
//  - offline (default without a key): a deterministic "policy model" Endpoint. It always calls the
//    agent's tool first, then writes the summary straight from the tool output. Same Mozaik loop,
//    same events, no network, byte-stable numbers.
//  - minimax (when MINIMAX_API_KEY is set): MiniMax's OpenAI-compatible chat API through Mozaik's
//    OpenAIChatCompletions endpoint. Any failure falls back to the offline policy for that step.
//  - openai (--provider openai with OPENAI_API_KEY): same, against OpenAI.
import {
  FunctionCallItem,
  ModelMessageItem,
  OpenAIChatCompletions,
  type Endpoint,
  type InferenceInput,
  type InferenceOutput,
} from "@mozaik-ai/core"
import { sleep } from "./util.ts"


export function makeSpec(name: string, provider: string) {
  return {
    name,
    provider,
    supportsReasoningEffort: false,
    supportedReasoningEfforts: [] as string[],
    supportsStreaming: false,
    contextWindowSize: 200_000,
    supportedContextItemTypes: ["user_message", "system_message", "developer_message", "reasoning", "function_call", "function_call_output", "model_message"],
    maxOutputTokens: 4096,
    supportsFunctionCalling: true,
    supportsStructuredOutput: false,
  }
}

export type ModelStats = { calls: number; liveCalls: number; fallbacks: number; inputTokens: number; outputTokens: number; errors: string[] }
export const stats: ModelStats = { calls: 0, liveCalls: 0, fallbacks: 0, inputTokens: 0, outputTokens: 0, errors: [] }

function toolOutputs(input: InferenceInput): string[] {
  return input.context
    .getItems()
    .filter((i) => i.type === "function_call_output")
    .map((i) => (i as unknown as { output: { text: string } }).output.text)
}

let callSeq = 0
/** Deterministic policy: call the tool once, then summarise its `brief` lines verbatim. */
export function offlineInfer(input: InferenceInput): InferenceOutput {
  const outputs = toolOutputs(input)
  const tool = input.tools?.[0]
  if (outputs.length === 0 && tool) {
    return { items: [FunctionCallItem.rehydrate({ callId: `call_${++callSeq}`, name: tool.name, args: "{}" })], tokenUsage: undefined, rowResponse: { offline: true } }
  }
  let text = "No tool output was available."
  try {
    const parsed = JSON.parse(outputs[outputs.length - 1]) as { brief?: string[]; headline?: string }
    text = [parsed.headline ?? "Findings", ...(parsed.brief ?? []).map((b) => `- ${b}`)].join("\n")
  } catch {
    text = outputs[outputs.length - 1]
  }
  return { items: [ModelMessageItem.rehydrate({ text })], tokenUsage: undefined, rowResponse: { offline: true } }
}

/** Offline endpoint with a small simulated latency so concurrent loops visibly interleave. */
export class OfflinePolicyEndpoint implements Endpoint {
  endpointMapper = { toRequest: (x: InferenceInput) => x, toResponse: (x: InferenceOutput) => x }
  constructor(private latencyMs: (input: InferenceInput) => number = () => 0) {}
  async infer(input: InferenceInput): Promise<InferenceOutput> {
    stats.calls++
    await sleep(this.latencyMs(input))
    return offlineInfer(input)
  }
  async *stream(): AsyncIterable<never> {
    throw new Error("streaming not used")
  }
}

/** Wraps a live endpoint: strips <think> blocks, forces the tool-first protocol, falls back offline on errors. */
export class GuardedLiveEndpoint implements Endpoint {
  endpointMapper
  constructor(private inner: Endpoint) {
    this.endpointMapper = inner.endpointMapper
  }
  async infer(input: InferenceInput): Promise<InferenceOutput> {
    stats.calls++
    const outputs = toolOutputs(input)
    try {
      const out = await this.inner.infer({ ...input, maxOutputTokens: input.maxOutputTokens ?? 900 })
      stats.liveCalls++
      if (out.tokenUsage) {
        stats.inputTokens += out.tokenUsage.inputTokens
        stats.outputTokens += out.tokenUsage.outputTokens
      }
      const hasCall = out.items.some((i) => i.type === "function_call")
      // Protocol: exactly one tool call first, then prose. Anything else is corrected deterministically.
      if (outputs.length === 0 && !hasCall) return fallback("model answered without calling its tool")
      if (outputs.length > 0 && hasCall) return fallback("model tried a second tool call")
      const items = out.items
        .filter((i) => i.type !== "reasoning")
        .map((i) =>
          i.type === "message"
            ? ModelMessageItem.rehydrate({ text: (i as ModelMessageItem).content.text.replace(/<think>[\s\S]*?<\/think>/g, "").trim() })
            : i,
        )
      return { ...out, items }
    } catch (err) {
      return fallback(String(err).slice(0, 160))
    }
    function fallback(reason: string): InferenceOutput {
      stats.fallbacks++
      stats.errors.push(reason)
      return offlineInfer(input)
    }
  }
  async *stream(): AsyncIterable<never> {
    throw new Error("streaming not used")
  }
}

export type Provider = "offline" | "minimax" | "openai"

export function pickProvider(argv: string[], env: NodeJS.ProcessEnv): Provider {
  if (argv.includes("--offline")) return "offline"
  const i = argv.indexOf("--provider")
  if (i >= 0) return argv[i + 1] as Provider
  if (env.MINIMAX_API_KEY) return "minimax"
  return "offline"
}

export function buildModels(provider: Provider, env: NodeJS.ProcessEnv): { model: string; supportedModels: { endpoint: Endpoint; specification: ReturnType<typeof makeSpec> }[] } {
  const latency = (input: InferenceInput) => {
    // Deterministic pseudo-latency (120-420 ms) derived from the context size; offline mode only.
    const n = input.context.getItems().length * 37 + (input.tools?.[0]?.name.length ?? 0) * 53
    return 120 + (n % 300)
  }
  if (provider === "minimax") {
    if (!env.MINIMAX_API_KEY) throw new Error("MINIMAX_API_KEY is not set")
    const model = env.MINIMAX_MODEL ?? "MiniMax-M3.1-Flash"
    const inner = new OpenAIChatCompletions(undefined, { baseURL: env.MINIMAX_BASE_URL ?? "https://api.minimaxi.com/v1", apiKey: env.MINIMAX_API_KEY })
    return { model, supportedModels: [{ endpoint: new GuardedLiveEndpoint(inner), specification: makeSpec(model, "minimax") }] }
  }
  if (provider === "openai") {
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set")
    const model = env.OPENAI_MODEL ?? "gpt-4.1-mini"
    const inner = new OpenAIChatCompletions(undefined, { baseURL: env.OPENAI_BASE_URL, apiKey: env.OPENAI_API_KEY })
    return { model, supportedModels: [{ endpoint: new GuardedLiveEndpoint(inner), specification: makeSpec(model, "openai") }] }
  }
  const model = "offline-policy"
  return { model, supportedModels: [{ endpoint: new OfflinePolicyEndpoint(latency), specification: makeSpec(model, "local") }] }
}
