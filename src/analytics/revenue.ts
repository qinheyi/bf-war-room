// Revenue Analyst analytics: what Black Friday actually brought in.
import type { Data } from "../data/load.ts"
import { EvidenceLedger, type Evidence } from "../evidence.ts"
import { round1, round2, type CsvRow } from "../util.ts"

export type RevenueResult = { figures: Evidence[]; peakHour: number }

export function runRevenue(data: Data, ledger: EvidenceLedger, agent = "Revenue Analyst"): RevenueResult {
  const P = "R"
  const L = (xs: CsvRow[]) => xs.map((o) => o.__line)
  const sum = (xs: CsvRow[], c: string) => round2(xs.reduce((a, o) => a + Number(o[c]), 0))
  const all = data.orders
  const cap = all.filter((o) => o.status === "captured")
  const dec = all.filter((o) => o.status === "declined")
  const byHour = new Map<number, CsvRow[]>()
  for (const o of cap) {
    const h = Number(o.created_at.slice(11, 13))
    byHour.set(h, [...(byHour.get(h) ?? []), o])
  }
  let peakHour = 0
  for (const [h, rows] of byHour) if (sum(rows, "charged_amount") > sum(byHour.get(peakHour) ?? [], "charged_amount")) peakHour = h
  const peak = byHour.get(peakHour) ?? []
  const wallet = cap.filter((o) => o.payment_method === "wallet")
  const hh = String(peakHour).padStart(2, "0")
  const add = (e: Omit<Evidence, "id" | "agent">) => ledger.add(P, { agent, ...e })

  const r1 = add({ label: "Orders placed", value: all.length, unit: "count", formula: "count(all orders)", check: { kind: "count", file: "orders.csv", lines: L(all) } })
  const r2 = add({ label: "Orders captured", value: cap.length, unit: "count", formula: "count(status = captured)", check: { kind: "count", file: "orders.csv", lines: L(cap) } })
  const r3 = add({ label: "Orders declined by the processor", value: dec.length, unit: "count", formula: "count(status = declined)", check: { kind: "count", file: "orders.csv", lines: L(dec) } })
  const r4 = add({ label: "Decline rate", value: round1((r3.value / r1.value) * 100), unit: "pct", formula: `R3 / R1 × 100`, check: { kind: "derived", expr: `${r3.id} / ${r1.id} * 100` } })
  const r5 = add({ label: "List value of captured orders", value: sum(cap, "list_amount"), unit: "usd", formula: "sum(list_amount) over captured", check: { kind: "sum", file: "orders.csv", lines: L(cap), column: "list_amount" } })
  const r6 = add({ label: "Discounts given", value: sum(cap, "discount_amount"), unit: "usd", formula: "sum(discount_amount) over captured", check: { kind: "sum", file: "orders.csv", lines: L(cap), column: "discount_amount" } })
  const r7 = add({ label: "Captured sales (GMV)", value: sum(cap, "charged_amount"), unit: "usd", formula: "sum(charged_amount) over captured", check: { kind: "sum", file: "orders.csv", lines: L(cap), column: "charged_amount" } })
  const r8 = add({ label: "Average order value", value: round2(r7.value / r2.value), unit: "usd", formula: `R7 / R2`, check: { kind: "derived", expr: `${r7.id} / ${r2.id}` } })
  const r9 = add({ label: "Average discount rate", value: round1((r6.value / r5.value) * 100), unit: "pct", formula: `R6 / R5 × 100`, check: { kind: "derived", expr: `${r6.id} / ${r5.id} * 100` } })
  const r10 = add({ label: `Peak hour sales (${hh}:00-${hh}:59 UTC)`, value: sum(peak, "charged_amount"), unit: "usd", formula: "max over hours of sum(charged_amount) for captured orders in that hour", check: { kind: "sum", file: "orders.csv", lines: L(peak), column: "charged_amount" } })
  const r11 = add({ label: `Orders in the peak hour (${hh}:00-${hh}:59 UTC)`, value: peak.length, unit: "count", formula: "count(captured orders in the peak hour)", check: { kind: "count", file: "orders.csv", lines: L(peak) } })
  const r12 = add({ label: "Wallet (Apple/Google Pay) sales", value: sum(wallet, "charged_amount"), unit: "usd", formula: "sum(charged_amount) over captured wallet orders", check: { kind: "sum", file: "orders.csv", lines: L(wallet), column: "charged_amount" } })
  const r13 = add({ label: "Wallet share of sales", value: round1((r12.value / r7.value) * 100), unit: "pct", formula: `R12 / R7 × 100`, check: { kind: "derived", expr: `${r12.id} / ${r7.id} * 100` } })
  return { figures: [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13], peakHour }
}
