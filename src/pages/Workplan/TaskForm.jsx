import { useState, useEffect } from 'react'
import Button  from '../../components/ui/Button'
import Select  from '../../components/ui/Select'
import { supabase, FARM_ID } from '../../lib/supabase'
import { todayDateString } from '../../lib/utils'
import { RECURRENCE_TYPES } from './taskUtils'

const TASK_TYPES = [
  'Planting', 'Irrigation', 'Fertilising', 'Pest Control', 'Harvesting',
  'Transplanting', 'Land Preparation', 'Weeding', 'Pruning', 'Maintenance',
  'Inspection', 'General',
]

/**
 * Form to schedule a new workplan task.
 *
 * Props:
 *   onSaved  — (task) => void
 *   onCancel — () => void
 */
export default function TaskForm({ onSaved, onCancel }) {
  const [sections,           setSections]           = useState([])
  const [people,             setPeople]             = useState([])
  const [taskName,           setTaskName]           = useState('')
  const [taskType,           setTaskType]           = useState('')
  const [sectionId,          setSectionId]          = useState('')
  const [assignedTo,         setAssignedTo]         = useState('')
  const [scheduledDate,      setScheduledDate]      = useState(todayDateString())
  const [recurrenceType,     setRecurrenceType]     = useState('Once')
  const [recurrenceInterval, setRecurrenceInterval] = useState('1')
  const [notes,              setNotes]              = useState('')
  const [isSubmitting,       setIsSubmitting]       = useState(false)
  const [errors,             setErrors]             = useState({})
  const [error,              setError]              = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('sections').select('id, name').eq('farm_id', FARM_ID).order('name'),
      supabase.from('people').select('id, full_name, role').eq('farm_id', FARM_ID).eq('active', true).order('full_name'),
    ]).then(([sRes, pRes]) => {
      setSections(sRes.data ?? [])
      setPeople(pRes.data ?? [])
    })
  }, [])

  function validate() {
    const e = {}
    if (!taskName.trim())  e.taskName      = 'Task name is required'
    if (!taskType)         e.taskType      = 'Select a task type'
    if (!scheduledDate)    e.scheduledDate = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(evt) {
    evt.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setError(null)

    const { data, error: supaError } = await supabase
      .from('workplan_schedule')
      .insert({
        farm_id:             FARM_ID,
        task_name:           taskName.trim(),
        activity_type:       taskType,
        section_id:          sectionId          || null,
        assigned_to:         assignedTo         || null,
        planned_date:        scheduledDate,
        recurrence_type:     recurrenceType,
        recurrence_interval: recurrenceType !== 'Once' ? parseInt(recurrenceInterval, 10) : null,
        notes:               notes.trim()       || null,
        status:              'Pending',
      })
      .select('*, sections(name), people!assigned_to(full_name)')
      .single()

    if (supaError) {
      setError(supaError.message)
      setIsSubmitting(false)
      return
    }

    onSaved(data)
  }

  const sectionOptions = sections.map((s) => ({ value: s.id, label: `Section ${s.name}` }))
  const peopleOptions  = people.map((p) => ({ value: p.id, label: `${p.full_name} (${p.role})` }))

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Schedule Task</h2>

      {/* Task name */}
      <div>
        <label className="field-label">
          Task Name<span className="text-red-500 ml-0.5">*</span>
        </label>
        <input
          type="text"
          className={['field-input', errors.taskName ? 'border-red-400' : ''].join(' ')}
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="e.g. Irrigate Section A, Apply fungicide to spinach"
        />
        {errors.taskName && <p className="mt-1 text-xs text-red-500">{errors.taskName}</p>}
      </div>

      {/* Type + Section */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Task Type"
          value={taskType}
          onChange={setTaskType}
          required
          error={errors.taskType}
          placeholder="Select type…"
          options={TASK_TYPES.map((t) => ({ value: t, label: t }))}
        />
        <Select
          label="Section"
          value={sectionId}
          onChange={setSectionId}
          placeholder="Any / all"
          options={sectionOptions}
        />
      </div>

      {/* Assigned to + Date */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Assigned To"
          value={assignedTo}
          onChange={setAssignedTo}
          placeholder="Unassigned"
          options={peopleOptions}
        />
        <div>
          <label className="field-label">
            Scheduled Date<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="date"
            className={['field-input', errors.scheduledDate ? 'border-red-400' : ''].join(' ')}
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
          {errors.scheduledDate && <p className="mt-1 text-xs text-red-500">{errors.scheduledDate}</p>}
        </div>
      </div>

      {/* Recurrence */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Repeats"
          value={recurrenceType}
          onChange={setRecurrenceType}
          options={RECURRENCE_TYPES.map((r) => ({ value: r, label: r }))}
        />
        {recurrenceType !== 'Once' && recurrenceType !== 'Fortnightly' && (
          <div>
            <label className="field-label">Every (interval)</label>
            <input
              type="number"
              min="1"
              max="30"
              className="field-input"
              value={recurrenceInterval}
              onChange={(e) => setRecurrenceInterval(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="field-label">Notes</label>
        <textarea
          className="field-input resize-none"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Instructions, quantities, special considerations…"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" fullWidth icon="📅" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Schedule Task'}
        </Button>
      </div>
    </form>
  )
}
