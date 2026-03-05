-- ==============================================================
-- NEBULA FRESH PRODUCE MANAGEMENT SYSTEM
-- Migration 005: Seed Workers/People
--
-- Adds sample farm workers for testing and initial deployment
-- ==============================================================

DO $$
DECLARE
  v_farm_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  
  -- Add sample workers (only if none exist)
  IF NOT EXISTS (SELECT 1 FROM people WHERE farm_id = v_farm_id) THEN
    INSERT INTO people (farm_id, full_name, role, active, phone)
    VALUES
      (v_farm_id, 'John Mokoena', 'Worker', true, '+27123456789'),
      (v_farm_id, 'Sarah Nkosi', 'Worker', true, '+27123456790'),
      (v_farm_id, 'Peter Dlamini', 'Supervisor', true, '+27123456791'),
      (v_farm_id, 'Mary Zulu', 'Worker', true, '+27123456792'),
      (v_farm_id, 'David Khumalo', 'Worker', true, '+27123456793');
    
    RAISE NOTICE 'Sample workers added to Nebula Fresh Produce';
  ELSE
    RAISE NOTICE 'Workers already exist, skipping seed';
  END IF;
END;
$$;
