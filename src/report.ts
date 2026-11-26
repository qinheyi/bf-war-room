// Builds the report once from structured blocks, then renders it to Markdown and HTML.
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describeSource, formatValue, type Evidence } from "./evidence.ts"
import { SPECIALISTS, type WarRoomResult } from "./warroom.ts"
import { stats } from "./models.ts"
import { usd } from "./util.ts"

type Block =
  | { kind: "h2"; text: string }
  | { kind: "p"; text: string }
  | { kind: "note"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "pre"; text: string }

export const DISCLAIMER =
  "Not financial advice. All data is synthetic (fixed seed, fictional store \"Lumen & Loom\"); no real customers, accounts or money are involved. Refund, chargeback and claim decisions are drafts for a human to review; nothing here moves money."

export function mozaikVersion(): string {
  try {
    return JSON.parse(readFileSync(join(import.meta.dirname, "..", "node_modules", "@mozaik-ai", "core", "package.json"), "utf8")).version
  } catch {
    return "unknown"
  }
}

export function loopTimeline(r: WarRoomResult) {
  const loops = new Map<string, { agent: string; purpose: string; start: number; end: number }>()
  for (const ev of r.state.trace) {
    if (!ev.loopId) continue
    const l = loops.get(ev.loopId) ?? { agent: ev.producer, purpose: r.state.loopPurpose.get(ev.loopId) ?? "", start: ev.t, end: ev.t }
    l.start = Math.min(l.start, ev.t)
    l.end = Math.max(l.end, ev.t)
    loops.set(ev.loopId, l)
  }
  const list = [...loops.values()].sort((a, b) => a.start - b.start)
  let maxConcurrent = 0
  for (const l of list) maxConcurrent = Math.max(maxConcurrent, list.filter((o) => o.start <= l.start && o.end >= l.start).length)
  const spec = list.filter((l) => (SPECIALISTS as readonly string[]).includes(l.agent))
  const specialistsOverlap = spec.length === 4 && Math.max(...spec.map((l) => l.start)) < Math.min(...spec.map((l) => l.end))
  return { list, maxConcurrent, specialistsOverlap }
}

