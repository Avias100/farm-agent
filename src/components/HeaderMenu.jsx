import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const MENU_ITEMS = [
  { to: '/',          icon: '🌱', label: 'Activity Logger' },
  { to: '/scouting',  icon: '🔍', label: 'Scouting' },
  { to: '/market',    icon: '📦', label: 'Market' },
  { to: '/nursery',   icon: '🌿', label: 'Nursery' },
  { to: '/staff',     icon: '👥', label: 'Staff' },
  { to: '/crm',       icon: '💼', label: 'CRM' },
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/workplan',  icon: '📅', label: 'Workplan' },
]

/**
 * Dropdown menu for quick navigation between modules.
 * Shows all available sections with icons.
 */
export default function HeaderMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="relative">
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-center"
        aria-label="Menu"
      >
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu panel */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Quick Navigation
              </p>
            </div>

            <div className="py-1">
              {MENU_ITEMS.map(({ to, icon, label }) => {
                const isActive = location.pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setIsOpen(false)}
                    className={[
                      'flex items-center gap-3 px-4 py-2.5 transition-colors',
                      isActive
                        ? 'bg-nebula-50 text-nebula-700'
                        : 'text-gray-700 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <span className="text-xl leading-none">{icon}</span>
                    <span className="font-medium text-sm">{label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-nebula-600" />
                    )}
                  </Link>
                )
              })}
            </div>

            <div className="border-t border-gray-100 mt-1 pt-1">
              <div className="px-4 py-2">
                <p className="text-xs text-gray-500 mb-1">Signed in as:</p>
                <p className="text-xs font-medium text-gray-700 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <span className="text-xl leading-none">🚪</span>
                <span className="font-medium text-sm">Sign Out</span>
              </button>
            </div>

            <div className="border-t border-gray-100 px-4 py-2">
              <p className="text-xs text-gray-400">
                Nebula Fresh Produce · v0.1.0
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
