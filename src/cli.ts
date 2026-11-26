// One command: npm start. Runs the war room and writes reports/ (Markdown, HTML, evidence, trace).
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// Mozaik Cloud telemetry is optional; silence its "no API key" notice (set MOZAIK_API_KEY to enable it).
const warn = console.warn
console.warn = (...a: unknown[]) => {
  if (typeof a[0] === "string" && a[0].startsWith("mozaik cloud: no API key")) return
  warn(...a)
}

const { runWarRoom } = await import("./warroom.ts")
const { pickProvider, stats } = await import("./models.ts")
const { buildBlocks, toHtml, toMarkdown, loopTimeline, mozaikVersion, DISCLAIMER } = await import("./report.ts")
const { formatValue } = await import("./evidence.ts")

const argv = process.argv.slice(2)
const provider = argv.includes("--live") ? (process.env.MINIMAX_API_KEY ? "minimax" : pickProvider([], process.env)) : pickProvider(argv, process.env)
const outDir = join(import.meta.dirname, "..", argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "reports")

console.log(`Black Friday War Room · @mozaik-ai/core ${mozaikVersion()} · mode: ${provider}${provider === "offline" ? " (no API key needed; deterministic)" : ""}`)
console.log(DISCLAIMER)
console.log("\nAgent loop events (live):")
const result = await runWarRoom({ provider, log: (s) => console.log(s), timeoutMs: provider === "offline" ? 30000 : 240000 })

const title = "Lumen & Loom (synthetic store) — Black Friday 2026-11-27 close-out"
const blocks = buildBlocks(result)
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, "report.md"), toMarkdown(title, blocks))
writeFileSync(join(outDir, "report.html"), toHtml(title, blocks))
writeFileSync(join(outDir, "evidence.json"), JSON.stringify(result.state.ledger.all(), null, 2))
writeFileSync(join(outDir, "trace.json"), JSON.stringify({ provider, model: result.model, elapsedMs: result.elapsedMs, events: result.state.trace, gate: result.state.gateLog }, null, 2))

const verdicts = [...result.state.verdicts.values()].flat()
const tl = loopTimeline(result)
const L = result.state.ledger
console.log("\nSummary")
console.log(`  agent loops: ${tl.list.length} (max ${tl.maxConcurrent} at once; 4 specialists overlapped: ${tl.specialistsOverlap ? "yes" : "no"})`)
console.log(`  figures verified from raw rows: ${verdicts.filter((v) => v.ok).length}/${verdicts.length}`)
console.log(`  cross-agent checks passed: ${result.state.cross?.checks.filter((c) => c.ok).length}/${result.state.cross?.checks.length}`)
for (const id of ["R7", "F4", "D13", "L7", "L16", "A3"]) console.log(`  ${id.padEnd(4)} ${L.get(id)!.label}: ${formatValue(L.get(id)!)}`)
if (provider !== "offline") console.log(`  model: ${stats.liveCalls} live calls, ${stats.inputTokens}/${stats.outputTokens} tokens in/out, ${stats.fallbacks} fallbacks`)
console.log(`\nWrote ${join(outDir, "report.html")}, report.md, evidence.json, trace.json`)
const allOk = verdicts.every((v) => v.ok) && (result.state.cross?.checks.every((c) => c.ok) ?? false)
process.exit(allOk ? 0 : 1)
