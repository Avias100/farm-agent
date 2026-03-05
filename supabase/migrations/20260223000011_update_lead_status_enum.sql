-- ==============================================================
-- NEBULA FRESH PRODUCE MANAGEMENT SYSTEM
-- Migration 011: Update CRM Lead Status Enum
--
-- Update lead_status_enum to match Module 6 requirements:
-- New → Contacted → Negotiating → Won / Lost / Dormant
-- ==============================================================

-- Update lead_status_enum to match Module 6 requirements
-- Add new values to existing enum

-- Add new status values
ALTER TYPE lead_status_enum ADD VALUE 'New';
ALTER TYPE lead_status_enum ADD VALUE 'Contacted';
ALTER TYPE lead_status_enum ADD VALUE 'Negotiating';
ALTER TYPE lead_status_enum ADD VALUE 'Lost';
ALTER TYPE lead_status_enum ADD VALUE 'Dormant';

-- Update default to 'New'
ALTER TABLE crm_leads ALTER COLUMN status SET DEFAULT 'New'::lead_status_enum;

-- Optionally migrate existing data
-- UPDATE crm_leads SET status = 'New' WHERE status = 'Active';
-- UPDATE crm_leads SET status = 'Contacted' WHERE status = 'Follow Up';
-- UPDATE crm_leads SET status = 'Lost' WHERE status = 'Closed';
