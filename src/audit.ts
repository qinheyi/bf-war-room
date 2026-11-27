// The Auditor's toolkit. Deliberately separate from src/analytics: it re-reads the raw CSV text,
// re-runs each figure's recipe on the exact cited lines, and checks the agents against each other.
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { EvidenceLedger, formatValue, type Evidence } from "./evidence.ts"

export type Verdict = { id: string; agent: string; ok: boolean; expected: number; recomputed: number; note?: string }

/** Raw line access: line N of a file, split by commas, keyed by the header. */
class RawFiles {
  private cache = new Map<string, { header: string[]; lines: string[] }>()
  constructor(private dir: string) {}
  private load(file: string) {
    let f = this.cache.get(file)
    if (!f) {
      const lines = readFileSync(join(this.dir, file), "utf8").replace(/\r/g, "").split("\n")
      f = { header: lines[0].split(","), lines }
      this.cache.set(file, f)
    }
    return f
  }
  cell(file: string, line: number, column: string): string {
    const f = this.load(file)
    const text = f.lines[line - 1]
    if (line < 2 || text === undefined || text === "") throw new Error(`${file} has no data line ${line}`)
    const idx = f.header.indexOf(column)
    if (idx < 0) throw new Error(`${file} has no column ${column}`)
    return text.split(",")[idx]
  }
  /** Line numbers of every non-empty data line (header = line 1). */
  dataLines(file: string): number[] {
    const f = this.load(file)
    const out: number[] = []
    for (let i = 1; i < f.lines.length; i++) if (f.lines[i] !== "") out.push(i + 1)
    return out
  }
  /** Raw scan of orders.csv: order_id -> status. */
  orderStatus(): Map<string, string> {
    const m = new Map<string, string>()
    for (const l of this.dataLines("orders.csv")) m.set(this.cell("orders.csv", l, "order_id"), this.cell("orders.csv", l, "status"))
    return m
  }
}

// ---------- Payment exceptions: the Auditor's own reading of the PI-* rules in data/POLICY.md ----------
// Written separately from src/analytics/payments.ts on purpose: a table of (cause, test) pairs over raw
// cells, checked in policy order. If the two implementations ever disagree, the "cause" check fails.
const EXC = "payment_exceptions.csv"
type RawAttempt = { status: string; code: string; threeDs: string; http: number; risk: string; orderStatus: string | undefined }
const PI_RULES: Array<[string, (a: RawAttempt) => boolean]> = [
  ["duplicate_charge", (a) => a.code === "00" && a.orderStatus === "captured"], // PI-DUP
  ["risk_block", (a) => a.risk === "block"], // PI-RISK
  ["gateway_error", (a) => a.http >= 500 && a.http <= 599], // PI-GW
  ["3ds_timeout", (a) => a.status === "pending" && a.threeDs === "challenge_sent"], // PI-3DS
  ["insufficient_funds", (a) => a.code === "51"], // PI-NSF
  ["issuer_decline", (a) => a.status === "failed" && /^\d\d$/.test(a.code) && a.code !== "00"], // PI-ISSUER
]
export function auditCause(raw: RawFiles, line: number, orders: Map<string, string>): string {
  const a: RawAttempt = {
    status: raw.cell(EXC, line, "status"),
    code: raw.cell(EXC, line, "response_code"),
    threeDs: raw.cell(EXC, line, "three_ds"),
    http: Number(raw.cell(EXC, line, "gateway_http")),
    risk: raw.cell(EXC, line, "risk_decision"),
    orderStatus: orders.get(raw.cell(EXC, line, "order_id")),
  }
  return PI_RULES.find(([, test]) => test(a))?.[0] ?? "unclassified"
}

const cents = (n: number) => Math.round(n * 100)

