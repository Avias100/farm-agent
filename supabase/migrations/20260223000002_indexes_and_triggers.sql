-- ==============================================================
-- NEBULA FRESH PRODUCE MANAGEMENT SYSTEM
-- Migration 002: Indexes + Triggers + Helper Functions
-- ==============================================================


-- ==============================================================
-- 1. INDEXES
-- Strategy: index every FK, every column used in WHERE or ORDER BY
-- clauses in the most frequent queries. Use partial indexes where
-- only a subset of rows is typically queried.
-- ==============================================================


-- ---- farms ----
-- (PK indexed automatically; no additional indexes needed)


-- ---- sections ----
CREATE INDEX idx_sections_farm_id
  ON sections(farm_id);


-- ---- beds_rows ----
CREATE INDEX idx_beds_rows_section_id
  ON beds_rows(section_id);


-- ---- people ----
CREATE INDEX idx_people_farm_id
  ON people(farm_id);

-- Partial: only active staff appear in dropdowns and assignments
CREATE INDEX idx_people_active
  ON people(farm_id, full_name)
  WHERE active = TRUE;

-- Auth user lookup (login → people record)
CREATE INDEX idx_people_auth_user_id
  ON people(auth_user_id)
  WHERE auth_user_id IS NOT NULL;


-- ---- activities ----
-- Most frequent query: activities for a section, sorted by date
CREATE INDEX idx_activities_section_start
  ON activities(section_id, start_time DESC);

-- Filter by worker
CREATE INDEX idx_activities_person_id
  ON activities(person_id);

-- Filter by task type (e.g. "show all Harvesting in the last 7 days")
CREATE INDEX idx_activities_task_type
  ON activities(task_type);

-- Filter by status (dashboards, workplan status)
CREATE INDEX idx_activities_status
  ON activities(status)
  WHERE status IN ('Scheduled', 'In Progress');

-- Offline sync: quickly find all unsynced offline records
CREATE INDEX idx_activities_unsynced
  ON activities(created_offline, synced_at)
  WHERE created_offline = TRUE AND synced_at IS NULL;

-- Deduplication lookup during sync
CREATE INDEX idx_activities_offline_id
  ON activities(offline_id)
  WHERE offline_id IS NOT NULL;


-- ---- scouting_observations ----
-- Most frequent: unresolved issues by section
CREATE INDEX idx_scouting_section_resolved
  ON scouting_observations(section_id, resolved, severity);

-- Filter by severity for alert dashboards
CREATE INDEX idx_scouting_severity
  ON scouting_observations(severity)
  WHERE resolved = FALSE;

-- Link back to activity
CREATE INDEX idx_scouting_activity_id
  ON scouting_observations(activity_id)
  WHERE activity_id IS NOT NULL;

-- Offline sync
CREATE INDEX idx_scouting_unsynced
  ON scouting_observations(created_offline, synced_at)
  WHERE created_offline = TRUE AND synced_at IS NULL;


-- ---- nursery_trays ----
CREATE INDEX idx_nursery_trays_section_id
  ON nursery_trays(section_id);

-- Upcoming transplant scheduling
CREATE INDEX idx_nursery_trays_expected_transplant
  ON nursery_trays(expected_transplant_date)
  WHERE actual_transplant_date IS NULL;


-- ---- inventory ----
CREATE INDEX idx_inventory_farm_id
  ON inventory(farm_id);

CREATE INDEX idx_inventory_category
  ON inventory(farm_id, category);

-- Low-stock alert: only rows at or below reorder level
CREATE INDEX idx_inventory_low_stock
  ON inventory(farm_id, item_name)
  WHERE reorder_level IS NOT NULL AND quantity <= reorder_level;


-- ---- inventory_usage ----
CREATE INDEX idx_inventory_usage_inventory_id
  ON inventory_usage(inventory_id);

CREATE INDEX idx_inventory_usage_activity_id
  ON inventory_usage(activity_id)
  WHERE activity_id IS NOT NULL;

CREATE INDEX idx_inventory_usage_used_at
  ON inventory_usage(used_at DESC);


-- ---- market_deliveries ----
-- Most frequent: deliveries by farm sorted by date (financial reports)
CREATE INDEX idx_market_deliveries_farm_date
  ON market_deliveries(farm_id, delivery_date DESC);

-- Product-level reporting
CREATE INDEX idx_market_deliveries_product
  ON market_deliveries(farm_id, product_name);


-- ---- market_batches ----
CREATE INDEX idx_market_batches_delivery_id
  ON market_batches(delivery_id);

CREATE INDEX idx_market_batches_sold_at
  ON market_batches(sold_at DESC);


-- ---- performance_notes ----
CREATE INDEX idx_performance_notes_person_id
  ON performance_notes(person_id);

CREATE INDEX idx_performance_notes_noted_by
  ON performance_notes(noted_by);

CREATE INDEX idx_performance_notes_activity_id
  ON performance_notes(activity_id)
  WHERE activity_id IS NOT NULL;


