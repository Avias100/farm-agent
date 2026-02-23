-- ==============================================================
-- NEBULA FRESH PRODUCE MANAGEMENT SYSTEM
-- Migration 001: Initial Schema — Enums + Core Tables
--
-- Informed by LiteFarm (github.com/LiteFarmOrg/LiteFarm) patterns:
--   • Location hierarchy (farm → section → bed/row)
--   • Task/activity model linked to people + locations
--   • Offline sync flags on field-captured records
--   • Financial batch tracking per delivery
--
-- Stack: Supabase (PostgreSQL 15+)
-- Author: Nebula Fresh Produce
-- ==============================================================


-- --------------------------------------------------------------
-- 0. EXTENSIONS
-- --------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- fallback uuid support


-- ==============================================================
-- 1. ENUM TYPES
-- Define all enums before tables that depend on them
-- ==============================================================

CREATE TYPE section_name_enum AS ENUM (
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'
);

CREATE TYPE person_role_enum AS ENUM (
  'Worker', 'Manager', 'Supervisor'
);

CREATE TYPE task_type_enum AS ENUM (
  'Planting',
  'Spraying',
  'Weeding',
  'Drenching',
  'Harvesting',
  'Fertilizing',
  'Irrigation',
  'Inspection',
  'Transplanting',
  'Other'
);

CREATE TYPE activity_status_enum AS ENUM (
  'Scheduled',
  'In Progress',
  'Completed',
  'Rescheduled',
  'Cancelled'
);

CREATE TYPE issue_type_enum AS ENUM (
  'Pest',
  'Disease',
  'Nutrient Deficiency',
  'Leaf Burn',
  'Failed Plants',
  'Germination Issue',
  'Other'
);

CREATE TYPE severity_enum AS ENUM (
  'Low',
  'Medium',
  'High'
);

CREATE TYPE inventory_category_enum AS ENUM (
  'Seed',
  'Fertilizer',
  'Chemical',
  'Fuel',
  'Packaging',
  'Other'
);

CREATE TYPE inventory_unit_enum AS ENUM (
  'kg',
  'L',
  'units',
  'bags'
);

CREATE TYPE performance_rating_enum AS ENUM (
  'Excellent',
  'Good',
  'Satisfactory',
  'Needs Improvement'
);

CREATE TYPE lead_type_enum AS ENUM (
  'Client',
  'Supplier'
);

CREATE TYPE lead_status_enum AS ENUM (
  'Active',
  'Follow Up',
  'Closed',
  'Won'
);

CREATE TYPE fuel_type_enum AS ENUM (
  'Diesel',
  'Petrol',
  'Electric'
);


-- ==============================================================
-- 2. CORE TABLES
-- ==============================================================


