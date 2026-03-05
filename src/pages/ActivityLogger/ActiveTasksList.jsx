import { useState } from 'react'
import { useTimer } from '../../hooks/useTimer'
import Button from '../../components/ui/Button'
import db from '../../db/localDb'
import { supabase } from '../../lib/supabase'

/**
 * Shows all currently running tasks with timers.
 * Each worker can complete their own task independently.
 */
export default function ActiveTasksList({ activeActivities, sections, people, onActivityEnd, onSyncNeeded }) {
  if (activeActivities.length === 0) return null

  const sectionMap = Object.fromEntries(sections.map(s => [s.id, s.name]))
  const personMap = Object.fromEntries(people.map(p => [p.id, p.full_name]))

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
        Active Tasks ({activeActivities.length})
      </h3>
      {activeActivities.map(activity => (
        <ActiveTaskCard
          key={activity.localId ?? activity.offline_id}
          activity={activity}
          sectionName={sectionMap[activity.section_id] ?? '?'}
          personName={personMap[activity.person_id] ?? 'Unknown'}
          onCompleted={() => {
            onActivityEnd(activity.localId ?? activity.offline_id)
            onSyncNeeded()
          }}
        />
      ))}
    </div>
  )
}

function ActiveTaskCard({ activity, sectionName, personName, onCompleted }) {
  const timer = useTimer()
  const [isCompleting, setIsCompleting] = useState(false)
  const [notes, setNotes] = useState(activity.notes || '')

  // Restore timer from activity start time
  if (!timer.isRunning && activity.start_time) {
    timer.restoreFrom(activity.start_time)
  }

  async function handleComplete() {
    setIsCompleting(true)

    const endTime = new Date().toISOString()
    const updates = {
      end_time: endTime,
      status: 'Completed',
      notes: notes.trim() || null,
      client_updated_at: endTime,
      synced: 0,
    }

    // Update IndexedDB
    await db.activities.update(activity.localId, updates)

    // Try Supabase in the background
    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from('activities')
          .upsert(
            (({ synced, localId: _l, ...rest }) => ({
              ...rest,
              ...updates,
              synced: undefined,
              localId: undefined,
            }))(activity),
            { onConflict: 'offline_id' }
          )
        if (!error) {
          await db.activities.update(activity.localId, { synced: 1 })
        }
      } catch {
        // Stays queued for sync
      }
    }

    onCompleted()
  }

  return (
    <div className="bg-nebula-50 border-2 border-nebula-200 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-semibold text-nebula-900">{activity.task_type}</p>
          <p className="text-xs text-nebula-600 mt-0.5">
            {personName} · Section {sectionName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold text-nebula-700">{timer.formatted}</p>
          <p className="text-xs text-nebula-500">running</p>
        </div>
      </div>

      {/* Notes field */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes (optional)..."
        rows={2}
        className="w-full px-3 py-2 text-sm border border-nebula-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nebula-500 bg-white"
      />

      {/* Complete button */}
      <Button
        variant="primary"
        size="md"
        fullWidth
        onClick={handleComplete}
        disabled={isCompleting}
        icon="✓"
      >
        {isCompleting ? 'Completing...' : 'Complete Task'}
      </Button>
    </div>
  )
}