-- ---- crm_leads ----
CREATE INDEX idx_crm_leads_farm_status
  ON crm_leads(farm_id, status);

-- Follow-up reminders (show leads due today or earlier)
CREATE INDEX idx_crm_leads_follow_up
  ON crm_leads(follow_up_date)
  WHERE follow_up_date IS NOT NULL AND status NOT IN ('Closed', 'Won');


-- ---- machinery ----
CREATE INDEX idx_machinery_farm_id
  ON machinery(farm_id)
  WHERE active = TRUE;

-- Service alert: machines approaching next_service_hours
CREATE INDEX idx_machinery_service_alert
  ON machinery(farm_id, hours_used, next_service_hours)
  WHERE active = TRUE AND next_service_hours IS NOT NULL;


-- ---- machinery_usage ----
CREATE INDEX idx_machinery_usage_machinery_id
  ON machinery_usage(machinery_id);

CREATE INDEX idx_machinery_usage_activity_id
  ON machinery_usage(activity_id)
  WHERE activity_id IS NOT NULL;


-- ---- workplan_schedule ----
CREATE INDEX idx_workplan_farm_date
  ON workplan_schedule(farm_id, planned_date);

CREATE INDEX idx_workplan_section_id
  ON workplan_schedule(section_id);

CREATE INDEX idx_workplan_assigned_to
  ON workplan_schedule(assigned_to)
  WHERE assigned_to IS NOT NULL;

-- Unlinked plans (not yet executed)
CREATE INDEX idx_workplan_unexecuted
  ON workplan_schedule(farm_id, planned_date)
  WHERE actual_activity_id IS NULL AND rescheduled = FALSE;


-- ==============================================================
-- 2. TRIGGER FUNCTIONS
-- ==============================================================


-- --------------------------------------------------------------
-- 2a. Update inventory.last_updated and decrement quantity
--     when an inventory_usage record is inserted.
--     Also validates that sufficient stock exists.
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_inventory_on_usage_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_quantity DECIMAL(12, 3);
BEGIN
  -- Lock the inventory row for this transaction
  SELECT quantity
    INTO v_current_quantity
    FROM inventory
   WHERE id = NEW.inventory_id
     FOR UPDATE;

  IF v_current_quantity IS NULL THEN
    RAISE EXCEPTION 'Inventory item % not found', NEW.inventory_id;
  END IF;

  IF v_current_quantity < NEW.quantity_used THEN
    RAISE EXCEPTION
      'Insufficient stock: %.3f available, %.3f requested for item %',
      v_current_quantity, NEW.quantity_used, NEW.inventory_id;
  END IF;

  -- Decrement quantity and update timestamp
  UPDATE inventory
     SET quantity     = quantity - NEW.quantity_used,
         last_updated = now()
   WHERE id = NEW.inventory_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_on_usage_insert
  AFTER INSERT ON inventory_usage
  FOR EACH ROW
  EXECUTE FUNCTION fn_inventory_on_usage_insert();

COMMENT ON FUNCTION fn_inventory_on_usage_insert IS
  'Decrements inventory.quantity and updates last_updated when inventory_usage is inserted. Raises an error if stock is insufficient.';


-- --------------------------------------------------------------
-- 2b. Restore inventory quantity when an inventory_usage row
--     is deleted (e.g. if a usage was logged in error).
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_inventory_on_usage_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inventory
     SET quantity     = quantity + OLD.quantity_used,
         last_updated = now()
   WHERE id = OLD.inventory_id;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_inventory_on_usage_delete
  AFTER DELETE ON inventory_usage
  FOR EACH ROW
  EXECUTE FUNCTION fn_inventory_on_usage_delete();

COMMENT ON FUNCTION fn_inventory_on_usage_delete IS
  'Restores inventory.quantity when a usage record is deleted.';


-- --------------------------------------------------------------
-- 2c. Accumulate hours on machinery when machinery_usage inserted.
--     Also adjusts when a usage record is deleted or updated.
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_machinery_hours_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE machinery
       SET hours_used = hours_used + NEW.hours_logged
     WHERE id = NEW.machinery_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE machinery
       SET hours_used = GREATEST(0, hours_used - OLD.hours_logged)
     WHERE id = OLD.machinery_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Adjust by the delta if hours_logged changed
    UPDATE machinery
       SET hours_used = GREATEST(0, hours_used - OLD.hours_logged + NEW.hours_logged)
     WHERE id = NEW.machinery_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_machinery_hours_insert
  AFTER INSERT ON machinery_usage
  FOR EACH ROW
  EXECUTE FUNCTION fn_machinery_hours_update();

CREATE TRIGGER trg_machinery_hours_delete
  AFTER DELETE ON machinery_usage
  FOR EACH ROW
  EXECUTE FUNCTION fn_machinery_hours_update();

CREATE TRIGGER trg_machinery_hours_update
  AFTER UPDATE OF hours_logged ON machinery_usage
  FOR EACH ROW
  EXECUTE FUNCTION fn_machinery_hours_update();

