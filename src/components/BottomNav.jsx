import { NavLink } from 'react-router-dom'

/**
 * Fixed bottom navigation bar.
 * New module tabs are added here as each module is built.
 *
 * Current tabs (Modules 1–3):
 *   🌱  Activities  /
 *   🔍  Scouting    /scouting
 *   📦  Market      /market
 *
 * Tabs to uncomment for future modules:
 *   🌿  Nursery     /nursery
 *   👥  Staff       /staff
 *   💼  CRM         /crm
 *   📊  Dashboard   /dashboard
 *   📅  Workplan    /workplan
 */
const NAV_ITEMS = [
  { to: '/',         icon: '🌱', label: 'Activities' },
  { to: '/scouting', icon: '🔍', label: 'Scouting'   },
  { to: '/market',   icon: '📦', label: 'Market'     },
  { to: '/nursery',  icon: '🌿', label: 'Nursery'    },
  { to: '/staff',    icon: '👥', label: 'Staff'      },
  { to: '/crm',       icon: '💼', label: 'CRM'       },
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/workplan',  icon: '📅', label: 'Workplan'  },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex safe-area-bottom z-50">
      {NAV_ITEMS.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}  // exact match for home so /scouting doesn't highlight it
          className={({ isActive }) =>
            [
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px]',
              'text-xs font-medium transition-colors duration-150',
              isActive
                ? 'text-nebula-700'
                : 'text-gray-400 hover:text-gray-600',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={[
                  'text-xl leading-none',
                  isActive ? 'opacity-100' : 'opacity-60',
                ].join(' ')}
              >
                {icon}
              </span>
              <span>{label}</span>
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-nebula-600" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
