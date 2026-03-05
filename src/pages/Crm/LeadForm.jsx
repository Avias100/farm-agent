import { useState } from 'react'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { supabase, FARM_ID } from '../../lib/supabase'
import { todayDateString } from '../../lib/utils'

const LEAD_TYPES = ['Client', 'Supplier']

const PRODUCTS = [
  'Spinach', 'Cabbage', 'Cucumber', 'Lettuce',
  'Maize', 'Sunflower', 'Potatoes', 'Mixed Vegetables',
]

/**
 * Form to add a new CRM lead (client or supplier).
 *
 * Props:
 *   onSaved  — (lead) => void
 *   onCancel — () => void
 */
export default function LeadForm({ onSaved, onCancel }) {
  const [leadType,        setLeadType]        = useState('')
  const [contactName,     setContactName]     = useState('')
  const [companyName,     setCompanyName]     = useState('')
  const [phone,           setPhone]           = useState('')
  const [email,           setEmail]           = useState('')
  const [productInterest, setProductInterest] = useState('')
  const [notes,           setNotes]           = useState('')
  const [lastContactDate, setLastContactDate] = useState(todayDateString())
  const [isSubmitting,    setIsSubmitting]    = useState(false)
  const [errors,          setErrors]          = useState({})
  const [error,           setError]           = useState(null)

  function validate() {
    const e = {}
    if (!leadType)            e.leadType    = 'Select client or supplier'
    if (!contactName.trim())  e.contactName = 'Contact name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(evt) {
    evt.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setError(null)

    const { data, error: supaError } = await supabase
      .from('crm_leads')
      .insert({
        farm_id:             FARM_ID,
        lead_type:           leadType,
        contact_name:        contactName.trim(),
        business_name:       companyName.trim()  || null,
        phone:               phone.trim()         || null,
        email:               email.trim()         || null,
        products_interested: productInterest      || null,
        notes:               notes.trim()         || null,
        last_contact_date:   lastContactDate     || null,
        status:              'New',
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
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-base font-semibold text-gray-800">New Contact</h2>

      {/* Type + Contact name */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Type"
          value={leadType}
          onChange={setLeadType}
          required
          error={errors.leadType}
          placeholder="Client or Supplier…"
          options={LEAD_TYPES.map((t) => ({ value: t, label: t }))}
        />
        <div>
          <label className="field-label">
            Contact Name<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="text"
            className={['field-input', errors.contactName ? 'border-red-400' : ''].join(' ')}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="e.g. John Dube"
          />
          {errors.contactName && (
            <p className="mt-1 text-xs text-red-500">{errors.contactName}</p>
          )}
        </div>
      </div>

      {/* Company */}
      <div>
        <label className="field-label">
          Company / Business <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          className="field-input"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Checkers Fourways, AgriSupply SA"
        />
      </div>

      {/* Phone + Email */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Phone</label>
          <input
            type="tel"
            className="field-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 011 555 0100"
          />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input
            type="email"
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="optional"
          />
        </div>
      </div>

      {/* Product interest + last contact */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Product Interest"
          value={productInterest}
          onChange={setProductInterest}
          placeholder="Any / unknown"
          options={PRODUCTS.map((p) => ({ value: p, label: p }))}
        />
        <div>
          <label className="field-label">Last Contact</label>
          <input
            type="date"
            className="field-input"
            value={lastContactDate}
            onChange={(e) => setLastContactDate(e.target.value)}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="field-label">Notes</label>
        <textarea
          className="field-input resize-none"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Volume needed, pricing discussed, introductory remarks…"
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
        <Button type="submit" variant="primary" size="md" fullWidth icon="💼" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Add Contact'}
        </Button>
      </div>
    </form>
  )
}
