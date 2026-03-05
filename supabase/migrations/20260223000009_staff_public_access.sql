-- ==============================================================
-- NEBULA FRESH PRODUCE MANAGEMENT SYSTEM
-- Migration 009: Staff Module Public Access
--
-- Allow public access to performance_notes for Module 5 functionality
-- ==============================================================

-- Allow anyone to create performance notes
CREATE POLICY "Public insert access to performance_notes"
  ON performance_notes
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update performance notes
CREATE POLICY "Public update access to performance_notes"
  ON performance_notes
  FOR UPDATE
  USING (true);

-- Allow anyone to read performance notes
CREATE POLICY "Public read access to performance_notes"
  ON performance_notes
  FOR SELECT
  USING (true);

-- Allow public updates to people table (for deactivate/reactivate)
CREATE POLICY "Public update access to people"
  ON people
  FOR UPDATE
  USING (true);
