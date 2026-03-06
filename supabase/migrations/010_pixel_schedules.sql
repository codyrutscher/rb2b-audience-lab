-- Migration 010: Pixel Schedules (Milestone 11)
-- User-configured schedule for automatic pixel data fetch.

CREATE TABLE IF NOT EXISTS rt_pixel_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pixel_id UUID NOT NULL REFERENCES rt_pixels(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  interval_type TEXT NOT NULL CHECK (interval_type IN ('minutes', 'hours', 'days')),
  interval_value INTEGER NOT NULL CHECK (interval_value > 0),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rt_pixel_schedules_pixel ON rt_pixel_schedules(pixel_id);
CREATE INDEX IF NOT EXISTS idx_rt_pixel_schedules_next_run ON rt_pixel_schedules(next_run_at) WHERE enabled = true;

COMMENT ON TABLE rt_pixel_schedules IS 'Scheduled fetch for pixels; worker polls and enqueues FetchPixelDataJob';
