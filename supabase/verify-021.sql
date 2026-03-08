-- Verification: run AFTER 021_recovery_type.sql

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_email_templates'
  AND column_name = 'recovery_type';
