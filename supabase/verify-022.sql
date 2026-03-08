-- Verification: run AFTER 022_slot_defaults.sql

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_email_templates'
  AND column_name = 'slot_defaults';
