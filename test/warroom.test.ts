import { test } from "node:test"
import assert from "node:assert/strict"
import { runWarRoom, SPECIALISTS } from "../src/warroom.ts"
import { loopTimeline } from "../src/report.ts"

test("offline war room: specialists run concurrently on Mozaik and every figure is verified", async () => {
  const r = await runWarRoom({ provider: "offline", timeoutMs: 30000 })
  const tl = loopTimeline(r)
  assert.equal(SPECIALISTS.length, 5)
  assert.equal(tl.list.length, 11, "5 specialist loops + 5 verification loops + 1 cross-check loop")
  assert.ok(tl.specialistsOverlap, "all five specialist loops (including the Payment Investigator) overlap in time")
  assert.ok(tl.maxConcurrent >= 5)
  for (const s of SPECIALISTS) assert.ok(r.state.answers.get(s)?.text.includes("["), `${s} answered with evidence IDs`)
  const verdicts = [...r.state.verdicts.values()].flat()
  assert.equal(verdicts.length, 76)
  assert.ok(verdicts.every((v) => v.ok))
  assert.equal(r.state.cross!.checks.length, 11)
  assert.ok(r.state.cross!.checks.every((c) => c.ok))
  assert.equal(r.state.verdicts.get("Payment Investigator")?.length, 20)
  for (const [agent, a] of r.state.answers) assert.deepEqual(a.gate.unverified, [], `${agent}: offline answers have no unverified numbers`)
  assert.ok(r.state.gateLog.some((g) => g.stage === "model_message"))
})
