# Lumen & Loom (synthetic store) — Black Friday 2026-11-27 close-out

> **Not financial advice. All data is synthetic (fixed seed, fictional store "Lumen & Loom"); no real customers, accounts or money are involved. Refund, chargeback and claim decisions are drafts for a human to review; nothing here moves money.**

Run: minimax mode (model `MiniMax-M3.1-Flash`), @mozaik-ai/core 6.0.0, 40231 ms wall time, 9 agent loops, up to 5 running at once. Store day: 2026-11-27 (UTC). Report as of 2026-12-01.

Audit status: 56 of 56 figures recomputed by the Auditor from the raw CSV lines they cite; 6 of 6 cross-agent checks pass; 73 numbers in agent summaries went through the number gate and 0 were flagged as unverified.

## Do this today

- **Hold 31 [F5] shipments** that score 75 or more, and review all 39 [F3] flagged orders that were already captured ($8,558.80 [F4] at risk). Queue below.
- **Block device D-CT7Q2X**: a card-testing burst of 26 [F6] orders; the processor declined 18 [F7] of them.
- **Answer 3 [D14] chargebacks due within 7 days.** Fight 6 [D7] ($836.82 [D8]) with AVS/CVV/delivery proof; accept 14 [D9] ($2,394.11 [D10]).
- **Approve 62 [D2] refunds** ($7,085.39 [D3]) and decline 1 [D4] final-sale request ($67.72 [D5]).
- **File processor claims**: 12 [L8] captured orders never paid out (-$1,244.32 [L9]), 6 [L14] short settlements (-$58.34 [L15]), 8 [L12] fee overcharges (-$4.40 [L13]). Set aside the $394.99 [L11] paid twice on 4 [L10] orders for the clawback.
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

## Fraud Sentinel

```text
**Fraud Sentinel — Black Friday post-close report (synthetic data)**

- Scored every order in the dataset: 1,226 [F1]. Flagged at score >= 50: 64 [F2], which is 5.2% [F8] of orders scored.
- Captured value at risk on flagged orders: $8,558.80 [F4] — this is the money already taken that the review queue protects.
- Hold list: 31 captured orders scoring >= 75 [F5]. Of the flagged orders, 39 are already captured and need review before shipping [F3] — do not ship these until cleared.
- Card-testing signal: 26 burst orders from the same device in 15 minutes or more [F6], with 18 attempts the processor declined [F7]. Declined attempts plus bursts point to scripted testing, not genuine buyers.
- Review queue lead examples: BF-000190, BF-000211, BF-000213 (each hit AVS mismatch, CVV no-match, card geo, IP geo, new account, and velocity), and BF-000288, BF-000613 (AVS mismatch, CVV no-match, card geo, IP geo, new account, high-value).
- Recommended next steps: freeze the 31 [F5] holds for manual review, work the 39 captured-and-flagged orders [F3] before release, and block the devices behind the 26 burst orders [F6]. Operational analysis only — not financial advice.
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
**Disputes Desk — post-Black Friday report (synthetic data)**

- **Refunds:** approve 62 [D2] of 63 [D1] requests totaling $7,085.39 [D3]; decline 1 [D4] as final sale for $67.72 [D5].
- **Chargebacks received:** 20 [D6] — represent 6 [D7] ($836.82 under representment [D8]) and accept 14 [D9] totaling $2,394.11 [D10].
- **Fees:** $15.00 per case [D11], $300.00 total across all cases win or lose [D12].
- **Expected dispute cost:** $9,779.50 [D13] (approved refunds + accepted chargebacks + fees).
- **Deadline pressure:** 3 chargebacks [D14] due within 7 days of 2026-12-01 — file representment on those first.
- All figures above are quoted verbatim from the tool output; operational analysis only, not financial advice.
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
**Ledger Reconciler — Black Friday payout reconciliation (synthetic data)**

- Expected net payout was $118,194.21 [L4]; actual net payout was $117,282.14 [L6] — a payout variance of -$912.07 [L7].
- Missing settlements drive the bulk of the gap: 12 [L8] captured orders never settled, a net impact of -$1,244.32 [L9].
- Duplicate settlements partly offset that: 4 [L10] orders were settled twice, overpaying by $394.99 [L11].
- Fee and gross errors are minor but real: 8 [L12] lines billed above the fee schedule for -$4.40 [L13], and 6 [L14] lines settled for a different gross for -$58.34 [L15].
- The decomposition fully explains the variance (-$1,244.32 [L9] + $394.99 [L11] - $4.40 [L13] - $58.34 [L15] = -$912.07 [L7]); unexplained variance is $0.00 [L16].
- Volume context: 1,159 [L1] orders captured against 1,151 [L5] settlement lines received, from $121,987.08 [L2] gross less $3,792.87 [L3] in expected processor fees.

Next step for the ops lead: chase the 12 [L8] unsettled orders and recover the $394.99 [L11] duplicate overpayment — together that is the only lever big enough to close the -$912.07 [L7] gap.
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

- **Captured sales (GMV): $121,987.08 [R7]** from **1,159** orders captured **[R2]** out of **1,226** placed **[R1]**; **67** orders were declined by the processor **[R3]**, a **5.5%** decline rate **[R4]**.
- **Discounting was the main give-away: $26,707.72 [R6]** against a list value of captured orders of **$148,694.80 [R5]** — an average discount rate of **18.0% [R9]**. Average order value landed at **$105.25 [R8]**.
- **Peak hour was 20:00–20:59 UTC: $10,680.07 [R10]** on **99** orders **[R11]** — that's the window to staff up for queue and support coverage next year.
- **Payment mix:** wallet (Apple/Google Pay) carried **$23,143.64 [R12]**, a **19.0%** share of sales **[R13]** — roughly one in five dollars came through wallets.
- **Reconciliation check passed:** 1,226 placed **[R1]** − 67 declined **[R3]** = 1,159 captured **[R2]**; $26,707.72 discounts **[R6]** + $121,987.08 GMV **[R7]** = $148,694.80 list value **[R5]**. Wallet sales **[R12]** are consistent with the **19.0% [R13]** share.
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

## Auditor

```text
- All cross-agent consistency checks pass, so the four specialists agree and there are no discrepancies to escalate.
- Sentinel recall on fraud chargebacks is 53.8% [A3] — only a little over half of fraud chargebacks were caught, leaving meaningful unblocked exposure.
- A hold would have protected $1,980.31 [A4] in fraud chargeback amount; that is the concrete benchmark for what tighter pre-hold screening is worth.
- Net sales after approved refunds and accepted chargebacks stands at $112,507.58 [A5] — this is the bottom line to watch against targets.
- Operational priority: review holds against the $1,980.31 [A4] protected-amount benchmark and target the missed population behind the 53.8% [A3] recall figure, since every additional catch lands directly on the $112,507.58 [A5] net sales line.
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

