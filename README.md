# 🛒 Black Friday War Room

**Five Mozaik agents close out a store's Black Friday. Four specialists run at the same time; an Auditor recomputes every number they report from the raw CSV rows.**

Built for the JigJoy Black Friday AI Hackathon (Agents in Finance track) on `@mozaik-ai/core` 6.0.0.

> **Not financial advice.** All data is synthetic: a fixed seed and a fictional store, "Lumen & Loom". No real customers, accounts or money are involved. Refund, chargeback and claim decisions are drafts for a person to review. Nothing in this project moves money.

- Sample report (live MiniMax run): [`docs/sample-live/report.html`](docs/sample-live/report.html) · hosted at **https://bf-war-room.vercel.app**
- Sample report (offline, deterministic): [`docs/sample-offline/report.md`](docs/sample-offline/report.md)

## The problem

The Monday after Black Friday, a small online shop has four piles of work and nobody to do them:

1. **Fraud.** Which orders that already went through should not ship? Was there a card-testing attack?
2. **Disputes.** Refund requests and chargebacks are piling up. Which ones do we approve, which do we fight, and which are due this week?
3. **Settlement.** The payment processor paid out less than expected. Where did the money go, to the cent?
4. **Revenue.** What did the day actually bring in after discounts, refunds and chargebacks?

Each pile needs a different specialist, and the owner has to be able to trust the numbers. So every figure in the report points to the CSV lines it came from, and a separate agent checks each one before the report is written.

## Run it (about 1 minute)

Requires Node.js 20.11 or newer.

```bash
git clone https://github.com/qinheyi/bf-war-room.git
cd bf-war-room
npm install
npm start          # no API key? runs in deterministic offline mode
npm test           # 11 tests, including a full offline war-room run
```

Open `reports/report.html` in a browser (`reports/report.md` has the same content). The command exits with code 0 only if every figure was verified and every cross-agent check passed.

| Mode | How | What thinks |
|---|---|---|
| Offline (default with no key) | `npm start` or `npm run demo` | A deterministic policy model running inside Mozaik: it calls the agent's tool, then writes the summary from the tool output. Same Mozaik loops, events and interception. No network. |
| MiniMax | `MINIMAX_API_KEY=... npm start` (optional `MINIMAX_MODEL`, default `MiniMax-M3.1-Flash`; `MINIMAX_BASE_URL`, default `https://api.minimaxi.com/v1`) | MiniMax's OpenAI-compatible chat API through Mozaik's `OpenAIChatCompletions` endpoint. One run makes about 18 small calls. |
| OpenAI | `OPENAI_API_KEY=... npm start -- --provider openai` (optional `OPENAI_MODEL`, default `gpt-4.1-mini`) | Same, against OpenAI. |

In every mode the numbers come from deterministic tools, never from the model. If a live model call fails or breaks the protocol, that one step falls back to the offline policy and the report counts the fallback.

Other commands: `npm run generate-data` rebuilds `data/*.csv` from the seed (byte-identical), and `npm run typecheck` runs the TypeScript checks.

## Architecture: how the agents run at the same time

Everything runs in one Mozaik runtime (`defineRuntime` → `initializeRuntime`). Participants join it, and the runtime fans every event out to all of them. Nothing is called in a fixed order. Each participant reacts to events through its own situation handlers.

```mermaid
flowchart LR
    Ops["👤 Ops Lead<br/>(human participant)"] -->|"sendMessage: kickoff"| RT(("Mozaik runtime<br/>shared WarRoomState<br/>+ evidence ledger"))
    RT -->|message.sent| F["🕵️ Fraud Sentinel<br/>score_orders"]
    RT -->|message.sent| D["⚖️ Disputes Desk<br/>triage_disputes"]
    RT -->|message.sent| L["📒 Ledger Reconciler<br/>reconcile_settlements"]
    RT -->|message.sent| R["📈 Revenue Analyst<br/>sales_summary"]
    F & D & L & R -->|"model.answer<br/>(after the number gate)"| RT
    RT -->|"model.answer from each specialist"| A["🔎 Auditor<br/>verify_figures × 4<br/>cross_check × 1"]
    A -->|"audit.agent_verified / audit.completed"| RT
    RT -->|every event| FR["📼 Flight Recorder<br/>(observer)"]
    RT -->|audit.completed| RD["🧾 Report Desk<br/>(observer)"]
```

1. **Kickoff.** The Ops Lead (a `createHuman` participant) sends one message.
2. **Four specialist agents start at the same moment.** Each one (`createAgent`) has a situation handler that matches the Ops Lead's `message.sent` and calls `runLoop(...)`. `runLoop` does not block, so the four loops run concurrently. Each loop is a full Mozaik state machine: `message_received → inference → function_call → inference → model_message`.
3. **The number gate (interception).** Every specialist loop gets an `InterceptionHandler`. At the `function_call` breakpoint it logs the tool and allows only that agent's read-only tool. At the `model_message` breakpoint it pulls every number out of the agent's prose and checks it against that agent's evidence. Any number it can't trace is rewritten as `⟦unverified: …⟧` before the answer is published.
4. **The Auditor checks each agent as soon as it answers.** Its handler matches `model.answer` from a specialist and starts a new verification loop right away, while the other specialists are still working. Its `verify_figures` tool re-reads the raw CSV text and re-runs each figure's recipe on the exact cited lines.
5. **Cross-check.** When all four are verified (the custom `audit.agent_verified` events), the Auditor starts one more loop. `cross_check` compares the agents with each other: Revenue vs Ledger on captured sales, Fraud vs Disputes on how many fraud chargebacks the rules would have caught, and whether the payout variance is fully explained. Then it publishes `audit.completed`.
6. **Observers.** The Flight Recorder logs every event with a timestamp. That log becomes the concurrency timeline in the report. The Report Desk waits for `audit.completed`.

