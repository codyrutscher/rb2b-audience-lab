-- Verification: run AFTER 009_pixel_ingest.sql to confirm migration succeeded.

-- =============================================================================
-- 1) rt_contacts: new columns
-- =============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_contacts'
  AND column_name IN ('edid', 'hem_sha256', 'pixel_data')
ORDER BY column_name;

-- =============================================================================
-- 2) rt_contact_events: new columns
-- =============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_contact_events'
  AND column_name IN ('full_url', 'referrer_url', 'resolution', 'pixel_id', 'source_event_key')
ORDER BY column_name;

-- =============================================================================
-- 3) Unique index for source_event_key
-- =============================================================================
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'rt_contact_events'
  AND indexname = 'idx_rt_contact_events_source_key';

-- =============================================================================
-- 4) Summary: PASS if all 8 new columns exist
-- =============================================================================
WITH expected AS (
  SELECT 8 AS expected_count
),
actual AS (
  SELECT count(*) AS actual_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (
      (table_name = 'rt_contacts' AND column_name IN ('edid', 'hem_sha256', 'pixel_data'))
      OR (table_name = 'rt_contact_events' AND column_name IN ('full_url', 'referrer_url', 'resolution', 'pixel_id', 'source_event_key'))
    )
)
SELECT
  CASE WHEN a.actual_count >= e.expected_count THEN 'PASS' ELSE 'FAIL' END AS verification_status,
  a.actual_count AS column_count,
  e.expected_count AS expected,
  'rt_contacts: edid, hem_sha256, pixel_data | rt_contact_events: full_url, referrer_url, resolution, pixel_id, source_event_key' AS note
FROM actual a, expected e;