- Ledger Reconciler: 16 of 16 figures recomputed from raw rows match; 24 numbers in its summary checked, 0 unverified.
- Disputes Desk: 14 of 14 figures recomputed from raw rows match; 15 numbers in its summary checked, 0 unverified.
- Revenue Analyst: 13 of 13 figures recomputed from raw rows match; 20 numbers in its summary checked, 0 unverified.
- Fraud Sentinel: 8 of 8 figures recomputed from raw rows match; 14 numbers in its summary checked, 0 unverified.

## How the agents ran (concurrency trace)

Each row is one Mozaik agent loop (runLoop). Times are milliseconds since the Ops Lead's kickoff message. The four specialist loops overlapped in time (all four were running at once); the Auditor's verification loops start as soon as each specialist answers, while the others are still working.

```text
Fraud Sentinel                       ██████                                                 2–4845  ms
Disputes Desk                        ██████                                                 2–4873  ms
Ledger Reconciler                    ██████                                                 2–5090  ms
Revenue Analyst                      ████████████                                           2–9714  ms
Auditor (verify Fraud Sentinel)            ████████████████████████████████████████████  4845–40230 ms
Auditor (verify Disputes Desk)             █████████                                     4873–12396 ms
Auditor (verify Ledger Reconciler)         ███████                                       5090–10551 ms
Auditor (verify Revenue Analyst)                 ███████████                             9715–18823 ms
Auditor (cross-check)                                                ████████           26081–32547 ms
```

## Interception log (number gate)

| t (ms) | Agent | Breakpoint | Action | Detail |
| --- | --- | --- | --- | --- |
| 1730 | Disputes Desk | function_call | allowed | triage_disputes (read-only; no money can move) |
| 1861 | Ledger Reconciler | function_call | allowed | reconcile_settlements (read-only; no money can move) |
| 1867 | Fraud Sentinel | function_call | allowed | score_orders (read-only; no money can move) |
| 2236 | Revenue Analyst | function_call | allowed | sales_summary (read-only; no money can move) |
| 4845 | Fraud Sentinel | model_message | passed | 14 numbers checked, 0 unverified |
| 4873 | Disputes Desk | model_message | passed | 15 numbers checked, 0 unverified |
| 5090 | Ledger Reconciler | model_message | passed | 24 numbers checked, 0 unverified |
| 6688 | Auditor | function_call | allowed | verify_figures (read-only; no money can move) |
| 7267 | Auditor | function_call | allowed | verify_figures (read-only; no money can move) |
| 9714 | Revenue Analyst | model_message | passed | 20 numbers checked, 0 unverified |
| 10551 | Auditor | model_message | passed | 6 numbers checked, 0 unverified |
| 12113 | Auditor | function_call | allowed | verify_figures (read-only; no money can move) |
| 12396 | Auditor | model_message | passed | 4 numbers checked, 0 unverified |
| 18823 | Auditor | model_message | passed | 5 numbers checked, 0 unverified |
| 26079 | Auditor | function_call | allowed | verify_figures (read-only; no money can move) |
| 27943 | Auditor | function_call | allowed | cross_check (read-only; no money can move) |
| 32547 | Auditor | model_message | passed | 6 numbers checked, 0 unverified |
| 40230 | Auditor | model_message | passed | 4 numbers checked, 0 unverified |

Model usage: 18 live calls, 12834 input and 5837 output tokens, 0 deterministic fallbacks.

## Data and sources

- `data/orders.csv`, `data/disputes.csv`, `data/settlements.csv`, `data/fee_schedule.csv`: synthetic, generated by `npm run generate-data` (seed 20261127). Line numbers count the header as line 1.
- `data/POLICY.md`: the fraud, refund, chargeback and fee rules the agents apply (rule IDs are cited above).
- `reports/evidence.json`: every figure with its full list of source lines and the recipe the Auditor re-ran.

> **Not financial advice. All data is synthetic (fixed seed, fictional store "Lumen & Loom"); no real customers, accounts or money are involved. Refund, chargeback and claim decisions are drafts for a human to review; nothing here moves money.**
