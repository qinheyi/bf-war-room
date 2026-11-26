// Ledger Reconciler analytics: match captured orders to the processor's settlement report.
import type { Data } from "../data/load.ts"
import { EvidenceLedger, type Evidence } from "../evidence.ts"
import { round2, type CsvRow } from "../util.ts"

export function feeFor(data: Data, method: string, gross: number): number {
  const f = data.fees.find((r) => r.payment_method === method)
  if (!f) throw new Error(`no fee schedule row for ${method}`)
  return round2(gross * Number(f.pct) + Number(f.fixed))
}

export type Claim = { kind: "missing" | "duplicate" | "fee_overcharge" | "gross_mismatch"; orderId: string; settlementLines: string[]; netImpact: number; note: string }

export type ReconResult = { figures: Evidence[]; claims: Claim[] }

export function runReconcile(data: Data, ledger: EvidenceLedger, agent = "Ledger Reconciler"): ReconResult {
  const P = "L"
  const captured = data.orders.filter((o) => o.status === "captured")
  const linesByOrder = new Map<string, CsvRow[]>()
  for (const s of data.settlements) linesByOrder.set(s.order_id, [...(linesByOrder.get(s.order_id) ?? []), s])

  const expectedNet = (o: CsvRow) => round2(Number(o.charged_amount) - feeFor(data, o.payment_method, Number(o.charged_amount)))
  const actualNet = (o: CsvRow) => round2((linesByOrder.get(o.order_id) ?? []).reduce((a, s) => a + Number(s.net), 0))

  const missing: CsvRow[] = []
  const dupOrders: CsvRow[] = []
  const feeOver: CsvRow[] = []
  const grossMis: CsvRow[] = []
  for (const o of captured) {
    const ls = linesByOrder.get(o.order_id) ?? []
    if (ls.length === 0) missing.push(o)
    else if (ls.length > 1) dupOrders.push(o)
    else if (Number(ls[0].gross) !== Number(o.charged_amount)) grossMis.push(o)
    else if (Number(ls[0].fee) !== feeFor(data, o.payment_method, Number(ls[0].gross))) feeOver.push(o)
  }
  const sLines = (os: CsvRow[]) => os.flatMap((o) => (linesByOrder.get(o.order_id) ?? []).map((s) => s.__line))
  const oLines = (os: CsvRow[]) => os.map((o) => o.__line)
  const add = (e: Omit<Evidence, "id" | "agent">) => ledger.add(P, { agent, ...e })
  const impact = (os: CsvRow[]) => round2(os.reduce((a, o) => a + (actualNet(o) - expectedNet(o)), 0))

  const l1 = add({ label: "Captured orders", value: captured.length, unit: "count", formula: "count(orders where status = captured)", check: { kind: "count", file: "orders.csv", lines: oLines(captured) } })
  const l2 = add({ label: "Expected gross (captured sales)", value: round2(captured.reduce((a, o) => a + Number(o.charged_amount), 0)), unit: "usd", formula: "sum(charged_amount) over captured orders", check: { kind: "sum", file: "orders.csv", lines: oLines(captured), column: "charged_amount" } })
  const l3 = add({ label: "Expected processor fees", value: round2(captured.reduce((a, o) => a + feeFor(data, o.payment_method, Number(o.charged_amount)), 0)), unit: "usd", formula: "sum(round(charged × pct + fixed, 2)) using fee_schedule.csv", check: { kind: "expectedFees", file: "orders.csv", lines: oLines(captured), amountColumn: "charged_amount" } })
  const l4 = add({ label: "Expected net payout", value: round2(l2.value - l3.value), unit: "usd", formula: `${"L2"} - ${"L3"}`, check: { kind: "derived", expr: `${l2.id} - ${l3.id}` } })
  const l5 = add({ label: "Settlement lines received", value: data.settlements.length, unit: "count", formula: "count(settlements.csv rows)", check: { kind: "count", file: "settlements.csv", lines: data.settlements.map((s) => s.__line) } })
  const l6 = add({ label: "Actual net payout", value: round2(data.settlements.reduce((a, s) => a + Number(s.net), 0)), unit: "usd", formula: "sum(net) over all settlement lines", check: { kind: "sum", file: "settlements.csv", lines: data.settlements.map((s) => s.__line), column: "net" } })
  const l7 = add({ label: "Payout variance (actual - expected)", value: round2(l6.value - l4.value), unit: "usd", formula: `${l6.id} - ${l4.id}`, check: { kind: "derived", expr: `${l6.id} - ${l4.id}` } })
  const l8 = add({ label: "Captured orders missing from settlement", value: missing.length, unit: "count", formula: "count(captured orders with 0 settlement lines)", check: { kind: "count", file: "orders.csv", lines: oLines(missing) } })
  const l9 = add({ label: "Net impact of missing settlements", value: impact(missing), unit: "usd", formula: "sum(actual net - expected net) over missing orders", check: { kind: "netDiff", orderLines: oLines(missing), settlementLines: sLines(missing) } })
  const l10 = add({ label: "Orders settled twice", value: dupOrders.length, unit: "count", formula: "count(captured orders with 2+ settlement lines)", check: { kind: "count", file: "orders.csv", lines: oLines(dupOrders) } })
  const l11 = add({ label: "Net impact of duplicate settlements (overpaid)", value: impact(dupOrders), unit: "usd", formula: "sum(actual net - expected net) over duplicated orders", check: { kind: "netDiff", orderLines: oLines(dupOrders), settlementLines: sLines(dupOrders) } })
  const l12 = add({ label: "Lines with fee above the schedule", value: feeOver.length, unit: "count", formula: "count(lines where fee != round(gross × pct + fixed, 2))", rules: ["fee_schedule.csv"], check: { kind: "count", file: "settlements.csv", lines: sLines(feeOver) } })
  const l13 = add({ label: "Net impact of fee overcharges", value: impact(feeOver), unit: "usd", formula: "sum(actual net - expected net) over overcharged orders", check: { kind: "netDiff", orderLines: oLines(feeOver), settlementLines: sLines(feeOver) } })
  const l14 = add({ label: "Lines settled for a different gross", value: grossMis.length, unit: "count", formula: "count(lines where gross != charged_amount)", check: { kind: "count", file: "settlements.csv", lines: sLines(grossMis) } })
  const l15 = add({ label: "Net impact of gross mismatches", value: impact(grossMis), unit: "usd", formula: "sum(actual net - expected net) over mismatched orders", check: { kind: "netDiff", orderLines: oLines(grossMis), settlementLines: sLines(grossMis) } })
  const explained = round2(l9.value + l11.value + l13.value + l15.value)
  const l16 = add({ label: "Unexplained variance", value: round2(l7.value - explained), unit: "usd", formula: `${l7.id} - (${l9.id} + ${l11.id} + ${l13.id} + ${l15.id})`, check: { kind: "derived", expr: `${l7.id} - (${l9.id} + ${l11.id} + ${l13.id} + ${l15.id})` } })
  l4.formula = `${l2.id} - ${l3.id}`

  const claims: Claim[] = [
    ...missing.map((o) => ({ kind: "missing" as const, orderId: o.order_id, settlementLines: [], netImpact: round2(actualNet(o) - expectedNet(o)), note: "captured but never paid out: ask the processor to settle it" })),
    ...dupOrders.map((o) => ({ kind: "duplicate" as const, orderId: o.order_id, settlementLines: (linesByOrder.get(o.order_id) ?? []).map((s) => s.line_id), netImpact: round2(actualNet(o) - expectedNet(o)), note: "paid out twice: expect a clawback, do not spend it" })),
    ...feeOver.map((o) => ({ kind: "fee_overcharge" as const, orderId: o.order_id, settlementLines: (linesByOrder.get(o.order_id) ?? []).map((s) => s.line_id), netImpact: round2(actualNet(o) - expectedNet(o)), note: "fee above the contracted schedule: request a fee refund" })),
    ...grossMis.map((o) => ({ kind: "gross_mismatch" as const, orderId: o.order_id, settlementLines: (linesByOrder.get(o.order_id) ?? []).map((s) => s.line_id), netImpact: round2(actualNet(o) - expectedNet(o)), note: "settled for less than captured: request an adjustment" })),
  ]
  return { figures: [l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15, l16], claims }
}
