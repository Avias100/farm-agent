-- ==============================================================
-- NEBULA FRESH PRODUCE MANAGEMENT SYSTEM
-- Migration 010: CRM Tables Public Access
--
-- Allow public access to crm_leads for Module 6 functionality
-- ==============================================================

-- Allow anyone to create CRM leads
CREATE POLICY "Public insert access to crm_leads"
  ON crm_leads
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update CRM leads
CREATE POLICY "Public update access to crm_leads"
  ON crm_leads
  FOR UPDATE
  USING (true);

-- Allow anyone to read CRM leads
CREATE POLICY "Public read access to crm_leads"
  ON crm_leads
  FOR SELECT
  USING (true);
