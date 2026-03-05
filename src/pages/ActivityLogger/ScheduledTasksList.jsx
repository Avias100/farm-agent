import { useState, useEffect } from 'react'
import Button from '../../components/ui/Button'
import db from '../../db/localDb'
import { supabase } from '../../lib/supabase'

/**
 * Shows all scheduled (not yet started) tasks with a "Start All" button.
 * Allows bulk starting of tasks for multiple workers at once.
 */
export default function ScheduledTasksList({ sections, people, onTasksStarted, onSyncNeeded }) {
  const [scheduledTasks, setScheduledTasks] = useState([])
  const [isStartingAll, setIsStartingAll] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const sectionMap = Object.fromEntries(sections.map(s => [s.id, s.name]))
  const personMap = Object.fromEntries(people.map(p => [p.id, p.full_name]))

  // Load scheduled tasks
  useEffect(() => {
    async function loadScheduled() {
      const tasks = await db.activities
        .where('status')
        .equals('Scheduled')
        .toArray()
      setScheduledTasks(tasks)
      setIsLoading(false)
    }
    loadScheduled()
    
    // Refresh every 2 seconds to show new scheduled tasks
    const interval = setInterval(loadScheduled, 2000)
    return () => clearInterval(interval)
  }, [])

  async function handleStartAll() {
    if (scheduledTasks.length === 0) return
    if (!confirm(`Start ${scheduledTasks.length} task(s) now?`)) return

    setIsStartingAll(true)
    const now = new Date().toISOString()

    for (const task of scheduledTasks) {
      const updates = {
        start_time: now,
        status: 'In Progress',
        client_updated_at: now,
        synced: 0,
      }

      // Update IndexedDB
      await db.activities.update(task.localId, updates)

      // Try Supabase in background
      if (navigator.onLine) {
        try {
          await supabase
            .from('activities')
            .upsert(
              (({ synced, localId: _l, ...rest }) => ({
                ...rest,
                ...updates,
                synced: undefined,
                localId: undefined,
              }))(task),
              { onConflict: 'offline_id' }
            )
          await db.activities.update(task.localId, { synced: 1 })
        } catch {
          // Will sync later
        }
      }
    }

    setScheduledTasks([])
    setIsStartingAll(false)
    onTasksStarted()
    onSyncNeeded()
  }

  async function handleDeleteTask(task) {
    await db.activities.delete(task.localId)
    setScheduledTasks(prev => prev.filter(t => t.localId !== task.localId))
    
    if (task.id && navigator.onLine) {
      await supabase.from('activities').delete().eq('id', task.id)
    }
    onSyncNeeded()
  }

  if (isLoading) return null
  if (scheduledTasks.length === 0) return null

  return (
    <div className="card space-y-3 bg-sky-50 border-2 border-sky-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-sky-900">
          📋 Scheduled Tasks ({scheduledTasks.length})
        </h3>
        <Button
          variant="primary"
          size="sm"
          onClick={handleStartAll}
          disabled={isStartingAll}
          icon="▶️"
        >
          {isStartingAll ? 'Starting...' : 'Start All'}
        </Button>
      </div>

      <div className="space-y-2">
        {scheduledTasks.map(task => (
          <div
            key={task.localId}
            className="bg-white rounded-lg border border-sky-200 p-3 flex items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">{task.task_type}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {personMap[task.person_id] ?? 'Unknown'} · Section {sectionMap[task.section_id] ?? '?'}
              </p>
            </div>
            <button
              onClick={() => handleDeleteTask(task)}
              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors flex items-center justify-center text-sm"
              title="Remove"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-sky-600 text-center">
        💡 Click "Start All" to begin all tasks simultaneously
      </p>
    </div>
  )
}
