import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import ActivityForm from './ActivityForm'
import ActivityList from './ActivityList'
import ActiveTasksList from './ActiveTasksList'
import ScheduledTasksList from './ScheduledTasksList'
import { useFarmData } from '../../hooks/useFarmData'
import { useSync } from '../../hooks/useSync'
import db from '../../db/localDb'

/**
 * Module 1: Daily Activity Logger
 *
 * This is the primary screen for field workers. It occupies the full
 * viewport on mobile and consists of two sections:
 *
 *  1. ActivityForm  — section/task/worker selectors + start/stop timer
 *  2. ActivityList  — live list of today's activities from IndexedDB
 *
 * SUPPORTS CONCURRENT TASKS:
 * Multiple staff members can have tasks running simultaneously.
 * Each worker can only have ONE active task at a time.
 */
export default function ActivityLoggerPage() {
  const { sections, people, isLoading } = useFarmData()
  const { refreshPendingCount }         = useSync()

  // All currently active (In Progress) activities — array of activities
  const [activeActivities, setActiveActivities] = useState([])
  const [isRestoring,      setIsRestoring]      = useState(true)

  // On mount: load all In Progress activities
  useEffect(() => {
    async function restoreInProgressActivities() {
      const inProgress = await db.activities
        .where('status')
        .equals('In Progress')
        .toArray()

      setActiveActivities(inProgress)
      setIsRestoring(false)
    }
    restoreInProgressActivities()
  }, [])

  function handleActivityStart(activity) {
    setActiveActivities(prev => [...prev, activity])
  }

  function handleActivityEnd(activityId) {
    setActiveActivities(prev => prev.filter(a => a.localId !== activityId && a.offline_id !== activityId))
  }

  function handleTasksStarted() {
    // Reload active activities when scheduled tasks are batch-started
    async function reloadActiveActivities() {
      const inProgress = await db.activities
        .where('status')
        .equals('In Progress')
        .toArray()
      setActiveActivities(inProgress)
    }
    reloadActiveActivities()
  }

  if (isRestoring || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <p className="text-4xl">🌿</p>
          <p className="text-sm text-gray-500 font-medium">Loading farm data…</p>
        </div>
      </div>
    )
  }

  // Warn if the app has never been seeded (no sections in IndexedDB and offline)
  const noData = sections.length === 0 && !navigator.onLine

  return (
    <Layout title="Activity Logger">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">

        {/* No-data warning shown when offline with empty cache */}
        {noData && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">No farm data cached</p>
            <p>
              Connect to the internet to load sections and staff for the first time.
              After the first online session, the app works fully offline.
            </p>
          </div>
        )}

        {/* ── ACTIVE TASKS ────────────────────────────────────── */}
        <ActiveTasksList
          activeActivities={activeActivities}
          sections={sections}
          people={people}
          onActivityEnd={handleActivityEnd}
          onSyncNeeded={refreshPendingCount}
        />

        {/* ── SCHEDULED TASKS (not started yet) ───────────────── */}
        <ScheduledTasksList
          sections={sections}
          people={people}
          onTasksStarted={handleTasksStarted}
          onSyncNeeded={refreshPendingCount}
        />

        {/* ── FORM ─────────────────────────────────────────────── */}
        <ActivityForm
          sections={sections}
          people={people}
          activeActivities={activeActivities}
          onActivityStart={handleActivityStart}
          onActivityEnd={handleActivityEnd}
          onSyncNeeded={refreshPendingCount}
        />

        {/* ── TODAY'S LOG ──────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
            Today&apos;s Activities
          </h2>
          <ActivityList sections={sections} people={people} />
        </section>
      </div>
    </Layout>
  )
}
