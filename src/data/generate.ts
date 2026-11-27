// Synthetic Black Friday dataset for a fictional store ("Lumen & Loom", online apparel).
// Everything here is generated from a fixed seed. No real customers, cards or accounts.
import { rng, round2, toCsv } from "../util.ts"

export const SEED = 20261127
export const DAY = "2026-11-27"

export type Dataset = {
  files: Record<string, string>
  planted: Record<string, unknown>
}

const COUNTRIES = ["US", "US", "US", "US", "US", "US", "CA", "GB", "DE", "FR"]
const FEES: Record<string, { pct: number; fixed: number }> = {
  card: { pct: 0.029, fixed: 0.3 },
  wallet: { pct: 0.025, fixed: 0.3 },
}

export const CHARGEBACK_FEE = 15

export function expectedFee(method: string, gross: number): number {
  const f = FEES[method]
  return round2(gross * f.pct + f.fixed)
}

function pad(n: number, w: number) {
  return String(n).padStart(w, "0")
}

export function generateDataset(seed = SEED): Dataset {
  const r = rng(seed)
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]
  // Hour weights: midnight doorbusters, a morning wave and an evening wave.
  const hourW = [9, 6, 3, 2, 1, 1, 1, 2, 3, 5, 6, 6, 5, 4, 4, 4, 5, 6, 7, 8, 9, 8, 6, 4]
  const hourTotal = hourW.reduce((a, b) => a + b, 0)
  const pickHour = () => {
    let x = r() * hourTotal
    for (let h = 0; h < 24; h++) {
      x -= hourW[h]
      if (x <= 0) return h
    }
    return 23
  }

  type Order = Record<string, string | number>
  const orders: Order[] = []
  const N = 1200
  const riskyIdx = new Set<number>()
  for (let i = 0; i < N; i++) {
    const h = pickHour()
    const m = Math.floor(r() * 60)
    const s = Math.floor(r() * 60)
    const risky = r() < 0.035
    if (risky) riskyIdx.add(i)
    const home = pick(COUNTRIES)
    const list = round2(Math.min(640, Math.max(14, Math.exp(4.2 + r() * 1.1 + (risky ? 0.9 : 0)))))
    const d = pick([0, 0, 0.2, 0.2, 0.3, 0.4])
    const discount = round2(list * d)
    const charged = round2(list - discount)
    const method = r() < 0.8 ? "card" : "wallet"
    const declined = r() < (risky ? 0.25 : 0.035)
    orders.push({
      order_id: `BF-${pad(i + 1, 6)}`,
      created_at: `${DAY}T${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}Z`,
      customer_id: risky ? `C-N${pad(Math.floor(r() * 9000) + 1000, 4)}` : `C-${pad(Math.floor(r() * 700) + 1, 4)}`,
      account_age_days: risky ? Math.floor(r() * 2) : Math.floor(r() * 1500) + 3,
      device_id: `D-${Math.floor(r() * 1e8).toString(36).toUpperCase()}`,
      card_country: method === "wallet" ? home : risky ? pick(["NG", "RO", "BR", "VN", "US"]) : home,
      ip_country: risky ? pick(["NL", "RU", "SG", "US", "BR"]) : home,
      ship_country: home,
      avs: risky ? pick(["N", "N", "U", "Y"]) : r() < 0.96 ? "Y" : "U",
      cvv: risky ? pick(["M", "N"]) : "M",
      payment_method: method,
      list_amount: list.toFixed(2),
      discount_amount: discount.toFixed(2),
      charged_amount: charged.toFixed(2),
      status: declined ? "declined" : "captured",
    })
  }
  orders.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
  orders.forEach((o, i) => (o.order_id = `BF-${pad(i + 1, 6)}`))

  // Planted card-testing burst: one device, tiny amounts, 03:12-03:21, mostly declined.
  const burstDevice = "D-CT7Q2X"
  const burst: Order[] = []
  for (let k = 0; k < 26; k++) {
    const amt = round2(1 + r() * 3.99)
    burst.push({
      order_id: "",
      created_at: `${DAY}T03:${pad(12 + Math.floor(k / 3), 2)}:${pad((k * 17) % 60, 2)}Z`,
      customer_id: `C-N${pad(8000 + k, 4)}`,
      account_age_days: 0,
      device_id: burstDevice,
      card_country: pick(["US", "BR", "VN", "IN"]),
      ip_country: "SG",
      ship_country: "US",
      avs: "U",
      cvv: r() < 0.6 ? "N" : "M",
      payment_method: "card",
      list_amount: amt.toFixed(2),
      discount_amount: "0.00",
      charged_amount: amt.toFixed(2),
      status: r() < 0.7 ? "declined" : "captured",
    })
  }
  const all = [...orders, ...burst].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
  all.forEach((o, i) => (o.order_id = `BF-${pad(i + 1, 6)}`))
  const burstIds = all.filter((o) => o.device_id === burstDevice).map((o) => String(o.order_id))

  // Disputes: refund requests and chargebacks opened after the event.
  const captured = all.filter((o) => o.status === "captured")
  const disputes: Order[] = []
  const used = new Set<string>()
  const riskyCaptured = captured.filter((o) => o.avs !== "Y" || o.cvv === "N" || Number(o.account_age_days) < 2).filter((o) => o.device_id !== burstDevice)
  let caseNo = 1
  const addCase = (o: Order, type: string, reason: string, tracking: string, partial = false) => {
    if (used.has(String(o.order_id))) return
    used.add(String(o.order_id))
    const openedDay = 29 + Math.floor(r() * 2) // Nov 29-30
    const amount = partial ? round2(Number(o.charged_amount) * 0.5) : Number(o.charged_amount)
    const respondDays = type === "chargeback" ? 7 + Math.floor(r() * 14) : 3
    const respond = new Date(Date.UTC(2026, 10, openedDay + respondDays))
    disputes.push({
      case_id: `CS-${pad(caseNo++, 4)}`,
      order_id: o.order_id,
      type,
      reason,
      amount: amount.toFixed(2),
      opened_at: `2026-11-${openedDay}`,
      respond_by: respond.toISOString().slice(0, 10),
      tracking,
    })
  }
  for (let k = 0; k < 64; k++) {
    const o = pick(captured)
    if (o.device_id === burstDevice) continue
    const reason = pick(["damaged", "not_as_described", "changed_mind", "changed_mind", "late_delivery", "wrong_size"])
    addCase(o, "refund", reason, pick(["delivered", "delivered", "in_transit"]), reason === "damaged" && r() < 0.5)
  }
  for (let k = 0; k < 12; k++) addCase(pick(riskyCaptured), "chargeback", "10.4_fraud", pick(["delivered", "none", "none"]))
  for (let k = 0; k < 4; k++) addCase(pick(captured.filter((o) => o.avs === "Y" && o.cvv === "M")), "chargeback", "10.4_fraud", "delivered")
  for (let k = 0; k < 5; k++) addCase(pick(captured), "chargeback", "13.1_not_received", pick(["delivered", "in_transit", "none"]))
  for (let k = 0; k < 3; k++) addCase(pick(captured), "chargeback", "13.3_not_as_described", "delivered")
  disputes.sort((a, b) => String(a.case_id).localeCompare(String(b.case_id)))

  // PSP settlement report: one capture line per captured order, batched every 4 hours, with planted defects.
  const settlements: Order[] = []
  const missing: string[] = []
  const duplicated: string[] = []
  const overFee: string[] = []
  const grossMismatch: string[] = []
  let lineNo = 1
  captured.forEach((o, idx) => {
    const hour = Number(String(o.created_at).slice(11, 13))
    const batch = `PO-1127-${pad(Math.floor(hour / 4), 2)}`
    const id = String(o.order_id)
    if (idx % 97 === 41) {
      missing.push(id)
      return
    }
    let gross = Number(o.charged_amount)
    if (idx % 211 === 100) {
      grossMismatch.push(id)
      gross = round2(gross - 10)
    }
    let fee = expectedFee(String(o.payment_method), gross)
    if (idx % 149 === 77) {
      overFee.push(id)
      fee = round2(fee + 0.55)
    }
    const line = {
      line_id: `ST-${pad(lineNo++, 5)}`,
      payout_batch: batch,
      order_id: id,
      payment_method: o.payment_method,
      gross: gross.toFixed(2),
      fee: fee.toFixed(2),
      net: round2(gross - fee).toFixed(2),
      settled_at: "2026-11-28",
    }
    settlements.push(line)
    if (idx % 263 === 130) {
      duplicated.push(id)
      settlements.push({ ...line, line_id: `ST-${pad(lineNo++, 5)}` })
    }
  })

  const feeSchedule = [
    ...Object.entries(FEES).map(([m, f]) => ({ payment_method: m, pct: f.pct, fixed: f.fixed.toFixed(2) })),
    { payment_method: "chargeback_fee", pct: 0, fixed: CHARGEBACK_FEE.toFixed(2) },
  ]

  const exceptions = generatePaymentExceptions(all, captured, burstDevice, seed)

  return {
    files: {
      "orders.csv": toCsv(
        ["order_id", "created_at", "customer_id", "account_age_days", "device_id", "card_country", "ip_country", "ship_country", "avs", "cvv", "payment_method", "list_amount", "discount_amount", "charged_amount", "status"],
        all,
      ),
      "disputes.csv": toCsv(["case_id", "order_id", "type", "reason", "amount", "opened_at", "respond_by", "tracking"], disputes),
      "settlements.csv": toCsv(["line_id", "payout_batch", "order_id", "payment_method", "gross", "fee", "net", "settled_at"], settlements),
      "fee_schedule.csv": toCsv(["payment_method", "pct", "fixed"], feeSchedule),
      "payment_exceptions.csv": toCsv(EXCEPTION_COLUMNS, exceptions.rows),
    },
    planted: {
      note: "Ground truth of deliberately planted defects. Used only by tests; agents never read this file.",
      card_testing_device: burstDevice,
      card_testing_orders: burstIds,
      settlement_missing: missing,
      settlement_duplicated: duplicated,
      settlement_fee_overcharge: overFee,
      settlement_gross_mismatch: grossMismatch,
      payment_exception_causes: exceptions.truth,
    },
  }
}

