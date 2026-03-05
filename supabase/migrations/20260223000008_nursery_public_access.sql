-- ==============================================================
-- NEBULA FRESH PRODUCE MANAGEMENT SYSTEM
-- Migration 008: Nursery Tables Public Access
--
-- Allow public access to nursery_trays for Module 4 functionality
-- ==============================================================

-- Allow anyone to create nursery trays
CREATE POLICY "Public insert access to nursery_trays"
  ON nursery_trays
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update nursery trays
CREATE POLICY "Public update access to nursery_trays"
  ON nursery_trays
  FOR UPDATE
  USING (true);

-- Allow anyone to read nursery trays
CREATE POLICY "Public read access to nursery_trays"
  ON nursery_trays
  FOR SELECT
  USING (true);
