-- ==============================================================
-- NEBULA FRESH PRODUCE MANAGEMENT SYSTEM
-- Migration 006: Public Read Policies for Reference Data
--
-- Allow unauthenticated access to sections and people for now.
-- This enables the app to work without authentication during
-- development and initial rollout.
--
-- TODO: Add proper authentication and restrict these policies
-- to authenticated users only in production.
-- ==============================================================

-- Allow anyone to read sections
CREATE POLICY "Public read access to sections"
  ON sections
  FOR SELECT
  USING (true);

-- Allow anyone to read active people
CREATE POLICY "Public read access to people"
  ON people
  FOR SELECT
  USING (true);

-- Allow anyone to create activities (for offline-first functionality)
CREATE POLICY "Public insert access to activities"
  ON activities
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update activities (for completing tasks)
CREATE POLICY "Public update access to activities"
  ON activities
  FOR UPDATE
  USING (true);

-- Allow anyone to read activities
CREATE POLICY "Public read access to activities"
  ON activities
  FOR SELECT
  USING (true);

-- Allow anyone to create scouting observations
CREATE POLICY "Public insert access to scouting_observations"
  ON scouting_observations
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update scouting observations (for resolving)
CREATE POLICY "Public update access to scouting_observations"
  ON scouting_observations
  FOR UPDATE
  USING (true);

-- Allow anyone to read scouting observations
CREATE POLICY "Public read access to scouting_observations"
  ON scouting_observations
  FOR SELECT
  USING (true);

-- ── Module 3: Market Deliveries & Batches ─────────────────────

-- Allow anyone to create market deliveries
CREATE POLICY "Public insert access to market_deliveries"
  ON market_deliveries
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update market deliveries
CREATE POLICY "Public update access to market_deliveries"
  ON market_deliveries
  FOR UPDATE
  USING (true);

-- Allow anyone to read market deliveries
CREATE POLICY "Public read access to market_deliveries"
  ON market_deliveries
  FOR SELECT
  USING (true);

-- Allow anyone to create market batches
CREATE POLICY "Public insert access to market_batches"
  ON market_batches
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update market batches
CREATE POLICY "Public update access to market_batches"
  ON market_batches
  FOR UPDATE
  USING (true);

-- Allow anyone to read market batches
CREATE POLICY "Public read access to market_batches"
  ON market_batches
  FOR SELECT
  USING (true);

-- ── Module 4: Nursery Tracker ─────────────────────────────────

CREATE POLICY "Public insert access to nursery_trays"
  ON nursery_trays FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access to nursery_trays"
  ON nursery_trays FOR UPDATE USING (true);

CREATE POLICY "Public read access to nursery_trays"
  ON nursery_trays FOR SELECT USING (true);

-- ── Module 5: Staff & Inventory ───────────────────────────────

CREATE POLICY "Public insert access to people"
  ON people FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access to people"
  ON people FOR UPDATE USING (true);

CREATE POLICY "Public insert access to performance_notes"
  ON performance_notes FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access to performance_notes"
  ON performance_notes FOR UPDATE USING (true);

CREATE POLICY "Public read access to performance_notes"
  ON performance_notes FOR SELECT USING (true);

CREATE POLICY "Public read access to inventory"
  ON inventory FOR SELECT USING (true);

CREATE POLICY "Public insert access to inventory"
  ON inventory FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access to inventory"
  ON inventory FOR UPDATE USING (true);

CREATE POLICY "Public read access to inventory_usage"
  ON inventory_usage FOR SELECT USING (true);

CREATE POLICY "Public insert access to inventory_usage"
  ON inventory_usage FOR INSERT WITH CHECK (true);

-- ── Module 6: CRM ─────────────────────────────────────────────

CREATE POLICY "Public read access to crm_leads"
  ON crm_leads FOR SELECT USING (true);

CREATE POLICY "Public insert access to crm_leads"
  ON crm_leads FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access to crm_leads"
  ON crm_leads FOR UPDATE USING (true);

-- ── Modules 7 & 8: Machinery & Workplan ──────────────────────

CREATE POLICY "Public read access to machinery"
  ON machinery FOR SELECT USING (true);

CREATE POLICY "Public insert access to machinery"
  ON machinery FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access to machinery"
  ON machinery FOR UPDATE USING (true);

CREATE POLICY "Public read access to machinery_usage"
  ON machinery_usage FOR SELECT USING (true);

CREATE POLICY "Public insert access to machinery_usage"
  ON machinery_usage FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read access to workplan_schedule"
  ON workplan_schedule FOR SELECT USING (true);

CREATE POLICY "Public insert access to workplan_schedule"
  ON workplan_schedule FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access to workplan_schedule"
  ON workplan_schedule FOR UPDATE USING (true);

-- ==============================================================
-- PRODUCTION CLEANUP: drop all dev policies when auth is ready.
-- Run this in the Supabase SQL editor after wiring auth_user_id:
--
-- DO $$
-- DECLARE r RECORD;
-- BEGIN
--   FOR r IN
--     SELECT policyname, tablename
--       FROM pg_policies
--      WHERE policyname LIKE 'Public %'
--   LOOP
--     EXECUTE format(
--       'DROP POLICY IF EXISTS %I ON %I',
--       r.policyname, r.tablename
--     );
--   END LOOP;
-- END;
-- $$;
-- ==============================================================
