-- Verify 014: Schedule run history
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rt_schedule_runs'
ORDER BY ordinal_position;
