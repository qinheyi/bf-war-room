# Lumen & Loom: payments policy (synthetic)

The agents apply these rules. Every rule has an ID that the report cites.

## Fraud scoring (Fraud Sentinel)

Each order starts at 0 points.

| Rule | Signal | Points |
|---|---|---|
| FR-AVS-N | `avs = N` (address does not match) | +30 |
| FR-AVS-U | `avs = U` (address not checked) | +10 |
| FR-CVV-N | `cvv = N` (wrong security code) | +35 |
| FR-GEO-CARD | `card_country` differs from `ship_country` | +20 |
| FR-GEO-IP | `ip_country` differs from `ship_country` | +15 |
| FR-NEW | `account_age_days < 2` | +15 |
| FR-HIGH | `charged_amount >= 250.00` | +10 |
| FR-VELOCITY | the same `device_id` placed 5 or more orders within 15 minutes | +40 |

Score 50 or more means **review**. Score 75 or more means **hold the shipment**.

## Refund requests (Disputes Desk)

| Rule | Condition | Decision |
|---|---|---|
| RF-QUALITY | reason is `damaged`, `not_as_described`, `late_delivery` or `wrong_size` | approve the requested amount |
| RF-CHANGED | reason is `changed_mind` and the order discount is under 40% | approve the requested amount |
| RF-FINAL | reason is `changed_mind` and the order discount is 40% or more (final sale) | decline |

## Chargebacks (Disputes Desk)

| Rule | Condition | Decision |
|---|---|---|
| CB-FRAUD-REP | reason `10.4_fraud`, order `avs = Y` and `cvv = M`, tracking `delivered` | represent (fight it) with AVS, CVV and delivery proof |
| CB-FRAUD-ACC | reason `10.4_fraud`, any other case | accept |
| CB-NR-REP | reason `13.1_not_received`, tracking `delivered` | represent with the delivery proof |
| CB-NR-ACC | reason `13.1_not_received`, tracking not `delivered` | accept |
| CB-NAD | reason `13.3_not_as_described` | accept and send the item to quality review |

Each chargeback costs the fixed fee in `fee_schedule.csv` (row `chargeback_fee`), win or lose.

## Settlement (Ledger Reconciler)

The expected processor fee is `round(gross × pct + fixed, 2)` using the `fee_schedule.csv` row for the order's `payment_method`.
Every captured order in `orders.csv` should appear exactly once in `settlements.csv`, with `gross = charged_amount` and the expected fee.
