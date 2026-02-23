-- ==============================================================
-- NEBULA FRESH PRODUCE MANAGEMENT SYSTEM
-- Migration 004: Seed Data
--
-- Inserts the real farm record and all 10 sections (A–J).
-- Uses a fixed UUID for the farm so all future seeds and
-- references can use it without a lookup.
--
-- NOTE: Do NOT run this migration against a production database
-- that already has a Nebula Fresh Produce farm record.
-- Use ON CONFLICT DO NOTHING for idempotency.
-- ==============================================================

-- Fixed farm UUID for Nebula Fresh Produce.
-- All subsequent seeds reference this constant.
-- If you need to re-run this migration, it is safe (idempotent).

-- Run this first to generate your farm UUID, then paste it below:
--   SELECT gen_random_uuid();
--
-- We use a well-known deterministic UUID for Nebula Fresh Produce
-- so this migration is idempotent and all team members share the same value.
-- Replace with your actual generated UUID and update your .env file.

DO $$
DECLARE
  v_farm_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN

  INSERT INTO farms (id, name, location)
  VALUES (
    v_farm_id,
    'Nebula Fresh Produce',
    'Gauteng, South Africa'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Seed all 10 sections A through J.
  -- area_hectares and soil_type are placeholders — update via the
  -- app dashboard with actual survey measurements.
  INSERT INTO sections (farm_id, name, description)
  VALUES
    (v_farm_id, 'A', 'Section A'),
    (v_farm_id, 'B', 'Section B'),
    (v_farm_id, 'C', 'Section C'),
    (v_farm_id, 'D', 'Section D'),
    (v_farm_id, 'E', 'Section E'),
    (v_farm_id, 'F', 'Section F'),
    (v_farm_id, 'G', 'Section G'),
    (v_farm_id, 'H', 'Section H'),
    (v_farm_id, 'I', 'Section I'),
    (v_farm_id, 'J', 'Section J')
  ON CONFLICT (farm_id, name) DO NOTHING;

  RAISE NOTICE 'Nebula Fresh Produce farm seeded with id: %', v_farm_id;
END;
$$;

-- ==============================================================
-- AFTER RUNNING: copy your farm UUID into your .env file:
--   VITE_FARM_ID=00000000-0000-0000-0000-000000000001
--
-- Or replace v_farm_id with a fresh UUID from gen_random_uuid()
-- before your first production deployment.
-- ==============================================================
