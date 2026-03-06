-- Migration 018: Segment activity time window
-- Only match leads whose most recent event is within the last X minutes/hours/days

ALTER TABLE rt_segments
  ADD COLUMN IF NOT EXISTS activity_window_value INT,
  ADD COLUMN IF NOT EXISTS activity_window_unit TEXT;

COMMENT ON COLUMN rt_segments.activity_window_value IS 'Only match contacts with activity in last N units (e.g. 20)';
COMMENT ON COLUMN rt_segments.activity_window_unit IS 'minutes | hours | days - when activity_window_value is set';
