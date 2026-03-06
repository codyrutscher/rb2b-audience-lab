-- Pre-flight: run this in Supabase SQL Editor BEFORE applying 010_pixel_schedules.sql.
-- Verifies rt_pixels exists and rt_pixel_schedules does not yet exist.

-- =============================================================================
-- 1) Prerequisites
-- =============================================================================
WITH prereq AS (
  SELECT unnest(ARRAY['rt_pixels']) AS t
),
prereq_check AS (
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_pixels') AS ok
),
-- =============================================================================
-- 2) Collision
-- =============================================================================
schedule_exists AS (
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_pixel_schedules') AS exists
)
SELECT
  CASE
    WHEN p.ok AND NOT s.exists THEN 'OK'
    WHEN NOT p.ok THEN 'FAIL_PREREQ'
    WHEN s.exists THEN 'FAIL_ALREADY_APPLIED'
    ELSE 'UNKNOWN'
  END AS status,
  CASE
    WHEN NOT p.ok THEN 'Missing rt_pixels. Run 009 first.'
    WHEN s.exists THEN 'rt_pixel_schedules already exists. Migration 010 may have been applied.'
    ELSE 'Safe to run 010_pixel_schedules.sql'
  END AS action
FROM prereq_check p, schedule_exists s;

-- =============================================================================
-- 3) Per-table details
-- =============================================================================
SELECT 'rt_pixels' AS table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_pixels') THEN 'EXISTS' ELSE 'MISSING' END AS status
UNION ALL
SELECT 'rt_pixel_schedules', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_pixel_schedules') THEN 'EXISTS (already applied)' ELSE 'absent (will create)' END;
