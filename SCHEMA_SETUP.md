# Nebula Fresh Produce — Schema Setup Guide

Complete setup checklist and technical reference for the Supabase database schema.

---

## 1. Supabase Dashboard Setup Checklist

### Step 1 — Create a New Project
1. Go to [app.supabase.com](https://app.supabase.com) and sign in.
2. Click **New Project**.
3. Set:
   - **Name**: `nebula-fresh-produce`
   - **Database Password**: generate a strong password, save it in a password manager
   - **Region**: `South Africa (Cape Town)` — closest to Gauteng for latency
4. Wait ~2 minutes for provisioning.

### Step 2 — Connect GitHub Repository (Native Integration)
1. In your Supabase project, go to **Project Settings → Integrations → GitHub**.
2. Click **Connect GitHub** and authorise Supabase.
3. Select your repository (e.g. `your-org/nebula-farm`).
4. Set **Branch** to `main`.
5. Set **Migration directory** to `supabase/migrations` (matches this repo's structure).
6. Enable **Auto-run migrations on push** — every push to `main` that touches
   `supabase/migrations/` will automatically apply pending migrations.

### Step 3 — Install Supabase CLI Locally
```bash
# macOS
brew install supabase/tap/supabase

# Verify
supabase --version
```

### Step 4 — Link Your Local Project to the Supabase Project
```bash
# From the repo root
supabase login                                  # browser OAuth
supabase link --project-ref YOUR_PROJECT_REF    # found in Project Settings → General
```

### Step 5 — Apply Migrations
```bash
# Apply all migrations to your remote Supabase project
supabase db push

# To reset local dev database and replay all migrations
supabase db reset
```

### Step 6 — Verify Tables in Supabase Dashboard
1. Go to **Table Editor** or **Database → Tables**.
2. Confirm all 16 tables exist:
   - `farms`, `sections`, `beds_rows`, `people`
   - `activities`, `scouting_observations`, `nursery_trays`
   - `inventory`, `inventory_usage`
   - `market_deliveries`, `market_batches`
   - `performance_notes`, `crm_leads`
   - `machinery`, `machinery_usage`, `workplan_schedule`
3. Confirm the seed data: **Table Editor → sections** should show rows A through J.

### Step 7 — Enable RLS (Applied via Migration)
RLS is already enabled in `20260223000003_rls_policies.sql`.
To verify in the dashboard:
1. Go to **Authentication → Policies**.
2. Every table should show a lock icon (RLS Enabled).
3. Spot-check `activities` — you should see 4 policies listed.

### Step 8 — Configure GitHub Actions CI
Add these secrets to **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Where to find it |
|--------|-----------------|
| `SUPABASE_ACCESS_TOKEN` | [app.supabase.com](https://app.supabase.com) → Account → Access Tokens → Generate new |
| `SUPABASE_DB_PASSWORD` | The password you set in Step 1 |
| `SUPABASE_PROJECT_ID` | Project Settings → General → Reference ID |

### Step 9 — Seed the Farm Record
Run this in the Supabase **SQL Editor** (Dashboard → SQL Editor → New query):
```sql
-- First, get a fresh UUID for your farm
SELECT gen_random_uuid() AS my_farm_id;

-- Copy the UUID, then open supabase/migrations/20260223000004_seed_data.sql
-- and replace the v_farm_id value before running supabase db push
-- OR run migration 004 as-is with the default UUID (recommended for solo teams)
```

The default farm UUID is: `00000000-0000-0000-0000-000000000001`

Save this in your frontend `.env` file:
```
VITE_FARM_ID=00000000-0000-0000-0000-000000000001
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Both values are found in **Project Settings → API**.

---

## 2. Net Income Formula (market_batches)

All financial columns in `market_batches` are **PostgreSQL GENERATED ALWAYS AS STORED** columns — they are computed automatically by the database engine whenever you insert or update a row. You never write to them manually.

### The formula in plain language (ZAR):

```
gross_amount             = quantity_sold × price_per_unit

market_commission_amount = gross_amount × market_commission_rate     (default 5%)
agent_commission_amount  = gross_amount × agent_commission_rate      (default 8.5%)

vat_on_commissions       = (market_commission_amount + agent_commission_amount) × vat_rate
                           (VAT applies to the commission services, NOT to the sale itself)

net_income = gross_amount
             − market_commission_amount − vat on market commission
             − agent_commission_amount  − vat on agent commission
             − bank_charge
```

Which simplifies to:
```
net_income = gross_amount
             − market_commission_amount × (1 + vat_rate)
             − agent_commission_amount  × (1 + vat_rate)
             − bank_charge
```

### Worked example (Spinach, 100 kg @ R10/kg):

| Item | Calculation | Amount |
|------|-------------|--------|
| Gross | 100 × R10 | R1,000.00 |
| Market commission (5%) | R1,000 × 0.05 | R50.00 |
| VAT on market comm (15%) | R50 × 0.15 | R7.50 |
| Agent commission (8.5%) | R1,000 × 0.085 | R85.00 |
| VAT on agent comm (15%) | R85 × 0.15 | R12.75 |
| Bank charge | fixed | R20.00 |
| **Net income** | | **R824.75** |

The `vat_on_commissions` column stores `R7.50 + R12.75 = R20.25` (combined).

---

## 3. Indexing Strategy

### Why these indexes?

| Index | Table | Covers |
|-------|-------|--------|
| `idx_activities_section_start` | activities | Section dashboard — "show all tasks in Section B this week" |
| `idx_activities_unsynced` | activities | Sync engine — "find all offline records not yet synced" |
| `idx_scouting_section_resolved` | scouting_observations | Scouting dashboard — "open issues in Section A, high severity first" |
| `idx_scouting_severity` | scouting_observations | Alert dashboard — "all unresolved High severity issues" |
| `idx_market_deliveries_farm_date` | market_deliveries | Financial reports — "deliveries this month" |
| `idx_inventory_low_stock` | inventory | Partial index — only rows at or below reorder level, used by stock alerts |
| `idx_crm_leads_follow_up` | crm_leads | Follow-up reminders — "leads due for contact today" |
| `idx_machinery_service_alert` | machinery | Maintenance — "machines within 10% of service interval" |
| `idx_workplan_unexecuted` | workplan_schedule | Daily workplan — "today's unstarted tasks" |

### Cost of the generated column on `activities.duration_minutes`
PostgreSQL computes it at write time and stores it, so reads are free (zero computation).
Write overhead is negligible — it's a single arithmetic expression.

---

## 4. Migration File Structure & Conventions

```
supabase/
├── config.toml                             # Supabase CLI project config
└── migrations/
    ├── 20260223000001_initial_schema.sql   # Enums + all 16 tables
    ├── 20260223000002_indexes_triggers.sql # Indexes, triggers, helper views
    ├── 20260223000003_rls_policies.sql     # Row Level Security
    └── 20260223000004_seed_data.sql        # Farm + sections seed
```

### Naming convention
```
YYYYMMDDHHMMSS_description.sql
```
Use UTC time when naming files. The timestamp prefix determines the order of application — Supabase CLI applies them in ascending order.

### Rules for new migrations
1. **Never edit a migration that has already been applied** to a shared environment.
   Instead, create a new migration file that alters/adds/drops.
2. **One concern per file** — don't mix schema changes with seed data.
3. **Always test locally** with `supabase db reset` before pushing to `main`.
4. **Use `IF NOT EXISTS` / `IF EXISTS`** in utility migrations for idempotency.

### Common future migrations examples
```bash
# Add a crop_type column to sections
supabase migration new add_crop_type_to_sections

# Add an expenses table
supabase migration new create_expenses_table
```

---

## 5. Offline Sync — Pattern & Conflict Resolution

### Which tables need offline support

| Table | Offline? | Reason |
|-------|----------|--------|
| `activities` | **YES** | Workers log tasks in the field without signal |
| `scouting_observations` | **YES** | Scouts capture observations on the move |
| `nursery_trays` | maybe | Usually entered at the nursery (better signal) |
| `inventory_usage` | maybe | Applied in field — consider offline if workers measure in field |
| All others | NO | Entered by managers/supervisors at the office |

### How offline sync works (recommended pattern)

#### On the device (React PWA)
1. Use **Dexie.js** (IndexedDB wrapper) to store a local copy of the database.
2. When a worker logs an activity:
   - Generate a client UUID (`crypto.randomUUID()`) → stored as `offline_id`
   - Set `created_offline = true`, `client_updated_at = new Date().toISOString()`
   - Save to IndexedDB immediately (instant feedback, no network required)
3. Register a **Background Sync** service worker event (`sync` tag: `nebula-sync`).
4. When connectivity returns, the service worker fires the sync event.

#### Sync algorithm (client → server)
```typescript
// Pseudocode for the sync worker
const unsyncedActivities = await db.activities
  .where('synced').equals(0)
  .toArray();

for (const record of unsyncedActivities) {
  const { data, error } = await supabase
    .from('activities')
    .upsert(
      { ...record, synced_at: null },   // synced_at set by server trigger
      { onConflict: 'offline_id' }      // deduplication key
    );

  if (!error) {
    await db.activities.update(record.localId, { synced: 1 });
  }
}
```

#### Conflict resolution strategy (Last-Write-Wins with client timestamp)

| Scenario | Resolution |
|----------|------------|
| Two workers log different activities in the same section | No conflict — different `offline_id` values → both insert |
| Same worker edits a record offline, then online | Use `client_updated_at`: if server's `client_updated_at` > client's, server wins; otherwise client wins |
| Manager edits a record while worker's phone is offline | When worker syncs, check `client_updated_at`. If server record is newer, skip update (preserve manager's edit) |
| Same `offline_id` arrives twice (retry) | `ON CONFLICT (offline_id) DO UPDATE` is idempotent — safe to retry |

#### Implementation checklist
- [ ] Install Dexie.js: `npm install dexie`
- [ ] Register a service worker with Background Sync API
- [ ] Mirror `activities` and `scouting_observations` tables in IndexedDB schema
- [ ] Add a `synced: 0|1` flag in IndexedDB (not in Supabase)
- [ ] Implement the `nebula-sync` sync event handler
- [ ] Show a sync status badge in the app header (offline/syncing/synced)
- [ ] Test with Chrome DevTools → Network → Offline mode

---

## 6. LiteFarm Design Patterns Applied

The following patterns were drawn from the LiteFarm open-source project
and adapted for Nebula's context:

| LiteFarm Pattern | Nebula Adaptation |
|-----------------|-------------------|
| Farm → Location hierarchy | Farm → Section → Bed/Row |
| Task model with task_type enum | `activities` with `task_type_enum` |
| Linking users to farms via `user_farm` junction | `people.auth_user_id` FK to Supabase auth |
| Separate observation model from tasks | `scouting_observations` is its own table, optionally linked to `activities` |
| Financial tracking separate from operations | `market_deliveries` + `market_batches` are independent from `activities` |
| Soft deletes via `deleted` flag | `people.active`, `machinery.active` booleans |
| Role-based access (Owner, Manager, Worker) | `person_role_enum`: Manager, Supervisor, Worker with RLS policies |
| Offline capability mentioned in their mobile PWA | `offline_id`, `created_offline`, `client_updated_at`, `synced_at` on field tables |
