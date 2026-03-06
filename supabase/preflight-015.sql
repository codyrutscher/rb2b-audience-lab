-- Preflight 015: Email send logs - resolved email, template (Milestone 18)
SELECT
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_email_sends')
      THEN 'rt_email_sends does not exist. Run migration 007 first.'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rt_email_sends' AND column_name = 'resolved_email')
      THEN 'resolved_email or email_template_id already exists. Migration 015 may have been applied.'
    ELSE 'OK'
  END AS status;