export function buildBlocks(r: WarRoomResult): Block[] {
  const { state } = r
  const L = state.ledger
  const f = (id: string) => {
    const e = L.get(id)
    if (!e) throw new Error(`missing ${id}`)
    return `${formatValue(e)} [${id}]`
  }
  const verdicts = [...state.verdicts.values()].flat()
  const okCount = verdicts.filter((v) => v.ok).length
  const crossVerdictOk = new Map(verdicts.map((v) => [v.id, v.ok]))
  const checks = state.cross?.checks ?? []
  const gateTotals = [...state.answers.entries()].filter(([a]) => !a.startsWith("Auditor")).reduce((a, [, v]) => ({ checked: a.checked + v.gate.checked, bad: a.bad + v.gate.unverified.length }), { checked: 0, bad: 0 })
  const tl = loopTimeline(r)
  const blocks: Block[] = []

  blocks.push({ kind: "note", text: DISCLAIMER })
  blocks.push({
    kind: "p",
    text: `Run: ${r.provider} mode (model \`${r.model}\`), @mozaik-ai/core ${mozaikVersion()}, ${r.elapsedMs} ms wall time, ${tl.list.length} agent loops, up to ${tl.maxConcurrent} running at once. Store day: 2026-11-27 (UTC). Report as of 2026-12-01.`,
  })
  blocks.push({
    kind: "p",
    text: `Audit status: ${okCount} of ${verdicts.length} figures recomputed by the Auditor from the raw CSV lines they cite; ${checks.filter((c) => c.ok).length} of ${checks.length} cross-agent checks pass; ${gateTotals.checked} numbers in agent summaries went through the number gate and ${gateTotals.bad} were flagged as unverified.`,
  })

  blocks.push({ kind: "h2", text: "Do this today" })
  blocks.push({
    kind: "list",
    items: [
      `**Hold ${f("F5")} shipments** that score 75 or more, and review all ${f("F3")} flagged orders that were already captured (${f("F4")} at risk). Queue below.`,
      `**Block device ${state.fraud?.velocityDevices.join(", ") || "-"}**: a card-testing burst of ${f("F6")} orders; the processor declined ${f("F7")} of them.`,
      `**Answer ${f("D14")} chargebacks due within 7 days.** Fight ${f("D7")} (${f("D8")}) with AVS/CVV/delivery proof; accept ${f("D9")} (${f("D10")}).`,
      `**Approve ${f("D2")} refunds** (${f("D3")}) and decline ${f("D4")} final-sale request (${f("D5")}).`,
      `**File processor claims**: ${f("L8")} captured orders never paid out (${f("L9")}), ${f("L14")} short settlements (${f("L15")}), ${f("L12")} fee overcharges (${f("L13")}). Set aside the ${f("L11")} paid twice on ${f("L10")} orders for the clawback.`,
      `Payout variance is ${f("L7")} and the unexplained remainder is ${f("L16")}.`,
    ],
  })

  blocks.push({ kind: "h2", text: "Headline numbers" })
  blocks.push({
    kind: "table",
    head: ["Figure", "Value", "Evidence"],
    rows: ["R7", "R2", "R8", "R6", "R10", "D13", "A5", "A3", "A4"].map((id) => [L.get(id)!.label, formatValue(L.get(id)!), `[${id}]`]),
  })

  for (const agent of [...SPECIALISTS, "Auditor"]) {
    blocks.push({ kind: "h2", text: agent })
    const ans = state.answers.get(agent === "Auditor" ? "Auditor: cross-check" : agent)
    if (ans) blocks.push({ kind: "pre", text: ans.text })
    const figs = L.byAgent(agent)
    blocks.push({
      kind: "table",
      head: ["ID", "Figure", "Value", "Recipe", "Source", "Audit"],
      rows: figs.map((e: Evidence) => [e.id, e.label, formatValue(e), e.formula + (e.rules?.length ? ` (rules: ${e.rules.join(", ")})` : ""), describeSource(e.check), crossVerdictOk.get(e.id) === undefined ? "n/a" : crossVerdictOk.get(e.id) ? "✅ recomputed" : "❌ mismatch"]),
    })
    if (agent === "Fraud Sentinel" && state.fraud) {
      blocks.push({ kind: "p", text: "Review queue (top 10 captured orders by score; amounts are the cited rows' `charged_amount`):" })
      blocks.push({ kind: "table", head: ["Order", "Score", "Rules hit", "Charged", "Source"], rows: state.fraud.reviewQueue.map((s) => [s.row.order_id, String(s.score), s.rules.join(" "), usd(Number(s.row.charged_amount)), `orders.csv L${s.row.__line}`]) })
    }
    if (agent === "Disputes Desk" && state.disputes) {
      blocks.push({ kind: "p", text: "Chargebacks due within 7 days (draft responses for a human to send):" })
      blocks.push({ kind: "table", head: ["Case", "Order", "Reason", "Amount", "Respond by", "Decision", "Rule", "Source"], rows: state.disputes.urgent.map((d) => [d.row.case_id, d.row.order_id, d.row.reason, usd(Number(d.row.amount)), d.row.respond_by, d.decision, d.rule, `disputes.csv L${d.row.__line}`]) })
    }
    if (agent === "Ledger Reconciler" && state.recon) {
      blocks.push({ kind: "p", text: "Processor claims to file (drafts; each net impact = settled net minus expected net for that order):" })
      blocks.push({ kind: "table", head: ["Type", "Order", "Settlement lines", "Net impact", "What to do"], rows: state.recon.claims.map((c) => [c.kind, c.orderId, c.settlementLines.join(" ") || "(none)", usd(c.netImpact), c.note]) })
    }
    if (agent === "Auditor") {
      blocks.push({ kind: "p", text: "Cross-agent consistency checks:" })
      blocks.push({ kind: "table", head: ["Check", "Result", "Detail", "Evidence"], rows: checks.map((c) => [`${c.id} ${c.title}`, c.ok ? "✅ pass" : "❌ fail", c.detail, c.refs.map((x) => `[${x}]`).join(" ")]) })
      blocks.push({ kind: "list", items: state.auditorNotes })
    }
  }

  blocks.push({ kind: "h2", text: "How the agents ran (concurrency trace)" })
  blocks.push({
    kind: "p",
    text: `Each row is one Mozaik agent loop (runLoop). Times are milliseconds since the Ops Lead's kickoff message. The four specialist loops ${tl.specialistsOverlap ? "overlapped in time (all four were running at once)" : "did not all overlap"}; the Auditor's verification loops start as soon as each specialist answers, while the others are still working.`,
  })
  const span = Math.max(1, ...tl.list.map((l) => l.end))
  blocks.push({
    kind: "pre",
    text: tl.list
      .map((l) => {
        const a = Math.round((l.start / span) * 50)
        const b = Math.max(a + 1, Math.round((l.end / span) * 50))
        const label = `${l.agent}${l.agent === "Auditor" ? ` (${l.purpose.startsWith("All four") ? "cross-check" : l.purpose.replace("Verify the figures reported by ", "verify ").replace(".", "")})` : ""}`
        return `${label.padEnd(36)} ${" ".repeat(a)}${"█".repeat(b - a)}${" ".repeat(Math.max(0, 50 - b))} ${String(l.start).padStart(5)}–${String(l.end).padEnd(5)} ms`
      })
      .join("\n"),
  })
  blocks.push({ kind: "h2", text: "Interception log (number gate)" })
  blocks.push({ kind: "table", head: ["t (ms)", "Agent", "Breakpoint", "Action", "Detail"], rows: state.gateLog.map((g) => [String(g.t), g.agent, g.stage, g.action, g.detail]) })
  if (r.provider !== "offline") {
    blocks.push({ kind: "p", text: `Model usage: ${stats.liveCalls} live calls, ${stats.inputTokens} input and ${stats.outputTokens} output tokens, ${stats.fallbacks} deterministic fallbacks.` })
  }
  blocks.push({ kind: "h2", text: "Data and sources" })
  blocks.push({
    kind: "list",
    items: [
      "`data/orders.csv`, `data/disputes.csv`, `data/settlements.csv`, `data/fee_schedule.csv`: synthetic, generated by `npm run generate-data` (seed 20261127). Line numbers count the header as line 1.",
      "`data/POLICY.md`: the fraud, refund, chargeback and fee rules the agents apply (rule IDs are cited above).",
      "`reports/evidence.json`: every figure with its full list of source lines and the recipe the Auditor re-ran.",
    ],
  })
  blocks.push({ kind: "note", text: DISCLAIMER })
  return blocks
}

