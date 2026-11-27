// Payment Investigator tests (added during the hackathon, 2026-11-27).
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { loadData, DATA_DIR } from "../src/data/load.ts"
import { EvidenceLedger } from "../src/evidence.ts"
import { classifyAttempt, runPayments } from "../src/analytics/payments.ts"
import { runFraud } from "../src/analytics/fraud.ts"
import { runDisputes } from "../src/analytics/disputes.ts"
import { runReconcile } from "../src/analytics/reconcile.ts"
import { runRevenue } from "../src/analytics/revenue.ts"
import { runCrossChecks } from "../src/analytics/crosscheck.ts"
import { gateAnswer, verifyFigures } from "../src/audit.ts"

const planted = JSON.parse(readFileSync(join(DATA_DIR, "planted_defects.json"), "utf8"))

test("payment investigator recovers the planted cause of every failed or pending attempt", () => {
  const r = runPayments(loadData(), new EvidenceLedger())
  assert.equal(r.cases.length, Object.keys(planted.payment_exception_causes).length)
  for (const c of r.cases) assert.equal(c.cause, planted.payment_exception_causes[c.row.attempt_id], c.row.attempt_id)
  const causes = new Set(r.cases.map((c) => c.cause))
  for (const k of ["3ds_timeout", "insufficient_funds", "risk_block", "gateway_error", "duplicate_charge", "issuer_decline"]) assert.ok(causes.has(k as never), `dataset exercises ${k}`)
})

test("PI rules: precedence and actions", () => {
  const a = (o: object) => ({ status: "failed", response_code: "", three_ds: "none", gateway_http: "200", risk_decision: "allow", ...o }) as any
  assert.equal(classifyAttempt(a({ status: "pending", response_code: "00" }), "captured"), "duplicate_charge")
  assert.equal(classifyAttempt(a({ status: "pending", response_code: "00" }), "declined"), "unclassified", "an approval on an uncaptured order is not a duplicate")
  assert.equal(classifyAttempt(a({ risk_decision: "block", gateway_http: "504" }), "declined"), "risk_block", "a risk block is never retried, even with a gateway error")
  assert.equal(classifyAttempt(a({ status: "pending", three_ds: "challenge_sent", gateway_http: "502" }), "declined"), "gateway_error")
  assert.equal(classifyAttempt(a({ status: "pending", three_ds: "challenge_sent" }), "declined"), "3ds_timeout")
  assert.equal(classifyAttempt(a({ response_code: "51" }), "declined"), "insufficient_funds")
  assert.equal(classifyAttempt(a({ response_code: "05" }), "declined"), "issuer_decline")
  const r = runPayments(loadData(), new EvidenceLedger())
  for (const c of r.cases) {
    if (c.cause === "3ds_timeout" || c.cause === "gateway_error") assert.equal(c.action, "retry")
    if (c.cause === "duplicate_charge") assert.equal(c.action, "refund")
    if (c.cause === "risk_block") assert.equal(c.action, "manual_review")
  }
})

test("auditor independently re-classifies payment exceptions and recomputes all 20 P figures", () => {
  const d = loadData()
  const L = new EvidenceLedger()
  const r = runPayments(d, L)
  const v = verifyFigures(r.figures, L, d.dir)
  assert.equal(v.length, 20)
  assert.deepEqual(v.filter((x) => !x.ok), [])
  assert.equal(L.get("P20")!.value, 0)
  assert.equal(L.get("P17")!.value, L.get("P5")!.value + L.get("P7")!.value)
})

test("auditor catches a mislabelled payment (a risk block passed off as a retryable gateway error)", () => {
  const d = loadData()
  const L = new EvidenceLedger()
  runPayments(d, L)
  const risk = L.get("P13")!.check
  const gw = L.get("P7")!.check
  assert.ok(risk.kind === "cause" && gw.kind === "cause")
  const moved = risk.lines[0]
  risk.lines = risk.lines.slice(1) // the agent "forgets" one risk block...
  gw.lines = [...gw.lines, moved] // ...and files it under gateway errors to retry it
  L.get("P13")!.value -= 1
  L.get("P7")!.value += 1
  const v = verifyFigures(L.all(), L, d.dir)
  const bad = v.filter((x) => !x.ok).map((x) => x.id)
  assert.ok(bad.includes("P13") && bad.includes("P7"), `bad: ${bad.join(",")}`)
  assert.match(v.find((x) => x.id === "P7")!.note ?? "", /not gateway_error/)
})

test("payment cross-checks agree with the Revenue Analyst, Ledger Reconciler and Fraud Sentinel", () => {
  const d = loadData()
  const L = new EvidenceLedger()
  const fraud = runFraud(d, L)
  runDisputes(d, L), runReconcile(d, L), runRevenue(d, L)
  const pay = runPayments(d, L)
  const x = runCrossChecks(d, L, fraud, pay)
  assert.equal(x.checks.length, 11)
  assert.deepEqual(x.checks.filter((c) => !c.ok).map((c) => c.id), [])
  // If the Investigator recommended retrying an order the Sentinel flagged, C10 must fail.
  const flagged = new Set(fraud.scored.filter((s) => s.score >= 50).map((s) => s.row.order_id))
  const victim = pay.cases.find((c) => flagged.has(c.row.order_id))!
  const tampered = { ...pay, cases: pay.cases.map((c) => (c === victim ? { ...c, action: "retry" as const } : c)) }
  const y = runCrossChecks(d, L, fraud, tampered)
  assert.equal(y.checks.find((c) => c.id === "C10")!.ok, false)
})

test("number gate rewrites whole tokens only (regression from the live run)", () => {
  const ev = { id: "A5", agent: "Auditor", label: "Net sales", value: 112507.58, unit: "usd" as const, formula: "", check: { kind: "derived" as const, expr: "0" } }
  const g = gateAnswer("Net sales $112,507.58 [A5]; 11 of 11 checks pass; attempt PA-0011.", [ev])
  assert.deepEqual(g.unverified, ["11", "11"])
  assert.match(g.text, /\$112,507\.58 \[A5\]/, "a verified figure that contains the digits 11 is left intact")
  assert.match(g.text, /⟦unverified: 11⟧ of ⟦unverified: 11⟧/)
  assert.match(g.text, /PA-0011/)
})
