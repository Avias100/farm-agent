import { useState, useEffect, useCallback } from 'react'
import Layout      from '../../components/Layout'
import Button      from '../../components/ui/Button'
import TrayCard    from './TrayCard'
import NurseryForm from './NurseryForm'
import { supabase, FARM_ID } from '../../lib/supabase'

/**
 * Module 4: Nursery Tracker
 *
 * Tracks seed tray batches from planting through to field transplant.
 * Online-only (no offline queue) — nursery records are managed from the
 * nursery desk, always with connectivity.
 *
 * Page layout:
 *   ┌───────────────────────────────┐
 *   │  Summary banner (active trays)│
 *   ├───────────────────────────────┤
 *   │  [+ New Tray Batch] button    │
 *   │  NurseryForm (if open)        │
 *   ├───────────────────────────────┤
 *   │  Active trays (sorted by      │
 *   │  expected_transplant_date)    │
 *   ├───────────────────────────────┤
 *   │  ▼ Transplant history         │
 *   └───────────────────────────────┘
 */
export default function NurseryPage() {
  const [trays,         setTrays]         = useState([])
  const [isLoading,     setIsLoading]     = useState(true)
  const [showForm,      setShowForm]      = useState(false)
  const [showHistory,   setShowHistory]   = useState(false)
  const [error,         setError]         = useState(null)

  const loadTrays = useCallback(async () => {
    setError(null)

    const { data, error: supaError } = await supabase
      .from('nursery_trays')
      .select('*, sections!inner(name, farm_id)')
      .eq('sections.farm_id', FARM_ID)
      .order('date_planted', { ascending: false })

    if (supaError) {
      setError('Could not load nursery data. Check your connection.')
      console.error('[Nursery] Load error:', supaError)
    } else {
      setTrays(data ?? [])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => { loadTrays() }, [loadTrays])

  function handleTrayAdded(tray) {
    setShowForm(false)
    setTrays((prev) => [tray, ...prev])
  }

  // ── Split active vs transplanted ───────────────────────────────
  const activeTrays = trays
    .filter((t) => !t.actual_transplant_date)
    .sort((a, b) => {
      // No expected date sinks to bottom; overdue floats to top
      if (!a.expected_transplant_date && !b.expected_transplant_date) return 0
      if (!a.expected_transplant_date) return 1
      if (!b.expected_transplant_date) return -1
      return new Date(a.expected_transplant_date) - new Date(b.expected_transplant_date)
    })

  const transplantedTrays = trays.filter((t) => t.actual_transplant_date)

  // ── Summary counts ─────────────────────────────────────────────
  const today    = new Date()
  today.setHours(0, 0, 0, 0)

  const overdueCount  = activeTrays.filter((t) => {
    if (!t.expected_transplant_date) return false
    return new Date(t.expected_transplant_date) < today
  }).length

  const dueSoonCount  = activeTrays.filter((t) => {
    if (!t.expected_transplant_date) return false
    const diff = Math.round((new Date(t.expected_transplant_date) - today) / 86_400_000)
    return diff >= 0 && diff <= 3
  }).length

  const totalActiveTrays = activeTrays.reduce((s, t) => s + (t.tray_count || 0), 0)

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Layout title="Nursery">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">

        {/* Summary banner */}
        {!isLoading && activeTrays.length > 0 && (
          <div className="rounded-2xl bg-nebula-600 text-white p-4">
            <p className="text-nebula-200 text-xs font-semibold uppercase tracking-wide mb-1">
              Active Nursery
            </p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold font-mono">{activeTrays.length} batch{activeTrays.length !== 1 ? 'es' : ''}</p>
                <p className="text-nebula-300 text-xs mt-0.5">
                  {totalActiveTrays} trays total
                  {overdueCount  > 0 && ` · ${overdueCount} overdue`}
                  {dueSoonCount  > 0 && ` · ${dueSoonCount} due soon`}
                </p>
              </div>
              <span className="text-4xl opacity-40">🌿</span>
            </div>
          </div>
        )}

        {/* New batch button / form */}
        {!showForm && (
          <Button
            variant="primary"
            size="md"
            fullWidth
            icon="🌱"
            onClick={() => setShowForm(true)}
          >
            New Tray Batch
          </Button>
        )}

        {showForm && (
          <NurseryForm
            onSaved={handleTrayAdded}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
            <button onClick={loadTrays} className="ml-2 underline font-medium">Retry</button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">🌿</p>
            <p className="text-sm">Loading nursery…</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && trays.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <p className="text-4xl mb-2">🌱</p>
            <p className="text-sm font-medium">No tray batches recorded yet</p>
            <p className="text-xs mt-1">Tap "New Tray Batch" to get started</p>
          </div>
        )}

        {/* Active trays */}
        {activeTrays.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
              Active Batches
            </h2>
            {activeTrays.map((tray) => (
              <TrayCard
                key={tray.id}
                tray={tray}
                onUpdated={loadTrays}
              />
            ))}
          </section>
        )}

        {/* Transplant history */}
        {transplantedTrays.length > 0 && (
          <section className="space-y-3">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-500 uppercase tracking-wide px-1 py-1"
            >
              <span>Transplant History ({transplantedTrays.length})</span>
              <span className="text-lg leading-none">{showHistory ? '▲' : '▼'}</span>
            </button>

            {showHistory && transplantedTrays.map((tray) => (
              <TrayCard
                key={tray.id}
                tray={tray}
                onUpdated={loadTrays}
              />
            ))}
          </section>
        )}

      </div>
    </Layout>
  )
}
