import { useState, useEffect, useCallback } from 'react'
import Layout   from '../../components/Layout'
import Button   from '../../components/ui/Button'
import LeadCard from './LeadCard'
import LeadForm from './LeadForm'
import { supabase, FARM_ID } from '../../lib/supabase'

const TYPE_FILTERS   = ['All', 'Clients', 'Suppliers']
const STATUS_FILTERS = ['All', 'Active', 'Won', 'Lost', 'Dormant']

// Statuses considered "active pipeline"
const ACTIVE_STATUSES = new Set(['New', 'Contacted', 'Negotiating'])

// Display order for status
const STATUS_ORDER = ['New', 'Contacted', 'Negotiating', 'Won', 'Lost', 'Dormant']

/**
 * Module 6: CRM — Client Leads & Supplier Contacts
 *
 * Track prospective buyers (retailers, restaurants, schools) and
 * input suppliers, with status progression through the sales pipeline.
 *
 * Page layout:
 *   ┌───────────────────────────────┐
 *   │  Pipeline summary banner      │
 *   ├───────────────────────────────┤
 *   │  [+ Add Contact] button       │
 *   │  LeadForm (if open)           │
 *   ├───────────────────────────────┤
 *   │  Type filter chips            │
 *   │  Status filter chips          │
 *   │  LeadCard × N                 │
 *   └───────────────────────────────┘
 */
export default function CrmPage() {
  const [leads,      setLeads]      = useState([])
  const [isLoading,  setIsLoading]  = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [error,      setError]      = useState(null)

  const loadLeads = useCallback(async () => {
    setError(null)

    const { data, error: supaError } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('farm_id', FARM_ID)
      .order('last_contact_date', { ascending: false, nullsFirst: false })

    if (supaError) {
      setError('Could not load CRM data. Check your connection.')
      console.error('[CRM] Load error:', supaError)
    } else {
      setLeads(data ?? [])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => { loadLeads() }, [loadLeads])

  function handleLeadAdded(lead) {
    setShowForm(false)
    setLeads((prev) => [lead, ...prev])
  }

  // ── Filters ────────────────────────────────────────────────────
  const filtered = leads
    .filter((l) => {
      if (typeFilter === 'Clients')   return l.lead_type === 'Client'
      if (typeFilter === 'Suppliers') return l.lead_type === 'Supplier'
      return true
    })
    .filter((l) => {
      if (statusFilter === 'Active')  return ACTIVE_STATUSES.has(l.status)
      if (statusFilter === 'Won')     return l.status === 'Won'
      if (statusFilter === 'Lost')    return l.status === 'Lost'
      if (statusFilter === 'Dormant') return l.status === 'Dormant'
      return true
    })
    .sort((a, b) => {
      const sa = STATUS_ORDER.indexOf(a.status)
      const sb = STATUS_ORDER.indexOf(b.status)
      return sa - sb
    })

  // ── Summary ────────────────────────────────────────────────────
  const activeCount   = leads.filter((l) => ACTIVE_STATUSES.has(l.status)).length
  const wonCount      = leads.filter((l) => l.status === 'Won').length
  const clientCount   = leads.filter((l) => l.lead_type === 'Client').length
  const supplierCount = leads.filter((l) => l.lead_type === 'Supplier').length

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Layout title="CRM">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">

        {/* Summary banner */}
        {!isLoading && leads.length > 0 && (
          <div className="rounded-2xl bg-nebula-600 text-white p-4">
            <p className="text-nebula-200 text-xs font-semibold uppercase tracking-wide mb-1">
              Pipeline
            </p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold font-mono">
                  {activeCount} active lead{activeCount !== 1 ? 's' : ''}
                </p>
                <p className="text-nebula-300 text-xs mt-0.5">
                  {wonCount} won · {clientCount} client{clientCount !== 1 ? 's' : ''} · {supplierCount} supplier{supplierCount !== 1 ? 's' : ''}
                </p>
              </div>
              <span className="text-4xl opacity-40">💼</span>
            </div>
          </div>
        )}

        {/* Add contact button / form */}
        {!showForm && (
          <Button
            variant="primary"
            size="md"
            fullWidth
            icon="➕"
            onClick={() => setShowForm(true)}
          >
            Add Contact
          </Button>
        )}

        {showForm && (
          <LeadForm
            onSaved={handleLeadAdded}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
            <button onClick={loadLeads} className="ml-2 underline font-medium">Retry</button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">💼</p>
            <p className="text-sm">Loading contacts…</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && leads.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <p className="text-4xl mb-2">💼</p>
            <p className="text-sm font-medium">No contacts yet</p>
            <p className="text-xs mt-1">Add buyers, retailers, and suppliers to track your pipeline</p>
          </div>
        )}

        {/* Filter chips */}
        {!isLoading && leads.length > 0 && (
          <div className="space-y-2">
            {/* Type filter */}
            <div className="flex gap-2">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={[
                    'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors',
                    typeFilter === f
                      ? 'bg-nebula-600 border-nebula-600 text-white'
                      : 'bg-white border-gray-200 text-gray-600',
                  ].join(' ')}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex gap-2 flex-wrap">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={[
                    'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors',
                    statusFilter === f
                      ? 'bg-gray-800 border-gray-800 text-white'
                      : 'bg-white border-gray-200 text-gray-600',
                  ].join(' ')}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lead cards */}
        {filtered.length > 0 && (
          <section className="space-y-3">
            {filtered.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onUpdated={loadLeads}
              />
            ))}
          </section>
        )}

        {/* Empty filtered state */}
        {!isLoading && leads.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">
            No contacts match this filter
          </p>
        )}

      </div>
    </Layout>
  )
}
