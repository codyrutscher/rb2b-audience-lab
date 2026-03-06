-- Verification: run AFTER 012_email_templates.sql.
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_email_templates' ORDER BY ordinal_position;

SELECT CASE WHEN count(*) >= 12 THEN 'PASS' ELSE 'FAIL' END AS verification_status
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_email_templates';
