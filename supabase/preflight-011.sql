-- Pre-flight: run BEFORE 011_pixel_segments.sql.
-- Verifies rt_segments/rt_segment_rules exist and rt_segment_rule_groups does not.

WITH prereq AS (
  SELECT unnest(ARRAY['rt_segments', 'rt_segment_rules']) AS t
),
prereq_ok AS (
  SELECT count(*) = 2 AS ok FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('rt_segments', 'rt_segment_rules')
),
groups_exists AS (
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_segment_rule_groups') AS exists
)
SELECT
  CASE WHEN p.ok AND NOT g.exists THEN 'OK' WHEN NOT p.ok THEN 'FAIL_PREREQ' WHEN g.exists THEN 'FAIL_ALREADY_APPLIED' ELSE 'UNKNOWN' END AS status,
  CASE WHEN NOT p.ok THEN 'Missing rt_segments or rt_segment_rules.' WHEN g.exists THEN 'rt_segment_rule_groups exists. Skip.' ELSE 'Safe to run 011_pixel_segments.sql' END AS action
FROM prereq_ok p, groups_exists g;
