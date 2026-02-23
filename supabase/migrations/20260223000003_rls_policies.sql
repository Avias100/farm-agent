-- ==============================================================
-- NEBULA FRESH PRODUCE MANAGEMENT SYSTEM
-- Migration 003: Row Level Security (RLS) Policies
--
-- Access model:
--   Worker     — can log and view their own activities/observations
--                on their assigned farm; cannot access financials or CRM
--   Supervisor — can view all activities on their farm, manage scouting,
--                nursery, inventory, and staff performance
--   Manager    — full access to all tables on their farm including
--                market financials, CRM, and machinery
--
-- How it works:
--   1. people.auth_user_id links a Supabase auth user to a farm person
--   2. Helper function get_my_person() returns the caller's people record
--   3. Helper function get_my_farm_id() returns the caller's farm_id
--   4. Helper function get_my_role() returns the caller's role enum
--   5. All policies check membership + role before allowing access
-- ==============================================================


-- ==============================================================
-- 0. ENABLE RLS ON ALL TABLES
-- ==============================================================

ALTER TABLE farms                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections              ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds_rows             ENABLE ROW LEVEL SECURITY;
ALTER TABLE people                ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities            ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nursery_trays         ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory             ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_usage       ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_deliveries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_batches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE machinery             ENABLE ROW LEVEL SECURITY;
ALTER TABLE machinery_usage       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workplan_schedule     ENABLE ROW LEVEL SECURITY;


-- ==============================================================
-- 1. HELPER FUNCTIONS (security definer = run as owner, not caller)
-- ==============================================================

-- Returns the people row for the currently logged-in auth user
CREATE OR REPLACE FUNCTION get_my_person()
RETURNS people
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
    FROM people
   WHERE auth_user_id = auth.uid()
   LIMIT 1;
$$;

-- Returns the farm_id for the currently logged-in user
CREATE OR REPLACE FUNCTION get_my_farm_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT farm_id
    FROM people
   WHERE auth_user_id = auth.uid()
   LIMIT 1;
$$;

-- Returns the role enum for the currently logged-in user
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS person_role_enum
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role
    FROM people
   WHERE auth_user_id = auth.uid()
   LIMIT 1;
$$;

-- Convenience: is the current user a Manager or Supervisor?
CREATE OR REPLACE FUNCTION is_manager_or_supervisor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT get_my_role() IN ('Manager', 'Supervisor');
$$;

-- Convenience: is the current user a Manager?
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT get_my_role() = 'Manager';
$$;

COMMENT ON FUNCTION get_my_farm_id IS 'Returns farm_id for the currently authenticated user via people.auth_user_id.';
COMMENT ON FUNCTION get_my_role     IS 'Returns role enum for the currently authenticated user.';


-- ==============================================================
-- 2. RLS POLICIES
-- ==============================================================


-- ---- farms ----
-- All staff on the farm can read their farm row.
-- Only managers can update farm details.
CREATE POLICY "farms_select_own"
  ON farms FOR SELECT
  USING (id = get_my_farm_id());

CREATE POLICY "farms_update_manager"
  ON farms FOR UPDATE
  USING (id = get_my_farm_id() AND is_manager());


-- ---- sections ----
-- All staff can view sections of their farm.
-- Managers only can insert/update sections.
CREATE POLICY "sections_select_own_farm"
  ON sections FOR SELECT
  USING (farm_id = get_my_farm_id());

CREATE POLICY "sections_insert_manager"
  ON sections FOR INSERT
  WITH CHECK (farm_id = get_my_farm_id() AND is_manager());

CREATE POLICY "sections_update_manager"
  ON sections FOR UPDATE
  USING (farm_id = get_my_farm_id() AND is_manager());


-- ---- beds_rows ----
-- All staff can view. Only managers/supervisors can manage.
CREATE POLICY "beds_rows_select"
  ON beds_rows FOR SELECT
  USING (
    section_id IN (
      SELECT id FROM sections WHERE farm_id = get_my_farm_id()
    )
  );

CREATE POLICY "beds_rows_insert_super"
  ON beds_rows FOR INSERT
  WITH CHECK (
    is_manager_or_supervisor() AND
    section_id IN (
      SELECT id FROM sections WHERE farm_id = get_my_farm_id()
    )
  );


-- ---- people ----
-- Workers can view colleagues on their farm (for assigning/tagging).
-- Only managers can insert new staff or change roles.
-- Each person can update their own record (e.g. phone number).
CREATE POLICY "people_select_same_farm"
  ON people FOR SELECT
  USING (farm_id = get_my_farm_id());

