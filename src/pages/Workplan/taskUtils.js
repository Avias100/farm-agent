/**
 * Pure helpers for workplan reschedule logic.
 * Kept separate so they can be unit-tested without React.
 */

export const RECURRENCE_TYPES = ['Once', 'Daily', 'Weekly', 'Fortnightly', 'Monthly']

export const RECURRENCE_LABELS = {
  Once:        '—',
  Daily:       'Daily',
  Weekly:      'Weekly',
  Fortnightly: 'Every 2 weeks',
  Monthly:     'Monthly',
}

/**
 * Given a scheduled_date (YYYY-MM-DD string), return the next occurrence date.
 * Returns null for 'Once' (no recurrence).
 */
export function getNextDate(scheduledDate, recurrenceType, recurrenceInterval = 1) {
  if (!recurrenceType || recurrenceType === 'Once') return null

  // Use noon local time to avoid DST boundary issues
  const d = new Date(`${scheduledDate}T12:00:00`)
  const n = Number(recurrenceInterval) || 1

  switch (recurrenceType) {
    case 'Daily':       d.setDate(d.getDate() + n);        break
    case 'Weekly':      d.setDate(d.getDate() + 7 * n);    break
    case 'Fortnightly': d.setDate(d.getDate() + 14);       break
    case 'Monthly':     d.setMonth(d.getMonth() + n);      break
    default:            return null
  }

  return d.toISOString().slice(0, 10)
}

/**
 * Return 'overdue' | 'today' | 'this-week' | 'upcoming'
 * based on a scheduled_date string relative to today.
 */
export function getTaskGroup(scheduledDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const d = new Date(`${scheduledDate}T12:00:00`)
  const diffDays = Math.round((d - today) / 86_400_000)

  if (diffDays < 0)          return 'overdue'
  if (diffDays === 0)        return 'today'
  if (diffDays <= 7)         return 'this-week'
  return 'upcoming'
}

export const GROUP_META = {
  overdue:   { label: 'Overdue',        alert: true  },
  today:     { label: 'Today',          alert: false },
  'this-week': { label: 'This Week',    alert: false },
  upcoming:  { label: 'Upcoming',       alert: false },
}
