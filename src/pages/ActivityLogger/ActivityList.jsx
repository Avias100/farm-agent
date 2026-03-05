import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '../../db/localDb'
import Badge from '../../components/ui/Badge'
import { formatDuration, todayStartISO } from '../../lib/utils'
import { supabase } from '../../lib/supabase'

/**
 * Live-updating list of activities logged today.
 * Uses dexie-react-hooks useLiveQuery — re-renders automatically whenever
 * IndexedDB changes (e.g. a new activity is started or completed).
 *
 * Props:
 *   sections — array from useFarmData (for section name lookup)
 *   people   — array from useFarmData (for person name lookup)
 */
export default function ActivityList({ sections, people }) {
  const todayISO = todayStartISO()

  const activities = useLiveQuery(
    () =>
      db.activities
        .where('created_at')
        .aboveOrEqual(todayISO)
        .reverse()
        .toArray(),
    [todayISO]
  )

  if (!activities) {
    return (
      <div className="text-center text-sm text-gray-400 py-6">
        Loading today&apos;s activities…
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-4xl mb-2">🌱</p>
        <p className="text-sm font-medium">No activities logged yet today</p>
        <p className="text-xs mt-1">Start a task above to get going</p>
      </div>
    )
  }

  // Helper lookups
  const sectionMap = Object.fromEntries(sections.map((s) => [s.id, s.name]))
  const personMap  = Object.fromEntries(people.map((p)  => [p.id, p.full_name]))

  return (
    <div className="space-y-2">
      {activities.map((act) => (
        <ActivityCard
          key={act.offline_id ?? act.localId}
          activity={act}
          sectionName={sectionMap[act.section_id] ?? '?'}
          personName={personMap[act.person_id]   ?? 'Unknown'}
        />
      ))}
    </div>
  )
}

function statusBadge(status, synced) {
  if (status === 'In Progress') return <Badge variant="blue"  dot>In Progress</Badge>
  if (status === 'Completed')   return <Badge variant="green"    >Completed</Badge>
  if (status === 'Cancelled')   return <Badge variant="red"      >Cancelled</Badge>
  if (status === 'Rescheduled') return <Badge variant="amber"    >Rescheduled</Badge>
  return <Badge variant="gray">Scheduled</Badge>
}

function ActivityCard({ activity, sectionName, personName }) {
  const { task_type, status, start_time, end_time, duration_minutes, notes, synced } = activity
  const [isDeleting, setIsDeleting] = useState(false)

  // Compute duration locally if end_time exists (server computes the DB column)
  const localDuration = end_time && start_time
    ? Math.floor((new Date(end_time) - new Date(start_time)) / 60000)
    : null

  const duration = duration_minutes ?? localDuration

  // Format start time as "08:45"
  const startDisplay = start_time
    ? new Date(start_time).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—'

  async function handleDelete() {
    if (!confirm('Delete this activity? This cannot be undone.')) return
    
    setIsDeleting(true)
    
    try {
      // Delete from IndexedDB using localId (the primary key)
      await db.activities.delete(activity.localId)
      
      // Delete from Supabase if it has been synced
      if (activity.id && navigator.onLine) {
        await supabase.from('activities').delete().eq('id', activity.id)
      }
    } catch (err) {
      console.error('[ActivityList] Delete error:', err)
      alert('Failed to delete activity')
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm relative">
      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 flex items-center justify-center text-sm"
        title="Delete activity"
      >
        {isDeleting ? '⏳' : '🗑️'}
      </button>

      {/* Top row: task type + status */}
      <div className="flex items-center justify-between gap-2 mb-1.5 pr-8">
        <span className="font-semibold text-sm text-gray-900">{task_type}</span>
        {statusBadge(status, synced)}
      </div>

      {/* Middle row: section · person · time */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
        <span>Section {sectionName}</span>
        <span className="text-gray-300">·</span>
        <span>{personName}</span>
        <span className="text-gray-300">·</span>
        <span>{startDisplay}</span>
        {duration !== null && (
          <>
            <span className="text-gray-300">·</span>
            <span>{formatDuration(duration * 60)}</span>
          </>
        )}
      </div>

      {/* Notes (if any) */}
      {notes && (
        <p className="mt-2 text-xs text-gray-500 italic border-t border-gray-50 pt-2 line-clamp-2">
          {notes}
        </p>
      )}

      {/* Offline pending indicator */}
      {synced === 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 font-medium">
          <span>⏳</span>
          <span>Pending sync</span>
        </div>
      )}
    </div>
  )
}
