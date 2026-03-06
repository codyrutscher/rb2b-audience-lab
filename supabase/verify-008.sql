-- Verification: run AFTER 008_pixels.sql to confirm migration succeeded.

-- =============================================================================
-- 1) Table exists and has correct columns
-- =============================================================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_pixels'
ORDER BY ordinal_position;

-- =============================================================================
-- 2) Foreign key to rt_accounts
-- =============================================================================
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'rt_pixels'
  AND tc.constraint_type = 'FOREIGN KEY';

-- =============================================================================
-- 3) Indexes
-- =============================================================================
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'rt_pixels';

-- =============================================================================
-- 4) Summary: PASS if table exists with 11 columns
-- =============================================================================
SELECT
  CASE
    WHEN COUNT(*) = 11 THEN 'PASS'
    ELSE 'FAIL'
  END AS verification_status,
  COUNT(*) AS column_count,
  'Expected: 11 columns (id, account_id, name, website_name, website_url, webhook_url, version, audiencelab_pixel_id, audiencelab_api_key, created_at, updated_at)' AS note
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_pixels';
