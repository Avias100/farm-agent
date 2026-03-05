import { useState } from 'react'
import Layout          from '../../components/Layout'
import ObservationForm from './ObservationForm'
import ObservationList from './ObservationList'
import { useFarmData } from '../../hooks/useFarmData'
import { useSync }     from '../../hooks/useSync'

/**
 * Module 2: Scouting & Observations
 *
 * Screen layout:
 *   ┌──────────────────────────────┐
 *   │ [Log Observation form]       │  ← collapsible to save space
 *   ├──────────────────────────────┤
 *   │ OPEN ISSUES                  │
 *   │ [All open] [High] [Med] [Low]│  ← filter chips
 *   │                              │
 *   │  🐛 Pest · Section A · Row 3 │
 *   │     HIGH · 12 plants         │
 *   │     "Aphids on stems"        │
 *   │     [✓ Mark Resolved]        │
 *   │                              │
 *   │  🦠 Disease · Section C      │
 *   │     MEDIUM                   │
 *   │     [✓ Mark Resolved]        │
 *   └──────────────────────────────┘
 *
 * The form can be toggled to maximise list space on small screens.
 */
export default function ScoutingPage() {
  const { sections, isLoading }  = useFarmData()
  const { refreshPendingCount }  = useSync()
  const [formOpen, setFormOpen]  = useState(true)
  const [listKey,  setListKey]   = useState(0) // bump to re-focus list after save

  function handleObservationSaved() {
    // Close form after save so the worker immediately sees the new card in the list
    setFormOpen(false)
    setListKey((k) => k + 1)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <p className="text-4xl">🔍</p>
          <p className="text-sm text-gray-500 font-medium">Loading farm data…</p>
        </div>
      </div>
    )
  }

  return (
    <Layout title="Scouting & Observations">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">

        {/* ── LOG FORM (collapsible) ──────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          {/* Toggle header */}
          <button
            onClick={() => setFormOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span>📋 Log New Observation</span>
            <span
              className={[
                'text-gray-400 transition-transform duration-200',
                formOpen ? 'rotate-180' : '',
              ].join(' ')}
            >
              ▾
            </span>
          </button>

          {formOpen && (
            <div className="px-4 pb-4 pt-0 border-t border-gray-100">
              <ObservationForm
                sections={sections}
                onSaved={handleObservationSaved}
                onSyncNeeded={refreshPendingCount}
              />
            </div>
          )}
        </div>

        {/* ── ISSUES LIST ─────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
            Field Issues
          </h2>
          <ObservationList key={listKey} sections={sections} />
        </section>
      </div>
    </Layout>
  )
}