-- --------------------------------------------------------------
-- TABLE 1: farms
-- Root entity. All other tables cascade down from here.
-- --------------------------------------------------------------
CREATE TABLE farms (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  location    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  farms IS 'Root entity representing the physical farm operation.';
COMMENT ON COLUMN farms.location IS 'Free-text address or GPS coordinates of the farm.';


-- --------------------------------------------------------------
-- TABLE 2: sections
-- Physical sections of the farm (A–J). Each has a unique name
-- per farm enforced by UNIQUE(farm_id, name).
-- Inspired by LiteFarm''s location hierarchy pattern.
-- --------------------------------------------------------------
CREATE TABLE sections (
  id             UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id        UUID               NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name           section_name_enum  NOT NULL,
  description    TEXT,
  area_hectares  DECIMAL(10, 4),
  soil_type      TEXT,
  created_at     TIMESTAMPTZ        NOT NULL DEFAULT now(),

  CONSTRAINT uq_section_per_farm UNIQUE (farm_id, name)
);

COMMENT ON TABLE  sections IS 'Physical sections A-J within a farm.';
COMMENT ON COLUMN sections.area_hectares IS 'Measured area of the section in hectares.';
COMMENT ON COLUMN sections.soil_type IS 'E.g. Sandy loam, Clay, Loam, Silty clay.';


-- --------------------------------------------------------------
-- TABLE 3: beds_rows
-- Granular sub-units within sections for row/bed tracking.
-- Allows scouting observations and nursery records to be tied
-- to an exact position in the field.
-- --------------------------------------------------------------
CREATE TABLE beds_rows (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID    NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  row_number  INTEGER,
  bed_number  INTEGER,
  notes       TEXT,

  CONSTRAINT chk_beds_rows_has_identifier
    CHECK (row_number IS NOT NULL OR bed_number IS NOT NULL)
);

COMMENT ON TABLE  beds_rows IS 'Individual rows or raised beds within a section.';


-- --------------------------------------------------------------
-- TABLE 4: people
-- Farm workers, supervisors, and managers. Links to Supabase
-- Auth via auth_user_id so RLS can be enforced by role.
-- Inspired by LiteFarm''s user–farm relationship model.
-- --------------------------------------------------------------
CREATE TABLE people (
  id            UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id       UUID             NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  full_name     TEXT             NOT NULL,
  role          person_role_enum NOT NULL,
  phone         TEXT,
  active        BOOLEAN          NOT NULL DEFAULT TRUE,
  -- Supabase Auth link: populated when the person creates an account
  auth_user_id  UUID             UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT now()
);

COMMENT ON TABLE  people IS 'Farm staff: workers, supervisors, and managers.';
COMMENT ON COLUMN people.auth_user_id IS 'FK to Supabase auth.users. NULL until the person activates their app account.';
COMMENT ON COLUMN people.active IS 'Soft-delete flag. Set FALSE instead of deleting to preserve history.';


-- --------------------------------------------------------------
-- TABLE 5: activities
-- The central operational record. Captures every field task
-- performed by a worker in a section.
--
-- OFFLINE SYNC DESIGN (LiteFarm-inspired):
--   offline_id       — client-generated UUID for deduplication on upsert
--   created_offline  — TRUE when the record was created without network
--   client_updated_at— client clock at the time of last edit (used for
--                      conflict resolution: higher timestamp wins)
--   synced_at        — server timestamp of first successful sync
--
-- duration_minutes is a PostgreSQL generated column computed
-- automatically from start_time and end_time. No trigger needed.
-- --------------------------------------------------------------
CREATE TABLE activities (
  id                UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id        UUID                 NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  person_id         UUID                 NOT NULL REFERENCES people(id)   ON DELETE RESTRICT,
  task_type         task_type_enum       NOT NULL,
  start_time        TIMESTAMPTZ,
  end_time          TIMESTAMPTZ,

  -- Computed: floor((end_time - start_time) in seconds / 60)
  duration_minutes  INTEGER GENERATED ALWAYS AS (
                      CASE
                        WHEN start_time IS NOT NULL AND end_time IS NOT NULL
                        THEN FLOOR(
                               EXTRACT(EPOCH FROM (end_time - start_time)) / 60
                             )::INTEGER
                        ELSE NULL
                      END
                    ) STORED,

  notes             TEXT,
  status            activity_status_enum NOT NULL DEFAULT 'Scheduled',

  -- ---- Offline sync fields ----
  offline_id        TEXT        UNIQUE,        -- Client UUID; used as upsert key
  created_offline   BOOLEAN     NOT NULL DEFAULT FALSE,
  client_updated_at TIMESTAMPTZ,               -- Client-side last-modified timestamp
  synced_at         TIMESTAMPTZ,               -- Set by server on first successful sync

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_end_after_start
    CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
);

COMMENT ON TABLE  activities IS 'All field tasks: planting, spraying, harvesting, etc.';
COMMENT ON COLUMN activities.offline_id IS 'Client-generated UUID for offline deduplication. Use ON CONFLICT (offline_id) DO UPDATE when syncing.';
COMMENT ON COLUMN activities.created_offline IS 'TRUE = record was created by a device without internet access.';
COMMENT ON COLUMN activities.client_updated_at IS 'Last-modified timestamp from the client device; used to resolve sync conflicts.';
COMMENT ON COLUMN activities.synced_at IS 'Timestamp set by the server when an offline record is first successfully received.';
COMMENT ON COLUMN activities.duration_minutes IS 'Auto-computed from start_time and end_time. Read-only.';


-- --------------------------------------------------------------
-- TABLE 6: scouting_observations
-- Field observations captured during scouting walks or as part
-- of an Inspection activity. Also needs offline sync support
-- since scouts work in the field without connectivity.
-- --------------------------------------------------------------
CREATE TABLE scouting_observations (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id       UUID           REFERENCES activities(id) ON DELETE SET NULL,
  section_id        UUID           NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  row_number        INTEGER,
  issue_type        issue_type_enum NOT NULL,
  description       TEXT,
  quantity_affected INTEGER,
  severity          severity_enum   NOT NULL,
  resolved          BOOLEAN         NOT NULL DEFAULT FALSE,

  -- Offline sync fields (mirrors activities pattern)
  offline_id        TEXT        UNIQUE,
  created_offline   BOOLEAN     NOT NULL DEFAULT FALSE,
  client_updated_at TIMESTAMPTZ,
  synced_at         TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  scouting_observations IS 'Pest, disease, and plant health observations from field scouting.';
COMMENT ON COLUMN scouting_observations.quantity_affected IS 'Number of plants, rows, or trays affected.';
COMMENT ON COLUMN scouting_observations.resolved IS 'FALSE = open issue requiring follow-up; TRUE = treated/resolved.';


-- --------------------------------------------------------------
-- TABLE 7: nursery_trays
-- Tracks seed trays from planting through to transplanting.
-- germination_rate stored as decimal percentage (e.g. 92.50 = 92.5%).
-- --------------------------------------------------------------
CREATE TABLE nursery_trays (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id               UUID        NOT NULL REFERENCES sections(id)  ON DELETE RESTRICT,
  crop_name                TEXT        NOT NULL,
  variety                  TEXT,
  tray_count               INTEGER     NOT NULL CHECK (tray_count > 0),
  date_planted             DATE        NOT NULL,
  expected_transplant_date DATE,
  actual_transplant_date   DATE,
  germination_rate         DECIMAL(5, 2) CHECK (germination_rate BETWEEN 0 AND 100),
  transplant_shock_notes   TEXT,
  created_by               UUID        REFERENCES people(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  nursery_trays IS 'Seed tray lifecycle from nursery planting to field transplanting.';
COMMENT ON COLUMN nursery_trays.germination_rate IS 'Percentage of seeds that germinated (0.00–100.00).';


-- --------------------------------------------------------------
-- TABLE 8: inventory
-- Farm inputs and consumables: seeds, chemicals, fuel, packaging.
-- quantity is decremented automatically by a trigger when
-- inventory_usage records are inserted.
-- --------------------------------------------------------------
CREATE TABLE inventory (
  id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         UUID                    NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  item_name       TEXT                    NOT NULL,
  category        inventory_category_enum NOT NULL,
  brand           TEXT,
  quantity        DECIMAL(12, 3)          NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit            inventory_unit_enum     NOT NULL,
  reorder_level   DECIMAL(12, 3),
  cost_per_unit   DECIMAL(12, 2),
  supplier_name   TEXT,
  created_at      TIMESTAMPTZ             NOT NULL DEFAULT now(),
  last_updated    TIMESTAMPTZ             NOT NULL DEFAULT now()
);

COMMENT ON TABLE  inventory IS 'Farm input stock: seeds, fertilizers, chemicals, fuel, packaging.';
COMMENT ON COLUMN inventory.reorder_level IS 'Quantity threshold that triggers a low-stock alert.';
COMMENT ON COLUMN inventory.last_updated IS 'Auto-updated by trigger when quantity changes.';


-- --------------------------------------------------------------
-- TABLE 9: inventory_usage
-- Records each time an inventory item is consumed during an
-- activity. The after-insert trigger on this table decrements
-- the parent inventory.quantity automatically.
-- --------------------------------------------------------------
CREATE TABLE inventory_usage (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id   UUID           NOT NULL REFERENCES inventory(id)  ON DELETE RESTRICT,
  activity_id    UUID           REFERENCES activities(id)           ON DELETE SET NULL,
  quantity_used  DECIMAL(12, 3) NOT NULL CHECK (quantity_used > 0),
  used_by        UUID           REFERENCES people(id)               ON DELETE SET NULL,
  used_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
  notes          TEXT
);

COMMENT ON TABLE inventory_usage IS 'Tracks consumption of inventory items per field activity.';


-- --------------------------------------------------------------
-- TABLE 10: market_deliveries
-- Each truck/vehicle load sent to the Johannesburg Fresh Produce
-- Market through agent DW Fresh Produce JHB.
-- Tracks gross quantities from farm gate to market gate.
-- --------------------------------------------------------------
CREATE TABLE market_deliveries (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id              UUID        NOT NULL REFERENCES farms(id) ON DELETE RESTRICT,
  delivery_date        DATE        NOT NULL,
  producer_ref_number  TEXT,
  gate_stamp_number    TEXT,
  agent_name           TEXT        NOT NULL DEFAULT 'DW Fresh Produce JHB',
  product_name         TEXT        NOT NULL,
  variety              TEXT,
  quantity_sent        DECIMAL(12, 3),
  quantity_received    DECIMAL(12, 3),
  quantity_unsold      DECIMAL(12, 3),
  quantity_discarded   DECIMAL(12, 3),
  arrival_timestamp    TIMESTAMPTZ,
  delivery_notes       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  market_deliveries IS 'Produce deliveries to JHB Fresh Produce Market via DW Fresh Produce agent.';
COMMENT ON COLUMN market_deliveries.producer_ref_number IS 'Reference number assigned by the producer/farm for this delivery.';
COMMENT ON COLUMN market_deliveries.gate_stamp_number IS 'Market gate stamp/entry number issued on arrival.';
COMMENT ON COLUMN market_deliveries.quantity_received IS 'Quantity confirmed by the agent on arrival (may differ from sent due to transit loss).';


-- --------------------------------------------------------------
-- TABLE 11: market_batches
-- Individual sale lots within a delivery. A single delivery of
-- spinach may sell in multiple batches at different prices.
--
-- ALL FINANCIAL COLUMNS ARE COMPUTED (GENERATED ALWAYS AS STORED):
--   gross_amount             = quantity_sold × price_per_unit
--   market_commission_amount = gross_amount × market_commission_rate
--   agent_commission_amount  = gross_amount × agent_commission_rate
--   vat_on_commissions       = (market_comm + agent_comm) × vat_rate
--   net_income               = gross_amount
--                              − market_commission_amount × (1 + vat_rate)
--                              − agent_commission_amount  × (1 + vat_rate)
--                              − bank_charge
--
-- Rates are stored per row (not hardcoded) so they can vary if
-- the market changes its commission structure in the future.
-- PostgreSQL GENERATED columns cannot reference other GENERATED
-- columns, so each formula is expanded to its base inputs.
-- --------------------------------------------------------------
CREATE TABLE market_batches (
  id                       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id              UUID           NOT NULL REFERENCES market_deliveries(id) ON DELETE CASCADE,
  batch_number             INTEGER        NOT NULL CHECK (batch_number > 0),

  -- Base inputs (editable)
  quantity_sold            DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),
  price_per_unit           DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (price_per_unit >= 0),
  market_commission_rate   DECIMAL(8, 6)  NOT NULL DEFAULT 0.05    CHECK (market_commission_rate BETWEEN 0 AND 1),
  agent_commission_rate    DECIMAL(8, 6)  NOT NULL DEFAULT 0.085   CHECK (agent_commission_rate  BETWEEN 0 AND 1),
  bank_charge              DECIMAL(10, 2) NOT NULL DEFAULT 20.00   CHECK (bank_charge >= 0),
  vat_rate                 DECIMAL(8, 6)  NOT NULL DEFAULT 0.15    CHECK (vat_rate BETWEEN 0 AND 1),

  -- Computed financial columns (read-only, auto-calculated)
  gross_amount             DECIMAL(14, 2) GENERATED ALWAYS AS (
                             ROUND(quantity_sold * price_per_unit, 2)
                           ) STORED,

  market_commission_amount DECIMAL(14, 2) GENERATED ALWAYS AS (
                             ROUND(quantity_sold * price_per_unit * market_commission_rate, 2)
                           ) STORED,

  agent_commission_amount  DECIMAL(14, 2) GENERATED ALWAYS AS (
                             ROUND(quantity_sold * price_per_unit * agent_commission_rate, 2)
                           ) STORED,

  vat_on_commissions       DECIMAL(14, 2) GENERATED ALWAYS AS (
                             ROUND(
                               (quantity_sold * price_per_unit * market_commission_rate
                                + quantity_sold * price_per_unit * agent_commission_rate)
                               * vat_rate,
                             2)
                           ) STORED,

  -- Net income formula:
  --   gross − (market_comm × (1 + vat)) − (agent_comm × (1 + vat)) − bank_charge
  net_income               DECIMAL(14, 2) GENERATED ALWAYS AS (
                             ROUND(
                               (quantity_sold * price_per_unit)
                               - (quantity_sold * price_per_unit * market_commission_rate * (1 + vat_rate))
                               - (quantity_sold * price_per_unit * agent_commission_rate  * (1 + vat_rate))
                               - bank_charge,
                             2)
                           ) STORED,

  sold_at                  TIMESTAMPTZ,

  CONSTRAINT uq_batch_per_delivery UNIQUE (delivery_id, batch_number)
);

COMMENT ON TABLE  market_batches IS 'Individual sale batches within a market delivery. All ZAR amounts auto-computed.';
COMMENT ON COLUMN market_batches.gross_amount IS 'quantity_sold × price_per_unit. Auto-computed.';
COMMENT ON COLUMN market_batches.net_income IS 'Farmer''s take-home after market commission, agent commission, VAT on commissions, and bank charges. Auto-computed.';
COMMENT ON COLUMN market_batches.vat_on_commissions IS 'VAT applies to both market and agent commissions (not on gross sales). Auto-computed.';


-- --------------------------------------------------------------
-- TABLE 12: performance_notes
-- Supervisor/manager notes on worker performance tied to
-- a specific activity. noted_by and person_id are separate
-- to allow one manager to review any worker.
-- --------------------------------------------------------------
CREATE TABLE performance_notes (
  id           UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id    UUID                    NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  activity_id  UUID                    REFERENCES activities(id)      ON DELETE SET NULL,
  noted_by     UUID                    NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  rating       performance_rating_enum NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ             NOT NULL DEFAULT now(),

  CONSTRAINT chk_not_self_review CHECK (person_id != noted_by)
);

COMMENT ON TABLE  performance_notes IS 'Manager/supervisor performance ratings for workers per activity.';
COMMENT ON COLUMN performance_notes.noted_by IS 'The person (manager/supervisor) who wrote this performance note.';


-- --------------------------------------------------------------
-- TABLE 13: crm_leads
-- Tracks potential clients (buyers) and suppliers. Used by
-- management to follow up on new market opportunities or
-- alternative input suppliers.
-- --------------------------------------------------------------
CREATE TABLE crm_leads (
  id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id             UUID             NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  lead_type           lead_type_enum   NOT NULL,
  contact_name        TEXT             NOT NULL,
  business_name       TEXT,
  phone               TEXT,
  email               TEXT,
  products_interested TEXT,
  last_contact_date   DATE,
  follow_up_date      DATE,
  notes               TEXT,
  status              lead_status_enum NOT NULL DEFAULT 'Active',
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT now()
);

COMMENT ON TABLE  crm_leads IS 'Client and supplier leads for business development.';
COMMENT ON COLUMN crm_leads.products_interested IS 'Free-text list of crops or products the lead is interested in buying or supplying.';


-- --------------------------------------------------------------
-- TABLE 14: machinery
-- Tracks all farm equipment. hours_used is updated automatically
-- by the trg_update_machinery_hours trigger whenever a
-- machinery_usage record is inserted.
-- --------------------------------------------------------------
CREATE TABLE machinery (
  id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id            UUID           NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name               TEXT           NOT NULL,
  model              TEXT,
  hours_used         DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (hours_used >= 0),
  last_service_date  DATE,
  next_service_hours DECIMAL(10, 2),
  fuel_type          fuel_type_enum,
  notes              TEXT,
  active             BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT now()
);

COMMENT ON TABLE  machinery IS 'Farm equipment register: tractors, sprayers, irrigation pumps, etc.';
COMMENT ON COLUMN machinery.hours_used IS 'Cumulative engine/operating hours. Auto-incremented by machinery_usage trigger.';
COMMENT ON COLUMN machinery.next_service_hours IS 'Target total hours_used at which the next service is due.';


-- --------------------------------------------------------------
-- TABLE 15: machinery_usage
-- Logs each time a machine is used on a field activity.
-- An after-insert trigger updates machinery.hours_used.
-- --------------------------------------------------------------
CREATE TABLE machinery_usage (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  machinery_id      UUID           NOT NULL REFERENCES machinery(id) ON DELETE RESTRICT,
  activity_id       UUID           REFERENCES activities(id)         ON DELETE SET NULL,
  hours_logged      DECIMAL(10, 2) NOT NULL CHECK (hours_logged > 0),
  fuel_used_litres  DECIMAL(10, 2) CHECK (fuel_used_litres >= 0),
  operated_by       UUID           REFERENCES people(id)             ON DELETE SET NULL,
  used_at           TIMESTAMPTZ    NOT NULL DEFAULT now()
);

COMMENT ON TABLE machinery_usage IS 'Machine hours and fuel consumption per field activity.';


-- --------------------------------------------------------------
-- TABLE 16: workplan_schedule
-- Forward-looking plan of field activities. When a worker
-- completes a scheduled task, actual_activity_id is linked.
-- If a task runs over (e.g. Harvesting overruns), the reschedule
-- logic in the app sets rescheduled = TRUE and creates a new
-- workplan_schedule row for the overflow.
-- --------------------------------------------------------------
CREATE TABLE workplan_schedule (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id             UUID           NOT NULL REFERENCES farms(id)      ON DELETE CASCADE,
  planned_date        DATE           NOT NULL,
  activity_type       task_type_enum NOT NULL,
  section_id          UUID           NOT NULL REFERENCES sections(id)   ON DELETE RESTRICT,
  assigned_to         UUID           REFERENCES people(id)              ON DELETE SET NULL,
  planned_start_time  TIME,
  planned_end_time    TIME,
  actual_activity_id  UUID           REFERENCES activities(id)          ON DELETE SET NULL,
  rescheduled         BOOLEAN        NOT NULL DEFAULT FALSE,
  reschedule_reason   TEXT,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT chk_plan_end_after_start
    CHECK (planned_end_time IS NULL OR planned_start_time IS NULL
           OR planned_end_time >= planned_start_time)
);

COMMENT ON TABLE  workplan_schedule IS 'Forward planning calendar for field activities. Links to actual activity when executed.';
COMMENT ON COLUMN workplan_schedule.actual_activity_id IS 'Populated when the worker starts the planned task, linking plan to execution.';
COMMENT ON COLUMN workplan_schedule.rescheduled IS 'TRUE = this plan slot was moved; reschedule_reason explains why.';
