-- =============================================================================
-- Verification: run AFTER 020_template_variable_mappings.sql
-- Confirms variable_mappings column was added successfully.
-- =============================================================================

-- 1) rt_email_templates: variable_mappings column
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_email_templates'
  AND column_name = 'variable_mappings';

-- 2) Summary: PASS if column exists
WITH expected AS (
  SELECT 1 AS expected_count
),
actual AS (
  SELECT count(*) AS actual_count
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'rt_email_templates'
    AND column_name = 'variable_mappings'
)
SELECT
  CASE WHEN a.actual_count >= e.expected_count THEN 'PASS' ELSE 'FAIL' END AS verification_status,
  a.actual_count AS columns_found,
  e.expected_count AS expected,
  'rt_email_templates.variable_mappings (JSONB, default ''{}'')' AS note
FROM actual a, expected e;
