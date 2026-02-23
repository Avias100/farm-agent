import { useState, useEffect } from 'react'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import TimerDisplay from './TimerDisplay'
import { generateId } from '../../lib/utils'
import db from '../../db/localDb'
import { supabase } from '../../lib/supabase'

const TASK_TYPES = [
  'Planting', 'Spraying', 'Weeding', 'Drenching',
  'Harvesting', 'Fertilizing', 'Irrigation',
  'Inspection', 'Transplanting', 'Other',
]

/**
 * Activity form with integrated start/stop timer.
 *
 * State machine:
 *   IDLE         → user fills in section/task/worker, taps Start
 *   IN_PROGRESS  → timer running, fields locked, only Notes + Complete shown
 *   COMPLETING   → async save, brief loading state
 *   IDLE         → form resets, new activity appears in the list below
 *
 * Props:
 *   sections        — array from useFarmData
 *   people          — array from useFarmData
 *   activeActivity  — the current in-progress activity from IndexedDB (or null)
 *   timer           — object from useTimer()
 *   onActivityStart — (activity) => void   — called after Start saved to IndexedDB
 *   onActivityEnd   — ()         => void   — called after Complete saved to IndexedDB
 *   onSyncNeeded    — ()         => void   — tells parent to refresh pending count
 */
export default function ActivityForm({
  sections,
  people,
  activeActivity,
  timer,
  onActivityStart,
  onActivityEnd,
  onSyncNeeded,
}) {
  const [sectionId,   setSectionId]   = useState('')
  const [personId,    setPersonId]    = useState('')
  const [taskType,    setTaskType]    = useState('')
  const [notes,       setNotes]       = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors,      setErrors]      = useState({})

  // Pre-populate form if we're restoring an in-progress activity (app re-opened)
  useEffect(() => {
    if (activeActivity) {
      setSectionId(activeActivity.section_id || '')
      setPersonId(activeActivity.person_id  || '')
      setTaskType(activeActivity.task_type  || '')
      setNotes(activeActivity.notes         || '')
    }
  }, []) // intentionally empty — restore only once on mount

  function validate() {
    const e = {}
    if (!sectionId) e.sectionId = 'Select a section'
    if (!taskType)  e.taskType  = 'Select a task type'
    if (!personId)  e.personId  = 'Select a worker'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleStart() {
    if (!validate()) return
    setIsSubmitting(true)

    const now        = new Date().toISOString()
    const offline_id = generateId()

    const activity = {
      id:               offline_id,
      offline_id,
      section_id:       sectionId,
      person_id:        personId,
      task_type:        taskType,
      start_time:       now,
      end_time:         null,
      notes:            notes.trim() || null,
      status:           'In Progress',
      created_offline:  !navigator.onLine,
      client_updated_at: now,
      synced_at:        null,
      created_at:       now,
      synced:           0,
    }

    // 1. Save to IndexedDB first — instant, works offline
    const localId = await db.activities.add(activity)

    // 2. Try Supabase in the background — fail silently if offline
    if (navigator.onLine) {
      try {
        const { data } = await supabase
          .from('activities')
          .upsert(
            // Supabase doesn't know about our local-only `synced` field
            (({ synced, localId: _l, ...rest }) => rest)(activity), // eslint-disable-line no-unused-vars
            { onConflict: 'offline_id' }
          )
          .select('id')
          .single()

        if (data?.id) {
          await db.activities.update(localId, { id: data.id, synced: 1 })
        }
      } catch {
        // Network failed — record stays in IndexedDB with synced=0
      }
    }

    timer.start()
    onActivityStart({ ...activity, localId })
    onSyncNeeded()
    setIsSubmitting(false)
  }

  async function handleComplete() {
    if (!activeActivity) return
    setIsSubmitting(true)

    const endTime = new Date().toISOString()
    const updates = {
      end_time:          endTime,
      status:            'Completed',
      notes:             notes.trim() || null,
      client_updated_at: endTime,
      synced:            0,
    }

    // Update IndexedDB
    await db.activities.update(activeActivity.localId, updates)

    // Try Supabase in the background
    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from('activities')
          .upsert(
            (({ synced, localId: _l, ...rest }) => ({  // eslint-disable-line no-unused-vars
              ...rest,
              ...updates,
              synced:  undefined,
              localId: undefined,
            }))(activeActivity),
            { onConflict: 'offline_id' }
          )
        if (!error) {
          await db.activities.update(activeActivity.localId, { synced: 1 })
        }
      } catch {
        // Stays queued for background sync
      }
    }

    timer.reset()
    onActivityEnd()
    onSyncNeeded()

    // Reset form for next task
    setSectionId('')
    setPersonId('')
    setTaskType('')
    setNotes('')
    setErrors({})
    setIsSubmitting(false)
  }

  const isActive   = !!activeActivity
  const activeSection = sections.find((s) => s.id === (activeActivity?.section_id || sectionId))

  return (
    <div className="card space-y-4">
      <h2 className="text-base font-semibold text-gray-800">
        {isActive ? 'Task In Progress' : 'Log New Activity'}
      </h2>

      {/* Timer — shown only when a task is running */}
      {isActive && (
        <TimerDisplay
          timer={timer}
          taskType={activeActivity.task_type}
          sectionName={activeSection?.name ?? '?'}
        />
      )}

      {/* Form fields — locked while timer is running */}
      <div className="space-y-3">
        <Select
          label="Section"
          value={sectionId}
          onChange={setSectionId}
          disabled={isActive}
          required
          error={errors.sectionId}
          placeholder="Choose section…"
          options={sections.map((s) => ({
            value: s.id,
            label: `Section ${s.name}${s.description ? ' — ' + s.description : ''}`,
          }))}
        />

        <Select
          label="Task Type"
          value={taskType}
          onChange={setTaskType}
          disabled={isActive}
          required
          error={errors.taskType}
          placeholder="Choose task…"
          options={TASK_TYPES.map((t) => ({ value: t, label: t }))}
        />

        <Select
          label="Worker"
          value={personId}
          onChange={setPersonId}
          disabled={isActive}
          required
          error={errors.personId}
          placeholder="Choose worker…"
          options={people.map((p) => ({
            value: p.id,
            label: `${p.full_name} (${p.role})`,
          }))}
        />

        {/* Notes — always editable so worker can add info mid-task */}
        <div>
          <label className="field-label">Notes</label>
          <textarea
            className="field-input resize-none"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional observations, conditions, bed numbers…"
          />
        </div>
      </div>

      {/* Action button */}
      {!isActive ? (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon="▶"
          onClick={handleStart}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Starting…' : 'Start Task'}
        </Button>
      ) : (
        <Button
          variant="success"
          size="lg"
          fullWidth
          icon="✓"
          onClick={handleComplete}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving…' : 'Complete Task'}
        </Button>
      )}

      {/* Offline nudge */}
      {!navigator.onLine && (
        <p className="text-xs text-center text-amber-600 font-medium">
          You are offline — task will sync automatically when connected
        </p>
      )}
    </div>
  )
}