COMMENT ON FUNCTION fn_machinery_hours_update IS
  'Keeps machinery.hours_used in sync with machinery_usage inserts/updates/deletes.';


-- --------------------------------------------------------------
-- 2d. Set synced_at on activities and scouting_observations
--     the first time an offline record is saved/updated
--     on the server (i.e. when created_offline is TRUE and
--     synced_at has not been set yet).
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_synced_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set synced_at once, on the first server-side save
  IF NEW.created_offline = TRUE AND NEW.synced_at IS NULL THEN
    NEW.synced_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activities_synced_at
  BEFORE INSERT OR UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_synced_at();

CREATE TRIGGER trg_scouting_synced_at
  BEFORE INSERT OR UPDATE ON scouting_observations
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_synced_at();

COMMENT ON FUNCTION fn_set_synced_at IS
  'Stamps synced_at on the first successful server-side write of an offline-created record.';


-- ==============================================================
-- 3. HELPER VIEWS
-- Convenience views for common dashboard queries
-- ==============================================================


-- ---- Open scouting issues (unresolved, ordered by severity) ----
CREATE OR REPLACE VIEW v_open_scouting_issues AS
SELECT
  so.id,
  so.created_at,
  s.name         AS section_name,
  so.row_number,
  so.issue_type,
  so.description,
  so.quantity_affected,
  so.severity,
  so.resolved
FROM scouting_observations so
JOIN sections s ON s.id = so.section_id
WHERE so.resolved = FALSE
ORDER BY
  CASE so.severity
    WHEN 'High'   THEN 1
    WHEN 'Medium' THEN 2
    WHEN 'Low'    THEN 3
  END,
  so.created_at DESC;

COMMENT ON VIEW v_open_scouting_issues IS 'All unresolved scouting observations ordered by severity then date.';


-- ---- Low stock inventory ----
CREATE OR REPLACE VIEW v_low_stock_inventory AS
SELECT
  i.id,
  i.farm_id,
  i.item_name,
  i.category,
  i.brand,
  i.quantity,
  i.unit,
  i.reorder_level,
  i.supplier_name,
  ROUND(i.reorder_level - i.quantity, 3) AS quantity_to_reorder
FROM inventory i
WHERE i.reorder_level IS NOT NULL
  AND i.quantity <= i.reorder_level
ORDER BY (i.reorder_level - i.quantity) DESC;

COMMENT ON VIEW v_low_stock_inventory IS 'Inventory items at or below their reorder level.';


-- ---- Machinery service alerts ----
CREATE OR REPLACE VIEW v_machinery_service_alerts AS
SELECT
  m.id,
  m.farm_id,
  m.name,
  m.model,
  m.hours_used,
  m.next_service_hours,
  m.last_service_date,
  ROUND(m.next_service_hours - m.hours_used, 2) AS hours_until_service
FROM machinery m
WHERE m.active = TRUE
  AND m.next_service_hours IS NOT NULL
  AND m.hours_used >= (m.next_service_hours * 0.9)  -- within 10% of service
ORDER BY (m.next_service_hours - m.hours_used) ASC;

COMMENT ON VIEW v_machinery_service_alerts IS 'Machines within 10% of their next service interval.';


-- ---- Workplan today (unexecuted tasks for today) ----
CREATE OR REPLACE VIEW v_workplan_today AS
SELECT
  ws.id,
  ws.planned_date,
  ws.activity_type,
  s.name          AS section_name,
  p.full_name     AS assigned_to_name,
  ws.planned_start_time,
  ws.planned_end_time,
  ws.actual_activity_id,
  ws.rescheduled,
  ws.reschedule_reason
FROM workplan_schedule ws
JOIN sections s ON s.id = ws.section_id
LEFT JOIN people p ON p.id = ws.assigned_to
WHERE ws.planned_date = CURRENT_DATE
ORDER BY ws.planned_start_time NULLS LAST;

COMMENT ON VIEW v_workplan_today IS 'All planned tasks for the current day with section and assignee details.';


-- ---- Market financial summary by product ----
CREATE OR REPLACE VIEW v_market_summary_by_product AS
SELECT
  md.farm_id,
  md.product_name,
  md.variety,
  COUNT(DISTINCT md.id)      AS delivery_count,
  SUM(mb.quantity_sold)      AS total_kg_sold,
  SUM(mb.gross_amount)       AS total_gross_zar,
  SUM(mb.net_income)         AS total_net_zar,
  ROUND(
    SUM(mb.net_income) / NULLIF(SUM(mb.quantity_sold), 0),
  2)                         AS avg_net_per_kg
FROM market_deliveries md
JOIN market_batches mb ON mb.delivery_id = md.id
GROUP BY md.farm_id, md.product_name, md.variety
ORDER BY total_net_zar DESC;

COMMENT ON VIEW v_market_summary_by_product IS 'Aggregated financial performance per product/variety across all market deliveries.';
