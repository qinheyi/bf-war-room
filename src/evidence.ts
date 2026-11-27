// Evidence ledger: every figure an agent reports is registered here with a machine-checkable
// recipe that points at exact CSV line numbers. The Auditor re-runs each recipe against the
// raw files, independently of the code that produced the figure.
import { int, pct, usd } from "./util.ts"

export type Unit = "usd" | "count" | "pct"

export type Check =
  | { kind: "count"; file: string; lines: number[] }
  | { kind: "sum"; file: string; lines: number[]; column: string }
  | { kind: "expectedFees"; file: string; lines: number[]; amountColumn: string }
  | { kind: "lookup"; file: string; line: number; column: string }
  | { kind: "derived"; expr: string }
  /** sum(net of settlement lines) - sum(charged_amount - expected fee) over order lines. */
  | { kind: "netDiff"; orderLines: number[]; settlementLines: number[] }
  /** payment_exceptions.csv lines whose cause (PI-* rules) is `cause`. The Auditor re-classifies every
   *  row of the file itself, requires the cited lines to be exactly that set, then counts or sums them. */
  | { kind: "cause"; lines: number[]; cause: string; measure: "count" | "sum" }

export type Evidence = {
  id: string
  agent: string
  label: string
  value: number
  unit: Unit
  /** Plain-English recipe, e.g. "sum(charged_amount) over captured orders". */
  formula: string
  /** Policy rule IDs from data/POLICY.md that the figure depends on. */
  rules?: string[]
  check: Check
}

export function formatValue(e: Pick<Evidence, "value" | "unit">): string {
  if (e.unit === "usd") return usd(e.value)
  if (e.unit === "pct") return pct(e.value)
  return int(e.value)
}

export class EvidenceLedger {
  private items = new Map<string, Evidence>()
  private counters = new Map<string, number>()

  add(prefix: string, e: Omit<Evidence, "id">): Evidence {
    const n = (this.counters.get(prefix) ?? 0) + 1
    this.counters.set(prefix, n)
    const full: Evidence = { ...e, id: `${prefix}${n}` }
    this.items.set(full.id, full)
    return full
  }

  get(id: string): Evidence | undefined {
    return this.items.get(id)
  }

  all(): Evidence[] {
    return [...this.items.values()]
  }

  byAgent(agent: string): Evidence[] {
    return this.all().filter((e) => e.agent === agent)
  }
}

/** Short human-readable pointer to the source lines, e.g. "orders.csv L2-L1227 (1,153 rows)". */
export function describeSource(c: Check): string {
  if (c.kind === "derived") return `computed: ${c.expr}`
  if (c.kind === "netDiff")
    return `settlements.csv ${c.settlementLines.map((l) => `L${l}`).join(", ") || "(none)"} vs orders.csv ${c.orderLines.map((l) => `L${l}`).join(", ")}`
  if (c.kind === "lookup") return `${c.file} L${c.line} column ${c.column}`
  const file = c.kind === "cause" ? "payment_exceptions.csv" : c.file
  const lines = c.lines
  if (lines.length === 0) return `${file} (0 rows)`
  const shown = lines.slice(0, 6).map((l) => `L${l}`).join(", ")
  const more = lines.length > 6 ? `, … (+${lines.length - 6})` : ""
  return `${file} ${shown}${more} [${int(lines.length)} rows]${c.kind === "cause" ? ` re-classified: ${c.cause}` : ""}`
}
