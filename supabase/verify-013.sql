-- Verify 013: Email field mapping + template link
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_segment_campaigns'
  AND column_name IN ('email_field_map', 'email_template_id')
ORDER BY ordinal_position;