**Shared state.** `WarRoomState extends RuntimeState` holds the dataset, the evidence ledger, each agent's results, the gate log and the trace. The agents never pass numbers to each other in text. They write figures to the ledger, and the Auditor reads the ledger and the raw files.

A typical offline trace (from `npm start`, times in ms):

```text
Fraud Sentinel                       ████████████████████                                   2–559   ms
Disputes Desk                        ████████████████████                                   2–561   ms
Ledger Reconciler                    █████████████████████                                  2–597   ms
Revenue Analyst                      ███████████████████████                                2–648   ms
Auditor (verify Fraud Sentinel)                          ██████████████████████████       560–1311  ms
Auditor (verify Disputes Desk)                           ██████████████████████████       561–1313  ms
Auditor (verify Ledger Reconciler)                        ███████████████████████████     597–1356  ms
Auditor (verify Revenue Analyst)                            ██████████████████████████    648–1406  ms
Auditor (cross-check)                                                   ███████████████   994–1426  ms
```

That is nine agent loops, with up to five running at once. In the live MiniMax run the loops take 2–6 seconds each and overlap the same way (see `docs/sample-live/trace.json`).

## Every number has a source

- **Evidence ledger** (`src/evidence.ts`). Every figure is registered with an ID (`F4`, `L7`, …), a plain-English recipe, the policy rules it depends on, and a recipe the Auditor can re-run. A recipe is one of: `count`/`sum` over exact CSV line numbers, `expectedFees` from `fee_schedule.csv`, `netDiff` between settlement and order lines, a `lookup` of one cell, or `derived` arithmetic over other evidence IDs.
- **Independent recompute** (`src/audit.ts`). This is separate code from the analytics. It reads the raw file text, fetches each cited line, applies the recipe, and compares the result to the reported value to the cent. Derived figures are rebuilt from recomputed inputs, never from reported values. A cited line that doesn't exist fails the check.
- **Number gate.** Numbers in model-written prose must match a figure the agent registered. Dates, clock times, IDs and rule codes are ignored. Small counting words (0–10) are allowed.
- **Policy as data.** `data/POLICY.md` defines the fraud scoring rules, refund and chargeback rules (with rule IDs the report cites) and the fee formula.
- **Rendering.** The report shows each figure next to its evidence ID, recipe, source lines and audit result. `reports/evidence.json` lists every source line.

## Data

All files are in `data/`. They are synthetic and generated by `scripts/generate-data.ts` (seed `20261127`). Line numbers count the header as line 1.

| File | Rows | What it is |
|---|---|---|
| `orders.csv` | 1,226 | Black Friday orders: amounts, discounts, AVS/CVV results, countries, device, captured or declined |
| `disputes.csv` | 83 | Refund requests and chargebacks (Visa-style reason codes 10.4, 13.1, 13.3), deadlines, tracking status |
| `settlements.csv` | 1,151 | The processor's payout report, one line per captured order (with planted defects) |
| `fee_schedule.csv` | 3 | Contract fees: card 2.9% + $0.30, wallet 2.5% + $0.30, chargeback $15 |
| `POLICY.md` | n/a | The rules the agents apply |
| `planted_defects.json` | n/a | Ground truth for the planted problems. **Only the tests read it**; the agents never do. |

Planted problems include a 26-order card-testing burst from one device, 12 captured orders missing from the payout, 4 orders paid out twice, 8 fee overcharges and 6 short settlements. The tests check that the agents find all of them and that the payout variance is explained to $0.00.

## Project layout

```text
src/warroom.ts           Mozaik runtime, participants, situation handlers, number-gate interception
src/models.ts            offline policy endpoint, MiniMax/OpenAI endpoints with fallback
src/analytics/*.ts       deterministic tools: fraud, disputes, reconcile, revenue, cross-checks
src/audit.ts             independent recompute, expression evaluator, number gate
src/evidence.ts          evidence ledger
src/report.ts, cli.ts    Markdown + HTML report, one-command entry point
test/*.test.ts           node:test suite (data, policy, reconciliation, audit tampering, full run)
```

## Limits

- The fraud rules are a simple, transparent points system, not a trained model. In this dataset they would have flagged 53.8% of the later fraud chargebacks (figure `A3` in the report).
- The decisions are drafts. Nothing here calls a payment API.
- Mozaik Cloud telemetry is off unless you set `MOZAIK_API_KEY`.

## License

MIT. See [LICENSE](LICENSE).
