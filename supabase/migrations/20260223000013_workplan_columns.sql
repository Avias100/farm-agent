-- ==============================================================
-- NEBULA FRESH PRODUCE MANAGEMENT SYSTEM
-- Migration 013: Add Workplan Schedule Columns
--
-- Add missing columns for Module 8 functionality:
-- - task_name, notes, status, completion_date
-- - recurrence fields for automatic rescheduling
-- ==============================================================

-- Add task tracking columns
ALTER TABLE workplan_schedule
  ADD COLUMN task_name TEXT,
  ADD COLUMN notes TEXT,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Completed', 'Skipped', 'Rescheduled')),
  ADD COLUMN completion_date DATE;

-- Add recurrence columns for automatic reschedule logic
ALTER TABLE workplan_schedule
  ADD COLUMN recurrence_type TEXT DEFAULT 'Once'
    CHECK (recurrence_type IN ('Once', 'Daily', 'Weekly', 'Fortnightly', 'Monthly')),
  ADD COLUMN recurrence_interval INTEGER DEFAULT 1,
  ADD COLUMN recurrence_anchor TEXT; -- e.g., "Monday" for weekly, "1" for monthly day-of-month

COMMENT ON COLUMN workplan_schedule.task_name IS 'User-friendly task label (optional, supplements activity_type).';
COMMENT ON COLUMN workplan_schedule.status IS 'Pending/Completed/Skipped/Rescheduled.';
COMMENT ON COLUMN workplan_schedule.recurrence_type IS 'Once (default) or Daily/Weekly/Fortnightly/Monthly. When Completed/Skipped, next occurrence auto-created.';
COMMENT ON COLUMN workplan_schedule.recurrence_interval IS 'Repeat every N days/weeks/fortnights/months (default: 1).';
COMMENT ON COLUMN workplan_schedule.recurrence_anchor IS 'Optional anchor for recurring patterns (e.g., "Monday" for weekly tasks).';
