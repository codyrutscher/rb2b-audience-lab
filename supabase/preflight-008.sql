-- Pre-flight: run this in Supabase SQL Editor BEFORE applying 008_pixels.sql.
-- Verifies prerequisites exist and rt_pixels does not yet exist (safe to migrate).

-- =============================================================================
-- 1) Prerequisites: rt_accounts must exist (from migration 007)
-- =============================================================================
WITH prerequisites AS (
  SELECT unnest(ARRAY['rt_accounts']) AS table_name
),
prereq_check AS (
  SELECT
    p.table_name,
    CASE WHEN c.table_name IS NOT NULL THEN true ELSE false END AS exists
  FROM prerequisites p
  LEFT JOIN information_schema.tables c
    ON c.table_schema = 'public' AND c.table_name = p.table_name
),
-- =============================================================================
-- 2) Collision check: rt_pixels should not exist yet
-- =============================================================================
rt_pixels_check AS (
  SELECT
    CASE WHEN c.table_name IS NOT NULL THEN true ELSE false END AS already_exists
  FROM (SELECT 1) x
  LEFT JOIN information_schema.tables c
    ON c.table_schema = 'public' AND c.table_name = 'rt_pixels'
),
-- =============================================================================
-- 3) Summary
-- =============================================================================
prereq_ok AS (
  SELECT count(*) FILTER (WHERE exists) = count(*) AS ok,
         count(*) FILTER (WHERE exists) AS passed,
         count(*) AS total
  FROM prereq_check
)
SELECT
  CASE
    WHEN p.ok AND NOT r.already_exists THEN 'OK'
    WHEN NOT p.ok THEN 'FAIL_PREREQ'
    WHEN r.already_exists THEN 'FAIL_RT_PIXELS_EXISTS'
    ELSE 'UNKNOWN'
  END AS status,
  p.passed || '/' || p.total AS prerequisites_met,
  CASE
    WHEN NOT p.ok THEN 'Missing rt_accounts. Run migration 007 first.'
    WHEN r.already_exists THEN 'rt_pixels already exists. Migration 008 may have been applied. Skip.'
    ELSE 'Safe to run 008_pixels.sql'
  END AS action
FROM prereq_ok p, rt_pixels_check r;

-- =============================================================================
-- 4) Per-table details
-- =============================================================================
SELECT
  'rt_accounts' AS table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_accounts')
    THEN 'EXISTS (prereq)' ELSE 'MISSING' END AS status
UNION ALL
SELECT
  'rt_pixels',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_pixels')
    THEN 'EXISTS (already applied)' ELSE 'absent (will create)' END;
