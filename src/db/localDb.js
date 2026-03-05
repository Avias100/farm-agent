import Dexie from 'dexie'

/**
 * NebulaFarmDB — Dexie (IndexedDB) offline-first database.
 *
 * Version history:
 *   v1 — activities, sections, people
 *   v2 — adds scouting_observations
 *
 * Offline sync pattern (same for all field-captured tables):
 *   synced = 0  → pending upload to Supabase
 *   synced = 1  → successfully written to Supabase
 *   offline_id  → client UUID; used as ON CONFLICT key on upsert
 */
const db = new Dexie('NebulaFarmDB')

// v1 ─ initial tables (never edit; add new versions below)
db.version(1).stores({
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

  sections: 'id, farm_id, name',
  people:   'id, farm_id, role, active',
})

// v2 ─ scouting observations (additive; existing tables unchanged)
// NOTE: `resolved` is stored as 0 (open) or 1 (resolved) — never boolean —
// so Dexie's equals(0)/equals(1) queries and compound indexes work correctly.
db.version(2).stores({
  scouting_observations: [
    '++localId',
    'offline_id',
    'section_id',
    'issue_type',
    'severity',
    'resolved',
    'synced',
    'created_at',
    '[resolved+severity]',  // compound index: filter open issues by severity
  ].join(', '),
})

export default db