// ---------------------------------------------------------------------------------------------
// Payment exceptions (added during the hackathon, 2026-11-27): the processor's report of payment
// attempts that did not end in a clean capture. Uses its own RNG stream (seed + 1) so the four
// original CSVs stay byte-identical. The rows carry raw signals only (status, response code, 3DS
// state, gateway HTTP status, risk decision); the cause is never written into the CSV. The true
// cause per attempt goes to planted_defects.json, which only the tests read.
export const EXCEPTION_COLUMNS = ["attempt_id", "order_id", "attempted_at", "last_event_at", "payment_method", "amount", "status", "response_code", "three_ds", "gateway_http", "risk_decision"]

type Row = Record<string, string | number>

function generatePaymentExceptions(all: Row[], captured: Row[], burstDevice: string, seed: number): { rows: Row[]; truth: Record<string, string> } {
  const r = rng(seed + 1)
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]
  const plus = (iso: string, min: number) => new Date(Date.parse(iso) + min * 60_000).toISOString().replace(".000Z", "Z")
  const rows: Array<Row & { __cause: string }> = []
  const base = (o: Row, at: string) => ({ order_id: o.order_id, attempted_at: at, payment_method: o.payment_method, amount: o.charged_amount })
  for (const o of all) {
    if (o.status !== "declined") continue
    const at = String(o.created_at)
    // Orders with any risk signal were stopped by the processor's risk engine.
    const risky = o.device_id === burstDevice || o.avs !== "Y" || o.cvv === "N" || Number(o.account_age_days) < 2
    let cause = risky ? "risk_block" : pick(["3ds_timeout", "3ds_timeout", "3ds_timeout", "insufficient_funds", "insufficient_funds", "gateway_error", "gateway_error", "issuer_decline"])
    if (cause === "3ds_timeout" && o.payment_method === "wallet") cause = "gateway_error" // wallets have no 3DS challenge
    const sig: Row =
      cause === "risk_block"
        ? { status: "failed", response_code: "59", three_ds: "none", gateway_http: 200, risk_decision: "block", last_event_at: plus(at, 0) }
        : cause === "3ds_timeout"
          ? { status: "pending", response_code: "", three_ds: "challenge_sent", gateway_http: 200, risk_decision: "allow", last_event_at: plus(at, 1 + Math.floor(r() * 3)) }
          : cause === "gateway_error"
            ? { status: r() < 0.6 ? "pending" : "failed", response_code: "", three_ds: o.payment_method === "wallet" ? "none" : "frictionless", gateway_http: pick([502, 504, 504]), risk_decision: "allow", last_event_at: plus(at, Math.floor(r() * 2)) }
            : cause === "insufficient_funds"
              ? { status: "failed", response_code: "51", three_ds: o.payment_method === "wallet" ? "none" : "frictionless", gateway_http: 200, risk_decision: "allow", last_event_at: plus(at, 0) }
              : { status: "failed", response_code: "05", three_ds: o.payment_method === "wallet" ? "none" : "frictionless", gateway_http: 200, risk_decision: "allow", last_event_at: plus(at, 0) }
    rows.push({ attempt_id: "", ...base(o, at), ...sig, __cause: cause })
  }
  // Duplicate authorisations: a second, still-pending approval on an order that was already captured.
  const clean = captured.filter((o) => o.device_id !== burstDevice && o.avs === "Y" && o.cvv === "M")
  const dupOrders = new Set<Row>()
  while (dupOrders.size < 5) dupOrders.add(pick(clean))
  for (const o of dupOrders) {
    const at = plus(String(o.created_at), 1 + Math.floor(r() * 4))
    rows.push({ attempt_id: "", ...base(o, at), status: "pending", response_code: "00", three_ds: o.payment_method === "wallet" ? "none" : "frictionless", gateway_http: 200, risk_decision: "allow", last_event_at: at, __cause: "duplicate_charge" })
  }
  rows.sort((a, b) => String(a.attempted_at).localeCompare(String(b.attempted_at)) || String(a.order_id).localeCompare(String(b.order_id)))
  const truth: Record<string, string> = {}
  rows.forEach((row, i) => {
    row.attempt_id = `PA-${pad(i + 1, 4)}`
    truth[String(row.attempt_id)] = row.__cause
  })
  return { rows, truth }
}
