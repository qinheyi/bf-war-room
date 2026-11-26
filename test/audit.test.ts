import { test } from "node:test"
import assert from "node:assert/strict"
import { loadData } from "../src/data/load.ts"
import { EvidenceLedger } from "../src/evidence.ts"
import { runReconcile } from "../src/analytics/reconcile.ts"
import { runRevenue } from "../src/analytics/revenue.ts"
import { evalExpr, gateAnswer, verifyFigures } from "../src/audit.ts"

test("auditor recomputes every figure from the raw lines", () => {
  const d = loadData()
  const L = new EvidenceLedger()
  runReconcile(d, L)
  runRevenue(d, L)
  const v = verifyFigures(L.all(), L, d.dir)
  assert.equal(v.filter((x) => x.ok).length, v.length)
})

test("auditor catches a tampered value and a bad line reference", () => {
  const d = loadData()
  const L = new EvidenceLedger()
  runRevenue(d, L)
  const r7 = L.get("R7")!
  r7.value += 1 // an agent "rounds up" sales by a dollar
  const r3 = L.get("R3")!
  if (r3.check.kind === "count") r3.check.lines = [...r3.check.lines, 99999] // cites a line that does not exist
  const v = verifyFigures(L.all(), L, d.dir)
  const bad = v.filter((x) => !x.ok).map((x) => x.id)
  assert.ok(bad.includes("R7"))
  assert.ok(bad.includes("R3"))
  assert.ok(!bad.includes("R8"), "derived figures are rebuilt from recomputed inputs, so the honest R8 still passes")
})

test("number gate passes cited figures and rewrites invented ones", () => {
  const L = new EvidenceLedger()
  runRevenue(loadData(), L)
  const ok = gateAnswer(`Sales were $121,987.08 [R7] on 1,159 orders [R2], peak 20:00-20:59 UTC on 2026-11-27.`, L.all())
  assert.deepEqual(ok.unverified, [])
  const bad = gateAnswer(`Sales were $121,987.08 [R7], up 23% on last year, about $125,000 next year.`, L.all())
  assert.deepEqual(bad.unverified, ["23%", "$125,000"])
  assert.match(bad.text, /⟦unverified: 23%⟧/)
})

test("expression evaluator", () => {
  const vals: Record<string, number> = { A1: 10, B2: 4 }
  assert.equal(evalExpr("A1 - (B2 + 1) * 2", (id) => vals[id]), 0)
  assert.equal(evalExpr("A1 / B2 * 100", (id) => vals[id]), 250)
  assert.throws(() => evalExpr("A1 +", (id) => vals[id]))
})
