# Lumen & Loom (synthetic store) — Black Friday 2026-11-27 close-out

> **Not financial advice. All data is synthetic (fixed seed, fictional store "Lumen & Loom"); no real customers, accounts or money are involved. Refund, chargeback and claim decisions are drafts for a human to review; nothing here moves money.**

Run: minimax mode (model `MiniMax-M3.1-Flash`), @mozaik-ai/core 6.0.0, 19650 ms wall time, 11 agent loops, up to 6 running at once. Store day: 2026-11-27 (UTC). Report as of 2026-12-01.

Audit status: 76 of 76 figures recomputed by the Auditor from the raw CSV lines they cite; 11 of 11 cross-agent checks pass; 90 numbers in agent summaries went through the number gate and 0 were flagged as unverified.

## Do this today

- **Hold 31 [F5] shipments** that score 75 or more, and review all 39 [F3] flagged orders that were already captured ($8,558.80 [F4] at risk). Queue below.
- **Block device D-CT7Q2X**: a card-testing burst of 26 [F6] orders; the processor declined 18 [F7] of them.
- **Answer 3 [D14] chargebacks due within 7 days.** Fight 6 [D7] ($836.82 [D8]) with AVS/CVV/delivery proof; accept 14 [D9] ($2,394.11 [D10]).
- **Approve 62 [D2] refunds** ($7,085.39 [D3]) and decline 1 [D4] final-sale request ($67.72 [D5]).
- **File processor claims**: 12 [L8] captured orders never paid out (-$1,244.32 [L9]), 6 [L14] short settlements (-$58.34 [L15]), 8 [L12] fee overcharges (-$4.40 [L13]). Set aside the $394.99 [L11] paid twice on 4 [L10] orders for the clawback.
- **Work the payment exceptions** (new: Payment Investigator): retry 23 [P17] stuck payments worth $2,279.03 [P18] (14 [P5] 3-D Secure timeouts get a fresh payment link, 9 [P7] gateway errors get one idempotent retry); void 5 [P15] duplicate authorisations on already-paid orders ($408.85 [P16]); send 29 [P13] risk-engine blocks ($2,217.62 [P14]) to manual review; email the 10 [P9] insufficient-funds and 5 [P11] other declined customers instead of retrying.
- Payout variance is -$912.07 [L7] and the unexplained remainder is $0.00 [L16].

## Headline numbers

| Figure | Value | Evidence |
| --- | --- | --- |
| Captured sales (GMV) | $121,987.08 | [R7] |
| Orders captured | 1,159 | [R2] |
| Average order value | $105.25 | [R8] |
| Discounts given | $26,707.72 | [R6] |
| Peak hour sales (20:00-20:59 UTC) | $10,680.07 | [R10] |
| Expected dispute cost (approved refunds + accepted chargebacks + fees) | $9,779.50 | [D13] |
| Net sales after approved refunds and accepted chargebacks | $112,507.58 | [A5] |
| Sentinel recall on fraud chargebacks | 53.8% | [A3] |
| Fraud chargeback amount a hold would have protected | $1,980.31 | [A4] |
| Sales recoverable by retrying | $2,279.03 | [P18] |
| Duplicate authorisations on paid orders: amount | $408.85 | [P16] |

## Fraud Sentinel

```text
**Fraud Sentinel — Black Friday order scoring (synthetic data)**

- Scored 1,226 orders [F1]; 64 flagged at score >= 50 [F2], a 5.2% share [F8].
- Captured value at risk across flagged orders is $8,558.80 [F4] — funds already taken that may need review.
- 39 flagged orders are already captured and need review before shipping [F3]; 31 captured orders score >= 75 and should be held [F5].
- Card-testing activity is concentrated: 26 burst orders from the same device with 5+ attempts in 15 minutes [F6], and 18 card-testing attempts the processor declined [F7].
- Review queue (top 5): BF-000190, BF-000211, BF-000213, BF-000288, BF-000613. The first three hit AVS + CVV + card/IP geo + new-account + velocity; the last two hit AVS + CVV + card/IP geo + new-account + high value.
- Action for the ops lead: hold the 31 high-scoring captured orders [F5], then work the 39-order captured review queue [F3] ahead of shipping; decline/confirm the card-testing bursts [F6] against the 18 already-declined attempts [F7].

All figures are quoted exactly from the scoring output and are synthetic; this is operational analysis, not financial advice.
```

| ID | Figure | Value | Recipe | Source | Audit |
| --- | --- | --- | --- | --- | --- |
| F1 | Orders scored | 1,226 | count(all orders) | orders.csv L2, L3, L4, L5, L6, L7, … (+1220) [1,226 rows] | ✅ recomputed |
| F2 | Orders flagged (score >= 50) | 64 | count(orders with fraud score >= 50) (rules: FR-AVS-N, FR-AVS-U, FR-CVV-N, FR-GEO-CARD, FR-GEO-IP, FR-NEW, FR-HIGH, FR-VELOCITY) | orders.csv L15, L69, L78, L135, L138, L142, … (+58) [64 rows] | ✅ recomputed |
| F3 | Flagged orders already captured (need review before shipping) | 39 | count(flagged and status = captured) (rules: FR-AVS-N, FR-AVS-U, FR-CVV-N, FR-GEO-CARD, FR-GEO-IP, FR-NEW, FR-HIGH, FR-VELOCITY) | orders.csv L15, L135, L138, L142, L188, L191, … (+33) [39 rows] | ✅ recomputed |
| F4 | Captured value at risk (flagged, captured) | $8,558.80 | sum(charged_amount) over flagged captured orders (rules: FR-AVS-N, FR-AVS-U, FR-CVV-N, FR-GEO-CARD, FR-GEO-IP, FR-NEW, FR-HIGH, FR-VELOCITY) | orders.csv L15, L135, L138, L142, L188, L191, … (+33) [39 rows] | ✅ recomputed |
| F5 | Captured orders to hold (score >= 75) | 31 | count(captured orders with fraud score >= 75) (rules: FR-AVS-N, FR-AVS-U, FR-CVV-N, FR-GEO-CARD, FR-GEO-IP, FR-NEW, FR-HIGH, FR-VELOCITY) | orders.csv L15, L135, L138, L142, L188, L191, … (+25) [31 rows] | ✅ recomputed |
| F6 | Card-testing burst orders (same device, >= 5 in 15 min) | 26 | count(orders hit by FR-VELOCITY) (rules: FR-VELOCITY) | orders.csv L186, L187, L188, L189, L190, L191, … (+20) [26 rows] | ✅ recomputed |
| F7 | Card-testing attempts the processor declined | 18 | count(FR-VELOCITY orders with status = declined) (rules: FR-VELOCITY) | orders.csv L186, L187, L189, L190, L192, L194, … (+12) [18 rows] | ✅ recomputed |
| F8 | Share of orders flagged | 5.2% | F2 / F1 × 100 | computed: F2 / F1 * 100 | ✅ recomputed |

