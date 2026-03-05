import { useState, useEffect, useCallback } from 'react'
import Layout     from '../../components/Layout'
import Button     from '../../components/ui/Button'
import PersonCard from './PersonCard'
import PersonForm from './PersonForm'
import { supabase, FARM_ID } from '../../lib/supabase'

const FILTERS = ['Active', 'All', 'Inactive']

const ROLE_ORDER = ['Manager', 'Supervisor', 'Driver', 'Security', 'Worker']

/**
 * Module 5: Staff & Performance Notes
 *
 * Manage farm staff (people table) and attach performance notes.
 * Online-only module — always run from office.
 *
 * Page layout:
 *   ┌───────────────────────────────┐
 *   │  Summary banner               │
 *   ├───────────────────────────────┤
 *   │  [+ Add Staff Member] button  │
 *   │  PersonForm (if open)         │
 *   ├───────────────────────────────┤
 *   │  Filter chips                 │
 *   │  PersonCard × N               │
 *   │    → collapsed: name/role     │
 *   │    → expanded: notes + form   │
 *   └───────────────────────────────┘
 */
export default function StaffPage() {
  const [people,      setPeople]      = useState([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [filter,      setFilter]      = useState('Active')
  const [error,       setError]       = useState(null)

  const loadPeople = useCallback(async () => {
    setError(null)

    const { data, error: supaError } = await supabase
      .from('people')
      .select('*')
      .eq('farm_id', FARM_ID)
      .order('full_name')

    if (supaError) {
      setError('Could not load staff. Check your connection.')
      console.error('[Staff] Load error:', supaError)
    } else {
      setPeople(data ?? [])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => { loadPeople() }, [loadPeople])

  function handlePersonAdded(person) {
    setShowForm(false)
    setPeople((prev) =>
      [...prev, person].sort((a, b) => a.full_name.localeCompare(b.full_name))
    )
  }

  // ── Filter + sort ──────────────────────────────────────────────
  const filtered = people
    .filter((p) => {
      if (filter === 'Active')   return p.active
      if (filter === 'Inactive') return !p.active
      return true
    })
    .sort((a, b) => {
      const ra = ROLE_ORDER.indexOf(a.role)
      const rb = ROLE_ORDER.indexOf(b.role)
      if (ra !== rb) return ra - rb
      return a.full_name.localeCompare(b.full_name)
    })

  // ── Summary counts ─────────────────────────────────────────────
  const activeCount = people.filter((p) => p.active).length
  const roleCounts  = ROLE_ORDER.reduce((acc, role) => {
    const n = people.filter((p) => p.role === role && p.active).length
    if (n > 0) acc[role] = n
    return acc
  }, {})

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Layout title="Staff">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">

        {/* Summary banner */}
        {!isLoading && activeCount > 0 && (
          <div className="rounded-2xl bg-nebula-600 text-white p-4">
            <p className="text-nebula-200 text-xs font-semibold uppercase tracking-wide mb-1">
              Active Staff
            </p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold font-mono">
                  {activeCount} member{activeCount !== 1 ? 's' : ''}
                </p>
                <p className="text-nebula-300 text-xs mt-0.5">
                  {Object.entries(roleCounts)
                    .map(([role, n]) => `${n} ${role}${n !== 1 ? 's' : ''}`)
                    .join(' · ')}
                </p>
              </div>
              <span className="text-4xl opacity-40">👥</span>
            </div>
          </div>
        )}

        {/* Add staff button / form */}
        {!showForm && (
          <Button
            variant="primary"
            size="md"
            fullWidth
            icon="👤"
            onClick={() => setShowForm(true)}
          >
            Add Staff Member
          </Button>
        )}

        {showForm && (
          <PersonForm
            onSaved={handlePersonAdded}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
            <button onClick={loadPeople} className="ml-2 underline font-medium">Retry</button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-sm">Loading staff…</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && people.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <p className="text-4xl mb-2">👤</p>
            <p className="text-sm font-medium">No staff members added yet</p>
            <p className="text-xs mt-1">Tap "Add Staff Member" to get started</p>
          </div>
        )}

        {/* Filter chips */}
        {!isLoading && people.length > 0 && (
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={[
                  'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors',
                  filter === f
                    ? 'bg-nebula-600 border-nebula-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600',
                ].join(' ')}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {/* Person cards */}
        {filtered.length > 0 && (
          <section className="space-y-3">
            {filtered.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                onUpdated={loadPeople}
              />
            ))}
          </section>
        )}

        {/* Empty filtered state */}
        {!isLoading && people.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">
            No {filter.toLowerCase()} staff members
          </p>
        )}

      </div>
    </Layout>
  )
}
