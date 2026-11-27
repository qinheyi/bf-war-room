// The war room: one Mozaik runtime, five specialist agents running concurrently, an Auditor agent
// that checks each of them the moment they report, and two observers (report desk, flight recorder).
import {
  Agent,
  ModelContext,
  DeveloperMessageItem,
  ModelMessageItem,
  RuntimeState,
  SemanticEvent,
  SituationSpecification,
  createAgent,
  createHuman,
  defineRuntime,
  type ExecutableTransition,
  type InterceptionHandler,
  type SituationContext,
  type SituationHandler,
  type Tool,
} from "@mozaik-ai/core"
import { loadData, type Data } from "./data/load.ts"
import { EvidenceLedger, formatValue, type Evidence } from "./evidence.ts"
import { runFraud, type FraudResult } from "./analytics/fraud.ts"
import { runDisputes, type DisputesResult } from "./analytics/disputes.ts"
import { runReconcile, type ReconResult } from "./analytics/reconcile.ts"
import { runRevenue, type RevenueResult } from "./analytics/revenue.ts"
import { runPayments, type PaymentsResult } from "./analytics/payments.ts"
import { runCrossChecks, type CrossResult } from "./analytics/crosscheck.ts"
import { gateAnswer, verifyFigures, type GateResult, type Verdict } from "./audit.ts"
import { buildModels, stats, type Provider } from "./models.ts"

// "Payment Investigator" was added during the hackathon (2026-11-27); the other four predate kickoff.
export const SPECIALISTS = ["Fraud Sentinel", "Disputes Desk", "Ledger Reconciler", "Revenue Analyst", "Payment Investigator"] as const
export type Specialist = (typeof SPECIALISTS)[number]

export type TraceEvent = { t: number; type: string; producer: string; loopId?: string; detail?: string }
export type GateLog = { agent: string; stage: string; action: string; detail: string; t: number }

export class WarRoomState extends RuntimeState {
  constructor(public data: Data, public ledger: EvidenceLedger) {
    super()
  }
  startedAt = Date.now()
  fraud?: FraudResult
  disputes?: DisputesResult
  recon?: ReconResult
  revenue?: RevenueResult
  payments?: PaymentsResult
  cross?: CrossResult
  answers = new Map<string, { text: string; gate: GateResult }>()
  verdicts = new Map<string, Verdict[]>()
  auditorNotes: string[] = []
  gateLog: GateLog[] = []
  trace: TraceEvent[] = []
  loopPurpose = new Map<string, string>()
  names = new Map<string, string>()
  crossCheckStarted = false
  auditorAnswers = 0
}

export type WarRoomResult = { state: WarRoomState; provider: Provider; model: string; elapsedMs: number }

const SHARED_RULES =
  "You are part of a Black Friday payments war room for a fictional store. All data is synthetic. " +
  "Call your tool exactly once, then write 3-6 short bullet points for the operations lead. " +
  "Use only numbers that appear in the tool output, copy them exactly, and put the evidence ID in square brackets after each number, e.g. $1,234.56 [L6]. " +
  "Never estimate, round differently, or invent a number. This is operational analysis, not financial advice."

const INSTRUCTIONS: Record<Specialist | "Auditor", string> = {
  "Fraud Sentinel": "You are the Fraud Sentinel. You score every order with the store's fraud rules and tell the team which shipments to hold. " + SHARED_RULES,
  "Disputes Desk": "You are the Disputes Desk. You decide refund requests and chargebacks by the store's written policy and list what is due soon. " + SHARED_RULES,
  "Ledger Reconciler": "You are the Ledger Reconciler. You match captured orders to the processor's settlement report and explain every cent of variance. " + SHARED_RULES,
  "Revenue Analyst": "You are the Revenue Analyst. You report what Black Friday actually brought in: sales, discounts, peak hour and payment mix. " + SHARED_RULES,
  "Payment Investigator":
    "You are the Payment Investigator. You work out why each failed or stuck payment did not capture (3-D Secure timeout, insufficient funds, risk block, gateway error, duplicate charge) and recommend retry, refund, manual review or contacting the customer, by the PI rules in the store policy. " +
    SHARED_RULES,
  Auditor:
    "You are the Auditor. You never trust another agent's numbers: your tool recomputes them from the raw CSV lines and checks agents against each other. " +
    SHARED_RULES,
}

function tool(name: string, description: string, invoke: () => Promise<unknown>): Tool {
  return { type: "function", name, description, parameters: { type: "object", properties: {}, additionalProperties: false }, strict: false, invoke }
}