Review queue (top 10 captured orders by score; amounts are the cited rows' `charged_amount`):

| Order | Score | Rules hit | Charged | Source |
| --- | --- | --- | --- | --- |
| BF-000190 | 135 | FR-AVS-U FR-CVV-N FR-GEO-CARD FR-GEO-IP FR-NEW FR-VELOCITY | $3.24 | orders.csv L191 |
| BF-000211 | 135 | FR-AVS-U FR-CVV-N FR-GEO-CARD FR-GEO-IP FR-NEW FR-VELOCITY | $3.00 | orders.csv L212 |
| BF-000213 | 135 | FR-AVS-U FR-CVV-N FR-GEO-CARD FR-GEO-IP FR-NEW FR-VELOCITY | $1.75 | orders.csv L214 |
| BF-000288 | 125 | FR-AVS-N FR-CVV-N FR-GEO-CARD FR-GEO-IP FR-NEW FR-HIGH | $366.84 | orders.csv L289 |
| BF-000613 | 125 | FR-AVS-N FR-CVV-N FR-GEO-CARD FR-GEO-IP FR-NEW FR-HIGH | $308.96 | orders.csv L614 |
| BF-000479 | 125 | FR-AVS-N FR-CVV-N FR-GEO-CARD FR-GEO-IP FR-NEW FR-HIGH | $263.78 | orders.csv L480 |
| BF-000134 | 125 | FR-AVS-N FR-CVV-N FR-GEO-CARD FR-GEO-IP FR-NEW FR-HIGH | $254.57 | orders.csv L135 |
| BF-000405 | 115 | FR-AVS-N FR-CVV-N FR-GEO-CARD FR-GEO-IP FR-NEW | $212.96 | orders.csv L406 |
| BF-000649 | 115 | FR-AVS-N FR-CVV-N FR-GEO-CARD FR-GEO-IP FR-NEW | $194.71 | orders.csv L650 |
| BF-001002 | 115 | FR-AVS-N FR-CVV-N FR-GEO-CARD FR-GEO-IP FR-NEW | $139.22 | orders.csv L1003 |

## Disputes Desk

```text
**Disputes Desk — post–Black Friday report (synthetic data)**

- **Refunds:** Approve 62 of 63 requests [D2] [D1] for a total of $7,085.39 [D3]; decline 1 as final sale worth $67.72 [D4] [D5].
- **Chargebacks — fight:** Represent 6 cases [D7], with $836.82 [D8] in dispute amount at stake; file representment packets before the deadlines below.
- **Chargebacks — accept:** Accept 14 cases [D9] totaling $2,394.11 [D10] out of 20 received [D6].
- **Fees:** $15.00 per case [D11] applies to all 20 cases regardless of outcome, for $300.00 in fees [D12] — incurred whether we win or lose.
- **Budget line:** Expected total dispute cost is $9,779.50 [D13] (approved refunds + accepted chargebacks + fees) [D13].
- **Deadline:** 3 chargebacks are due within 7 days of 2026-12-01 [D14] — prioritize those representments first.
```

| ID | Figure | Value | Recipe | Source | Audit |
| --- | --- | --- | --- | --- | --- |
| D1 | Refund requests | 63 | count(disputes where type = refund) | disputes.csv L2, L3, L4, L5, L6, L7, … (+57) [63 rows] | ✅ recomputed |
| D2 | Refunds to approve | 62 | count(refunds decided approve) (rules: RF-QUALITY, RF-CHANGED) | disputes.csv L2, L3, L5, L6, L7, L8, … (+56) [62 rows] | ✅ recomputed |
| D3 | Refund amount to approve | $7,085.39 | sum(amount) over approved refunds (rules: RF-QUALITY, RF-CHANGED) | disputes.csv L2, L3, L5, L6, L7, L8, … (+56) [62 rows] | ✅ recomputed |
| D4 | Refunds to decline (final sale) | 1 | count(refunds decided decline) (rules: RF-FINAL) | disputes.csv L4 [1 rows] | ✅ recomputed |
| D5 | Refund amount declined | $67.72 | sum(amount) over declined refunds (rules: RF-FINAL) | disputes.csv L4 [1 rows] | ✅ recomputed |
| D6 | Chargebacks received | 20 | count(disputes where type = chargeback) | disputes.csv L65, L66, L67, L68, L69, L70, … (+14) [20 rows] | ✅ recomputed |
| D7 | Chargebacks to represent (fight) | 6 | count(chargebacks decided represent) (rules: CB-FRAUD-REP, CB-NR-REP) | disputes.csv L74, L75, L76, L77, L81, L82 [6 rows] | ✅ recomputed |
| D8 | Amount under representment | $836.82 | sum(amount) over represented chargebacks (rules: CB-FRAUD-REP, CB-NR-REP) | disputes.csv L74, L75, L76, L77, L81, L82 [6 rows] | ✅ recomputed |
| D9 | Chargebacks to accept | 14 | count(chargebacks decided accept) (rules: CB-FRAUD-ACC, CB-NR-ACC, CB-NAD) | disputes.csv L65, L66, L67, L68, L69, L70, … (+8) [14 rows] | ✅ recomputed |
| D10 | Amount of accepted chargebacks | $2,394.11 | sum(amount) over accepted chargebacks (rules: CB-FRAUD-ACC, CB-NR-ACC, CB-NAD) | disputes.csv L65, L66, L67, L68, L69, L70, … (+8) [14 rows] | ✅ recomputed |
| D11 | Chargeback fee per case | $15.00 | fee_schedule.csv chargeback_fee.fixed | fee_schedule.csv L4 column fixed | ✅ recomputed |
| D12 | Chargeback fees (all cases, win or lose) | $300.00 | D6 × D11 | computed: D6 * D11 | ✅ recomputed |
| D13 | Expected dispute cost (approved refunds + accepted chargebacks + fees) | $9,779.50 | D3 + D10 + D12 | computed: D3 + D10 + D12 | ✅ recomputed |
| D14 | Chargebacks due within 7 days of 2026-12-01 | 3 | count(chargebacks with respond_by - as_of <= 7 days) | disputes.csv L72, L75, L82 [3 rows] | ✅ recomputed |

Chargebacks due within 7 days (draft responses for a human to send):

| Case | Order | Reason | Amount | Respond by | Decision | Rule | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CS-0071 | BF-000247 | 10.4_fraud | $78.64 | 2026-12-07 | accept | CB-FRAUD-ACC | disputes.csv L72 |
| CS-0074 | BF-000056 | 10.4_fraud | $118.34 | 2026-12-07 | represent | CB-FRAUD-REP | disputes.csv L75 |
| CS-0081 | BF-000773 | 13.1_not_received | $104.86 | 2026-12-08 | represent | CB-NR-REP | disputes.csv L82 |

## Ledger Reconciler

```text
**Black Friday settlement reconciliation — synthetic data, operational analysis only**

- Expected net payout $118,194.21 [L4] vs. actual $117,282.14 [L6] — payout variance -$912.07 [L7].
- Root cause: 12 [L8] captured orders missing from settlement, net impact -$1,244.32 [L9]; this is the single largest driver of the shortfall.
- Offsets and other errors: 4 [L10] orders settled twice (overpaid) net +$394.99 [L11]; 8 [L12] lines charged fees above schedule net -$4.40 [L13]; 6 [L14] lines settled for a different gross net -$58.34 [L15].
- The four drivers sum exactly to the variance, leaving $0.00 [L16] unexplained — the ledger fully explains the gap.
- Volume context: 1,159 [L1] captured orders produced 1,151 [L5] settlement lines, consistent with the 12 [L8] missing lines.
- Expected gross $121,987.08 [L2] against expected processor fees $3,792.87 [L3].

Next actions for the desk: chase the 12 [L8] missing lines with the processor (biggest recovery), dispute the 8 [L12] overcharged fee lines, and reconcile the 4 [L10] duplicate settlements for clawback.
```

| ID | Figure | Value | Recipe | Source | Audit |
| --- | --- | --- | --- | --- | --- |
| L1 | Captured orders | 1,159 | count(orders where status = captured) | orders.csv L2, L3, L4, L5, L7, L8, … (+1153) [1,159 rows] | ✅ recomputed |
| L2 | Expected gross (captured sales) | $121,987.08 | sum(charged_amount) over captured orders | orders.csv L2, L3, L4, L5, L7, L8, … (+1153) [1,159 rows] | ✅ recomputed |
| L3 | Expected processor fees | $3,792.87 | sum(round(charged × pct + fixed, 2)) using fee_schedule.csv | orders.csv L2, L3, L4, L5, L7, L8, … (+1153) [1,159 rows] | ✅ recomputed |
| L4 | Expected net payout | $118,194.21 | L2 - L3 | computed: L2 - L3 | ✅ recomputed |
| L5 | Settlement lines received | 1,151 | count(settlements.csv rows) | settlements.csv L2, L3, L4, L5, L6, L7, … (+1145) [1,151 rows] | ✅ recomputed |
| L6 | Actual net payout | $117,282.14 | sum(net) over all settlement lines | settlements.csv L2, L3, L4, L5, L6, L7, … (+1145) [1,151 rows] | ✅ recomputed |
| L7 | Payout variance (actual - expected) | -$912.07 | L6 - L4 | computed: L6 - L4 | ✅ recomputed |
| L8 | Captured orders missing from settlement | 12 | count(captured orders with 0 settlement lines) | orders.csv L45, L145, L263, L364, L463, L565, … (+6) [12 rows] | ✅ recomputed |
| L9 | Net impact of missing settlements | -$1,244.32 | sum(actual net - expected net) over missing orders | settlements.csv (none) vs orders.csv L45, L145, L263, L364, L463, L565, L663, L767, L868, L969, L1073, L1176 | ✅ recomputed |
| L10 | Orders settled twice | 4 | count(captured orders with 2+ settlement lines) | orders.csv L137, L426, L700, L974 [4 rows] | ✅ recomputed |
| L11 | Net impact of duplicate settlements (overpaid) | $394.99 | sum(actual net - expected net) over duplicated orders | settlements.csv L131, L132, L392, L393, L653, L654, L914, L915 vs orders.csv L137, L426, L700, L974 | ✅ recomputed |
| L12 | Lines with fee above the schedule | 8 | count(lines where fee != round(gross × pct + fixed, 2)) (rules: fee_schedule.csv) | settlements.csv L78, L227, L374, L523, L671, L818, … (+2) [8 rows] | ✅ recomputed |
| L13 | Net impact of fee overcharges | -$4.40 | sum(actual net - expected net) over overcharged orders | settlements.csv L78, L227, L374, L523, L671, L818, L967, L1114 vs orders.csv L84, L254, L407, L563, L719, L873, L1029, L1188 | ✅ recomputed |
| L14 | Lines settled for a different gross | 6 | count(lines where gross != charged_amount) | settlements.csv L101, L311, L521, L730, L940, L1149 [6 rows] | ✅ recomputed |
| L15 | Net impact of gross mismatches | -$58.34 | sum(actual net - expected net) over mismatched orders | settlements.csv L101, L311, L521, L730, L940, L1149 vs orders.csv L107, L341, L561, L780, L1001, L1224 | ✅ recomputed |
| L16 | Unexplained variance | $0.00 | L7 - (L9 + L11 + L13 + L15) | computed: L7 - (L9 + L11 + L13 + L15) | ✅ recomputed |

Processor claims to file (drafts; each net impact = settled net minus expected net for that order):

| Type | Order | Settlement lines | Net impact | What to do |
| --- | --- | --- | --- | --- |
| missing | BF-000044 | (none) | -$52.16 | captured but never paid out: ask the processor to settle it |
| missing | BF-000144 | (none) | -$63.87 | captured but never paid out: ask the processor to settle it |
| missing | BF-000262 | (none) | -$141.66 | captured but never paid out: ask the processor to settle it |
| missing | BF-000363 | (none) | -$68.50 | captured but never paid out: ask the processor to settle it |
| missing | BF-000462 | (none) | -$138.45 | captured but never paid out: ask the processor to settle it |
| missing | BF-000564 | (none) | -$192.46 | captured but never paid out: ask the processor to settle it |
| missing | BF-000662 | (none) | -$105.50 | captured but never paid out: ask the processor to settle it |
| missing | BF-000766 | (none) | -$120.98 | captured but never paid out: ask the processor to settle it |
| missing | BF-000867 | (none) | -$108.36 | captured but never paid out: ask the processor to settle it |
| missing | BF-000968 | (none) | -$60.49 | captured but never paid out: ask the processor to settle it |
| missing | BF-001072 | (none) | -$69.50 | captured but never paid out: ask the processor to settle it |
| missing | BF-001175 | (none) | -$122.39 | captured but never paid out: ask the processor to settle it |
| duplicate | BF-000136 | ST-00130 ST-00131 | $94.88 | paid out twice: expect a clawback, do not spend it |
| duplicate | BF-000425 | ST-00391 ST-00392 | $161.87 | paid out twice: expect a clawback, do not spend it |
| duplicate | BF-000699 | ST-00652 ST-00653 | $83.49 | paid out twice: expect a clawback, do not spend it |
| duplicate | BF-000973 | ST-00913 ST-00914 | $54.75 | paid out twice: expect a clawback, do not spend it |
| fee_overcharge | BF-000083 | ST-00077 | -$0.55 | fee above the contracted schedule: request a fee refund |
| fee_overcharge | BF-000253 | ST-00226 | -$0.55 | fee above the contracted schedule: request a fee refund |
| fee_overcharge | BF-000406 | ST-00373 | -$0.55 | fee above the contracted schedule: request a fee refund |
| fee_overcharge | BF-000562 | ST-00522 | -$0.55 | fee above the contracted schedule: request a fee refund |
| fee_overcharge | BF-000718 | ST-00670 | -$0.55 | fee above the contracted schedule: request a fee refund |
| fee_overcharge | BF-000872 | ST-00817 | -$0.55 | fee above the contracted schedule: request a fee refund |
| fee_overcharge | BF-001028 | ST-00966 | -$0.55 | fee above the contracted schedule: request a fee refund |
| fee_overcharge | BF-001187 | ST-01113 | -$0.55 | fee above the contracted schedule: request a fee refund |
| gross_mismatch | BF-000106 | ST-00100 | -$9.71 | settled for less than captured: request an adjustment |
| gross_mismatch | BF-000340 | ST-00310 | -$9.71 | settled for less than captured: request an adjustment |
| gross_mismatch | BF-000560 | ST-00520 | -$9.71 | settled for less than captured: request an adjustment |
| gross_mismatch | BF-000779 | ST-00729 | -$9.75 | settled for less than captured: request an adjustment |
| gross_mismatch | BF-001000 | ST-00939 | -$9.75 | settled for less than captured: request an adjustment |
| gross_mismatch | BF-001223 | ST-01148 | -$9.71 | settled for less than captured: request an adjustment |

## Revenue Analyst

```text
**Revenue Analyst — Black Friday close (synthetic data)**

- Captured sales (GMV) came in at $121,987.08 [R7] from 1,159 captured orders [R2], for an average order value of $105.25 [R8].
- Discounts were $26,707.72 [R6] against a captured list value of $148,694.80 [R5] — an average discount rate of 18.0% [R9]. (List minus discounts reconciles exactly to GMV.)
- 1,226 orders were placed [R1] and 67 were declined by the processor [R3], a decline rate of 5.5% [R4] — placed minus declined reconciles to captured.
- Peak hour was 20:00–20:59 UTC at $10,680.07 [R10] from 99 orders [R11]; this single hour is a small slice of the 1,159 captured orders [R2], so the day was broadly spread rather than one-hour-driven.
- Wallet (Apple/Google Pay) contributed $23,143.64 [R12], a 19.0% share of sales [R13] — meaningful, with most volume still on other rails.
- One flag for the ops lead: the 67 processor declines [R3] are the only recovered-lost revenue in the data; at the $105.25 average order value [R8] they sit outside the captured GMV of $121,987.08 [R7], so capture-rate fixes are worth prioritising next cycle.

Operational analysis only — not financial advice.
```

| ID | Figure | Value | Recipe | Source | Audit |
| --- | --- | --- | --- | --- | --- |
| R1 | Orders placed | 1,226 | count(all orders) | orders.csv L2, L3, L4, L5, L6, L7, … (+1220) [1,226 rows] | ✅ recomputed |
| R2 | Orders captured | 1,159 | count(status = captured) | orders.csv L2, L3, L4, L5, L7, L8, … (+1153) [1,159 rows] | ✅ recomputed |
| R3 | Orders declined by the processor | 67 | count(status = declined) | orders.csv L6, L17, L69, L73, L78, L151, … (+61) [67 rows] | ✅ recomputed |
| R4 | Decline rate | 5.5% | R3 / R1 × 100 | computed: R3 / R1 * 100 | ✅ recomputed |
| R5 | List value of captured orders | $148,694.80 | sum(list_amount) over captured | orders.csv L2, L3, L4, L5, L7, L8, … (+1153) [1,159 rows] | ✅ recomputed |
| R6 | Discounts given | $26,707.72 | sum(discount_amount) over captured | orders.csv L2, L3, L4, L5, L7, L8, … (+1153) [1,159 rows] | ✅ recomputed |
| R7 | Captured sales (GMV) | $121,987.08 | sum(charged_amount) over captured | orders.csv L2, L3, L4, L5, L7, L8, … (+1153) [1,159 rows] | ✅ recomputed |
| R8 | Average order value | $105.25 | R7 / R2 | computed: R7 / R2 | ✅ recomputed |
| R9 | Average discount rate | 18.0% | R6 / R5 × 100 | computed: R6 / R5 * 100 | ✅ recomputed |
| R10 | Peak hour sales (20:00-20:59 UTC) | $10,680.07 | max over hours of sum(charged_amount) for captured orders in that hour | orders.csv L925, L926, L927, L928, L929, L930, … (+93) [99 rows] | ✅ recomputed |
| R11 | Orders in the peak hour (20:00-20:59 UTC) | 99 | count(captured orders in the peak hour) | orders.csv L925, L926, L927, L928, L929, L930, … (+93) [99 rows] | ✅ recomputed |
| R12 | Wallet (Apple/Google Pay) sales | $23,143.64 | sum(charged_amount) over captured wallet orders | orders.csv L2, L8, L14, L27, L34, L63, … (+213) [219 rows] | ✅ recomputed |
| R13 | Wallet share of sales | 19.0% | R12 / R7 × 100 | computed: R12 / R7 * 100 | ✅ recomputed |

## Payment Investigator

```text
**Payment Investigator — Black Friday exceptions (synthetic data)**

- **Scope:** 72 payment exceptions reviewed, 47 failed [P1][P2] and 25 pending/stuck [P3], totalling $6,580.90 [P4]; 0 exceptions left without a cause [P20], so every attempt has a classified cause.
- **Retry (safe to re-attempt):** 23 attempts [P17] — 14 3-D Secure timeouts worth $1,458.58 [P5][P6] and 9 gateway errors worth $820.45 [P7][P8] — recovering $2,279.03, or 34.6% of exception value [P18][P19]. These carry the highest-confidence win and should go out first.
- **Manual review (largest dollar block):** 29 risk-engine blocks worth $2,217.62 [P13][P14] — a bigger exposure than the retry bucket, but not auto-retryable, so desk capacity should be planned around these.
- **Refund (duplicate charges):** 5 duplicate authorisations on already-paid orders worth $408.85 [P15][P16] — issue refunds to stop double-capture; example orders BF-000012 and BF-000042 under rule PI-DUP.
- **Contact customer (do not retry):** 10 insufficient-funds declines worth $1,191.00 [P9][P10] and 5 other issuer declines worth $484.40 [P11][P12] — these need a customer touch, not another charge attempt.
- **Sample classifications to spot-check:** PA-0005, PA-0006, PA-0007, PA-0008 all risk blocks routed to manual review; PA-0001 is an issuer decline routed to contact customer.
```

| ID | Figure | Value | Recipe | Source | Audit |
| --- | --- | --- | --- | --- | --- |
| P1 | Payment exceptions reviewed | 72 | count(payment_exceptions.csv rows) | payment_exceptions.csv L2, L3, L4, L5, L6, L7, … (+66) [72 rows] | ✅ recomputed |
| P2 | Failed attempts | 47 | count(status = failed) | payment_exceptions.csv L2, L6, L7, L8, L9, L11, … (+41) [47 rows] | ✅ recomputed |
| P3 | Pending (stuck) attempts | 25 | count(status = pending) | payment_exceptions.csv L3, L4, L5, L10, L31, L32, … (+19) [25 rows] | ✅ recomputed |
| P4 | Amount in payment exceptions | $6,580.90 | sum(amount) over all exception rows | payment_exceptions.csv L2, L3, L4, L5, L6, L7, … (+66) [72 rows] | ✅ recomputed |
| P5 | 3-D Secure timeouts | 14 | count(rows classified 3ds_timeout by PI-3DS) (rules: PI-3DS) | payment_exceptions.csv L32, L34, L41, L43, L46, L50, … (+8) [14 rows] re-classified: 3ds_timeout | ✅ recomputed |
| P6 | 3-D Secure timeouts: amount | $1,458.58 | sum(amount) over P5 rows (rules: PI-3DS) | payment_exceptions.csv L32, L34, L41, L43, L46, L50, … (+8) [14 rows] re-classified: 3ds_timeout | ✅ recomputed |
| P7 | Gateway errors | 9 | count(rows classified gateway_error by PI-GW) (rules: PI-GW) | payment_exceptions.csv L3, L31, L36, L44, L49, L59, … (+3) [9 rows] re-classified: gateway_error | ✅ recomputed |
| P8 | Gateway errors: amount | $820.45 | sum(amount) over P7 rows (rules: PI-GW) | payment_exceptions.csv L3, L31, L36, L44, L49, L59, … (+3) [9 rows] re-classified: gateway_error | ✅ recomputed |
| P9 | Insufficient funds declines | 10 | count(rows classified insufficient_funds by PI-NSF) (rules: PI-NSF) | payment_exceptions.csv L29, L30, L37, L38, L45, L48, … (+4) [10 rows] re-classified: insufficient_funds | ✅ recomputed |
| P10 | Insufficient funds declines: amount | $1,191.00 | sum(amount) over P9 rows (rules: PI-NSF) | payment_exceptions.csv L29, L30, L37, L38, L45, L48, … (+4) [10 rows] re-classified: insufficient_funds | ✅ recomputed |
| P11 | Other issuer declines | 5 | count(rows classified issuer_decline by PI-ISSUER) (rules: PI-ISSUER) | payment_exceptions.csv L2, L39, L40, L56, L57 [5 rows] re-classified: issuer_decline | ✅ recomputed |
| P12 | Other issuer declines: amount | $484.40 | sum(amount) over P11 rows (rules: PI-ISSUER) | payment_exceptions.csv L2, L39, L40, L56, L57 [5 rows] re-classified: issuer_decline | ✅ recomputed |
| P13 | Risk-engine blocks | 29 | count(rows classified risk_block by PI-RISK) (rules: PI-RISK) | payment_exceptions.csv L6, L7, L8, L9, L11, L12, … (+23) [29 rows] re-classified: risk_block | ✅ recomputed |
| P14 | Risk-engine blocks: amount | $2,217.62 | sum(amount) over P13 rows (rules: PI-RISK) | payment_exceptions.csv L6, L7, L8, L9, L11, L12, … (+23) [29 rows] re-classified: risk_block | ✅ recomputed |
| P15 | Duplicate authorisations on paid orders | 5 | count(rows classified duplicate_charge by PI-DUP) (rules: PI-DUP) | payment_exceptions.csv L4, L5, L10, L35, L54 [5 rows] re-classified: duplicate_charge | ✅ recomputed |
| P16 | Duplicate authorisations on paid orders: amount | $408.85 | sum(amount) over P15 rows (rules: PI-DUP) | payment_exceptions.csv L4, L5, L10, L35, L54 [5 rows] re-classified: duplicate_charge | ✅ recomputed |
| P17 | Attempts to retry (3-D Secure timeouts + gateway errors) | 23 | P5 + P7 (rules: PI-3DS, PI-GW) | computed: P5 + P7 | ✅ recomputed |
| P18 | Sales recoverable by retrying | $2,279.03 | P6 + P8 (rules: PI-3DS, PI-GW) | computed: P6 + P8 | ✅ recomputed |
| P19 | Share of exception value recoverable by retrying | 34.6% | P18 / P4 × 100 | computed: P18 / P4 * 100 | ✅ recomputed |
| P20 | Exceptions left without a cause | 0 | P1 - (P5 + P7 + P9 + P11 + P13 + P15) | computed: P1 - (P5 + P7 + P9 + P11 + P13 + P15) | ✅ recomputed |

Every failed or pending payment attempt, its cause (derived from the raw signals; the CSV has no cause column) and the recommended action (drafts; nothing is retried or refunded automatically):

| Attempt | Order | Status | Signals | Cause | Rule | Action | Amount | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PA-0001 | BF-000005 | failed | code 05 · 3DS none · HTTP 200 · risk allow | issuer_decline | PI-ISSUER | do not retry; ask the customer for another payment method | $60.87 | payment_exceptions.csv L2 |
| PA-0002 | BF-000016 | pending | code - · 3DS none · HTTP 502 · risk allow | gateway_error | PI-GW | retry once with the same idempotency key | $54.64 | payment_exceptions.csv L3 |
| PA-0003 | BF-000012 | pending | code 00 · 3DS frictionless · HTTP 200 · risk allow | duplicate_charge | PI-DUP | void the duplicate authorisation (refund if it captures); the order was already paid | $91.56 | payment_exceptions.csv L4 |
| PA-0004 | BF-000042 | pending | code 00 · 3DS frictionless · HTTP 200 · risk allow | duplicate_charge | PI-DUP | void the duplicate authorisation (refund if it captures); the order was already paid | $91.18 | payment_exceptions.csv L5 |
| PA-0005 | BF-000068 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $320.30 | payment_exceptions.csv L6 |
| PA-0006 | BF-000072 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $270.83 | payment_exceptions.csv L7 |
| PA-0007 | BF-000077 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $352.98 | payment_exceptions.csv L8 |
| PA-0008 | BF-000150 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $170.96 | payment_exceptions.csv L9 |
| PA-0009 | BF-000157 | pending | code 00 · 3DS frictionless · HTTP 200 · risk allow | duplicate_charge | PI-DUP | void the duplicate authorisation (refund if it captures); the order was already paid | $77.29 | payment_exceptions.csv L10 |
| PA-0010 | BF-000185 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $3.20 | payment_exceptions.csv L11 |
| PA-0011 | BF-000186 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $2.90 | payment_exceptions.csv L12 |
| PA-0012 | BF-000188 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $2.26 | payment_exceptions.csv L13 |
| PA-0013 | BF-000189 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $4.32 | payment_exceptions.csv L14 |
| PA-0014 | BF-000191 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $3.77 | payment_exceptions.csv L15 |
| PA-0015 | BF-000193 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $1.95 | payment_exceptions.csv L16 |
| PA-0016 | BF-000194 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $1.23 | payment_exceptions.csv L17 |
| PA-0017 | BF-000195 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $4.02 | payment_exceptions.csv L18 |
| PA-0018 | BF-000197 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $3.13 | payment_exceptions.csv L19 |
| PA-0019 | BF-000199 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $4.10 | payment_exceptions.csv L20 |
| PA-0020 | BF-000200 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $4.70 | payment_exceptions.csv L21 |
| PA-0021 | BF-000201 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $3.94 | payment_exceptions.csv L22 |
| PA-0022 | BF-000203 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $3.37 | payment_exceptions.csv L23 |
| PA-0023 | BF-000206 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $1.31 | payment_exceptions.csv L24 |
| PA-0024 | BF-000207 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $3.82 | payment_exceptions.csv L25 |
| PA-0025 | BF-000208 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $4.23 | payment_exceptions.csv L26 |
| PA-0026 | BF-000209 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $3.32 | payment_exceptions.csv L27 |
| PA-0027 | BF-000212 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $3.58 | payment_exceptions.csv L28 |
| PA-0028 | BF-000218 | failed | code 51 · 3DS frictionless · HTTP 200 · risk allow | insufficient_funds | PI-NSF | do not retry; email the customer to update payment, cancel after 48h | $90.42 | payment_exceptions.csv L29 |
| PA-0029 | BF-000238 | failed | code 51 · 3DS frictionless · HTTP 200 · risk allow | insufficient_funds | PI-NSF | do not retry; email the customer to update payment, cancel after 48h | $92.17 | payment_exceptions.csv L30 |
| PA-0030 | BF-000297 | pending | code - · 3DS frictionless · HTTP 502 · risk allow | gateway_error | PI-GW | retry once with the same idempotency key | $123.20 | payment_exceptions.csv L31 |
| PA-0031 | BF-000335 | pending | code - · 3DS challenge_sent · HTTP 200 · risk allow | 3ds_timeout | PI-3DS | send the customer a fresh payment link to redo 3-D Secure | $106.92 | payment_exceptions.csv L32 |
| PA-0032 | BF-000350 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $136.64 | payment_exceptions.csv L33 |
| PA-0033 | BF-000351 | pending | code - · 3DS challenge_sent · HTTP 200 · risk allow | 3ds_timeout | PI-3DS | send the customer a fresh payment link to redo 3-D Secure | $107.80 | payment_exceptions.csv L34 |
| PA-0034 | BF-000365 | pending | code 00 · 3DS none · HTTP 200 · risk allow | duplicate_charge | PI-DUP | void the duplicate authorisation (refund if it captures); the order was already paid | $47.64 | payment_exceptions.csv L35 |
| PA-0035 | BF-000421 | pending | code - · 3DS frictionless · HTTP 502 · risk allow | gateway_error | PI-GW | retry once with the same idempotency key | $84.22 | payment_exceptions.csv L36 |
| PA-0036 | BF-000445 | failed | code 51 · 3DS frictionless · HTTP 200 · risk allow | insufficient_funds | PI-NSF | do not retry; email the customer to update payment, cancel after 48h | $122.48 | payment_exceptions.csv L37 |
| PA-0037 | BF-000471 | failed | code 51 · 3DS frictionless · HTTP 200 · risk allow | insufficient_funds | PI-NSF | do not retry; email the customer to update payment, cancel after 48h | $92.18 | payment_exceptions.csv L38 |
| PA-0038 | BF-000476 | failed | code 05 · 3DS frictionless · HTTP 200 · risk allow | issuer_decline | PI-ISSUER | do not retry; ask the customer for another payment method | $120.09 | payment_exceptions.csv L39 |
| PA-0039 | BF-000481 | failed | code 05 · 3DS frictionless · HTTP 200 · risk allow | issuer_decline | PI-ISSUER | do not retry; ask the customer for another payment method | $52.05 | payment_exceptions.csv L40 |
| PA-0040 | BF-000486 | pending | code - · 3DS challenge_sent · HTTP 200 · risk allow | 3ds_timeout | PI-3DS | send the customer a fresh payment link to redo 3-D Secure | $72.19 | payment_exceptions.csv L41 |
| PA-0041 | BF-000519 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $336.77 | payment_exceptions.csv L42 |
| PA-0042 | BF-000635 | pending | code - · 3DS challenge_sent · HTTP 200 · risk allow | 3ds_timeout | PI-3DS | send the customer a fresh payment link to redo 3-D Secure | $172.78 | payment_exceptions.csv L43 |
| PA-0043 | BF-000663 | pending | code - · 3DS frictionless · HTTP 504 · risk allow | gateway_error | PI-GW | retry once with the same idempotency key | $99.00 | payment_exceptions.csv L44 |
| PA-0044 | BF-000673 | failed | code 51 · 3DS frictionless · HTTP 200 · risk allow | insufficient_funds | PI-NSF | do not retry; email the customer to update payment, cancel after 48h | $60.07 | payment_exceptions.csv L45 |
| PA-0045 | BF-000680 | pending | code - · 3DS challenge_sent · HTTP 200 · risk allow | 3ds_timeout | PI-3DS | send the customer a fresh payment link to redo 3-D Secure | $56.68 | payment_exceptions.csv L46 |
| PA-0046 | BF-000690 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $122.14 | payment_exceptions.csv L47 |
| PA-0047 | BF-000702 | failed | code 51 · 3DS frictionless · HTTP 200 · risk allow | insufficient_funds | PI-NSF | do not retry; email the customer to update payment, cancel after 48h | $128.58 | payment_exceptions.csv L48 |
| PA-0048 | BF-000714 | pending | code - · 3DS frictionless · HTTP 504 · risk allow | gateway_error | PI-GW | retry once with the same idempotency key | $72.27 | payment_exceptions.csv L49 |
| PA-0049 | BF-000719 | pending | code - · 3DS challenge_sent · HTTP 200 · risk allow | 3ds_timeout | PI-3DS | send the customer a fresh payment link to redo 3-D Secure | $98.57 | payment_exceptions.csv L50 |
| PA-0050 | BF-000813 | pending | code - · 3DS challenge_sent · HTTP 200 · risk allow | 3ds_timeout | PI-3DS | send the customer a fresh payment link to redo 3-D Secure | $91.19 | payment_exceptions.csv L51 |
| PA-0051 | BF-000823 | failed | code 51 · 3DS frictionless · HTTP 200 · risk allow | insufficient_funds | PI-NSF | do not retry; email the customer to update payment, cancel after 48h | $190.79 | payment_exceptions.csv L52 |
| PA-0052 | BF-000836 | pending | code - · 3DS challenge_sent · HTTP 200 · risk allow | 3ds_timeout | PI-3DS | send the customer a fresh payment link to redo 3-D Secure | $88.95 | payment_exceptions.csv L53 |
| PA-0053 | BF-000850 | pending | code 00 · 3DS frictionless · HTTP 200 · risk allow | duplicate_charge | PI-DUP | void the duplicate authorisation (refund if it captures); the order was already paid | $101.18 | payment_exceptions.csv L54 |
| PA-0054 | BF-000862 | pending | code - · 3DS challenge_sent · HTTP 200 · risk allow | 3ds_timeout | PI-3DS | send the customer a fresh payment link to redo 3-D Secure | $73.51 | payment_exceptions.csv L55 |
| PA-0055 | BF-000897 | failed | code 05 · 3DS none · HTTP 200 · risk allow | issuer_decline | PI-ISSUER | do not retry; ask the customer for another payment method | $110.27 | payment_exceptions.csv L56 |
| PA-0056 | BF-000906 | failed | code 05 · 3DS none · HTTP 200 · risk allow | issuer_decline | PI-ISSUER | do not retry; ask the customer for another payment method | $141.12 | payment_exceptions.csv L57 |
| PA-0057 | BF-000920 | failed | code 51 · 3DS frictionless · HTTP 200 · risk allow | insufficient_funds | PI-NSF | do not retry; email the customer to update payment, cancel after 48h | $157.20 | payment_exceptions.csv L58 |
| PA-0058 | BF-000965 | pending | code - · 3DS frictionless · HTTP 504 · risk allow | gateway_error | PI-GW | retry once with the same idempotency key | $169.45 | payment_exceptions.csv L59 |
| PA-0059 | BF-000989 | failed | code - · 3DS frictionless · HTTP 504 · risk allow | gateway_error | PI-GW | retry once with the same idempotency key | $50.43 | payment_exceptions.csv L60 |
| PA-0060 | BF-000999 | pending | code - · 3DS challenge_sent · HTTP 200 · risk allow | 3ds_timeout | PI-3DS | send the customer a fresh payment link to redo 3-D Secure | $115.25 | payment_exceptions.csv L61 |
| PA-0061 | BF-001017 | pending | code - · 3DS challenge_sent · HTTP 200 · risk allow | 3ds_timeout | PI-3DS | send the customer a fresh payment link to redo 3-D Secure | $159.40 | payment_exceptions.csv L62 |
| PA-0062 | BF-001042 | pending | code - · 3DS challenge_sent · HTTP 200 · risk allow | 3ds_timeout | PI-3DS | send the customer a fresh payment link to redo 3-D Secure | $105.69 | payment_exceptions.csv L63 |
| PA-0063 | BF-001056 | pending | code - · 3DS challenge_sent · HTTP 200 · risk allow | 3ds_timeout | PI-3DS | send the customer a fresh payment link to redo 3-D Secure | $114.13 | payment_exceptions.csv L64 |
| PA-0064 | BF-001062 | failed | code - · 3DS none · HTTP 504 · risk allow | gateway_error | PI-GW | retry once with the same idempotency key | $69.89 | payment_exceptions.csv L65 |
| PA-0065 | BF-001069 | failed | code 51 · 3DS none · HTTP 200 · risk allow | insufficient_funds | PI-NSF | do not retry; email the customer to update payment, cancel after 48h | $132.84 | payment_exceptions.csv L66 |
| PA-0066 | BF-001093 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $83.28 | payment_exceptions.csv L67 |
| PA-0067 | BF-001098 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $71.11 | payment_exceptions.csv L68 |
| PA-0068 | BF-001123 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $75.98 | payment_exceptions.csv L69 |
| PA-0069 | BF-001126 | failed | code - · 3DS frictionless · HTTP 502 · risk allow | gateway_error | PI-GW | retry once with the same idempotency key | $97.35 | payment_exceptions.csv L70 |
| PA-0070 | BF-001155 | failed | code 51 · 3DS none · HTTP 200 · risk allow | insufficient_funds | PI-NSF | do not retry; email the customer to update payment, cancel after 48h | $124.27 | payment_exceptions.csv L71 |
| PA-0071 | BF-001169 | pending | code - · 3DS challenge_sent · HTTP 200 · risk allow | 3ds_timeout | PI-3DS | send the customer a fresh payment link to redo 3-D Secure | $95.52 | payment_exceptions.csv L72 |
| PA-0072 | BF-001216 | failed | code 59 · 3DS none · HTTP 200 · risk block | risk_block | PI-RISK | manual review by a person; never auto-retry a risk block | $217.48 | payment_exceptions.csv L73 |

## Auditor

```text
- **Cross-agent audit is clean:** ⟦unverified: 11⟧ of ⟦unverified: 11⟧ consistency checks pass (this line carries no evidence ID in the tool output).
- **Sentinel recall on fraud chargebacks is 53.8% [A3]** — only about half of fraud chargebacks were flagged, so a meaningful share reached settlement undetected.
- **A hold would have protected $1,980.31 [A4]** of fraud chargeback exposure; that is the recoverable dollar value attached to the missed cases, and the number to anchor any hold/hold-placement decision.
- **Net sales after approved refunds and accepted chargebacks: $⟦unverified: 11⟧2,507.58 [A5]** — the bottom-line figure to treat as the current net, with refunds and chargebacks already deducted.
- **Caution on combining these:** recall [A3], protected amount [A4], and net sales [A5] are three different measures and must not be summed or netted against each other.
```

| ID | Figure | Value | Recipe | Source | Audit |
| --- | --- | --- | --- | --- | --- |
| A1 | Fraud chargebacks (reason 10.4) | 13 | count(chargebacks with reason 10.4_fraud) | disputes.csv L65, L66, L67, L68, L69, L70, … (+7) [13 rows] | ✅ recomputed |
| A2 | Fraud chargebacks the Sentinel had flagged at checkout | 7 | count(10.4 chargebacks whose order scored >= 50) (rules: FR-*) | disputes.csv L65, L66, L69, L70, L71, L73, … (+1) [7 rows] | ✅ recomputed |
| A3 | Sentinel recall on fraud chargebacks | 53.8% | A2 / A1 × 100 | computed: A2 / A1 * 100 | ✅ recomputed |
| A4 | Fraud chargeback amount a hold would have protected | $1,980.31 | sum(amount) over A2 cases | disputes.csv L65, L66, L69, L70, L71, L73, … (+1) [7 rows] | ✅ recomputed |
| A5 | Net sales after approved refunds and accepted chargebacks | $112,507.58 | R7 - D3 - D10 | computed: R7 - D3 - D10 | ✅ recomputed |

Cross-agent consistency checks:

| Check | Result | Detail | Evidence |
| --- | --- | --- | --- |
| C1 Revenue Analyst and Ledger Reconciler agree on captured sales | ✅ pass | R7 $121,987.08 vs L2 $121,987.08 | [R7] [L2] |
| C2 Revenue Analyst and Ledger Reconciler agree on captured order count | ✅ pass | R2 1,159 vs L1 1,159 | [R2] [L1] |
| C3 Fraud Sentinel scored every order the Revenue Analyst counted | ✅ pass | F1 1,226 vs R1 1,226 | [F1] [R1] |
| C4 Payout variance is fully explained by the listed defects | ✅ pass | L16 unexplained = $0.00 | [L7] [L16] |
| C5 Card-testing declines are a subset of all declines | ✅ pass | F7 18 <= R3 67 | [F7] [R3] |
| C6 Every dispute points to a captured order and never exceeds the charge | ✅ pass | 0 disputes break this rule | [D1] [D6] |
| C7 Payment Investigator has exactly one exception for every order the Revenue Analyst counted as declined | ✅ pass | P1 - P15 = 67 vs R3 67 | [P1] [P15] [R3] |
| C8 No failed or pending payment shows up in the payout the Ledger Reconciler matched | ✅ pass | 0 of 67 non-duplicate exceptions have a settlement line | [P1] [L5] |
| C9 Every duplicate authorisation is on a captured, settled order and equals its charge (refund is safe) | ✅ pass | 5 of 5 duplicates match a captured order in L1 and a settlement line | [P15] [P16] [L1] |
| C10 No retry is recommended on an order the Fraud Sentinel flagged (score 50+) | ✅ pass | 0 of 23 retries are on flagged orders | [P17] [F2] |
| C11 Every payment exception got a cause and an action | ✅ pass | P20 unclassified = 0 | [P1] [P20] |

- Ledger Reconciler: 16 of 16 figures recomputed from raw rows match; 20 numbers in its summary checked, 0 unverified.
- Fraud Sentinel: 8 of 8 figures recomputed from raw rows match; 16 numbers in its summary checked, 0 unverified.
- Disputes Desk: 14 of 14 figures recomputed from raw rows match; 16 numbers in its summary checked, 0 unverified.
- Revenue Analyst: 13 of 13 figures recomputed from raw rows match; 17 numbers in its summary checked, 0 unverified.
- Payment Investigator: 20 of 20 figures recomputed from raw rows match; 21 numbers in its summary checked, 0 unverified.

## How the agents ran (concurrency trace)

Each row is one Mozaik agent loop (runLoop). Times are milliseconds since the Ops Lead's kickoff message. The 5 specialist loops overlapped in time (all 5 were running at once); the Auditor's verification loops start as soon as each specialist answers, while the others are still working.

```text
Fraud Sentinel                       █████████████                                          2–4969  ms
Disputes Desk                        ████████████████                                       2–6393  ms
Ledger Reconciler                    ████████████                                           3–4593  ms
Revenue Analyst                      ████████████████████                                   3–7668  ms
Payment Investigator                 ████████████████████                                   3–7825  ms
Auditor (verify Ledger Reconciler)               ███████████████                         4594–10505 ms
Auditor (verify Fraud Sentinel)                   █████████████                          4969–10244 ms
Auditor (verify Disputes Desk)                       ███████████████                     6393–12204 ms
Auditor (verify Revenue Analyst)                         ██████████████                  7668–13177 ms
Auditor (verify Payment Investigator)                     ██████████████████████████████  7825–19650 ms
Auditor (cross-check)                                        ██████████████████          9423–16359 ms
```

## Interception log (number gate)

| t (ms) | Agent | Breakpoint | Action | Detail |
| --- | --- | --- | --- | --- |
| 2176 | Disputes Desk | function_call | allowed | triage_disputes (read-only; no money can move) |
| 2256 | Fraud Sentinel | function_call | allowed | score_orders (read-only; no money can move) |
| 2260 | Ledger Reconciler | function_call | allowed | reconcile_settlements (read-only; no money can move) |
| 2615 | Revenue Analyst | function_call | allowed | sales_summary (read-only; no money can move) |
| 2745 | Payment Investigator | function_call | allowed | investigate_payments (read-only; no money can move) |
| 4593 | Ledger Reconciler | model_message | passed | 20 numbers checked, 0 unverified |
| 4969 | Fraud Sentinel | model_message | passed | 16 numbers checked, 0 unverified |
| 6013 | Auditor | function_call | allowed | verify_figures (read-only; no money can move) |
| 6116 | Auditor | function_call | allowed | verify_figures (read-only; no money can move) |
| 6393 | Disputes Desk | model_message | passed | 16 numbers checked, 0 unverified |
| 7347 | Auditor | function_call | allowed | verify_figures (read-only; no money can move) |
| 7668 | Revenue Analyst | model_message | passed | 17 numbers checked, 0 unverified |
| 7825 | Payment Investigator | model_message | passed | 21 numbers checked, 0 unverified |
| 8836 | Auditor | function_call | allowed | verify_figures (read-only; no money can move) |
| 9365 | Auditor | function_call | allowed | verify_figures (read-only; no money can move) |
| 10244 | Auditor | model_message | passed | 5 numbers checked, 0 unverified |
| 10505 | Auditor | model_message | passed | 12 numbers checked, 0 unverified |
| 10919 | Auditor | function_call | allowed | cross_check (read-only; no money can move) |
| 12204 | Auditor | model_message | passed | 4 numbers checked, 0 unverified |
| 13177 | Auditor | model_message | passed | 5 numbers checked, 0 unverified |
| 16359 | Auditor | model_message | rewrote answer | 5 numbers checked, 2 unverified: 11, 11 |
| 19650 | Auditor | model_message | passed | 6 numbers checked, 0 unverified |

Model usage: 22 live calls, 16506 input and 8187 output tokens, 0 deterministic fallbacks.

## Data and sources

- `data/orders.csv`, `data/disputes.csv`, `data/settlements.csv`, `data/fee_schedule.csv`, `data/payment_exceptions.csv`: synthetic, generated by `npm run generate-data` (seed 20261127). Line numbers count the header as line 1.
- `data/POLICY.md`: the fraud, refund, chargeback, fee and payment-exception (PI-*) rules the agents apply (rule IDs are cited above).
- `reports/evidence.json`: every figure with its full list of source lines and the recipe the Auditor re-ran.

> **Not financial advice. All data is synthetic (fixed seed, fictional store "Lumen & Loom"); no real customers, accounts or money are involved. Refund, chargeback and claim decisions are drafts for a human to review; nothing here moves money.**
