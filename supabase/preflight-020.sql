-- =============================================================================
-- Pre-flight: run BEFORE 020_template_variable_mappings.sql
-- Verifies rt_email_templates exists and variable_mappings does not yet exist.
-- =============================================================================

-- 1) Prerequisite: rt_email_templates must exist
WITH prereq AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'rt_email_templates'
  ) AS exists
),
-- 2) Collision: variable_mappings should not exist
cols_templates AS (
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'rt_email_templates'
),
has_variable_mappings AS (
  SELECT EXISTS (SELECT 1 FROM cols_templates WHERE column_name = 'variable_mappings') AS exists
),
-- 3) Summary
prereq_ok AS (
  SELECT p.exists AS ok FROM prereq p
)
SELECT
  CASE
    WHEN p.ok AND NOT h.exists THEN 'OK'
    WHEN NOT p.ok THEN 'FAIL_PREREQ'
    WHEN h.exists THEN 'FAIL_ALREADY_APPLIED'
    ELSE 'UNKNOWN'
  END AS status,
  CASE
    WHEN NOT p.ok THEN 'rt_email_templates does not exist. Run migration 012_email_templates.sql first.'
    WHEN h.exists THEN 'rt_email_templates.variable_mappings already exists. Migration 020 may have been applied.'
    ELSE 'Safe to run 020_template_variable_mappings_manual.sql'
  END AS action
FROM prereq_ok p, has_variable_mappings h;

-- 4) Per-table detail
SELECT 'rt_email_templates' AS table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_email_templates')
    THEN 'EXISTS' ELSE 'MISSING' END AS status;