CREATE POLICY "people_insert_manager"
  ON people FOR INSERT
  WITH CHECK (farm_id = get_my_farm_id() AND is_manager());

CREATE POLICY "people_update_own_or_manager"
  ON people FOR UPDATE
  USING (
    farm_id = get_my_farm_id() AND
    (auth_user_id = auth.uid() OR is_manager())
  );


-- ---- activities ----
-- Workers can create and view their own activities.
-- Managers/supervisors can view and edit all farm activities.
CREATE POLICY "activities_select_own_or_super"
  ON activities FOR SELECT
  USING (
    section_id IN (
      SELECT id FROM sections WHERE farm_id = get_my_farm_id()
    ) AND (
      person_id = (get_my_person()).id
      OR is_manager_or_supervisor()
    )
  );

CREATE POLICY "activities_insert_worker"
  ON activities FOR INSERT
  WITH CHECK (
    section_id IN (
      SELECT id FROM sections WHERE farm_id = get_my_farm_id()
    )
    -- person_id must be themselves OR a manager logging on behalf
    -- (application enforces person_id = caller unless manager)
  );

CREATE POLICY "activities_update_own_or_super"
  ON activities FOR UPDATE
  USING (
    section_id IN (
      SELECT id FROM sections WHERE farm_id = get_my_farm_id()
    ) AND (
      person_id = (get_my_person()).id
      OR is_manager_or_supervisor()
    )
  );


-- ---- scouting_observations ----
-- All staff can log and view observations on their farm.
-- Managers/supervisors can mark as resolved.
CREATE POLICY "scouting_select_own_farm"
  ON scouting_observations FOR SELECT
  USING (
    section_id IN (
      SELECT id FROM sections WHERE farm_id = get_my_farm_id()
    )
  );

CREATE POLICY "scouting_insert_any_staff"
  ON scouting_observations FOR INSERT
  WITH CHECK (
    section_id IN (
      SELECT id FROM sections WHERE farm_id = get_my_farm_id()
    )
  );

CREATE POLICY "scouting_update_super"
  ON scouting_observations FOR UPDATE
  USING (
    is_manager_or_supervisor() AND
    section_id IN (
      SELECT id FROM sections WHERE farm_id = get_my_farm_id()
    )
  );


-- ---- nursery_trays ----
CREATE POLICY "nursery_select_own_farm"
  ON nursery_trays FOR SELECT
  USING (
    section_id IN (
      SELECT id FROM sections WHERE farm_id = get_my_farm_id()
    )
  );

CREATE POLICY "nursery_insert_super"
  ON nursery_trays FOR INSERT
  WITH CHECK (
    is_manager_or_supervisor() AND
    section_id IN (
      SELECT id FROM sections WHERE farm_id = get_my_farm_id()
    )
  );

CREATE POLICY "nursery_update_super"
  ON nursery_trays FOR UPDATE
  USING (
    is_manager_or_supervisor() AND
    section_id IN (
      SELECT id FROM sections WHERE farm_id = get_my_farm_id()
    )
  );


-- ---- inventory ----
-- Workers can view stock levels.
-- Only managers/supervisors can modify inventory.
CREATE POLICY "inventory_select_own_farm"
  ON inventory FOR SELECT
  USING (farm_id = get_my_farm_id());

CREATE POLICY "inventory_insert_super"
  ON inventory FOR INSERT
  WITH CHECK (farm_id = get_my_farm_id() AND is_manager_or_supervisor());

CREATE POLICY "inventory_update_super"
  ON inventory FOR UPDATE
  USING (farm_id = get_my_farm_id() AND is_manager_or_supervisor());


-- ---- inventory_usage ----
-- All staff can log usage (field workers apply chemicals/seeds).
-- View is farm-scoped.
CREATE POLICY "inv_usage_select_own_farm"
  ON inventory_usage FOR SELECT
  USING (
    inventory_id IN (
      SELECT id FROM inventory WHERE farm_id = get_my_farm_id()
    )
  );

CREATE POLICY "inv_usage_insert_any_staff"
  ON inventory_usage FOR INSERT
  WITH CHECK (
    inventory_id IN (
      SELECT id FROM inventory WHERE farm_id = get_my_farm_id()
    )
  );

