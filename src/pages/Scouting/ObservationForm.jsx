import { useState } from 'react'
import Button  from '../../components/ui/Button'
import Select  from '../../components/ui/Select'
import { generateId } from '../../lib/utils'
import db              from '../../db/localDb'
import { supabase }    from '../../lib/supabase'

const ISSUE_TYPES = [
  'Pest', 'Disease', 'Nutrient Deficiency',
  'Leaf Burn', 'Failed Plants', 'Germination Issue', 'Other',
]

const SEVERITIES = ['Low', 'Medium', 'High']

// Emoji hint shown alongside the issue type label
const ISSUE_ICONS = {
  'Pest':                '🐛',
  'Disease':             '🦠',
  'Nutrient Deficiency': '🌿',
  'Leaf Burn':           '🔥',
  'Failed Plants':       '💀',
  'Germination Issue':   '🌱',
  'Other':               '⚠️',
}

/**
 * Form for logging a new scouting observation.
 *
 * Props:
 *   sections      — array from useFarmData
 *   onSaved       — () => void  — called after record is saved to IndexedDB
 *   onSyncNeeded  — () => void  — tells parent to refresh pending count
 */
export default function ObservationForm({ sections, onSaved, onSyncNeeded }) {
  const [sectionId,         setSectionId]         = useState('')
  const [rowNumber,         setRowNumber]          = useState('')
  const [issueType,         setIssueType]          = useState('')
  const [severity,          setSeverity]           = useState('')
  const [quantityAffected,  setQuantityAffected]   = useState('')
  const [description,       setDescription]        = useState('')
  const [isSubmitting,      setIsSubmitting]       = useState(false)
  const [errors,            setErrors]             = useState({})
  const [savedFlash,        setSavedFlash]         = useState(false)

  function validate() {
    const e = {}
    if (!sectionId) e.sectionId = 'Select a section'
    if (!issueType) e.issueType = 'Select an issue type'
    if (!severity)  e.severity  = 'Select severity'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)

    const now        = new Date().toISOString()
    const offline_id = generateId()

    const observation = {
      id:                offline_id,
      offline_id,
      section_id:        sectionId,
      row_number:        rowNumber ? parseInt(rowNumber, 10) : null,
      issue_type:        issueType,
      severity,
      quantity_affected: quantityAffected ? parseInt(quantityAffected, 10) : null,
      description:       description.trim() || null,
      resolved:          0,    // 0 = open, 1 = resolved — integer keeps Dexie compound index consistent
      created_offline:   !navigator.onLine,
      client_updated_at: now,
      synced_at:         null,
      created_at:        now,
      synced:            0,
    }

    // 1. Save to IndexedDB — instant, works offline
    await db.scouting_observations.add(observation)

    // 2. Try Supabase in background
    if (navigator.onLine) {
      try {
        const { localId: _l, synced: _s, ...payload } = observation // eslint-disable-line no-unused-vars
        await supabase
          .from('scouting_observations')
          .upsert(payload, { onConflict: 'offline_id' })
      } catch {
        // Queued for background sync
      }
    }

    onSyncNeeded()

    // Flash success and reset form
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)

    setSectionId('')
    setRowNumber('')
    setIssueType('')
    setSeverity('')
    setQuantityAffected('')
    setDescription('')
    setErrors({})
    setIsSubmitting(false)
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h2 className="text-base font-semibold text-gray-800">Log Observation</h2>

      {/* Success flash */}
      {savedFlash && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 font-medium">
          ✓ Observation saved
          {!navigator.onLine && ' — will sync when online'}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Select
            label="Section"
            value={sectionId}
            onChange={setSectionId}
            required
            error={errors.sectionId}
            placeholder="Choose section…"
            options={sections.map((s) => ({ value: s.id, label: `Section ${s.name}` }))}
          />
        </div>

        <div>
          <label className="field-label">Row # <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="number"
            min="1"
            className="field-input"
            value={rowNumber}
            onChange={(e) => setRowNumber(e.target.value)}
            placeholder="e.g. 3"
          />
        </div>

        <div>
          <label className="field-label">
            Qty Affected <span className="text-gray-400 font-normal">(plants)</span>
          </label>
          <input
            type="number"
            min="1"
            className="field-input"
            value={quantityAffected}
            onChange={(e) => setQuantityAffected(e.target.value)}
            placeholder="e.g. 12"
          />
        </div>

        <div className="col-span-2">
          <Select
            label="Issue Type"
            value={issueType}
            onChange={setIssueType}
            required
            error={errors.issueType}
            placeholder="What did you observe?"
            options={ISSUE_TYPES.map((t) => ({
              value: t,
              label: `${ISSUE_ICONS[t]}  ${t}`,
            }))}
          />
        </div>

        <div className="col-span-2">
          <Select
            label="Severity"
            value={severity}
            onChange={setSeverity}
            required
            error={errors.severity}
            placeholder="How severe?"
            options={SEVERITIES.map((s) => ({ value: s, label: s }))}
          />
        </div>
      </div>

      <div>
        <label className="field-label">Description</label>
        <textarea
          className="field-input resize-none"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What exactly did you see? Describe location, affected plants, visible symptoms…"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        icon="📋"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving…' : 'Log Observation'}
      </Button>

      {!navigator.onLine && (
        <p className="text-xs text-center text-amber-600 font-medium">
          Offline — observation saved locally, will sync when connected
        </p>
      )}
    </form>
  )
}
