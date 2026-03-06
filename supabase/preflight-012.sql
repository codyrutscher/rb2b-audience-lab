-- Pre-flight: run BEFORE 012_email_templates.sql.
WITH prereq AS (
  SELECT count(*) = 2 AS ok FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('rt_accounts', 'rt_knowledge_banks')
),
tbl_exists AS (
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_email_templates') AS exists
)
SELECT
  CASE WHEN p.ok AND NOT t.exists THEN 'OK' WHEN NOT p.ok THEN 'FAIL_PREREQ' WHEN t.exists THEN 'FAIL_ALREADY_APPLIED' ELSE 'UNKNOWN' END AS status,
  CASE WHEN NOT p.ok THEN 'Missing rt_accounts or rt_knowledge_banks.' WHEN t.exists THEN 'rt_email_templates exists. Skip.' ELSE 'Safe to run 012_email_templates.sql' END AS action
FROM prereq p, tbl_exists t;
