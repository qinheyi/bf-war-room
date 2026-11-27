# Submission: JigJoy Black Friday AI Hackathon, Agents in Finance

**Project name:** Black Friday War Room

**Tagline:** Six Mozaik agents close out a store's Black Friday. Five specialists run at the same time, and an Auditor recomputes every number they report from the raw rows.

**Repository:** https://github.com/qinheyi/bf-war-room

**Live demo (sample report):** https://bf-war-room.vercel.app (offline deterministic run of the current code; a live MiniMax run is at https://bf-war-room.vercel.app/sample-live/report.html)

## Description

The Monday after Black Friday, a small online store has five piles of work: orders that may be fraud and shouldn't ship, a queue of refund requests and chargebacks with deadlines, a processor payout that doesn't match sales, an owner asking what the day really earned, and dozens of payments that failed or are still stuck. Black Friday War Room gives each pile to its own Mozaik agent and runs all five at once on a synthetic dataset for a fictional store: 1,226 orders, 83 disputes, 1,151 settlement lines and 72 failed or pending payment attempts.

The Fraud Sentinel scores every order with written rules and finds a card-testing burst. The Disputes Desk decides refunds and chargebacks by policy and lists what's due this week. The Ledger Reconciler explains the payout variance to $0.00 (missing payouts, double settlements, fee overcharges, short settlements) and drafts processor claims. The Revenue Analyst reports sales, discounts, peak hour and payment mix. The Payment Investigator works out why each failed or stuck payment didn't capture (3-D Secure timeout, insufficient funds, risk block, gateway error, issuer decline, duplicate charge) from raw signals and recommends what to do: retry 23 of them worth $2,279.03, refund 5 duplicate authorisations, send 29 risk blocks to manual review, or contact the customer.

Nothing is taken on trust. Every figure goes into an evidence ledger with the exact CSV line numbers it came from. A separate Auditor agent re-reads the raw files and recomputes each figure. For payments it re-classifies every row with its own copy of the rules. It then checks the agents against each other: for example, there must be exactly one payment exception per declined order, no failed payment can appear in the payout, and no retry can be recommended on an order the Fraud Sentinel flagged. A "number gate" also intercepts every model-written answer and flags any number it can't trace. The output is a one-page "do this today" report in HTML and Markdown in which every number links to its source. `npm start` runs it without an API key in deterministic offline mode, or with MiniMax or OpenAI when a key is set. The decisions are drafts: no money moves, and nothing in it is financial advice.

## How the agents run concurrently (Mozaik 6.0.0)

- One runtime (`defineRuntime` / `initializeRuntime`) with a shared `WarRoomState extends RuntimeState` that holds the data, the evidence ledger, results, the gate log and the trace.
- The Ops Lead (`createHuman`) sends one `sendMessage`. The five specialist agents (`createAgent`) each have a situation handler on that `message.sent` and call `runLoop`, which doesn't block. That starts five agent loops at the same instant (message_received → inference → function_call → inference → model_message). The trace in each report shows them overlapping.
- Each specialist loop has an `InterceptionHandler` (the number gate). At `function_call` it allows only that agent's read-only tool. At `model_message` it checks every number against the agent's evidence and rewrites any it can't trace before `model.answer` is published.
- The Auditor agent reacts to each specialist's `model.answer` by starting its own verification loop right away, while the other specialists are still running. After five custom `audit.agent_verified` events it starts a cross-check loop that compares the agents with each other, then publishes `audit.completed`.
- Two observer participants: a Flight Recorder that timestamps every event (this builds the concurrency timeline) and a Report Desk that waits for `audit.completed`.
- One run has 11 agent loops with up to 6 at once. The result: 76 of 76 figures recomputed from raw rows and 11 of 11 cross-agent checks passing. 17 tests (`npm test`) include a full offline run that asserts all five specialist loops overlap.

## Built during the hackathon

The core framework and the first four specialists (Fraud Sentinel, Disputes Desk, Ledger Reconciler, Revenue Analyst, the Auditor with checks C1–C6, the evidence ledger, the number gate and 11 tests) were prepared before kickoff, on 2026-11-26 before 10:00 CET (commits 2deaf95, 5d6c17f, 3e38613). After kickoff, on 2026-11-27, I added:
- the Payment Investigator, a fifth concurrent agent, and its synthetic failed/pending payments dataset (commits 9fc06c1, e803166);
- the Auditor's independent re-classification of every payment row, and five new cross-agent checks C7–C11 against the Revenue Analyst, Ledger Reconciler and Fraud Sentinel (e803166);
- a number-gate fix found in the first five-agent live MiniMax run (e803166);
- 6 new tests (c7a8d1a), and docs and sample reports (the final commit).

The README has the full list.

**Data:** synthetic only (seeded generator in the repo; planted defects are used only by the tests). No real customers, accounts or money. Not financial advice.
