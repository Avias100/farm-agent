import { useState, useEffect } from 'react'
import Button  from '../../components/ui/Button'
import Select  from '../../components/ui/Select'
import { supabase, FARM_ID } from '../../lib/supabase'
import { todayDateString } from '../../lib/utils'

const CROPS = [
  'Spinach', 'Cabbage', 'Cucumber', 'Lettuce',
  'Maize', 'Sunflower', 'Potatoes',
]

/**
 * Form to record a new nursery tray batch.
 *
 * Props:
 *   onSaved  — (tray) => void   called after successful insert
 *   onCancel — () => void
 */
export default function NurseryForm({ onSaved, onCancel }) {
  const [sections,              setSections]              = useState([])
  const [sectionId,             setSectionId]             = useState('')
  const [cropName,              setCropName]              = useState('')
  const [variety,               setVariety]               = useState('')
  const [trayCount,             setTrayCount]             = useState('')
  const [datePlanted,           setDatePlanted]           = useState(todayDateString())
  const [expectedTransplant,    setExpectedTransplant]    = useState('')
  const [germinationRate,       setGerminationRate]       = useState('')
  const [isSubmitting,          setIsSubmitting]          = useState(false)
  const [errors,                setErrors]                = useState({})
  const [error,                 setError]                 = useState(null)

  // Load sections for the dropdown
  useEffect(() => {
    supabase
      .from('sections')
      .select('id, name')
      .eq('farm_id', FARM_ID)
      .order('name')
      .then(({ data }) => setSections(data ?? []))
  }, [])

  function validate() {
    const e = {}
    if (!cropName)  e.cropName  = 'Select a crop'
    if (!trayCount || Number(trayCount) < 1) e.trayCount = 'Enter tray count'
    if (!datePlanted) e.datePlanted = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(evt) {
    evt.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setError(null)

    const { data, error: supaError } = await supabase
      .from('nursery_trays')
      .insert({
        farm_id:                  FARM_ID,
        section_id:               sectionId   || null,
        crop_name:                cropName,
        variety:                  variety.trim() || null,
        tray_count:               parseInt(trayCount, 10),
        date_planted:             datePlanted,
        expected_transplant_date: expectedTransplant || null,
        germination_rate:         germinationRate !== '' ? parseFloat(germinationRate) : null,
      })
      .select('*, sections(name)')
      .single()

    if (supaError) {
      setError(supaError.message)
      setIsSubmitting(false)
      return
    }

    onSaved(data)
  }

  const sectionOptions = sections.map((s) => ({ value: s.id, label: `Section ${s.name}` }))

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-base font-semibold text-gray-800">New Tray Batch</h2>

      {/* Crop + Section */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Crop"
          value={cropName}
          onChange={setCropName}
          required
          error={errors.cropName}
          placeholder="Select crop…"
          options={CROPS.map((c) => ({ value: c, label: c }))}
        />
        <Select
          label="Section"
          value={sectionId}
          onChange={setSectionId}
          placeholder="Any section"
          options={sectionOptions}
        />
      </div>

      {/* Variety */}
      <div>
        <label className="field-label">
          Variety <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          className="field-input"
          value={variety}
          onChange={(e) => setVariety(e.target.value)}
          placeholder="e.g. Baby Spinach, Savoy"
        />
      </div>

      {/* Tray count + Germination rate */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">
            Tray Count<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="number"
            min="1"
            step="1"
            className={['field-input', errors.trayCount ? 'border-red-400' : ''].join(' ')}
            value={trayCount}
            onChange={(e) => setTrayCount(e.target.value)}
            placeholder="e.g. 50"
          />
          {errors.trayCount && <p className="mt-1 text-xs text-red-500">{errors.trayCount}</p>}
        </div>
        <div>
          <label className="field-label">
            Germination % <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            className="field-input"
            value={germinationRate}
            onChange={(e) => setGerminationRate(e.target.value)}
            placeholder="e.g. 92"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">
            Date Planted<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="date"
            className={['field-input', errors.datePlanted ? 'border-red-400' : ''].join(' ')}
            value={datePlanted}
            onChange={(e) => setDatePlanted(e.target.value)}
          />
          {errors.datePlanted && <p className="mt-1 text-xs text-red-500">{errors.datePlanted}</p>}
        </div>
        <div>
          <label className="field-label">
            Expected Transplant <span className="text-gray-400 font-normal">(opt)</span>
          </label>
          <input
            type="date"
            className="field-input"
            value={expectedTransplant}
            onChange={(e) => setExpectedTransplant(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" fullWidth icon="🌱" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Record Batch'}
        </Button>
      </div>
    </form>
  )
}
