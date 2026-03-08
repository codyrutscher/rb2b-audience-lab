-- Pre-flight: run BEFORE 022_slot_defaults.sql

WITH prereq AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'rt_email_templates'
  ) AS exists
),
cols AS (
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'rt_email_templates'
),
has_col AS (
  SELECT EXISTS (SELECT 1 FROM cols WHERE column_name = 'slot_defaults') AS exists
)
SELECT
  CASE
    WHEN p.exists AND NOT h.exists THEN 'OK'
    WHEN NOT p.exists THEN 'FAIL_PREREQ'
    WHEN h.exists THEN 'FAIL_ALREADY_APPLIED'
    ELSE 'UNKNOWN'
  END AS status,
  CASE
    WHEN NOT p.exists THEN 'rt_email_templates does not exist.'
    WHEN h.exists THEN 'slot_defaults already exists. Migration 022 applied.'
    ELSE 'Safe to run 022_slot_defaults.sql'
  END AS action
FROM prereq p, has_col h;
