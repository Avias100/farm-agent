/**
 * Generate a RFC 4122 v4 UUID.
 * Uses crypto.randomUUID() when available (Chrome 92+, Safari 15.4+, Firefox 95+).
 * Falls back to a Math.random implementation for older Android WebViews.
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback — not cryptographically secure but sufficient for offline_id deduplication
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/**
 * Format seconds into HH:MM:SS string.
 */
export function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

/**
 * Format a date string or Date object for display in South African context.
 * Returns e.g. "Mon, 23 Feb 2026 · 08:45"
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '—'
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  return d.toLocaleString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Returns today's ISO date string at midnight local time.
 * Used for filtering activities to "today".
 */
export function todayStartISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/**
 * Format a number as South African Rand.
 * e.g. 824.75 → "R 824.75" | 1234.5 → "R 1,234.50"
 */
export function formatZAR(amount) {
  if (amount == null) return '—'
  return (
    'R\u00A0' +
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount))
  )
}

/**
 * Format a date string as "Mon, 23 Feb 2026" (no time).
 */
export function formatDate(dateInput) {
  if (!dateInput) return '—'
  const d = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00') : dateInput
  return d.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Returns today's date as a YYYY-MM-DD string (for <input type="date"> defaults).
 */
export function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Client-side net income calculation — mirrors the SQL GENERATED ALWAYS AS formula.
 * Used for the live preview in BatchForm before the record is saved to Supabase.
 *
 * @param {object} p
 * @param {number} p.qty
 * @param {number} p.price
 * @param {number} p.marketRate   default 0.05
 * @param {number} p.agentRate    default 0.085
 * @param {number} p.vatRate      default 0.15
 * @param {number} p.bankCharge   default 20
 * @returns {{ gross, marketComm, agentComm, vatOnComm, netIncome }}
 */
export function calcBatchFinancials({
  qty        = 0,
  price      = 0,
  marketRate = 0.05,
  agentRate  = 0.085,
  vatRate    = 0.15,
  bankCharge = 20,
}) {
  const gross      = qty * price
  const marketComm = gross * marketRate
  const agentComm  = gross * agentRate
  const vatOnComm  = (marketComm + agentComm) * vatRate
  const netIncome  =
    gross - marketComm * (1 + vatRate) - agentComm * (1 + vatRate) - bankCharge

  const r = (n) => Math.round(n * 100) / 100  // round to 2dp
  return {
    gross:      r(gross),
    marketComm: r(marketComm),
    agentComm:  r(agentComm),
    vatOnComm:  r(vatOnComm),
    netIncome:  r(netIncome),
  }
}
