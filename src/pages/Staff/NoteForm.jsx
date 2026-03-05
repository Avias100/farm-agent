import { useState } from 'react'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { supabase, FARM_ID } from '../../lib/supabase'
import { todayDateString } from '../../lib/utils'

const CATEGORIES = [
  'Attendance', 'Productivity', 'Quality', 'Safety', 'Conduct', 'General',
]

const RATING_LABELS = {
  1: '⭐ Poor',
  2: '⭐⭐ Below average',
  3: '⭐⭐⭐ Satisfactory',
  4: '⭐⭐⭐⭐ Good',
  5: '⭐⭐⭐⭐⭐ Excellent',
}

/**
 * Inline form to add a performance note for a specific person.
 *
 * Props:
 *   personId — UUID of the person being reviewed
 *   onSaved  — (note) => void
 *   onCancel — () => void
 */
export default function NoteForm({ personId, onSaved, onCancel }) {
  const [noteDate,     setNoteDate]     = useState(todayDateString())
  const [category,     setCategory]     = useState('')
  const [rating,       setRating]       = useState('')
  const [noteText,     setNoteText]     = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors,       setErrors]       = useState({})
  const [error,        setError]        = useState(null)

  function validate() {
    const e = {}
    if (!category)       e.category = 'Select a category'
    if (!noteText.trim()) e.noteText = 'Note text is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(evt) {
    evt.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setError(null)

    const { data, error: supaError } = await supabase
      .from('performance_notes')
      .insert({
        farm_id:   FARM_ID,
        person_id: personId,
        note_date: noteDate,
        category,
        rating:    rating ? parseInt(rating, 10) : null,
        note_text: noteText.trim(),
      })
      .select('*')
      .single()

    if (supaError) {
      setError(supaError.message)
      setIsSubmitting(false)
      return
    }

    onSaved(data)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-3 space-y-3 border border-gray-100">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Add Performance Note</p>

      {/* Date + Category */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Date</label>
          <input
            type="date"
            className="field-input"
            value={noteDate}
            onChange={(e) => setNoteDate(e.target.value)}
          />
        </div>
        <Select
          label="Category"
          value={category}
          onChange={setCategory}
          required
          error={errors.category}
          placeholder="Select…"
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
      </div>

      {/* Rating chips */}
      <div>
        <label className="field-label">Rating <span className="text-gray-400 font-normal">(optional)</span></label>
        <div className="flex gap-1 flex-wrap mt-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(rating === String(n) ? '' : String(n))}
              className={[
                'text-xs px-2 py-1 rounded-lg border font-medium transition-colors',
                rating === String(n)
                  ? 'bg-nebula-600 border-nebula-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600',
              ].join(' ')}
            >
              {'⭐'.repeat(n)}
            </button>
          ))}
        </div>
        {rating && (
          <p className="mt-1 text-xs text-gray-500">{RATING_LABELS[parseInt(rating, 10)]}</p>
        )}
      </div>

      {/* Note text */}
      <div>
        <label className="field-label">
          Note<span className="text-red-500 ml-0.5">*</span>
        </label>
        <textarea
          className={['field-input resize-none', errors.noteText ? 'border-red-400' : ''].join(' ')}
          rows={3}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Describe the observation, incident, or commendation…"
        />
        {errors.noteText && <p className="mt-1 text-xs text-red-500">{errors.noteText}</p>}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Note'}
        </Button>
      </div>
    </form>
  )
}
