-- Verification: run AFTER 011_pixel_segments.sql.

SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_segment_rule_groups' ORDER BY ordinal_position;

SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_segment_rules' AND column_name IN ('field', 'operator', 'group_id');

SELECT
  CASE WHEN (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rt_segment_rule_groups') >= 4
    AND (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rt_segment_rules' AND column_name IN ('field', 'operator', 'group_id')) = 3
  THEN 'PASS' ELSE 'FAIL' END AS verification_status;
