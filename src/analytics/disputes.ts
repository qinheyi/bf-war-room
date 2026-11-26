// Disputes Desk analytics: refund and chargeback decisions from data/POLICY.md.
import type { Data } from "../data/load.ts"
import { EvidenceLedger, type Evidence } from "../evidence.ts"
import { round2, type CsvRow } from "../util.ts"

export const AS_OF = "2026-12-01"

export type Decision = { row: CsvRow; order?: CsvRow; decision: "approve" | "decline" | "represent" | "accept"; rule: string; dueInDays: number }

export function decide(d: CsvRow, order: CsvRow | undefined): Decision {
  const dueInDays = Math.round((Date.parse(d.respond_by) - Date.parse(AS_OF)) / 86_400_000)
  const base = { row: d, order, dueInDays }
  if (d.type === "refund") {
    if (d.reason === "changed_mind") {
      const list = Number(order?.list_amount ?? 0)
      const disc = Number(order?.discount_amount ?? 0)
      const finalSale = list > 0 && disc / list >= 0.4 - 1e-9
      return finalSale ? { ...base, decision: "decline", rule: "RF-FINAL" } : { ...base, decision: "approve", rule: "RF-CHANGED" }
    }
    return { ...base, decision: "approve", rule: "RF-QUALITY" }
  }
  if (d.reason === "10.4_fraud") {
    const strong = order?.avs === "Y" && order?.cvv === "M" && d.tracking === "delivered"
    return strong ? { ...base, decision: "represent", rule: "CB-FRAUD-REP" } : { ...base, decision: "accept", rule: "CB-FRAUD-ACC" }
  }
  if (d.reason === "13.1_not_received") {
    return d.tracking === "delivered" ? { ...base, decision: "represent", rule: "CB-NR-REP" } : { ...base, decision: "accept", rule: "CB-NR-ACC" }
  }
  return { ...base, decision: "accept", rule: "CB-NAD" }
}

export type DisputesResult = { figures: Evidence[]; decisions: Decision[]; urgent: Decision[] }

export function runDisputes(data: Data, ledger: EvidenceLedger, agent = "Disputes Desk"): DisputesResult {
  const P = "D"
  const orderById = new Map(data.orders.map((o) => [o.order_id, o]))
  const decisions = data.disputes.map((d) => decide(d, orderById.get(d.order_id)))
  const L = (xs: Decision[]) => xs.map((x) => x.row.__line)
  const sum = (xs: Decision[]) => round2(xs.reduce((a, x) => a + Number(x.row.amount), 0))
  const refunds = decisions.filter((d) => d.row.type === "refund")
  const approved = refunds.filter((d) => d.decision === "approve")
  const declined = refunds.filter((d) => d.decision === "decline")
  const cbs = decisions.filter((d) => d.row.type === "chargeback")
  const rep = cbs.filter((d) => d.decision === "represent")
  const acc = cbs.filter((d) => d.decision === "accept")
  const urgent = cbs.filter((d) => d.dueInDays <= 7).sort((a, b) => a.dueInDays - b.dueInDays)
  const feeRow = data.fees.find((f) => f.payment_method === "chargeback_fee")!

  const add = (e: Omit<Evidence, "id" | "agent">) => ledger.add(P, { agent, ...e })
  const d1 = add({ label: "Refund requests", value: refunds.length, unit: "count", formula: "count(disputes where type = refund)", check: { kind: "count", file: "disputes.csv", lines: L(refunds) } })
  const d2 = add({ label: "Refunds to approve", value: approved.length, unit: "count", formula: "count(refunds decided approve)", rules: ["RF-QUALITY", "RF-CHANGED"], check: { kind: "count", file: "disputes.csv", lines: L(approved) } })
  const d3 = add({ label: "Refund amount to approve", value: sum(approved), unit: "usd", formula: "sum(amount) over approved refunds", rules: ["RF-QUALITY", "RF-CHANGED"], check: { kind: "sum", file: "disputes.csv", lines: L(approved), column: "amount" } })
  const d4 = add({ label: "Refunds to decline (final sale)", value: declined.length, unit: "count", formula: "count(refunds decided decline)", rules: ["RF-FINAL"], check: { kind: "count", file: "disputes.csv", lines: L(declined) } })
  const d5 = add({ label: "Refund amount declined", value: sum(declined), unit: "usd", formula: "sum(amount) over declined refunds", rules: ["RF-FINAL"], check: { kind: "sum", file: "disputes.csv", lines: L(declined), column: "amount" } })
  const d6 = add({ label: "Chargebacks received", value: cbs.length, unit: "count", formula: "count(disputes where type = chargeback)", check: { kind: "count", file: "disputes.csv", lines: L(cbs) } })
  const d7 = add({ label: "Chargebacks to represent (fight)", value: rep.length, unit: "count", formula: "count(chargebacks decided represent)", rules: ["CB-FRAUD-REP", "CB-NR-REP"], check: { kind: "count", file: "disputes.csv", lines: L(rep) } })
  const d8 = add({ label: "Amount under representment", value: sum(rep), unit: "usd", formula: "sum(amount) over represented chargebacks", rules: ["CB-FRAUD-REP", "CB-NR-REP"], check: { kind: "sum", file: "disputes.csv", lines: L(rep), column: "amount" } })
  const d9 = add({ label: "Chargebacks to accept", value: acc.length, unit: "count", formula: "count(chargebacks decided accept)", rules: ["CB-FRAUD-ACC", "CB-NR-ACC", "CB-NAD"], check: { kind: "count", file: "disputes.csv", lines: L(acc) } })
  const d10 = add({ label: "Amount of accepted chargebacks", value: sum(acc), unit: "usd", formula: "sum(amount) over accepted chargebacks", rules: ["CB-FRAUD-ACC", "CB-NR-ACC", "CB-NAD"], check: { kind: "sum", file: "disputes.csv", lines: L(acc), column: "amount" } })
  const d11 = add({ label: "Chargeback fee per case", value: Number(feeRow.fixed), unit: "usd", formula: "fee_schedule.csv chargeback_fee.fixed", check: { kind: "lookup", file: "fee_schedule.csv", line: feeRow.__line, column: "fixed" } })
  const d12 = add({ label: "Chargeback fees (all cases, win or lose)", value: round2(d6.value * d11.value), unit: "usd", formula: `${d6.id} × ${d11.id}`, check: { kind: "derived", expr: `${d6.id} * ${d11.id}` } })
  const d13 = add({ label: "Expected dispute cost (approved refunds + accepted chargebacks + fees)", value: round2(d3.value + d10.value + d12.value), unit: "usd", formula: `${d3.id} + ${d10.id} + ${d12.id}`, check: { kind: "derived", expr: `${d3.id} + ${d10.id} + ${d12.id}` } })
  const d14 = add({ label: `Chargebacks due within 7 days of ${AS_OF}`, value: urgent.length, unit: "count", formula: "count(chargebacks with respond_by - as_of <= 7 days)", check: { kind: "count", file: "disputes.csv", lines: L(urgent) } })
  return { figures: [d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11, d12, d13, d14], decisions, urgent }
}
