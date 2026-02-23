import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import ActivityForm from './ActivityForm'
import ActivityList from './ActivityList'
import { useTimer } from '../../hooks/useTimer'
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
 * On mount, we check IndexedDB for any "In Progress" activities so that
 * if a worker closes the app mid-task and reopens it, the timer resumes
 * from the original start_time.
 */
export default function ActivityLoggerPage() {
  const timer            = useTimer()
  const { sections, people, isLoading } = useFarmData()
  const { refreshPendingCount }         = useSync()

  // The currently active (In Progress) activity — null if none running
  const [activeActivity, setActiveActivity] = useState(null)
  const [isRestoring,    setIsRestoring]    = useState(true)

  // On mount: look for any In Progress activity to restore the timer
  useEffect(() => {
    async function restoreInProgressActivity() {
      const inProgress = await db.activities
        .where('status')
        .equals('In Progress')
        .first()

      if (inProgress) {
        setActiveActivity(inProgress)
        timer.restoreFrom(inProgress.start_time)
      }
      setIsRestoring(false)
    }
    restoreInProgressActivity()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleActivityStart(activity) {
    setActiveActivity(activity)
  }

  function handleActivityEnd() {
    setActiveActivity(null)
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

        {/* ── FORM ─────────────────────────────────────────────── */}
        <ActivityForm
          sections={sections}
          people={people}
          activeActivity={activeActivity}
          timer={timer}
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
