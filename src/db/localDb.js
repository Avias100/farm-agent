import Dexie from 'dexie'

/**
 * NebulaFarmDB — Dexie (IndexedDB) schema for offline-first data storage.
 *
 * Tables:
 *   activities  — field task records (offline-created, synced to Supabase)
 *   sections    — reference cache of farm sections (seeded from Supabase)
 *   people      — reference cache of farm staff (seeded from Supabase)
 *
 * Sync flag: `synced` column (0 = pending, 1 = synced to server)
 *
 * Offline conflict key: `offline_id` — client-generated UUID used as the
 * upsert conflict key when syncing to Supabase:
 *   supabase.from('activities').upsert(data, { onConflict: 'offline_id' })
 */
const db = new Dexie('NebulaFarmDB')

db.version(1).stores({
  // ++ = auto-increment PK (localId)
  // Indexed columns listed (others stored but not indexed)
  activities: [
    '++localId',
    'offline_id',
    'section_id',
    'person_id',
    'task_type',
    'status',
    'synced',
    'created_at',
  ].join(', '),

  // Reference data — keyed by Supabase id
  sections: 'id, farm_id, name',
  people:   'id, farm_id, role, active',
})

export default db
