import { useState, useEffect, useCallback } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import db from '../db/localDb'
import { supabase } from '../lib/supabase'

/**
 * Manages the offline → online sync queue for all field-captured tables.
 *
 * Sync strategy:
 *   1. Any record saved offline has synced = 0.
 *   2. When the device comes online, syncNow() runs automatically.
 *   3. Each unsynced record is upserted to Supabase using offline_id
 *      as the conflict key — safe to retry (idempotent).
 *   4. On success, synced is set to 1 in IndexedDB.
 *
 * Tables synced (add new field-captured tables here):
 *   activities            → Supabase table: activities
 *   scouting_observations → Supabase table: scouting_observations
 *
 * Returns:
 *   pendingCount  — total records waiting to sync across all tables
 *   isSyncing     — true while a sync pass is in progress
 *   lastSyncedAt  — Date of the most recent successful sync
 *   syncNow()     — trigger a manual sync pass
 *   refreshPendingCount() — recount unsynced records
 */

// Tables that participate in offline sync.
// Each entry maps a Dexie table accessor to its Supabase table name.
const SYNC_CONFIG = [
  { supabaseTable: 'activities',            getDbTable: (d) => d.activities },
  { supabaseTable: 'scouting_observations', getDbTable: (d) => d.scouting_observations },
]

export function useSync() {
  const isOnline      = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing,    setIsSyncing]    = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)

  const refreshPendingCount = useCallback(async () => {
    let total = 0
    for (const { getDbTable } of SYNC_CONFIG) {
      total += await getDbTable(db).where('synced').equals(0).count()
    }
    setPendingCount(total)
  }, [])

  useEffect(() => {
    refreshPendingCount()
  }, [refreshPendingCount])

  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)
    let totalSynced = 0

    for (const { supabaseTable, getDbTable } of SYNC_CONFIG) {
      const dbTable  = getDbTable(db)
      const unsynced = await dbTable.where('synced').equals(0).toArray()

      for (const record of unsynced) {
        const { localId, synced, ...payload } = record // eslint-disable-line no-unused-vars

        try {
          const { error } = await supabase
            .from(supabaseTable)
            .upsert(payload, { onConflict: 'offline_id' })

          if (!error) {
            await dbTable.update(record.localId, { synced: 1 })
            totalSynced++
          }
        } catch {
          // Network dropped mid-sync — stop this table, retry next time
          break
        }
      }
    }

    if (totalSynced > 0) setLastSyncedAt(new Date())

    await refreshPendingCount()
    setIsSyncing(false)
  }, [isOnline, isSyncing, refreshPendingCount])

  // Auto-sync whenever the device comes back online
  useEffect(() => {
    if (isOnline) syncNow()
  }, [isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  return { pendingCount, isSyncing, lastSyncedAt, syncNow, refreshPendingCount }
}
