-- Migration 014: Schedule run history (Milestone 17)
-- Log each pixel schedule fetch for dashboard run history.

CREATE TABLE IF NOT EXISTS rt_schedule_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES rt_pixel_schedules(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  pages_fetched INTEGER DEFAULT 0,
  contacts_upserted INTEGER DEFAULT 0,
  events_inserted INTEGER DEFAULT 0,
  events_skipped INTEGER DEFAULT 0,
  contacts_enqueued INTEGER DEFAULT 0,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_rt_schedule_runs_schedule ON rt_schedule_runs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_rt_schedule_runs_started ON rt_schedule_runs(started_at DESC);

COMMENT ON TABLE rt_schedule_runs IS 'Run history for pixel schedule fetches; dashboard last run, next run, history';
