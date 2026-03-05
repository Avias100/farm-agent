import { useState, useEffect } from 'react'
import Button   from '../../components/ui/Button'
import NoteForm from './NoteForm'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'

const ROLE_COLOURS = {
  Manager:    'bg-purple-100 text-purple-700',
  Supervisor: 'bg-blue-100   text-blue-700',
  Worker:     'bg-nebula-100 text-nebula-700',
  Driver:     'bg-amber-100  text-amber-700',
  Security:   'bg-gray-100   text-gray-700',
}

const CATEGORY_ICON = {
  Attendance:   '🕐',
  Productivity: '⚡',
  Quality:      '✅',
  Safety:       '🦺',
  Conduct:      '🤝',
  General:      '📝',
}

function stars(n) {
  if (!n) return null
  return '⭐'.repeat(n)
}

/**
 * PersonCard — expandable staff member with inline performance notes.
 *
 * Props:
 *   person     — row from people table
 *   onUpdated  — () => void  (called after deactivate)
 */
export default function PersonCard({ person, onUpdated }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [notes,      setNotes]      = useState([])
  const [isLoading,  setIsLoading]  = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load notes when expanded for the first time
  useEffect(() => {
    if (!isExpanded || notes.length > 0) return
    setIsLoading(true)
    supabase
      .from('performance_notes')
      .select('*')
      .eq('person_id', person.id)
      .order('note_date', { ascending: false })
      .then(({ data }) => {
        setNotes(data ?? [])
        setIsLoading(false)
      })
  }, [isExpanded, person.id, notes.length])

  function handleNoteSaved(note) {
    setNotes((prev) => [note, ...prev])
    setShowNoteForm(false)
  }

  async function handleToggleActive() {
    await supabase
      .from('people')
      .update({ active: !person.active })
      .eq('id', person.id)
    onUpdated()
  }

  async function handleDelete() {
    if (!confirm(`Delete ${person.full_name}? This will also delete all their performance notes and unassign them from activities.`)) return
    
    setIsDeleting(true)
    const { error } = await supabase
      .from('people')
      .delete()
      .eq('id', person.id)
    
    if (error) {
      alert('Failed to delete: ' + error.message)
      setIsDeleting(false)
    } else {
      onUpdated()
    }
  }

  const roleStyle = ROLE_COLOURS[person.role] ?? 'bg-gray-100 text-gray-600'
  const initials  = person.full_name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className={['card p-0 overflow-hidden', !person.active ? 'opacity-60' : ''].join(' ')}>

      {/* Header — always visible */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-nebula-100 text-nebula-700 flex items-center justify-center font-bold text-sm shrink-0">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 truncate">{person.full_name}</p>
            {!person.active && (
              <span className="text-xs text-gray-400 font-medium shrink-0">Inactive</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleStyle}`}>
              {person.role}
            </span>
            {person.phone && (
              <span className="text-xs text-gray-400 truncate">{person.phone}</span>
            )}
          </div>
        </div>

        <span className="text-gray-400 text-sm shrink-0">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 pb-4 space-y-3">

          {/* Actions */}
          <div className="flex gap-2 pt-3">
            {!showNoteForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNoteForm(true)}
              >
                + Add Note
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleActive}
            >
              {person.active ? 'Deactivate' : 'Reactivate'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isDeleting ? 'Deleting...' : '🗑️ Delete'}
            </Button>
          </div>

          {/* Note form */}
          {showNoteForm && (
            <NoteForm
              personId={person.id}
              onSaved={handleNoteSaved}
              onCancel={() => setShowNoteForm(false)}
            />
          )}

          {/* Notes list */}
          {isLoading && (
            <p className="text-xs text-gray-400 text-center py-2">Loading notes…</p>
          )}

          {!isLoading && notes.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">No performance notes yet</p>
          )}

          {notes.map((note) => (
            <div key={note.id} className="bg-gray-50 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{CATEGORY_ICON[note.category] ?? '📝'}</span>
                  <span className="text-xs font-semibold text-gray-700">{note.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  {note.rating && (
                    <span className="text-xs">{stars(note.rating)}</span>
                  )}
                  <span className="text-xs text-gray-400">{formatDate(note.note_date)}</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-snug">{note.note_text}</p>
            </div>
          ))}

        </div>
      )}
    </div>
  )
}
