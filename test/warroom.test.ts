import { test } from "node:test"
import assert from "node:assert/strict"
import { runWarRoom, SPECIALISTS } from "../src/warroom.ts"
import { loopTimeline } from "../src/report.ts"

test("offline war room: specialists run concurrently on Mozaik and every figure is verified", async () => {
  const r = await runWarRoom({ provider: "offline", timeoutMs: 30000 })
  const tl = loopTimeline(r)
  assert.equal(tl.list.length, 9, "4 specialist loops + 4 verification loops + 1 cross-check loop")
  assert.ok(tl.specialistsOverlap, "all four specialist loops overlap in time")
  assert.ok(tl.maxConcurrent >= 4)
  for (const s of SPECIALISTS) assert.ok(r.state.answers.get(s)?.text.includes("["), `${s} answered with evidence IDs`)
  const verdicts = [...r.state.verdicts.values()].flat()
  assert.equal(verdicts.length, 56)
  assert.ok(verdicts.every((v) => v.ok))
  assert.ok(r.state.cross!.checks.every((c) => c.ok))
  assert.ok(r.state.gateLog.some((g) => g.stage === "model_message"))
})
