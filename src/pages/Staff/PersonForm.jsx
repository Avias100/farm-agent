import { useState } from 'react'
import Button  from '../../components/ui/Button'
import Select  from '../../components/ui/Select'
import { supabase, FARM_ID } from '../../lib/supabase'

const ROLES = ['Worker', 'Supervisor', 'Manager', 'Driver', 'Security']

/**
 * Form to add a new staff member.
 *
 * Props:
 *   onSaved  — (person) => void
 *   onCancel — () => void
 */
export default function PersonForm({ onSaved, onCancel }) {
  const [name,         setName]         = useState('')
  const [role,         setRole]         = useState('')
  const [phone,        setPhone]        = useState('')
  const [email,        setEmail]        = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors,       setErrors]       = useState({})
  const [error,        setError]        = useState(null)

  function validate() {
    const e = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!role)        e.role = 'Select a role'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(evt) {
    evt.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setError(null)

    const { data, error: supaError } = await supabase
      .from('people')
      .insert({
        farm_id:   FARM_ID,
        name:      name.trim(),
        role,
        phone:     phone.trim()  || null,
        email:     email.trim()  || null,
        is_active: true,
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
      <h2 className="text-base font-semibold text-gray-800">Add Staff Member</h2>

      {/* Name + Role */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">
            Full Name<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="text"
            className={['field-input', errors.name ? 'border-red-400' : ''].join(' ')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Thabo Molefe"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        <Select
          label="Role"
          value={role}
          onChange={setRole}
          required
          error={errors.role}
          placeholder="Select role…"
          options={ROLES.map((r) => ({ value: r, label: r }))}
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
            placeholder="e.g. 082 555 0100"
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

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" fullWidth icon="👤" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Add Member'}
        </Button>
      </div>
    </form>
  )
}