CREATE POLICY "inv_usage_delete_super"
  ON inventory_usage FOR DELETE
  USING (
    is_manager_or_supervisor() AND
    inventory_id IN (
      SELECT id FROM inventory WHERE farm_id = get_my_farm_id()
    )
  );


-- ---- market_deliveries ----
-- SENSITIVE: financial data. Managers and supervisors only.
CREATE POLICY "market_deliveries_manager_super"
  ON market_deliveries FOR ALL
  USING (farm_id = get_my_farm_id() AND is_manager_or_supervisor())
  WITH CHECK (farm_id = get_my_farm_id() AND is_manager_or_supervisor());


-- ---- market_batches ----
-- SENSITIVE: inherits farm scope via delivery. Managers and supervisors only.
CREATE POLICY "market_batches_manager_super"
  ON market_batches FOR ALL
  USING (
    is_manager_or_supervisor() AND
    delivery_id IN (
      SELECT id FROM market_deliveries WHERE farm_id = get_my_farm_id()
    )
  )
  WITH CHECK (
    is_manager_or_supervisor() AND
    delivery_id IN (
      SELECT id FROM market_deliveries WHERE farm_id = get_my_farm_id()
    )
  );


-- ---- performance_notes ----
-- Workers can view notes about themselves.
-- Managers/supervisors can read and write all notes on their farm.
CREATE POLICY "perf_notes_select"
  ON performance_notes FOR SELECT
  USING (
    person_id = (get_my_person()).id
    OR is_manager_or_supervisor()
  );

CREATE POLICY "perf_notes_insert_super"
  ON performance_notes FOR INSERT
  WITH CHECK (
    is_manager_or_supervisor() AND
    noted_by = (get_my_person()).id
  );

CREATE POLICY "perf_notes_update_super"
  ON performance_notes FOR UPDATE
  USING (
    is_manager_or_supervisor() AND
    noted_by = (get_my_person()).id
  );


-- ---- crm_leads ----
-- SENSITIVE: business relationships. Managers only.
CREATE POLICY "crm_leads_manager_only"
  ON crm_leads FOR ALL
  USING (farm_id = get_my_farm_id() AND is_manager())
  WITH CHECK (farm_id = get_my_farm_id() AND is_manager());


-- ---- machinery ----
-- All staff can view. Managers/supervisors manage equipment records.
CREATE POLICY "machinery_select_own_farm"
  ON machinery FOR SELECT
  USING (farm_id = get_my_farm_id());

CREATE POLICY "machinery_write_super"
  ON machinery FOR INSERT
  WITH CHECK (farm_id = get_my_farm_id() AND is_manager_or_supervisor());

CREATE POLICY "machinery_update_super"
  ON machinery FOR UPDATE
  USING (farm_id = get_my_farm_id() AND is_manager_or_supervisor());


-- ---- machinery_usage ----
-- Workers can log machine usage during activities.
-- All farm staff can view usage logs.
CREATE POLICY "machinery_usage_select_own_farm"
  ON machinery_usage FOR SELECT
  USING (
    machinery_id IN (
      SELECT id FROM machinery WHERE farm_id = get_my_farm_id()
    )
  );

CREATE POLICY "machinery_usage_insert_any_staff"
  ON machinery_usage FOR INSERT
  WITH CHECK (
    machinery_id IN (
      SELECT id FROM machinery WHERE farm_id = get_my_farm_id()
    )
  );

CREATE POLICY "machinery_usage_delete_super"
  ON machinery_usage FOR DELETE
  USING (
    is_manager_or_supervisor() AND
    machinery_id IN (
      SELECT id FROM machinery WHERE farm_id = get_my_farm_id()
    )
  );


-- ---- workplan_schedule ----
-- Workers can view their own workplan.
-- Managers/supervisors can view and manage all plans.
CREATE POLICY "workplan_select"
  ON workplan_schedule FOR SELECT
  USING (
    farm_id = get_my_farm_id() AND (
      assigned_to = (get_my_person()).id
      OR is_manager_or_supervisor()
    )
  );

CREATE POLICY "workplan_insert_super"
  ON workplan_schedule FOR INSERT
  WITH CHECK (farm_id = get_my_farm_id() AND is_manager_or_supervisor());

CREATE POLICY "workplan_update_super"
  ON workplan_schedule FOR UPDATE
  USING (farm_id = get_my_farm_id() AND is_manager_or_supervisor());

CREATE POLICY "workplan_delete_super"
  ON workplan_schedule FOR DELETE
  USING (farm_id = get_my_farm_id() AND is_manager());
