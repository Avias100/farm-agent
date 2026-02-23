import SyncStatusBar from './SyncStatusBar'
import { useSync } from '../hooks/useSync'

/**
 * App shell layout.
 *
 * Structure:
 *   ┌─────────────────────────┐
 *   │ SyncStatusBar (fixed)   │  ← network + sync queue
 *   ├─────────────────────────┤
 *   │ Header (app name + nav) │
 *   ├─────────────────────────┤
 *   │ <children> (scrollable) │
 *   └─────────────────────────┘
 *
 * The layout is intentionally minimal for Module 1.
 * A bottom navigation bar will be added in Module 2 when routing is introduced.
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
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        {/* Farm logo placeholder */}
        <div className="w-8 h-8 rounded-lg bg-nebula-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-base leading-none">🌿</span>
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900 leading-tight">{title}</h1>
          <p className="text-xs text-gray-500 leading-tight">Nebula Fresh Produce · Gauteng</p>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
