import { useState } from 'react'
import Button from '../../components/ui/Button'
import { supabase, FARM_ID } from '../../lib/supabase'
import { formatDate, todayDateString } from '../../lib/utils'
import { getNextDate, RECURRENCE_LABELS } from './taskUtils'

const STATUS_STYLES = {
  Pending:    { pill: 'bg-amber-100  text-amber-700',   bar: 'bg-amber-400'  },
  Completed:  { pill: 'bg-nebula-100 text-nebula-700',  bar: 'bg-nebula-500' },
  Skipped:    { pill: 'bg-gray-100   text-gray-500',    bar: 'bg-gray-300'   },
  Rescheduled:{ pill: 'bg-blue-100   text-blue-700',    bar: 'bg-blue-400'   },
}

const TYPE_ICON = {
  Planting:        '🌱',
  Irrigation:      '💧',
  Fertilising:     '🌿',
  'Pest Control':  '🐛',
  Harvesting:      '🌾',
  Transplanting:   '♻️',
  'Land Preparation':'🚜',
  Weeding:         '✂️',
  Pruning:         '✂️',
  Maintenance:     '🔧',
  Inspection:      '🔍',
  General:         '📋',
}

/**
 * TaskCard — one scheduled task with complete / skip / reschedule actions.
 * Auto-reschedule: when completing/skipping a recurring task, a new row is
 * inserted with the next calculated date.
 *
 * Props:
 *   task      — row from workplan_schedule (with sections and people joins)
 *   isOverdue — bool (used for visual alert)
 *   onUpdated — () => void
 */
export default function TaskCard({ task, isOverdue, onUpdated }) {
  const [showReschedule, setShowReschedule]   = useState(false)
  const [newDate,        setNewDate]          = useState(task.planned_date)
  const [isSaving,       setIsSaving]         = useState(false)
  const [saveError,      setSaveError]        = useState(null)
  const [nextScheduled,  setNextScheduled]    = useState(null) // toast after auto-reschedule
  const [isDeleting,     setIsDeleting]       = useState(false)

  const isRecurring = task.recurrence_type && task.recurrence_type !== 'Once'
  const style       = STATUS_STYLES[task.status] ?? STATUS_STYLES.Pending
  const isDone      = task.status === 'Completed' || task.status === 'Skipped'

  async function handleDelete() {
    if (!confirm(`Delete task: ${task.task_name || task.activity_type}? This cannot be undone.`)) return
    
    setIsDeleting(true)
    const { error } = await supabase
      .from('workplan_schedule')
      .delete()
      .eq('id', task.id)
    
    if (error) {
      alert('Failed to delete: ' + error.message)
      setIsDeleting(false)
    } else {
      onUpdated()
    }
  }

  async function markStatus(newStatus) {
    setIsSaving(true)
    setSaveError(null)

    const updates = {
      status:          newStatus,
      completion_date: todayDateString(),
    }

    const { error: updateErr } = await supabase
      .from('workplan_schedule')
      .update(updates)
      .eq('id', task.id)

    if (updateErr) {
      setSaveError(updateErr.message)
      setIsSaving(false)
      return
    }

    // Auto-reschedule: insert next occurrence for recurring tasks
    if (isRecurring) {
      const nextDate = getNextDate(
        task.planned_date,
        task.recurrence_type,
        task.recurrence_interval
      )

      if (nextDate) {
        const { error: insertErr } = await supabase
          .from('workplan_schedule')
          .insert({
            farm_id:             FARM_ID,
            task_name:           task.task_name,
            activity_type:       task.activity_type,
            section_id:          task.section_id,
            assigned_to:         task.assigned_to,
            planned_date:        nextDate,
            recurrence_type:     task.recurrence_type,
            recurrence_interval: task.recurrence_interval,
            notes:               task.notes,
            status:              'Pending',
          })

        if (!insertErr) {
          setNextScheduled(nextDate)
        }
      }
    }

    setIsSaving(false)
    onUpdated()
  }

  async function handleReschedule() {
    setIsSaving(true)
    setSaveError(null)

    const { error } = await supabase
      .from('workplan_schedule')
      .update({ planned_date: newDate, status: 'Rescheduled' })
      .eq('id', task.id)

    if (error) {
      setSaveError(error.message)
      setIsSaving(false)
    } else {
      setShowReschedule(false)
      onUpdated()
    }
  }

  const sectionLabel  = task.sections?.name ? `Section ${task.sections.name}` : null
  const assignedLabel = task.people?.full_name ?? null
  const recurrLabel   = isRecurring ? RECURRENCE_LABELS[task.recurrence_type] : null

  return (
    <div className={[
      'card p-0 overflow-hidden relative',
      isDone ? 'opacity-60' : '',
    ].join(' ')}>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/80 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 flex items-center justify-center text-sm z-10"
        title="Delete task"
      >
        {isDeleting ? '⏳' : '🗑️'}
      </button>

      {/* Urgency/status bar */}
      <div className={`h-1 w-full ${isOverdue && !isDone ? 'bg-red-400' : style.bar}`} />

      <div className="p-4 space-y-3">

        {/* Header */}
        <div className="flex items-start gap-3 pr-8">
          <span className="text-xl mt-0.5 shrink-0">
            {TYPE_ICON[task.activity_type] ?? '📋'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-900 leading-tight">{task.task_name}</p>
              <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${style.pill}`}>
                {task.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
              <span className="text-xs text-gray-500">{formatDate(task.planned_date)}</span>
              {sectionLabel  && <span className="text-xs text-gray-400">· {sectionLabel}</span>}
              {assignedLabel && <span className="text-xs text-gray-400">· {assignedLabel}</span>}
              {recurrLabel   && (
                <span className="text-xs font-medium text-nebula-600 bg-nebula-50 px-1.5 py-0.5 rounded-md">
                  ↻ {recurrLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {task.notes && (
          <p className="text-xs text-gray-500 border-l-2 border-gray-200 pl-2 leading-snug">
            {task.notes}
          </p>
        )}

        {/* Next scheduled toast */}
        {nextScheduled && (
          <div className="rounded-lg bg-nebula-50 border border-nebula-100 px-3 py-2 text-xs text-nebula-700 font-medium">
            ✅ Next occurrence scheduled for {formatDate(nextScheduled)}
          </div>
        )}

        {/* Actions — only for Pending/Rescheduled tasks */}
        {!isDone && !showReschedule && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="success"
              size="sm"
              onClick={() => markStatus('Completed')}
              disabled={isSaving}
            >
              ✓ Complete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markStatus('Skipped')}
              disabled={isSaving}
            >
              Skip
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReschedule(true)}
              disabled={isSaving}
            >
              ↕ Reschedule
            </Button>
          </div>
        )}

        {/* Reschedule form */}
        {showReschedule && (
          <div className="bg-gray-50 rounded-xl p-3 space-y-3 border border-gray-100">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pick New Date</p>
            <input
              type="date"
              className="field-input"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            {saveError && (
              <p className="text-xs text-red-600">{saveError}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowReschedule(false); setSaveError(null) }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                fullWidth
                onClick={handleReschedule}
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Confirm Reschedule'}
              </Button>
            </div>
          </div>
        )}

        {saveError && !showReschedule && (
          <p className="text-xs text-red-600">{saveError}</p>
        )}

      </div>
    </div>
  )
}
