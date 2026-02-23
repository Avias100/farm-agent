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
