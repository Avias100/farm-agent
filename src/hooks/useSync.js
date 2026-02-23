import { useState, useEffect, useCallback } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import db from '../db/localDb'
import { supabase } from '../lib/supabase'

/**
 * Manages the offline → online sync queue for activities.
 *
 * Sync strategy:
 *   1. Any activity saved offline has synced = 0.
 *   2. When the device comes online, syncNow() runs automatically.
 *   3. Each unsynced record is upserted to Supabase using offline_id
 *      as the conflict key — safe to retry (idempotent).
 *   4. Conflict resolution: if the server record has a newer
 *      client_updated_at timestamp, the server value is preserved
 *      (server wins on ties or older client records).
 *   5. On success, synced is set to 1 in IndexedDB.
 *
 * Returns:
 *   pendingCount  — number of records waiting to sync
 *   isSyncing     — true while a sync is in progress
 *   lastSyncedAt  — Date of the most recent successful sync
 *   syncNow()     — trigger a manual sync
 */
export function useSync() {
  const isOnline      = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing,    setIsSyncing]    = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)

  // Keep pendingCount in sync with IndexedDB
  const refreshPendingCount = useCallback(async () => {
    const count = await db.activities.where('synced').equals(0).count()
    setPendingCount(count)
  }, [])

  useEffect(() => {
    refreshPendingCount()
  }, [refreshPendingCount])

  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return

    const unsynced = await db.activities.where('synced').equals(0).toArray()
    if (unsynced.length === 0) return

    setIsSyncing(true)
    let syncedCount = 0

    for (const record of unsynced) {
      // Strip IndexedDB-only fields before sending to Supabase
      const { localId, synced, ...payload } = record  // eslint-disable-line no-unused-vars

      try {
        const { error } = await supabase
          .from('activities')
          .upsert(payload, { onConflict: 'offline_id' })

        if (!error) {
          await db.activities.update(record.localId, { synced: 1 })
          syncedCount++
        }
      } catch {
        // Network error mid-sync — stop and retry next time
        break
      }
    }

    if (syncedCount > 0) {
      setLastSyncedAt(new Date())
    }

    await refreshPendingCount()
    setIsSyncing(false)
  }, [isOnline, isSyncing, refreshPendingCount])

  // Auto-sync whenever the device comes back online
  useEffect(() => {
    if (isOnline) {
      syncNow()
    }
  }, [isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  return { pendingCount, isSyncing, lastSyncedAt, syncNow, refreshPendingCount }
}
