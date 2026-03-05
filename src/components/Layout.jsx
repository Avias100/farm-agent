import SyncStatusBar from './SyncStatusBar'
import BottomNav     from './BottomNav'
import HeaderMenu    from './HeaderMenu'
import { useSync }   from '../hooks/useSync'

/**
 * App shell layout.
 *
 * Structure:
 *   ┌─────────────────────────┐
 *   │ SyncStatusBar           │  ← network status + pending sync count
 *   ├─────────────────────────┤
 *   │ Header                  │  ← farm name + page title
 *   ├─────────────────────────┤
 *   │ <children>              │  ← scrollable page content
 *   ├─────────────────────────┤
 *   │ BottomNav               │  ← module navigation tabs
 *   └─────────────────────────┘
 */
export default function Layout({ title = 'Nebula Fresh Produce', children }) {
  const { pendingCount, isSyncing, lastSyncedAt, syncNow } = useSync()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Sync status strip */}
      <SyncStatusBar
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onSyncNow={syncNow}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
          <img src="/logo.svg" alt="Nebula Logo" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900 leading-tight">{title}</h1>
          <p className="text-xs text-gray-500 leading-tight">Nebula Fresh Produce · Gauteng</p>
        </div>
        <HeaderMenu />
      </header>

      {/* Page content — fills remaining height, scrollable */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom navigation — fixed above phone home indicator */}
      <BottomNav />
    </div>
  )
}
