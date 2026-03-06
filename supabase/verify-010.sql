-- Verification: run AFTER 010_pixel_schedules.sql to confirm migration succeeded.

-- =============================================================================
-- 1) Table and columns
-- =============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_pixel_schedules'
ORDER BY ordinal_position;

-- =============================================================================
-- 2) Summary: PASS if 10 columns exist
-- =============================================================================
SELECT
  CASE WHEN COUNT(*) = 10 THEN 'PASS' ELSE 'FAIL' END AS verification_status,
  COUNT(*) AS column_count,
  'Expected: id, pixel_id, account_id, interval_type, interval_value, enabled, last_run_at, next_run_at, created_at, updated_at' AS note
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_pixel_schedules';