/** Tiny arithmetic evaluator for derived figures: numbers, evidence IDs, + - * / and parentheses. */
export function evalExpr(expr: string, lookup: (id: string) => number): number {
  const tokens = expr.match(/[A-Z]+\d+|\d+(?:\.\d+)?|[()+\-*/]/g) ?? []
  let i = 0
  const peek = () => tokens[i]
  const next = () => tokens[i++]
  const factor = (): number => {
    const t = next()
    if (t === "(") {
      const v = sum()
      if (next() !== ")") throw new Error(`bad expression: ${expr}`)
      return v
    }
    if (t === "-") return -factor()
    if (t !== undefined && /^[A-Z]+\d+$/.test(t)) return lookup(t)
    if (t !== undefined && /^\d/.test(t)) return Number(t)
    throw new Error(`bad token ${t} in ${expr}`)
  }
  const term = (): number => {
    let v = factor()
    while (peek() === "*" || peek() === "/") v = next() === "*" ? v * factor() : v / factor()
    return v
  }
  const sum = (): number => {
    let v = term()
    while (peek() === "+" || peek() === "-") v = next() === "+" ? v + term() : v - term()
    return v
  }
  const v = sum()
  if (i !== tokens.length) throw new Error(`trailing tokens in ${expr}`)
  return v
}

export function recompute(e: Evidence, raw: RawFiles, ledger: EvidenceLedger): number {
  const c = e.check
  const feeOf = (method: string, gross: number) => {
    // fee_schedule.csv is tiny: scan it raw.
    for (let line = 2; line < 10; line++) {
      try {
        if (raw.cell("fee_schedule.csv", line, "payment_method") === method) {
          return Math.round((gross * Number(raw.cell("fee_schedule.csv", line, "pct")) + Number(raw.cell("fee_schedule.csv", line, "fixed"))) * 100) / 100
        }
      } catch {
        break
      }
    }
    throw new Error(`no fee for ${method}`)
  }
  switch (c.kind) {
    case "count":
      c.lines.forEach((l) => raw.cell(c.file, l, headerFirst(c.file))) // every cited line must exist
      return new Set(c.lines).size
    case "sum":
      return c.lines.reduce((a, l) => a + cents(Number(raw.cell(c.file, l, c.column))), 0) / 100
    case "expectedFees":
      return c.lines.reduce((a, l) => a + cents(feeOf(raw.cell(c.file, l, "payment_method"), Number(raw.cell(c.file, l, c.amountColumn)))), 0) / 100
    case "lookup":
      return Number(raw.cell(c.file, c.line, c.column))
    case "cause": {
      // Re-classify every row of the file, not just the cited ones: the cited set must be complete and exact.
      const orders = raw.orderStatus()
      const mine = raw.dataLines(EXC).filter((l) => auditCause(raw, l, orders) === c.cause)
      const cited = [...new Set(c.lines)].sort((a, b) => a - b)
      if (cited.length !== c.lines.length) throw new Error(`duplicate line citations for ${c.cause}`)
      const extra = cited.filter((l) => !mine.includes(l))
      const missed = mine.filter((l) => !cited.includes(l))
      if (extra.length || missed.length) throw new Error(`${c.cause}: cited lines disagree with re-classification (not ${c.cause}: ${extra.map((l) => `L${l}`).join(" ") || "-"}; missed: ${missed.map((l) => `L${l}`).join(" ") || "-"})`)
      return c.measure === "count" ? mine.length : mine.reduce((a, l) => a + cents(Number(raw.cell(EXC, l, "amount"))), 0) / 100
    }
    case "netDiff": {
      const actual = c.settlementLines.reduce((a, l) => a + cents(Number(raw.cell("settlements.csv", l, "net"))), 0)
      const expected = c.orderLines.reduce((a, l) => {
        const gross = Number(raw.cell("orders.csv", l, "charged_amount"))
        return a + cents(gross) - cents(feeOf(raw.cell("orders.csv", l, "payment_method"), gross))
      }, 0)
      return (actual - expected) / 100
    }
    case "derived":
      // Inputs are recomputed too (recursively), so a derived figure never trusts a reported value.
      return evalExpr(c.expr, (id) => {
        const ref = ledger.get(id)
        if (!ref) throw new Error(`unknown evidence ${id}`)
        return roundTo(ref.unit, recompute(ref, raw, ledger))
      })
  }
  function headerFirst(file: string) {
    return file === "orders.csv" ? "order_id" : file === "disputes.csv" ? "case_id" : file === "settlements.csv" ? "line_id" : file === EXC ? "attempt_id" : "payment_method"
  }
}

