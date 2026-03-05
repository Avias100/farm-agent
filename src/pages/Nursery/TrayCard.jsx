import { useState } from 'react'
import Button     from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { formatDate, todayDateString } from '../../lib/utils'

/**
 * Computes urgency for an active (not yet transplanted) tray.
 * Returns 'overdue' | 'due-soon' | 'upcoming' | 'no-date'
 */
function getUrgency(expectedDate) {
  if (!expectedDate) return 'no-date'
  const today    = new Date()
  today.setHours(0, 0, 0, 0)
  const exp      = new Date(expectedDate)
  const diffDays = Math.round((exp - today) / 86_400_000)

  if (diffDays < 0)  return 'overdue'
  if (diffDays <= 3) return 'due-soon'
  return 'upcoming'
}

const URGENCY_STYLES = {
  overdue:  { bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700',    label: 'Overdue'   },
  'due-soon':{ bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', label: 'Due soon'  },
  upcoming: { bar: 'bg-nebula-500', badge: 'bg-nebula-100 text-nebula-700',label: 'Upcoming' },
  'no-date':{ bar: 'bg-gray-300',   badge: 'bg-gray-100 text-gray-500',   label: 'No date'  },
}

/**
 * TrayCard — displays one nursery_tray row.
 *
 * Props:
 *   tray       — row from nursery_trays (includes sections.name via join)
 *   onUpdated  — () => void   called after any mutation so parent can refresh
 */
export default function TrayCard({ tray, onUpdated }) {
  const isTransplanted = Boolean(tray.actual_transplant_date)
  const urgency        = isTransplanted ? null : getUrgency(tray.expected_transplant_date)
  const style          = urgency ? URGENCY_STYLES[urgency] : null

  const [showTransplantForm, setShowTransplantForm] = useState(false)
  const [transplantDate,     setTransplantDate]     = useState(todayDateString())
  const [shockNotes,         setShockNotes]         = useState('')
  const [isSaving,           setIsSaving]           = useState(false)
  const [saveError,          setSaveError]          = useState(null)
  const [isDeleting,         setIsDeleting]         = useState(false)

  async function handleRecordTransplant() {
    setIsSaving(true)
    setSaveError(null)

    const { error } = await supabase
      .from('nursery_trays')
      .update({
        actual_transplant_date: transplantDate,
        transplant_shock_notes: shockNotes.trim() || null,
      })
      .eq('id', tray.id)

    if (error) {
      setSaveError(error.message)
      setIsSaving(false)
    } else {
      setShowTransplantForm(false)
      onUpdated()
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${tray.plant_name} tray (${tray.tray_count} trays)? This cannot be undone.`)) return
    
    setIsDeleting(true)
    const { error } = await supabase
      .from('nursery_trays')
      .delete()
      .eq('id', tray.id)
    
    if (error) {
      alert('Failed to delete: ' + error.message)
      setIsDeleting(false)
    } else {
      onUpdated()
    }
  }

  const sectionLabel = tray.sections?.name
    ? `Section ${tray.sections.name}`
    : 'No section'

  return (
    <div className={[
      'card overflow-hidden p-0 relative',
      isTransplanted ? 'opacity-70' : '',
    ].join(' ')}>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/80 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 flex items-center justify-center text-sm z-10"
        title="Delete tray"
      >
        {isDeleting ? '⏳' : '🗑️'}
      </button>

      {/* Urgency colour bar */}
      {style && <div className={`h-1 w-full ${style.bar}`} />}

      <div className="p-4 space-y-3">

        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900 leading-tight">
              {tray.crop_name}
              {tray.variety && (
                <span className="ml-1 font-normal text-gray-500 text-sm">({tray.variety})</span>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{sectionLabel}</p>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {/* Urgency badge (active trays only) */}
            {style && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                {style.label}
              </span>
            )}
            {/* Transplanted badge */}
            {isTransplanted && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                Transplanted
              </span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Trays" value={tray.tray_count} />
          <Stat
            label="Planted"
            value={tray.date_planted ? formatDate(tray.date_planted) : '—'}
          />
          <Stat
            label={isTransplanted ? 'Transplanted' : 'Expected'}
            value={
              isTransplanted
                ? formatDate(tray.actual_transplant_date)
                : tray.expected_transplant_date
                  ? formatDate(tray.expected_transplant_date)
                  : '—'
            }
            highlight={!isTransplanted && urgency === 'overdue'}
          />
        </div>

        {/* Germination rate */}
        {tray.germination_rate != null && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={[
                  'h-full rounded-full transition-all',
                  tray.germination_rate >= 80
                    ? 'bg-nebula-500'
                    : tray.germination_rate >= 50
                      ? 'bg-amber-400'
                      : 'bg-red-400',
                ].join(' ')}
                style={{ width: `${Math.min(100, tray.germination_rate)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 font-medium w-12 text-right">
              {Number(tray.germination_rate).toFixed(1)}%
            </span>
            <span className="text-xs text-gray-400">germ.</span>
          </div>
        )}

        {/* Transplant shock notes */}
        {isTransplanted && tray.transplant_shock_notes && (
          <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">
            {tray.transplant_shock_notes}
          </p>
        )}

        {/* Record Transplant button / form */}
        {!isTransplanted && !showTransplantForm && (
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => setShowTransplantForm(true)}
          >
            Record Transplant
          </Button>
        )}

        {showTransplantForm && (
          <div className="border-t border-gray-100 pt-3 space-y-3">
            <p className="text-xs font-semibold text-gray-600">Record Transplant</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Transplant Date</label>
                <input
                  type="date"
                  className="field-input"
                  value={transplantDate}
                  onChange={(e) => setTransplantDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="field-label">
                Transplant Shock Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                className="field-input resize-none"
                rows={2}
                value={shockNotes}
                onChange={(e) => setShockNotes(e.target.value)}
                placeholder="Wilting, losses, recovery observations…"
              />
            </div>

            {saveError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {saveError}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowTransplantForm(false); setSaveError(null) }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="success"
                size="sm"
                fullWidth
                icon="✅"
                onClick={handleRecordTransplant}
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Confirm Transplant'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div className="bg-gray-50 rounded-xl py-2 px-1">
      <p className={['text-sm font-semibold', highlight ? 'text-red-600' : 'text-gray-800'].join(' ')}>
        {value}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
