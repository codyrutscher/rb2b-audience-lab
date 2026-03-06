-- Pre-flight: run this in Supabase SQL Editor BEFORE applying 009_pixel_ingest.sql.
-- Verifies rt_pixels exists and new columns do not yet exist (safe to migrate).

-- =============================================================================
-- 1) Prerequisites: rt_pixels, rt_contacts, rt_contact_events must exist
-- =============================================================================
WITH prereq AS (
  SELECT unnest(ARRAY['rt_pixels', 'rt_contacts', 'rt_contact_events']) AS t
),
prereq_check AS (
  SELECT
    p.t AS table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = p.t) AS exists
  FROM prereq p
),
-- =============================================================================
-- 2) Collision: new columns on rt_contacts should not exist
-- =============================================================================
cols_contacts AS (
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'rt_contacts'
),
has_pixel_data AS (
  SELECT EXISTS (SELECT 1 FROM cols_contacts WHERE column_name = 'pixel_data') AS exists
),
-- =============================================================================
-- 3) Summary
-- =============================================================================
prereq_ok AS (
  SELECT count(*) FILTER (WHERE exists) = 3 AS ok FROM prereq_check
)
SELECT
  CASE
    WHEN p.ok AND NOT h.exists THEN 'OK'
    WHEN NOT p.ok THEN 'FAIL_PREREQ'
    WHEN h.exists THEN 'FAIL_ALREADY_APPLIED'
    ELSE 'UNKNOWN'
  END AS status,
  CASE
    WHEN NOT p.ok THEN 'Missing rt_pixels, rt_contacts, or rt_contact_events. Run 008 first.'
    WHEN h.exists THEN 'rt_contacts.pixel_data already exists. Migration 009 may have been applied.'
    ELSE 'Safe to run 009_pixel_ingest.sql'
  END AS action
FROM prereq_ok p, has_pixel_data h;

-- =============================================================================
-- 4) Per-table details
-- =============================================================================
SELECT 'rt_pixels' AS table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_pixels')
    THEN 'EXISTS' ELSE 'MISSING' END AS status
UNION ALL
SELECT 'rt_contacts', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_contacts') THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'rt_contact_events', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_contact_events') THEN 'EXISTS' ELSE 'MISSING' END;