function roundTo(unit: string, v: number) {
  return unit === "usd" ? Math.round(v * 100) / 100 : unit === "pct" ? Math.round(v * 10) / 10 : v
}

export function makeRaw(dir: string) {
  return new RawFiles(dir)
}

export function verifyFigures(figures: Evidence[], ledger: EvidenceLedger, dir: string): Verdict[] {
  const raw = new RawFiles(dir)
  return figures.map((e) => {
    try {
      const v = roundTo(e.unit, recompute(e, raw, ledger))
      const tol = e.unit === "usd" ? 0.005 : e.unit === "pct" ? 0.05 : 0
      return { id: e.id, agent: e.agent, ok: Math.abs(v - e.value) <= tol + 1e-9, expected: e.value, recomputed: v }
    } catch (err) {
      return { id: e.id, agent: e.agent, ok: false, expected: e.value, recomputed: NaN, note: String(err) }
    }
  })
}

// ---------- Number gate: every number in an agent's prose must come from its evidence ----------

export type GateResult = { checked: number; unverified: string[]; text: string }

/** Numbers that are not figures: dates, clock times, evidence/rule IDs, reason codes. */
function stripNonFigures(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/\[[A-Z]+\d+(?:\s*,\s*[A-Z]+\d+)*\]/g, " ")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, " ")
    .replace(/\b(?:BF|CS|ST|PO|C|D)-[A-Z0-9-]+\b/g, " ")
    .replace(/\b[A-Z]{2,}-[A-Z0-9-]+\b/g, " ")
    .replace(/\b1[03]\.\d_[a-z_]+\b/g, " ")
}

export function numberVariants(e: Pick<Evidence, "value" | "unit">): Set<string> {
  const v = e.value
  const s = new Set<string>()
  s.add(formatValue(e).replace(/[$,%]/g, ""))
  s.add(String(v))
  s.add(v.toFixed(2))
  s.add(v.toFixed(1))
  s.add(String(Math.round(v)))
  if (e.unit === "usd") s.add(Math.abs(v).toFixed(2))
  return s
}

export function gateAnswer(text: string, allowed: Evidence[]): GateResult {
  const clean = stripNonFigures(text)
  const ok = new Set<string>()
  for (const e of allowed) {
    for (const v of numberVariants(e)) ok.add(v.replace(/^-/, ""))
    for (const m of e.label.match(/\d+(?:\.\d+)?/g) ?? []) ok.add(m)
  }
  for (let k = 0; k <= 10; k++) ok.add(String(k)) // small counting words like "top 3"
  const found = clean.match(/\$?-?\d[\d,]*(?:\.\d+)?%?/g) ?? []
  const unverified: string[] = []
  for (const raw of found) {
    const n = raw.replace(/[$,%]/g, "").replace(/^-/, "")
    if (!ok.has(n) && !ok.has(String(Number(n)))) unverified.push(raw)
  }
  // Rewrite whole numeric tokens only: an unverified "11" must not corrupt "$112,507.58" or "PA-0011".
  // (Fixed 2026-11-27 after the first five-agent live run; it used to be a plain substring replace.)
  let out = text
  for (const u of new Set(unverified)) {
    const esc = u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    out = out.replace(new RegExp(`(?<![\\w.,$-])${esc}(?![\\w%]|[.,]\\d)`, "g"), `⟦unverified: ${u}⟧`)
  }
  return { checked: found.length, unverified, text: out }
}
