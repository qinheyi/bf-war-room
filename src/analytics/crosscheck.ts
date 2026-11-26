// Cross-agent checks run by the Auditor once every specialist has reported.
import type { Data } from "../data/load.ts"
import { EvidenceLedger, formatValue, type Evidence } from "../evidence.ts"
import { round1, round2 } from "../util.ts"
import type { FraudResult } from "./fraud.ts"

export type Consistency = { id: string; title: string; ok: boolean; detail: string; refs: string[] }

export type CrossResult = { figures: Evidence[]; checks: Consistency[] }

export function runCrossChecks(data: Data, ledger: EvidenceLedger, fraud: FraudResult, agent = "Auditor"): CrossResult {
  const P = "A"
  const get = (id: string) => {
    const e = ledger.get(id)
    if (!e) throw new Error(`missing evidence ${id}`)
    return e
  }
  const flaggedIds = new Set(fraud.scored.filter((s) => s.score >= 50).map((s) => s.row.order_id))
  const fraudCbs = data.disputes.filter((d) => d.type === "chargeback" && d.reason === "10.4_fraud")
  const caught = fraudCbs.filter((d) => flaggedIds.has(d.order_id))
  const add = (e: Omit<Evidence, "id" | "agent">) => ledger.add(P, { agent, ...e })
  const a1 = add({ label: "Fraud chargebacks (reason 10.4)", value: fraudCbs.length, unit: "count", formula: "count(chargebacks with reason 10.4_fraud)", check: { kind: "count", file: "disputes.csv", lines: fraudCbs.map((d) => d.__line) } })
  const a2 = add({ label: "Fraud chargebacks the Sentinel had flagged at checkout", value: caught.length, unit: "count", formula: "count(10.4 chargebacks whose order scored >= 50)", rules: ["FR-*"], check: { kind: "count", file: "disputes.csv", lines: caught.map((d) => d.__line) } })
  const a3 = add({ label: "Sentinel recall on fraud chargebacks", value: round1((a2.value / Math.max(1, a1.value)) * 100), unit: "pct", formula: "A2 / A1 × 100", check: { kind: "derived", expr: `${a2.id} / ${a1.id} * 100` } })
  const a4 = add({ label: "Fraud chargeback amount a hold would have protected", value: round2(caught.reduce((a, d) => a + Number(d.amount), 0)), unit: "usd", formula: "sum(amount) over A2 cases", check: { kind: "sum", file: "disputes.csv", lines: caught.map((d) => d.__line), column: "amount" } })
  const a5 = add({ label: "Net sales after approved refunds and accepted chargebacks", value: round2(get("R7").value - get("D3").value - get("D10").value), unit: "usd", formula: "R7 - D3 - D10", check: { kind: "derived", expr: "R7 - D3 - D10" } })

  const orderById = new Map(data.orders.map((o) => [o.order_id, o]))
  const badDisputes = data.disputes.filter((d) => {
    const o = orderById.get(d.order_id)
    return !o || o.status !== "captured" || Number(d.amount) > Number(o.charged_amount) + 1e-9
  })
  const eq = (a: string, b: string) => get(a).value === get(b).value
  const checks: Consistency[] = [
    { id: "C1", title: "Revenue Analyst and Ledger Reconciler agree on captured sales", ok: eq("R7", "L2"), detail: `R7 ${formatValue(get("R7"))} vs L2 ${formatValue(get("L2"))}`, refs: ["R7", "L2"] },
    { id: "C2", title: "Revenue Analyst and Ledger Reconciler agree on captured order count", ok: eq("R2", "L1"), detail: `R2 ${formatValue(get("R2"))} vs L1 ${formatValue(get("L1"))}`, refs: ["R2", "L1"] },
    { id: "C3", title: "Fraud Sentinel scored every order the Revenue Analyst counted", ok: eq("F1", "R1"), detail: `F1 ${formatValue(get("F1"))} vs R1 ${formatValue(get("R1"))}`, refs: ["F1", "R1"] },
    { id: "C4", title: "Payout variance is fully explained by the listed defects", ok: get("L16").value === 0, detail: `L16 unexplained = ${formatValue(get("L16"))}`, refs: ["L7", "L16"] },
    { id: "C5", title: "Card-testing declines are a subset of all declines", ok: get("F7").value <= get("R3").value, detail: `F7 ${formatValue(get("F7"))} <= R3 ${formatValue(get("R3"))}`, refs: ["F7", "R3"] },
    { id: "C6", title: "Every dispute points to a captured order and never exceeds the charge", ok: badDisputes.length === 0, detail: `${badDisputes.length} disputes break this rule`, refs: ["D1", "D6"] },
  ]
  return { figures: [a1, a2, a3, a4, a5], checks }
}
