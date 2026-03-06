-- Preflight 014: Schedule run history (Milestone 17)
SELECT
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_pixel_schedules')
      THEN 'rt_pixel_schedules does not exist. Run migration 010 first.'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rt_schedule_runs')
      THEN 'rt_schedule_runs already exists. Migration 014 may have been applied.'
    ELSE 'OK'
  END AS status;
