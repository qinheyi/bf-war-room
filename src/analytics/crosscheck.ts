// Cross-agent checks run by the Auditor once every specialist has reported.
import type { Data } from "../data/load.ts"
import { EvidenceLedger, formatValue, type Evidence } from "../evidence.ts"
import { round1, round2 } from "../util.ts"
import type { FraudResult } from "./fraud.ts"
import type { PaymentsResult } from "./payments.ts"

export type Consistency = { id: string; title: string; ok: boolean; detail: string; refs: string[] }

export type CrossResult = { figures: Evidence[]; checks: Consistency[] }

export function runCrossChecks(data: Data, ledger: EvidenceLedger, fraud: FraudResult, payments?: PaymentsResult, agent = "Auditor"): CrossResult {
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
  if (payments) checks.push(...paymentChecks(data, ledger, fraud, payments))
  return { figures: [a1, a2, a3, a4, a5], checks }
}

/** Payment Investigator vs the other desks (added during the hackathon, 2026-11-27). */
export function paymentChecks(data: Data, ledger: EvidenceLedger, fraud: FraudResult, payments: PaymentsResult): Consistency[] {
  const get = (id: string) => {
    const e = ledger.get(id)
    if (!e) throw new Error(`missing evidence ${id}`)
    return e
  }
  const orderById = new Map(data.orders.map((o) => [o.order_id, o]))
  const settledOrders = new Set(data.settlements.map((s) => s.order_id))
  const declined = new Set(data.orders.filter((o) => o.status === "declined").map((o) => o.order_id))
  const nonDup = payments.cases.filter((c) => c.cause !== "duplicate_charge")
  const nonDupOrders = new Set(nonDup.map((c) => c.row.order_id))
  const sameSet = nonDupOrders.size === declined.size && [...declined].every((id) => nonDupOrders.has(id)) && nonDupOrders.size === nonDup.length
  const paidOut = nonDup.filter((c) => settledOrders.has(c.row.order_id))
  const dups = payments.cases.filter((c) => c.cause === "duplicate_charge")
  const badDups = dups.filter((c) => {
    const o = orderById.get(c.row.order_id)
    return !o || o.status !== "captured" || Number(c.row.amount) !== Number(o.charged_amount) || !settledOrders.has(c.row.order_id)
  })
  const flagged = new Set(fraud.scored.filter((s) => s.score >= 50).map((s) => s.row.order_id))
  const riskyRetries = payments.cases.filter((c) => c.action === "retry" && flagged.has(c.row.order_id))
  const expectNonDup = get("P1").value - get("P15").value
  return [
    {
      id: "C7",
      title: "Payment Investigator has exactly one exception for every order the Revenue Analyst counted as declined",
      ok: sameSet && expectNonDup === get("R3").value,
      detail: `P1 - P15 = ${formatValue({ value: expectNonDup, unit: "count" })} vs R3 ${formatValue(get("R3"))}`,
      refs: ["P1", "P15", "R3"],
    },
    {
      id: "C8",
      title: "No failed or pending payment shows up in the payout the Ledger Reconciler matched",
      ok: paidOut.length === 0,
      detail: `${paidOut.length} of ${nonDup.length} non-duplicate exceptions have a settlement line`,
      refs: ["P1", "L5"],
    },
    {
      id: "C9",
      title: "Every duplicate authorisation is on a captured, settled order and equals its charge (refund is safe)",
      ok: badDups.length === 0 && dups.length === get("P15").value,
      detail: `${dups.length - badDups.length} of ${dups.length} duplicates match a captured order in L1 and a settlement line`,
      refs: ["P15", "P16", "L1"],
    },
    {
      id: "C10",
      title: "No retry is recommended on an order the Fraud Sentinel flagged (score 50+)",
      ok: riskyRetries.length === 0,
      detail: `${riskyRetries.length} of ${get("P17").value} retries are on flagged orders`,
      refs: ["P17", "F2"],
    },
    {
      id: "C11",
      title: "Every payment exception got a cause and an action",
      ok: get("P20").value === 0,
      detail: `P20 unclassified = ${formatValue(get("P20"))}`,
      refs: ["P1", "P20"],
    },
  ]
}
