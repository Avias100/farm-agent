-- ==============================================================
-- NEBULA FRESH PRODUCE MANAGEMENT SYSTEM
-- Migration 014: Add DELETE Policies to All Tables
--
-- Enable delete functionality across all modules
-- ==============================================================

-- Activities (Module 1)
CREATE POLICY "Public delete access to activities"
  ON activities
  FOR DELETE
  USING (true);

-- Scouting Observations (Module 2)
CREATE POLICY "Public delete access to scouting_observations"
  ON scouting_observations
  FOR DELETE
  USING (true);

-- Market Deliveries & Batches (Module 3)
CREATE POLICY "Public delete access to market_deliveries"
  ON market_deliveries
  FOR DELETE
  USING (true);

CREATE POLICY "Public delete access to market_batches"
  ON market_batches
  FOR DELETE
  USING (true);

-- Nursery (Module 4)
CREATE POLICY "Public delete access to nursery_trays"
  ON nursery_trays
  FOR DELETE
  USING (true);

-- Staff/People (Module 5)
CREATE POLICY "Public delete access to people"
  ON people
  FOR DELETE
  USING (true);

-- CRM (Module 6)
CREATE POLICY "Public delete access to crm_leads"
  ON crm_leads
  FOR DELETE
  USING (true);

-- Workplan (Module 8)
CREATE POLICY "Public delete access to workplan_schedule"
  ON workplan_schedule
  FOR DELETE
  USING (true);

-- Inventory
CREATE POLICY "Public delete access to inventory"
  ON inventory
  FOR DELETE
  USING (true);

CREATE POLICY "Public delete access to inventory_usage"
  ON inventory_usage
  FOR DELETE
  USING (true);

-- Sections (core data)
CREATE POLICY "Public delete access to sections"
  ON sections
  FOR DELETE
  USING (true);
