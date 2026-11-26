import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { generateDataset } from "../src/data/generate.ts"
import { loadData, DATA_DIR } from "../src/data/load.ts"
import { EvidenceLedger } from "../src/evidence.ts"
import { runFraud } from "../src/analytics/fraud.ts"
import { decide, runDisputes } from "../src/analytics/disputes.ts"
import { runReconcile } from "../src/analytics/reconcile.ts"
import { runRevenue } from "../src/analytics/revenue.ts"

const planted = JSON.parse(readFileSync(join(DATA_DIR, "planted_defects.json"), "utf8"))

test("committed CSVs are exactly what the seeded generator produces", () => {
  const ds = generateDataset()
  for (const [name, text] of Object.entries(ds.files)) assert.equal(readFileSync(join(DATA_DIR, name), "utf8"), text, name)
})

test("reconciler finds every planted settlement defect and explains the variance to the cent", () => {
  const d = loadData()
  const r = runReconcile(d, new EvidenceLedger())
  const ids = (k: string) => r.claims.filter((c) => c.kind === k).map((c) => c.orderId).sort()
  assert.deepEqual(ids("missing"), [...planted.settlement_missing].sort())
  assert.deepEqual(ids("duplicate"), [...planted.settlement_duplicated].sort())
  assert.deepEqual(ids("fee_overcharge"), [...planted.settlement_fee_overcharge].sort())
  assert.deepEqual(ids("gross_mismatch"), [...planted.settlement_gross_mismatch].sort())
  assert.equal(r.figures.find((f) => f.label === "Unexplained variance")!.value, 0)
})

test("fraud sentinel catches the whole card-testing burst", () => {
  const r = runFraud(loadData(), new EvidenceLedger())
  const vel = r.scored.filter((s) => s.rules.includes("FR-VELOCITY")).map((s) => s.row.order_id).sort()
  assert.deepEqual(vel, [...planted.card_testing_orders].sort())
  assert.deepEqual(r.velocityDevices, [planted.card_testing_device])
})

test("dispute policy rules", () => {
  const order = { order_id: "X", list_amount: "100.00", discount_amount: "40.00", avs: "Y", cvv: "M" } as any
  const dispute = (o: object) => ({ case_id: "c", order_id: "X", amount: "10.00", respond_by: "2026-12-05", tracking: "delivered", ...o }) as any
  assert.equal(decide(dispute({ type: "refund", reason: "changed_mind" }), order).rule, "RF-FINAL")
  assert.equal(decide(dispute({ type: "refund", reason: "damaged" }), order).decision, "approve")
  assert.equal(decide(dispute({ type: "chargeback", reason: "10.4_fraud" }), order).rule, "CB-FRAUD-REP")
  assert.equal(decide(dispute({ type: "chargeback", reason: "10.4_fraud", tracking: "none" }), order).rule, "CB-FRAUD-ACC")
  assert.equal(decide(dispute({ type: "chargeback", reason: "13.1_not_received", tracking: "in_transit" }), order).rule, "CB-NR-ACC")
  assert.equal(decide(dispute({ type: "chargeback", reason: "13.1_not_received" }), order).dueInDays, 4)
})

test("revenue identities hold: placed = captured + declined, list - discount = captured sales", () => {
  const L = new EvidenceLedger()
  runRevenue(loadData(), L)
  const v = (id: string) => L.get(id)!.value
  assert.equal(v("R1"), v("R2") + v("R3"))
  assert.equal(Math.round((v("R5") - v("R6")) * 100), Math.round(v("R7") * 100))
})

test("every evidence ID is unique across agents", () => {
  const L = new EvidenceLedger()
  const d = loadData()
  runFraud(d, L), runDisputes(d, L), runReconcile(d, L), runRevenue(d, L)
  const ids = L.all().map((e) => e.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(ids.length, 51)
})
