-- Preflight 013: Email field mapping + template link (Milestone 16)
-- Checks: rt_segment_campaigns exists; email_field_map and email_template_id columns don't exist yet.

WITH prereq AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'rt_segment_campaigns'
  ) AS ok
),
cols AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'rt_segment_campaigns'
    AND column_name IN ('email_field_map', 'email_template_id')
),
has_new AS (
  SELECT EXISTS (SELECT 1 FROM cols) AS exists
)
SELECT
  CASE
    WHEN NOT p.ok THEN 'rt_segment_campaigns table does not exist. Run migration 007 first.'
    WHEN h.exists THEN 'email_field_map or email_template_id already exists. Migration 013 may have been applied.'
    ELSE 'OK'
  END AS status
FROM prereq p, has_new h;
