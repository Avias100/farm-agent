import { useState } from 'react'
import Button        from '../../components/ui/Button'
import Select        from '../../components/ui/Select'
import { supabase }  from '../../lib/supabase'
import { FARM_ID }   from '../../lib/supabase'
import { todayDateString } from '../../lib/utils'

// Crops grown at Nebula Fresh Produce
const CROPS = [
  'Spinach', 'Cabbage', 'Cucumber', 'Lettuce',
  'Maize', 'Sunflower', 'Potatoes',
]

/**
 * Form to record a new produce delivery to the JHB Fresh Produce Market.
 * After saving, the form calls onSaved(delivery) with the new row.
 *
 * Note: market_deliveries are always created online (manager desk function).
 * No offline queue is needed here.
 *
 * Props:
 *   onSaved  — (delivery) => void
 *   onCancel — () => void
 */
export default function DeliveryForm({ onSaved, onCancel }) {
  const [deliveryDate,     setDeliveryDate]     = useState(todayDateString())
  const [productName,      setProductName]      = useState('')
  const [variety,          setVariety]          = useState('')
  const [quantitySent,     setQuantitySent]     = useState('')
  const [quantityReceived, setQuantityReceived] = useState('')
  const [quantityUnsold,   setQuantityUnsold]   = useState('')
  const [quantityDiscarded,setQuantityDiscarded]= useState('')
  const [gateStamp,        setGateStamp]        = useState('')
  const [producerRef,      setProducerRef]      = useState('')
  const [notes,            setNotes]            = useState('')
  const [isSubmitting,     setIsSubmitting]     = useState(false)
  const [error,            setError]            = useState(null)
  const [errors,           setErrors]           = useState({})

  function validate() {
    const e = {}
    if (!deliveryDate) e.deliveryDate = 'Required'
    if (!productName)  e.productName  = 'Select a crop'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setError(null)

    const { data, error: supaError } = await supabase
      .from('market_deliveries')
      .insert({
        farm_id:             FARM_ID,
        delivery_date:       deliveryDate,
        product_name:        productName,
        variety:             variety.trim() || null,
        quantity_sent:       quantitySent     ? parseFloat(quantitySent)      : null,
        quantity_received:   quantityReceived ? parseFloat(quantityReceived)  : null,
        quantity_unsold:     quantityUnsold   ? parseFloat(quantityUnsold)    : null,
        quantity_discarded:  quantityDiscarded? parseFloat(quantityDiscarded) : null,
        gate_stamp_number:   gateStamp.trim()    || null,
        producer_ref_number: producerRef.trim()  || null,
        delivery_notes:      notes.trim()        || null,
        agent_name:          'DW Fresh Produce JHB',
        arrival_timestamp:   new Date().toISOString(),
      })
      .select('*, market_batches(*)')
      .single()

    if (supaError) {
      setError(supaError.message)
      setIsSubmitting(false)
      return
    }

    onSaved(data)
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-base font-semibold text-gray-800">New Delivery to JHB Market</h2>

      {/* Date + Product */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">
            Delivery Date<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="date"
            className={['field-input', errors.deliveryDate ? 'border-red-400' : ''].join(' ')}
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            required
          />
          {errors.deliveryDate && <p className="mt-1 text-xs text-red-500">{errors.deliveryDate}</p>}
        </div>

        <Select
          label="Crop"
          value={productName}
          onChange={setProductName}
          required
          error={errors.productName}
          placeholder="Select crop…"
          options={CROPS.map((c) => ({ value: c, label: c }))}
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
          placeholder="e.g. Savoy, Sweet Corn, Baby Spinach"
        />
      </div>

      {/* Quantities */}
      <div>
        <p className="field-label">Quantities (kg)</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Sent from farm', quantitySent,      setQuantitySent,      'Sent'],
            ['Received at market', quantityReceived, setQuantityReceived, 'Received'],
            ['Unsold (returned)', quantityUnsold,  setQuantityUnsold,   'Unsold'],
            ['Discarded at market', quantityDiscarded, setQuantityDiscarded, 'Discarded'],
          ].map(([label, val, setter, placeholder]) => (
            <div key={label}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input
                type="number"
                min="0"
                step="0.001"
                className="field-input"
                value={val}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Reference numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Gate Stamp #</label>
          <input
            type="text"
            className="field-input"
            value={gateStamp}
            onChange={(e) => setGateStamp(e.target.value)}
            placeholder="e.g. GS-4521"
          />
        </div>
        <div>
          <label className="field-label">Producer Ref #</label>
          <input
            type="text"
            className="field-input"
            value={producerRef}
            onChange={(e) => setProducerRef(e.target.value)}
            placeholder="e.g. NF-2026-001"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="field-label">Delivery Notes</label>
        <textarea
          className="field-input resize-none"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Transport conditions, delays, quality observations…"
        />
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
        <Button type="submit" variant="primary" size="md" fullWidth icon="🚛" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Record Delivery'}
        </Button>
      </div>
    </form>
  )
}
