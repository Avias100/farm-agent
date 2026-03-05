-- ==============================================================
-- NEBULA FRESH PRODUCE MANAGEMENT SYSTEM
-- Migration 012: Workplan Tables Public Access
--
-- Allow public access to workplan_schedule for Module 8 functionality
-- ==============================================================

-- Allow anyone to create workplan tasks
CREATE POLICY "Public insert access to workplan_schedule"
  ON workplan_schedule
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update workplan tasks
CREATE POLICY "Public update access to workplan_schedule"
  ON workplan_schedule
  FOR UPDATE
  USING (true);

-- Allow anyone to read workplan tasks
CREATE POLICY "Public read access to workplan_schedule"
  ON workplan_schedule
  FOR SELECT
  USING (true);
