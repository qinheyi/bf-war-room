// Payment Investigator analytics (added during the hackathon, 2026-11-27).
// Reads data/payment_exceptions.csv (failed or pending payment attempts), works out why each one
// did not capture from its raw signals, and recommends what to do, using the PI-* rules in
// data/POLICY.md. The cause is never in the CSV; it is derived here and re-derived by the Auditor.
import type { Data } from "../data/load.ts"
import { EvidenceLedger, type Evidence } from "../evidence.ts"
import { round1, round2, type CsvRow } from "../util.ts"

export const CAUSES = ["duplicate_charge", "risk_block", "gateway_error", "3ds_timeout", "insufficient_funds", "issuer_decline", "unclassified"] as const
export type Cause = (typeof CAUSES)[number]
export type Action = "refund" | "manual_review" | "retry" | "contact_customer"

export const RULE_OF: Record<Cause, string> = {
  duplicate_charge: "PI-DUP",
  risk_block: "PI-RISK",
  gateway_error: "PI-GW",
  "3ds_timeout": "PI-3DS",
  insufficient_funds: "PI-NSF",
  issuer_decline: "PI-ISSUER",
  unclassified: "PI-UNK",
}

export const ACTION_OF: Record<Cause, Action> = {
  duplicate_charge: "refund",
  risk_block: "manual_review",
  gateway_error: "retry",
  "3ds_timeout": "retry",
  insufficient_funds: "contact_customer",
  issuer_decline: "contact_customer",
  unclassified: "manual_review",
}

export const ACTION_TEXT: Record<Cause, string> = {
  duplicate_charge: "void the duplicate authorisation (refund if it captures); the order was already paid",
  risk_block: "manual review by a person; never auto-retry a risk block",
  gateway_error: "retry once with the same idempotency key",
  "3ds_timeout": "send the customer a fresh payment link to redo 3-D Secure",
  insufficient_funds: "do not retry; email the customer to update payment, cancel after 48h",
  issuer_decline: "do not retry; ask the customer for another payment method",
  unclassified: "manual review",
}

/** First matching rule wins, in the order written in POLICY.md. */
export function classifyAttempt(a: CsvRow, orderStatus: string | undefined): Cause {
  if (a.response_code === "00" && orderStatus === "captured") return "duplicate_charge"
  if (a.risk_decision === "block") return "risk_block"
  if (Number(a.gateway_http) >= 500) return "gateway_error"
  if (a.three_ds === "challenge_sent" && a.status === "pending") return "3ds_timeout"
  if (a.response_code === "51") return "insufficient_funds"
  if (a.status === "failed" && a.response_code !== "" && a.response_code !== "00") return "issuer_decline"
  return "unclassified"
}

export type Case = { row: CsvRow; cause: Cause; rule: string; action: Action; actionText: string }
export type PaymentsResult = { figures: Evidence[]; cases: Case[] }

export function runPayments(data: Data, ledger: EvidenceLedger, agent = "Payment Investigator"): PaymentsResult {
  const P = "P"
  const status = new Map(data.orders.map((o) => [o.order_id, o.status]))
  const cases: Case[] = data.exceptions.map((row) => {
    const cause = classifyAttempt(row, status.get(row.order_id))
    return { row, cause, rule: RULE_OF[cause], action: ACTION_OF[cause], actionText: ACTION_TEXT[cause] }
  })
  const L = (cs: Case[]) => cs.map((c) => c.row.__line)
  const sum = (cs: Case[]) => round2(cs.reduce((a, c) => a + Number(c.row.amount), 0))
  const of = (cause: Cause) => cases.filter((c) => c.cause === cause)
  const add = (e: Omit<Evidence, "id" | "agent">) => ledger.add(P, { agent, ...e })
  const F = "payment_exceptions.csv"
  const failed = cases.filter((c) => c.row.status === "failed")
  const pending = cases.filter((c) => c.row.status === "pending")

  const p1 = add({ label: "Payment exceptions reviewed", value: cases.length, unit: "count", formula: "count(payment_exceptions.csv rows)", check: { kind: "count", file: F, lines: L(cases) } })
  const p2 = add({ label: "Failed attempts", value: failed.length, unit: "count", formula: "count(status = failed)", check: { kind: "count", file: F, lines: L(failed) } })
  const p3 = add({ label: "Pending (stuck) attempts", value: pending.length, unit: "count", formula: "count(status = pending)", check: { kind: "count", file: F, lines: L(pending) } })
  const p4 = add({ label: "Amount in payment exceptions", value: sum(cases), unit: "usd", formula: "sum(amount) over all exception rows", check: { kind: "sum", file: F, lines: L(cases), column: "amount" } })
  const pair = (cause: Cause, label: string) => {
    const cs = of(cause)
    const rules = [RULE_OF[cause]]
    const n = add({ label: `${label}`, value: cs.length, unit: "count", formula: `count(rows classified ${cause} by ${RULE_OF[cause]})`, rules, check: { kind: "cause", lines: L(cs), cause, measure: "count" } })
    const v = add({ label: `${label}: amount`, value: sum(cs), unit: "usd", formula: `sum(amount) over ${n.id} rows`, rules, check: { kind: "cause", lines: L(cs), cause, measure: "sum" } })
    return [n, v]
  }
  const [p5, p6] = pair("3ds_timeout", "3-D Secure timeouts")
  const [p7, p8] = pair("gateway_error", "Gateway errors")
  const [p9, p10] = pair("insufficient_funds", "Insufficient funds declines")
  const [p11, p12] = pair("issuer_decline", "Other issuer declines")
  const [p13, p14] = pair("risk_block", "Risk-engine blocks")
  const [p15, p16] = pair("duplicate_charge", "Duplicate authorisations on paid orders")
  const p17 = add({ label: "Attempts to retry (3-D Secure timeouts + gateway errors)", value: p5.value + p7.value, unit: "count", formula: `${p5.id} + ${p7.id}`, rules: ["PI-3DS", "PI-GW"], check: { kind: "derived", expr: `${p5.id} + ${p7.id}` } })
  const p18 = add({ label: "Sales recoverable by retrying", value: round2(p6.value + p8.value), unit: "usd", formula: `${p6.id} + ${p8.id}`, rules: ["PI-3DS", "PI-GW"], check: { kind: "derived", expr: `${p6.id} + ${p8.id}` } })
  const p19 = add({ label: "Share of exception value recoverable by retrying", value: round1((p18.value / p4.value) * 100), unit: "pct", formula: `${p18.id} / ${p4.id} × 100`, check: { kind: "derived", expr: `${p18.id} / ${p4.id} * 100` } })
  const p20 = add({
    label: "Exceptions left without a cause",
    value: p1.value - (p5.value + p7.value + p9.value + p11.value + p13.value + p15.value),
    unit: "count",
    formula: `${p1.id} - (${p5.id} + ${p7.id} + ${p9.id} + ${p11.id} + ${p13.id} + ${p15.id})`,
    check: { kind: "derived", expr: `${p1.id} - (${p5.id} + ${p7.id} + ${p9.id} + ${p11.id} + ${p13.id} + ${p15.id})` },
  })
  return { figures: [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19, p20], cases }
}