export function toMarkdown(title: string, blocks: Block[]): string {
  const esc = (s: string) => s.replace(/\|/g, "\\|")
  const out = [`# ${title}`, ""]
  for (const b of blocks) {
    if (b.kind === "h2") out.push(`## ${b.text}`, "")
    else if (b.kind === "p") out.push(b.text, "")
    else if (b.kind === "note") out.push(`> **${b.text}**`, "")
    else if (b.kind === "list") out.push(...b.items.map((i) => `- ${i}`), "")
    else if (b.kind === "pre") out.push("```text", b.text, "```", "")
    else out.push(`| ${b.head.join(" | ")} |`, `| ${b.head.map(() => "---").join(" | ")} |`, ...b.rows.map((r) => `| ${r.map(esc).join(" | ")} |`), "")
  }
  return out.join("\n")
}

export function toHtml(title: string, blocks: Block[]): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([A-Z]+\d+)\]/g, '<a class="ev" href="#ev-$1">$1</a>')
  const body: string[] = []
  for (const b of blocks) {
    if (b.kind === "h2") body.push(`<h2>${esc(b.text)}</h2>`)
    else if (b.kind === "p") body.push(`<p>${inline(b.text)}</p>`)
    else if (b.kind === "note") body.push(`<p class="note">${inline(b.text)}</p>`)
    else if (b.kind === "list") body.push(`<ul>${b.items.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`)
    else if (b.kind === "pre") body.push(`<pre>${inline(b.text)}</pre>`)
    else {
      const idCol = b.head[0] === "ID"
      body.push(
        `<div class="tw"><table><thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${b.rows
          .map((r) => `<tr${idCol ? ` id="ev-${esc(r[0])}"` : ""}>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`,
      )
    }
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>
:root{--bg:#0d0f14;--card:#151923;--ink:#e8ebf2;--mute:#9aa3b5;--acc:#ffcc33;--ok:#4ade80;--bad:#f87171}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:1180px;margin:0 auto;padding:32px 20px 80px}h1{font-size:30px;margin:0 0 6px}h1 span{color:var(--acc)}
h2{margin-top:40px;border-bottom:1px solid #2a3142;padding-bottom:6px}p.note{background:#2a2410;border-left:4px solid var(--acc);padding:10px 14px;border-radius:6px}
.tw{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px;background:var(--card)}th,td{padding:6px 8px;border-bottom:1px solid #232a3a;text-align:left;vertical-align:top}
th{color:var(--mute);font-weight:600}tr:target{outline:2px solid var(--acc)}pre{background:var(--card);padding:12px;border-radius:6px;overflow-x:auto;font-size:12.5px;white-space:pre-wrap}
code{background:#1e2433;padding:1px 4px;border-radius:4px}a.ev{color:var(--acc);text-decoration:none;font-size:12px;border:1px solid #4a3f12;border-radius:4px;padding:0 3px}
li{margin:6px 0}
</style></head><body><main><h1>🛒 <span>Black Friday War Room</span></h1><p style="color:var(--mute)">${esc(title)}</p>${body.join("\n")}</main></body></html>`
}
