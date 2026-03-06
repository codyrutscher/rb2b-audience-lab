-- Migration 017: Campaign trigger type and schedule
-- on_segment_update = send when contact matches (current behavior)
-- scheduled = run segment eval at interval (minutes/hours/days)

ALTER TABLE rt_segment_campaigns
  ADD COLUMN IF NOT EXISTS trigger_type TEXT NOT NULL DEFAULT 'on_segment_update',
  ADD COLUMN IF NOT EXISTS trigger_interval_type TEXT,
  ADD COLUMN IF NOT EXISTS trigger_interval_value INT;

COMMENT ON COLUMN rt_segment_campaigns.trigger_type IS 'on_segment_update | scheduled';
COMMENT ON COLUMN rt_segment_campaigns.trigger_interval_type IS 'minutes | hours | days - when trigger_type=scheduled';
COMMENT ON COLUMN rt_segment_campaigns.trigger_interval_value IS 'Interval value when trigger_type=scheduled';
