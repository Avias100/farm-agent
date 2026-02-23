import { useOnlineStatus } from '../hooks/useOnlineStatus'

/**
 * Fixed top bar showing network status and offline sync queue count.
 *
 * Props:
 *   pendingCount — number of activities waiting to sync
 *   isSyncing    — boolean
 *   lastSyncedAt — Date | null
 *   onSyncNow    — () => void  (manual sync trigger)
 */
export default function SyncStatusBar({ pendingCount, isSyncing, lastSyncedAt, onSyncNow }) {
  const isOnline = useOnlineStatus()

  return (
    <div
      className={[
        'flex items-center justify-between px-4 py-2 text-xs font-medium',
        isOnline
          ? 'bg-nebula-600 text-white'
          : 'bg-amber-500 text-white',
      ].join(' ')}
    >
      {/* Left: network status */}
      <div className="flex items-center gap-1.5">
        <span
          className={[
            'w-2 h-2 rounded-full',
            isOnline ? 'bg-white' : 'bg-amber-200',
          ].join(' ')}
        />
        <span>{isOnline ? 'Online' : 'Offline — changes saved locally'}</span>
      </div>

      {/* Right: sync queue */}
      <div className="flex items-center gap-2">
        {isSyncing && (
          <span className="opacity-80">Syncing…</span>
        )}

        {!isSyncing && pendingCount > 0 && isOnline && (
          <button
            onClick={onSyncNow}
            className="underline opacity-90 hover:opacity-100 active:opacity-70"
          >
            Sync {pendingCount} {pendingCount === 1 ? 'record' : 'records'}
          </button>
        )}

        {!isSyncing && pendingCount > 0 && !isOnline && (
          <span className="opacity-80">
            {pendingCount} pending
          </span>
        )}

        {!isSyncing && pendingCount === 0 && lastSyncedAt && (
          <span className="opacity-70">All synced</span>
        )}
      </div>
    </div>
  )
}
