import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import db          from '../../db/localDb'
import Badge       from '../../components/ui/Badge'
import { supabase } from '../../lib/supabase'

const ISSUE_ICONS = {
  'Pest':                '🐛',
  'Disease':             '🦠',
  'Nutrient Deficiency': '🌿',
  'Leaf Burn':           '🔥',
  'Failed Plants':       '💀',
  'Germination Issue':   '🌱',
  'Other':               '⚠️',
}

const SEVERITY_VARIANT = { High: 'red', Medium: 'amber', Low: 'blue' }
const SEVERITY_ORDER   = { High: 1, Medium: 2, Low: 3 }

const FILTER_CHIPS = [
  { key: 'all',    label: 'All open' },
  { key: 'High',   label: '🔴 High'   },
  { key: 'Medium', label: '🟡 Medium'  },
  { key: 'Low',    label: '🔵 Low'    },
  { key: 'resolved', label: '✓ Resolved' },
]

/**
 * Live list of scouting observations from IndexedDB.
 * Supports filtering by severity and resolved status.
 * Allows marking an open issue as resolved (updates IndexedDB + Supabase).
 *
 * Props:
 *   sections — array from useFarmData
 */
export default function ObservationList({ sections }) {
  const [filter, setFilter] = useState('all')

  const sectionMap = Object.fromEntries(sections.map((s) => [s.id, s.name]))

  // useLiveQuery re-renders automatically when IndexedDB changes
  const observations = useLiveQuery(async () => {
    let query = db.scouting_observations.orderBy('created_at').reverse()

    if (filter === 'resolved') {
      query = db.scouting_observations
        .where('resolved').equals(1)
        .reverse()
    } else if (filter === 'all') {
      query = db.scouting_observations
        .where('resolved').equals(0)
        .reverse()
    } else {
      // Severity filter — open issues of that severity
      query = db.scouting_observations
        .where('[resolved+severity]').equals([0, filter])
        .reverse()
    }

    return query.toArray()
  }, [filter])

  async function markResolved(obs) {
    const now = new Date().toISOString()

    await db.scouting_observations.update(obs.localId, {
      resolved:          1,   // Dexie uses 1/0 for booleans in indexes
      client_updated_at: now,
      synced:            0,
    })

    // Best-effort Supabase update
    if (navigator.onLine) {
      try {
        await supabase
          .from('scouting_observations')
          .update({ resolved: true, client_updated_at: now })
          .eq('offline_id', obs.offline_id)
      } catch { /* queued for sync */ }
    }
  }

  if (!observations) {
    return <p className="text-center text-sm text-gray-400 py-6">Loading…</p>
  }

  return (
    <section className="space-y-3">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {FILTER_CHIPS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={[
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              filter === key
                ? 'bg-nebula-600 text-white border-nebula-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {observations.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-2">
            {filter === 'resolved' ? '✅' : '🔍'}
          </p>
          <p className="text-sm font-medium">
            {filter === 'resolved'
              ? 'No resolved issues'
              : 'No open issues — field looking good!'}
          </p>
        </div>
      )}

      {/* Sort open issues by severity (High first) */}
      {[...observations]
        .sort((a, b) =>
          filter === 'resolved'
            ? 0
            : (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
        )
        .map((obs) => (
          <ObservationCard
            key={obs.offline_id ?? obs.localId}
            obs={obs}
            sectionName={sectionMap[obs.section_id] ?? '?'}
            onResolve={() => markResolved(obs)}
          />
        ))}
    </section>
  )
}

function ObservationCard({ obs, sectionName, onResolve }) {
  const {
    issue_type, severity, description,
    quantity_affected, row_number, created_at,
    resolved, synced,
  } = obs
  const [isDeleting, setIsDeleting] = useState(false)

  const isResolved = resolved === 1 || resolved === true

  const timeDisplay = created_at
    ? new Date(created_at).toLocaleTimeString('en-ZA', {
        hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : '—'

  async function handleDelete() {
    if (!confirm('Delete this observation? This cannot be undone.')) return
    
    setIsDeleting(true)
    
    try {
      // Delete from IndexedDB
      await db.scouting_observations.delete(obs.localId)
      
      // Delete from Supabase if synced
      if (obs.offline_id && navigator.onLine) {
        await supabase
          .from('scouting_observations')
          .delete()
          .eq('offline_id', obs.offline_id)
      }
    } catch (err) {
      console.error('[ObservationList] Delete error:', err)
      alert('Failed to delete observation')
      setIsDeleting(false)
    }
  }

  return (
    <div className={[
      'bg-white rounded-xl border shadow-sm p-3.5 space-y-2 relative',
      isResolved ? 'border-gray-100 opacity-70' : 'border-gray-100',
    ].join(' ')}>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 flex items-center justify-center text-sm"
        title="Delete observation"
      >
        {isDeleting ? '⏳' : '🗑️'}
      </button>

      {/* Top row: issue type + severity */}
      <div className="flex items-start justify-between gap-2 pr-8">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{ISSUE_ICONS[issue_type] ?? '⚠️'}</span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-900 leading-tight">{issue_type}</p>
            <p className="text-xs text-gray-500">
              Section {sectionName}
              {row_number ? ` · Row ${row_number}` : ''}
              {' · '}{timeDisplay}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {!isResolved
            ? <Badge variant={SEVERITY_VARIANT[severity] ?? 'gray'}>{severity}</Badge>
            : <Badge variant="green">Resolved</Badge>
          }
          {synced === 0 && (
            <span className="text-xs text-amber-500 font-medium">⏳ pending</span>
          )}
        </div>
      </div>

      {/* Quantity */}
      {quantity_affected && (
        <p className="text-xs text-gray-600 font-medium">
          {quantity_affected} plant{quantity_affected !== 1 ? 's' : ''} affected
        </p>
      )}

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
      )}

      {/* Resolve button — only for open issues */}
      {!isResolved && (
        <button
          onClick={onResolve}
          className="w-full text-center text-xs font-semibold text-nebula-700 py-1.5 border border-nebula-200 rounded-lg hover:bg-nebula-50 active:bg-nebula-100 transition-colors mt-1"
        >
          ✓ Mark as Resolved
        </button>
      )}
    </div>
  )
}
