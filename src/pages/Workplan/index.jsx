import { useState, useEffect, useCallback } from 'react'
import Layout   from '../../components/Layout'
import Button   from '../../components/ui/Button'
import TaskCard from './TaskCard'
import TaskForm from './TaskForm'
import { supabase, FARM_ID } from '../../lib/supabase'
import { getTaskGroup, GROUP_META } from './taskUtils'

const PENDING_STATUSES = ['Pending', 'Rescheduled']
const DONE_STATUSES    = ['Completed', 'Skipped']
const GROUP_ORDER      = ['overdue', 'today', 'this-week', 'upcoming']

/**
 * Module 8: Workplan with Automatic Reschedule Logic
 *
 * Schedule recurring and one-off farm tasks. When a recurring task is
 * completed or skipped, the next occurrence is automatically created.
 *
 * Page layout:
 *   ┌───────────────────────────────┐
 *   │  Summary banner               │
 *   ├───────────────────────────────┤
 *   │  [+ Schedule Task] button     │
 *   │  TaskForm (if open)           │
 *   ├───────────────────────────────┤
 *   │  Overdue ⚠                    │
 *   │  Today                        │
 *   │  This Week                    │
 *   │  Upcoming                     │
 *   ├───────────────────────────────┤
 *   │  ▼ Completed / Skipped        │
 *   └───────────────────────────────┘
 */
export default function WorkplanPage() {
  const [tasks,        setTasks]        = useState([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [showDone,     setShowDone]     = useState(false)
  const [error,        setError]        = useState(null)

  const loadTasks = useCallback(async () => {
    setError(null)

    const { data, error: supaError } = await supabase
      .from('workplan_schedule')
      .select('*, sections(name), people!assigned_to(full_name)')
      .eq('farm_id', FARM_ID)
      .order('planned_date', { ascending: true })

    if (supaError) {
      setError('Could not load workplan. Check your connection.')
      console.error('[Workplan] Load error:', supaError)
    } else {
      setTasks(data ?? [])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  function handleTaskAdded(task) {
    setShowForm(false)
    setTasks((prev) =>
      [...prev, task].sort(
        (a, b) => new Date(a.planned_date) - new Date(b.planned_date)
      )
    )
  }

  // ── Split and group pending tasks ──────────────────────────────
  const pendingTasks = tasks.filter((t) => PENDING_STATUSES.includes(t.status))
  const doneTasks    = tasks.filter((t) => DONE_STATUSES.includes(t.status))

  // Group pending by timeframe
  const grouped = pendingTasks.reduce((acc, task) => {
    const g = getTaskGroup(task.planned_date)
    if (!acc[g]) acc[g] = []
    acc[g].push(task)
    return acc
  }, {})

  // ── Summary ────────────────────────────────────────────────────
  const overdueCount  = (grouped['overdue']    ?? []).length
  const todayCount    = (grouped['today']      ?? []).length
  const thisWeekCount = (grouped['this-week']  ?? []).length

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Layout title="Workplan">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">

        {/* Summary banner */}
        {!isLoading && pendingTasks.length > 0 && (
          <div className={[
            'rounded-2xl p-4 text-white',
            overdueCount > 0 ? 'bg-red-600' : 'bg-nebula-600',
          ].join(' ')}>
            <p className={[
              'text-xs font-semibold uppercase tracking-wide mb-1',
              overdueCount > 0 ? 'text-red-200' : 'text-nebula-200',
            ].join(' ')}>
              Workplan
            </p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold font-mono">
                  {pendingTasks.length} task{pendingTasks.length !== 1 ? 's' : ''} pending
                </p>
                <p className={[
                  'text-xs mt-0.5',
                  overdueCount > 0 ? 'text-red-200' : 'text-nebula-300',
                ].join(' ')}>
                  {overdueCount  > 0 && `${overdueCount} overdue · `}
                  {todayCount    > 0 && `${todayCount} today · `}
                  {thisWeekCount > 0 && `${thisWeekCount} this week`}
                </p>
              </div>
              <span className="text-4xl opacity-40">📅</span>
            </div>
          </div>
        )}

        {/* Add task button / form */}
        {!showForm && (
          <Button
            variant="primary"
            size="md"
            fullWidth
            icon="📅"
            onClick={() => setShowForm(true)}
          >
            Schedule Task
          </Button>
        )}

        {showForm && (
          <TaskForm
            onSaved={handleTaskAdded}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
            <button onClick={loadTasks} className="ml-2 underline font-medium">Retry</button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-sm">Loading workplan…</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && tasks.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <p className="text-4xl mb-2">📅</p>
            <p className="text-sm font-medium">No tasks scheduled yet</p>
            <p className="text-xs mt-1">Schedule recurring tasks to keep the farm on track</p>
          </div>
        )}

        {/* Grouped pending tasks */}
        {GROUP_ORDER.map((group) => {
          const groupTasks = grouped[group]
          if (!groupTasks || groupTasks.length === 0) return null
          const meta = GROUP_META[group]
          return (
            <section key={group} className="space-y-3">
              <h2 className={[
                'text-sm font-semibold uppercase tracking-wide px-1 flex items-center gap-2',
                meta.alert ? 'text-red-600' : 'text-gray-500',
              ].join(' ')}>
                {meta.alert && <span>⚠️</span>}
                {meta.label}
                <span className={[
                  'text-xs font-bold px-2 py-0.5 rounded-full',
                  meta.alert
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-500',
                ].join(' ')}>
                  {groupTasks.length}
                </span>
              </h2>
              {groupTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isOverdue={group === 'overdue'}
                  onUpdated={loadTasks}
                />
              ))}
            </section>
          )
        })}

        {/* Completed / Skipped history */}
        {doneTasks.length > 0 && (
          <section className="space-y-3">
            <button
              onClick={() => setShowDone((v) => !v)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-500 uppercase tracking-wide px-1 py-1"
            >
              <span>Completed / Skipped ({doneTasks.length})</span>
              <span className="text-lg leading-none">{showDone ? '▲' : '▼'}</span>
            </button>
            {showDone && doneTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isOverdue={false}
                onUpdated={loadTasks}
              />
            ))}
          </section>
        )}

      </div>
    </Layout>
  )
}
