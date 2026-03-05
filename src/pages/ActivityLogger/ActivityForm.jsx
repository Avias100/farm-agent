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
 * Activity form - supports multiple concurrent activities (one per worker).
 *
 * Props:
 *   sections          — array from useFarmData
 *   people            — array from useFarmData
 *   activeActivities  — array of all in-progress activities
 *   onActivityStart   — (activity) => void
 *   onActivityEnd     — (activityId) => void
 *   onSyncNeeded      — () => void
 */
export default function ActivityForm({
  sections,
  people,
  activeActivities,
  onActivityStart,
  onActivityEnd,
  onSyncNeeded,
}) {
  const [sectionId,    setSectionId]    = useState('')
  const [personId,     setPersonId]     = useState('')
  const [taskType,     setTaskType]     = useState('')
  const [notes,        setNotes]        = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors,       setErrors]       = useState({})
  const [scheduleMode, setScheduleMode] = useState(false) // New: toggle between Schedule/Start

  // Check if selected worker already has an active task
  const personHasActiveTask = personId && activeActivities.some(a => a.person_id === personId)

  function validate() {
    const e = {}
    if (!sectionId) e.sectionId = 'Select a section'
    if (!taskType)  e.taskType  = 'Select a task type'
    if (!personId)  e.personId  = 'Select a worker'
    if (personHasActiveTask) e.personId = 'This worker already has an active task'
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
      start_time:       scheduleMode ? null : now, // null if scheduling for later
      end_time:         null,
      notes:            notes.trim() || null,
      status:           scheduleMode ? 'Scheduled' : 'In Progress',
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

    onActivityStart({ ...activity, localId })
    onSyncNeeded()
    
    // Reset form for next activity
    setSectionId('')
    setPersonId('')
    setTaskType('')
    setNotes('')
    setIsSubmitting(false)
  }

  async function handleComplete() {
    // This function is removed - completion happens in ActiveTasksList
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">
          {scheduleMode ? 'Schedule Tasks' : 'Start New Task'}
        </h2>
        {/* Toggle between Schedule/Start modes */}
        <button
          onClick={() => setScheduleMode(!scheduleMode)}
          className="text-xs font-medium px-3 py-1.5 rounded-full border-2 transition-colors"
          style={{
            backgroundColor: scheduleMode ? '#e0f2fe' : '#f0fdf4',
            borderColor: scheduleMode ? '#0ea5e9' : '#22c55e',
            color: scheduleMode ? '#0369a1' : '#15803d',
          }}
        >
          {scheduleMode ? '📋 Schedule Mode' : '▶️ Start Mode'}
        </button>
      </div>

      {scheduleMode && (
        <p className="text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
          💡 Queue tasks for multiple workers, then start them all together
        </p>
      )}

      {/* Form fields */}
      <div className="space-y-3">
        <Select
          label="Section"
          value={sectionId}
          onChange={setSectionId}
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
          required
          error={errors.taskType}
          placeholder="Choose task…"
          options={TASK_TYPES.map((t) => ({ value: t, label: t }))}
        />

        <Select
          label="Worker"
          value={personId}
          onChange={setPersonId}
          required
          error={errors.personId}
          placeholder="Choose worker…"
          options={people.map((p) => ({
            value: p.id,
            label: `${p.full_name} (${p.role})`,
          }))}
        />

        {/* Warning if worker has active task */}
        {personHasActiveTask && (
          <p className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ {people.find(p => p.id === personId)?.full_name} already has an active task
          </p>
        )}

        {/* Notes */}
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
      <Button
        variant={scheduleMode ? "outline" : "primary"}
        size="lg"
        fullWidth
        icon={scheduleMode ? "📋" : "▶"}
        onClick={handleStart}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving…' : (scheduleMode ? 'Schedule Task' : 'Start Task')}
      </Button>

      {/* Offline nudge */}
      {!navigator.onLine && (
        <p className="text-xs text-center text-amber-600 font-medium">
          You are offline — task will sync automatically when connected
        </p>
      )}
    </div>
  )
}
