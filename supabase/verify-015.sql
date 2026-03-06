-- Verify 015
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_email_sends'
  AND column_name IN ('resolved_email', 'email_template_id');
