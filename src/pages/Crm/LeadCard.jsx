import { useState } from 'react'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { supabase } from '../../lib/supabase'
import { formatDate, todayDateString } from '../../lib/utils'

const STATUSES = ['New', 'Contacted', 'Negotiating', 'Won', 'Lost', 'Dormant']

const STATUS_STYLES = {
  New:         { pill: 'bg-blue-100   text-blue-700',   dot: 'bg-blue-400'   },
  Contacted:   { pill: 'bg-amber-100  text-amber-700',  dot: 'bg-amber-400'  },
  Negotiating: { pill: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
  Won:         { pill: 'bg-nebula-100 text-nebula-700', dot: 'bg-nebula-500' },
  Lost:        { pill: 'bg-red-100    text-red-700',    dot: 'bg-red-400'    },
  Dormant:     { pill: 'bg-gray-100   text-gray-500',   dot: 'bg-gray-300'   },
}

const TYPE_ICON = { Client: '🛒', Supplier: '🚚' }

/**
 * LeadCard — expandable CRM contact card.
 *
 * Props:
 *   lead      — row from crm_leads
 *   onUpdated — () => void
 */
export default function LeadCard({ lead, onUpdated }) {
  const [isExpanded,    setIsExpanded]    = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [newStatus,     setNewStatus]     = useState(lead.status)
  const [newNote,       setNewNote]       = useState('')
  const [contactDate,   setContactDate]   = useState(todayDateString())
  const [isSaving,      setIsSaving]      = useState(false)
  const [saveError,     setSaveError]     = useState(null)
  const [isDeleting,    setIsDeleting]    = useState(false)

  const style = STATUS_STYLES[lead.status] ?? STATUS_STYLES.New

  async function handleUpdateStatus() {
    setIsSaving(true)
    setSaveError(null)

    const updates = {
      status: newStatus,
      last_contact_date: contactDate || null,
    }
    if (newNote.trim()) {
      // Append new note to existing notes
      updates.notes = [lead.notes, newNote.trim()].filter(Boolean).join('\n\n—\n\n')
    }

    const { error } = await supabase
      .from('crm_leads')
      .update(updates)
      .eq('id', lead.id)

    if (error) {
      setSaveError(error.message)
      setIsSaving(false)
    } else {
      setEditingStatus(false)
      setNewNote('')
      onUpdated()
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete lead for ${lead.business_name}? This cannot be undone.`)) return
    
    setIsDeleting(true)
    const { error } = await supabase
      .from('crm_leads')
      .delete()
      .eq('id', lead.id)
    
    if (error) {
      alert('Failed to delete: ' + error.message)
      setIsDeleting(false)
    } else {
      onUpdated()
    }
  }

  return (
    <div className="card p-0 overflow-hidden">

      {/* Header */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* Type icon */}
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl shrink-0">
          {TYPE_ICON[lead.lead_type] ?? '📋'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 truncate">{lead.contact_name}</p>
            <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${style.pill}`}>
              {lead.status}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {lead.business_name && (
              <p className="text-xs text-gray-500 truncate">{lead.business_name}</p>
            )}
            {lead.product_interest && (
              <span className="text-xs text-gray-400">· {lead.product_interest}</span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400 font-medium">{lead.lead_type}</p>
          {lead.last_contact_date && (
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(lead.last_contact_date)}</p>
          )}
        </div>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 pb-4 space-y-3">

          {/* Contact details */}
          <div className="grid grid-cols-2 gap-2 pt-3">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-1.5 text-xs text-nebula-700 font-medium"
              >
                <span>📞</span> {lead.phone}
              </a>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-1.5 text-xs text-nebula-700 font-medium truncate"
              >
                <span>✉️</span> {lead.email}
              </a>
            )}
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-snug">{lead.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!editingStatus && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditingStatus(true)}
                >
                  Update Status
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {isDeleting ? '⏳' : '🗑️'}
                </Button>
              </>
            )}
          </div>

          {/* Status update form */}
          {editingStatus && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Update Contact</p>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Status"
                  value={newStatus}
                  onChange={setNewStatus}
                  options={STATUSES.map((s) => ({ value: s, label: s }))}
                />
                <div>
                  <label className="field-label">Last Contact</label>
                  <input
                    type="date"
                    className="field-input"
                    value={contactDate}
                    onChange={(e) => setContactDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="field-label">
                  Add Note <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  className="field-input resize-none"
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="What was discussed, next steps…"
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
                  onClick={() => { setEditingStatus(false); setSaveError(null) }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={handleUpdateStatus}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving…' : 'Save Update'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