function brief(figs: Evidence[], ids: string[]): string[] {
  return ids.map((id) => {
    const e = figs.find((f) => f.id === id)
    if (!e) throw new Error(`no figure ${id}`)
    return `${e.label}: ${formatValue(e)} [${e.id}]`
  })
}

function toolPayload(agent: string, figs: Evidence[], headlineIds: string[], extra: Record<string, unknown> = {}) {
  return {
    agent,
    headline: `${agent} report (synthetic data; not financial advice)`,
    brief: brief(figs, headlineIds),
    figures: figs.map((f) => ({ id: f.id, label: f.label, value: formatValue(f) })),
    ...extra,
    rules: "Quote numbers exactly as written here and cite their [ID].",
  }
}

class Is extends SituationSpecification {
  constructor(private test: (c: SituationContext) => boolean) {
    super()
  }
  isSatisfiedBy(c: SituationContext): boolean {
    return this.test(c)
  }
}

export async function runWarRoom(opts: { provider: Provider; env?: NodeJS.ProcessEnv; dataDir?: string; timeoutMs?: number; log?: (s: string) => void }): Promise<WarRoomResult> {
  const env = opts.env ?? process.env
  const log = opts.log ?? (() => {})
  const { model, supportedModels } = buildModels(opts.provider, env)
  const data = loadData(opts.dataDir)
  const ledger = new EvidenceLedger()
  const state = new WarRoomState(data, ledger)

  // A fresh runtime per run (defineRuntime returns its own closure).
  const { initializeRuntime, join, sendMessage, sendEvent, runLoop } = defineRuntime<WarRoomState>()
  initializeRuntime({ state, inferenceRunnerConfig: { supportedModels } })

  const name = (id: string) => state.names.get(id) ?? id
  const elapsed = () => Date.now() - state.startedAt
  let resolveDone!: () => void
  let rejectDone!: (e: unknown) => void
  const done = new Promise<void>((res, rej) => {
    resolveDone = res
    rejectDone = rej
  })

  // ---- Interception: the "number gate" breakpoint on every specialist loop ----
  const numberGate = (agent: string, allowed: () => Evidence[], answerKey = agent): InterceptionHandler => ({
    isSatisfiedBy: (t: ExecutableTransition) => t.nextStateId === "function_call" || t.nextStateId === "model_message",
    async handle(t: ExecutableTransition) {
      if (t.nextStateId === "function_call") {
        const toolNames = (t.input.inferenceInput.tools ?? []).map((x) => x.name)
        const ok = toolNames.includes(t.input.call.name)
        state.gateLog.push({ agent, stage: "function_call", action: ok ? "allowed" : "unknown tool", detail: `${t.input.call.name} (read-only; no money can move)`, t: elapsed() })
        return t
      }
      if (t.nextStateId === "model_message") {
        const text = t.input.answer.content.text
        const gate = gateAnswer(text, allowed())
        state.answers.set(answerKey, { text: gate.text, gate })
        state.gateLog.push({
          agent,
          stage: "model_message",
          action: gate.unverified.length ? "rewrote answer" : "passed",
          detail: `${gate.checked} numbers checked, ${gate.unverified.length} unverified${gate.unverified.length ? `: ${gate.unverified.join(", ")}` : ""}`,
          t: elapsed(),
        })
        if (gate.unverified.length) return { nextStateId: "model_message", input: { answer: ModelMessageItem.rehydrate({ text: gate.text }) } }
      }
      return t
    },
  })

  // ---- Specialist agents: each reacts to the Ops Lead's kickoff by starting its own loop ----
  const kickoffSpec = (opsLeadId: () => string) => new Is(({ event }) => event.type === "message.sent" && event.producerId === opsLeadId())
  let opsLeadId = ""
  const startLoop: SituationHandler["processor"] = {
    apply({ event, participant }) {
      if (!(participant instanceof Agent)) return
      const agent = name(participant.getId())
      const { message } = event.payload as { message: string }
      runLoop(
        participant.getId(),
        message,
        { model, context: participant.getMemory().getContext(), tools: participant.getTools() },
        numberGate(agent, () => ledger.byAgent(agent)),
      )
    },
  }
  const specialistTools: Record<Specialist, Tool> = {
    "Fraud Sentinel": tool("score_orders", "Score every Black Friday order with the fraud rules in data/POLICY.md and return flagged orders and figures.", async () => {
      const r = (state.fraud = runFraud(data, ledger))
      return toolPayload("Fraud Sentinel", r.figures, ["F4", "F3", "F5", "F6", "F7", "F8"], {
        reviewQueue: r.reviewQueue.slice(0, 5).map((s) => ({ order: s.row.order_id, rules: s.rules })),
      })
    }),
    "Disputes Desk": tool("triage_disputes", "Decide every refund request and chargeback by data/POLICY.md and return totals and deadlines.", async () => {
      const r = (state.disputes = runDisputes(data, ledger))
      return toolPayload("Disputes Desk", r.figures, ["D3", "D2", "D8", "D7", "D10", "D13", "D14"])
    }),
    "Ledger Reconciler": tool("reconcile_settlements", "Match captured orders to the processor settlement report and decompose the payout variance.", async () => {
      const r = (state.recon = runReconcile(data, ledger))
      return toolPayload("Ledger Reconciler", r.figures, ["L4", "L6", "L7", "L9", "L11", "L13", "L15", "L16"])
    }),
    "Revenue Analyst": tool("sales_summary", "Summarise captured sales, discounts, peak hour and payment mix for Black Friday.", async () => {
      const r = (state.revenue = runRevenue(data, ledger))
      return toolPayload("Revenue Analyst", r.figures, ["R7", "R2", "R8", "R6", "R10", "R4", "R13"])
    }),
    "Payment Investigator": tool("investigate_payments", "Classify every failed or pending payment attempt by the PI rules in data/POLICY.md and recommend retry, refund, manual review or contacting the customer.", async () => {
      const r = (state.payments = runPayments(data, ledger))
      return toolPayload("Payment Investigator", r.figures, ["P1", "P17", "P18", "P15", "P16", "P13", "P14", "P9"], {
        cases: r.cases.slice(0, 8).map((c) => ({ attempt: c.row.attempt_id, order: c.row.order_id, cause: c.cause, rule: c.rule, action: c.action })),
      })
    }),
  }
  const specialists = SPECIALISTS.map((n) =>
    createAgent({ name: n, capabilities: ["inference", "payments-analysis"], instruction: INSTRUCTIONS[n], tools: [specialistTools[n]], handlers: [{ specification: kickoffSpec(() => opsLeadId), processor: startLoop }] }),
  )
  const specialistIds = new Set(specialists.map((a) => a.getId()))

  // ---- Auditor: verifies each specialist as soon as it answers; cross-checks once all of them are in ----
  const freshContext = (instruction: string) => ModelContext.create().addContextItem(DeveloperMessageItem.create(instruction))
  const auditorGate = (purpose: string) =>
    numberGate(
      "Auditor",
      () => {
      const meta = [...state.verdicts.values()].flat().length
      const extra = [meta, ...[...state.verdicts.values()].map((v) => v.length), ...[...state.verdicts.values()].map((v) => v.filter((x) => x.ok).length)]
      for (const a of state.answers.values()) extra.push(a.gate.checked, a.gate.unverified.length)
      // Cross-check tallies and the desk count are figures the Auditor may quote too (fixed 2026-11-27:
      // with 11 checks the "11 of 11" line was wrongly flagged in the first five-agent live run).
      if (state.cross) extra.push(state.cross.checks.length, state.cross.checks.filter((c) => c.ok).length)
      extra.push(SPECIALISTS.length)
      return [...ledger.all(), ...extra.map((value) => ({ id: "META", agent: "Auditor", label: purpose, value, unit: "count" as const, formula: "", check: { kind: "derived" as const, expr: "0" } }))]
      },
      `Auditor: ${purpose}`,
    )
  const verifyTool = (agent: string) =>
    tool("verify_figures", `Recompute every figure ${agent} reported from the raw CSV lines it cites, and check the numbers in its prose.`, async () => {
      const figs = ledger.byAgent(agent)
      const v = verifyFigures(figs, ledger, data.dir)
      state.verdicts.set(agent, v)
      const gate = state.answers.get(agent)?.gate
      const okN = v.filter((x) => x.ok).length
      const line = `${agent}: ${okN} of ${v.length} figures recomputed from raw rows match; ${gate?.checked ?? 0} numbers in its summary checked, ${gate?.unverified.length ?? 0} unverified.`
      state.auditorNotes.push(line)
      sendEvent(SemanticEvent.create("audit.agent_verified", auditor.getId(), { agent, ok: okN === v.length }), auditor.getId())
      return { headline: `Audit of ${agent}`, brief: [line, ...v.filter((x) => !x.ok).map((x) => `MISMATCH ${x.id}: reported ${x.expected}, recomputed ${x.recomputed}`)] }
    })
  const crossTool = tool("cross_check", "Check the specialists against each other and compute cross-agent figures.", async () => {
    if (!state.fraud) throw new Error("fraud results missing")
    if (!state.payments) throw new Error("payment investigation results missing")
    const r = (state.cross = runCrossChecks(data, ledger, state.fraud, state.payments))
    state.verdicts.set("Auditor", verifyFigures(r.figures, ledger, data.dir)) // the Auditor's own figures go through the same recompute
    const passed = r.checks.filter((c) => c.ok).length
    return {
      headline: "Cross-agent audit",
      brief: [`${passed} of ${r.checks.length} cross-agent consistency checks pass.`, ...brief(r.figures, ["A3", "A4", "A5"]), ...r.checks.filter((c) => !c.ok).map((c) => `FAILED ${c.id}: ${c.title} (${c.detail})`)],
    }
  })
  const auditor = createAgent({
    name: "Auditor",
    capabilities: ["inference", "verification"],
    instruction: INSTRUCTIONS.Auditor,
    tools: [crossTool],
    handlers: [
      {
        specification: new Is(({ event }) => event.type === "model.answer" && specialistIds.has(event.producerId)),
        processor: {
          apply({ event }) {
            const agent = name(event.producerId)
            runLoop(auditor.getId(), `Verify the figures reported by ${agent}.`, { model, context: freshContext(INSTRUCTIONS.Auditor), tools: [verifyTool(agent)] }, auditorGate(`verify ${agent}`))
          },
        },
      },
      {
        specification: new Is(({ event }) => event.type === "audit.agent_verified"),
        processor: {
          apply() {
            if (state.verdicts.size < SPECIALISTS.length || state.crossCheckStarted) return
            state.crossCheckStarted = true
            runLoop(auditor.getId(), "All specialists are verified. Run the cross-agent checks.", { model, context: freshContext(INSTRUCTIONS.Auditor), tools: [crossTool] }, auditorGate("cross-check"))
          },
        },
      },
      {
        specification: new Is(({ event, participant }) => event.type === "model.answer" && event.producerId === participant.getId()),
        processor: {
          apply({ event }) {
            // Finish only when every auditor loop (one verification per specialist + 1 cross-check) has answered.
            state.auditorAnswers++
            if (state.auditorAnswers === SPECIALISTS.length + 1 && state.cross) {
              sendEvent(SemanticEvent.create("audit.completed", auditor.getId(), {}), auditor.getId())
            }
          },
        },
      },
    ],
  })

  // ---- Observers ----
  const recorder = createHuman({
    name: "Flight Recorder",
    capabilities: ["observe"],
    handlers: [
      {
        specification: new Is(() => true),
        processor: {
          apply({ event }) {
            const p = event.payload as { loopId?: string; content?: string; call?: { name: string } }
            if (event.type === "message_received.started" && p.loopId && p.content) state.loopPurpose.set(p.loopId, p.content)
            if (event.type === "inference.stream") return
            const detail = event.type === "function_call.started" ? p.call?.name : undefined
            state.trace.push({ t: elapsed(), type: event.type, producer: name(event.producerId), loopId: p.loopId, detail })
            if (["message_received.started", "function_call.started", "model.answer"].includes(event.type)) log(`  +${String(elapsed()).padStart(5)}ms  ${name(event.producerId).padEnd(18)} ${event.type}${detail ? ` → ${detail}` : ""}`)
          },
        },
      },
    ],
  })
  const reportDesk = createHuman({
    name: "Report Desk",
    capabilities: ["observe"],
    handlers: [{ specification: new Is(({ event }) => event.type === "audit.completed"), processor: { apply: () => resolveDone() } }],
  })
  const opsLead = createHuman({ name: "Ops Lead", capabilities: ["kickoff"], handlers: [] })
  opsLeadId = opsLead.getId()

  for (const p of [recorder, reportDesk, opsLead, auditor, ...specialists]) state.names.set(p.getId(), p.getManifest().name)

  const onRejection = (e: unknown) => rejectDone(e)
  process.on("unhandledRejection", onRejection)
  const timer = setTimeout(() => rejectDone(new Error(`war room timed out after ${opts.timeoutMs ?? 120000} ms`)), opts.timeoutMs ?? 120000)
  try {
    for (const p of [recorder, reportDesk, auditor, ...specialists, opsLead]) join(p)
    // One message; five specialist agents react to it at the same instant and run their loops concurrently.
    sendMessage("Black Friday is closed. Each desk: run your checks on the synthetic data and report back with evidence IDs.", opsLead.getId())
    await done
  } finally {
    clearTimeout(timer)
    process.off("unhandledRejection", onRejection)
  }
  return { state, provider: opts.provider, model, elapsedMs: elapsed() }
}

export { stats }
