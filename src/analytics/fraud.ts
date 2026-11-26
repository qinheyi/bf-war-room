// Fraud Sentinel analytics: rule-based scoring from data/POLICY.md (no model guesses).
import type { Data } from "../data/load.ts"
import { EvidenceLedger, type Evidence } from "../evidence.ts"
import { round1, round2, type CsvRow } from "../util.ts"

export type Scored = { row: CsvRow; score: number; rules: string[] }

export function velocityOrders(orders: CsvRow[], windowMin = 15, threshold = 5): Set<string> {
  const byDevice = new Map<string, CsvRow[]>()
  for (const o of orders) byDevice.set(o.device_id, [...(byDevice.get(o.device_id) ?? []), o])
  const hit = new Set<string>()
  for (const rows of byDevice.values()) {
    if (rows.length < threshold) continue
    const t = rows.map((r) => Date.parse(r.created_at)).sort((a, b) => a - b)
    const sorted = [...rows].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    for (let i = 0; i < t.length; i++) {
      let j = i
      while (j + 1 < t.length && t[j + 1] - t[i] <= windowMin * 60_000) j++
      if (j - i + 1 >= threshold) for (let k = i; k <= j; k++) hit.add(sorted[k].order_id)
    }
  }
  return hit
}

export function scoreOrders(orders: CsvRow[]): Scored[] {
  const velocity = velocityOrders(orders)
  return orders.map((o) => {
    const rules: string[] = []
    let score = 0
    const add = (rule: string, pts: number) => {
      rules.push(rule)
      score += pts
    }
    if (o.avs === "N") add("FR-AVS-N", 30)
    if (o.avs === "U") add("FR-AVS-U", 10)
    if (o.cvv === "N") add("FR-CVV-N", 35)
    if (o.card_country !== o.ship_country) add("FR-GEO-CARD", 20)
    if (o.ip_country !== o.ship_country) add("FR-GEO-IP", 15)
    if (Number(o.account_age_days) < 2) add("FR-NEW", 15)
    if (Number(o.charged_amount) >= 250) add("FR-HIGH", 10)
    if (velocity.has(o.order_id)) add("FR-VELOCITY", 40)
    return { row: o, score, rules }
  })
}

export type FraudResult = { figures: Evidence[]; reviewQueue: Scored[]; velocityDevices: string[]; scored: Scored[] }

export function runFraud(data: Data, ledger: EvidenceLedger, agent = "Fraud Sentinel"): FraudResult {
  const P = "F"
  const scored = scoreOrders(data.orders)
  const lines = (xs: Scored[]) => xs.map((s) => s.row.__line)
  const flagged = scored.filter((s) => s.score >= 50)
  const flaggedCaptured = flagged.filter((s) => s.row.status === "captured")
  const hold = flaggedCaptured.filter((s) => s.score >= 75)
  const vel = scored.filter((s) => s.rules.includes("FR-VELOCITY"))
  const velDeclined = vel.filter((s) => s.row.status === "declined")
  const allRules = ["FR-AVS-N", "FR-AVS-U", "FR-CVV-N", "FR-GEO-CARD", "FR-GEO-IP", "FR-NEW", "FR-HIGH", "FR-VELOCITY"]

  const f1 = ledger.add(P, { agent, label: "Orders scored", value: scored.length, unit: "count", formula: "count(all orders)", check: { kind: "count", file: "orders.csv", lines: lines(scored) } })
  const f2 = ledger.add(P, { agent, label: "Orders flagged (score >= 50)", value: flagged.length, unit: "count", formula: "count(orders with fraud score >= 50)", rules: allRules, check: { kind: "count", file: "orders.csv", lines: lines(flagged) } })
  const f3 = ledger.add(P, { agent, label: "Flagged orders already captured (need review before shipping)", value: flaggedCaptured.length, unit: "count", formula: "count(flagged and status = captured)", rules: allRules, check: { kind: "count", file: "orders.csv", lines: lines(flaggedCaptured) } })
  const f4 = ledger.add(P, { agent, label: "Captured value at risk (flagged, captured)", value: round2(flaggedCaptured.reduce((a, s) => a + Number(s.row.charged_amount), 0)), unit: "usd", formula: "sum(charged_amount) over flagged captured orders", rules: allRules, check: { kind: "sum", file: "orders.csv", lines: lines(flaggedCaptured), column: "charged_amount" } })
  const f5 = ledger.add(P, { agent, label: "Captured orders to hold (score >= 75)", value: hold.length, unit: "count", formula: "count(captured orders with fraud score >= 75)", rules: allRules, check: { kind: "count", file: "orders.csv", lines: lines(hold) } })
  const f6 = ledger.add(P, { agent, label: "Card-testing burst orders (same device, >= 5 in 15 min)", value: vel.length, unit: "count", formula: "count(orders hit by FR-VELOCITY)", rules: ["FR-VELOCITY"], check: { kind: "count", file: "orders.csv", lines: lines(vel) } })
  const f7 = ledger.add(P, { agent, label: "Card-testing attempts the processor declined", value: velDeclined.length, unit: "count", formula: "count(FR-VELOCITY orders with status = declined)", rules: ["FR-VELOCITY"], check: { kind: "count", file: "orders.csv", lines: lines(velDeclined) } })
  const f8 = ledger.add(P, { agent, label: "Share of orders flagged", value: round1((f2.value / f1.value) * 100), unit: "pct", formula: `${f2.id} / ${f1.id} × 100`, check: { kind: "derived", expr: `${f2.id} / ${f1.id} * 100` } })

  const reviewQueue = [...flaggedCaptured].sort((a, b) => b.score - a.score || Number(b.row.charged_amount) - Number(a.row.charged_amount)).slice(0, 10)
  const velocityDevices = [...new Set(vel.map((s) => s.row.device_id))]
  return { figures: [f1, f2, f3, f4, f5, f6, f7, f8], reviewQueue, velocityDevices, scored }
}
