# Submission: JigJoy Black Friday AI Hackathon, Agents in Finance

**Project name:** Black Friday War Room

**Tagline:** Five Mozaik agents close out a store's Black Friday. Four run at the same time, and an Auditor recomputes every number they report from the raw rows.

**Repository:** https://github.com/qinheyi/bf-war-room

**Live demo (sample report):** https://bf-war-room.vercel.app

## Description

The Monday after Black Friday, a small online store has four piles of work: orders that may be fraud and shouldn't ship, a queue of refund requests and chargebacks with deadlines, a processor payout that doesn't match sales, and an owner asking what the day really earned. Black Friday War Room gives each pile to its own Mozaik agent and runs all four at once on a synthetic dataset: 1,226 orders, 83 disputes and 1,151 settlement lines for a fictional store.

The Fraud Sentinel scores every order with written rules and finds a card-testing burst. The Disputes Desk decides refunds and chargebacks by policy and lists what's due this week. The Ledger Reconciler explains the payout variance to $0.00 (missing payouts, double settlements, fee overcharges, short settlements) and drafts processor claims. The Revenue Analyst reports sales, discounts, peak hour and payment mix.

Nothing is taken on trust. Every figure goes into an evidence ledger with the exact CSV line numbers it came from. A separate Auditor agent re-reads the raw files and recomputes each figure, then checks the agents against each other. A "number gate" also intercepts every model-written answer and flags any number it can't trace. The output is a one-page "do this today" report in HTML and Markdown in which every number links to its source. `npm start` runs it without an API key in deterministic offline mode, or with MiniMax or OpenAI when a key is set. The decisions are drafts: no money moves, and nothing in it is financial advice.

## How the agents run concurrently (Mozaik 6.0.0)

- One runtime (`defineRuntime` / `initializeRuntime`) with a shared `WarRoomState extends RuntimeState` that holds the data, the evidence ledger, results, the gate log and the trace.
- The Ops Lead (`createHuman`) sends one `sendMessage`. The four specialist agents (`createAgent`) each have a situation handler on that `message.sent` and call `runLoop`, which doesn't block. That starts four agent loops at the same instant (message_received → inference → function_call → inference → model_message). The trace in each report shows them overlapping.
- Each specialist loop has an `InterceptionHandler` (the number gate). At `function_call` it allows only that agent's read-only tool. At `model_message` it checks every number against the agent's evidence and rewrites any it can't trace before `model.answer` is published. In an early live MiniMax run it caught two numbers the model had copied from a non-evidence field.
- The Auditor agent reacts to each specialist's `model.answer` by starting its own verification loop right away, while the other specialists are still running. After four custom `audit.agent_verified` events it starts a cross-check loop that compares the agents with each other, then publishes `audit.completed`.
- Two observer participants: a Flight Recorder that timestamps every event (this builds the concurrency timeline) and a Report Desk that waits for `audit.completed`.
- One run has 9 agent loops with up to 5 at once. The result: 56 of 56 figures recomputed from raw rows and 6 of 6 cross-agent checks passing. 11 tests (`npm test`) include a full offline run that asserts the four specialist loops overlap.

**Data:** synthetic only (seeded generator in the repo; planted defects are used only by the tests). No real customers, accounts or money. Not financial advice.
