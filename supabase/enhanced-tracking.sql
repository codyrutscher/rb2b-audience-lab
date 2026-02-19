-- Enhanced Tracking Schema
-- Add new columns to visitors table for device and UTM tracking

-- Add device and browser info
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS screen_width INTEGER;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS screen_height INTEGER;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Add UTM parameters
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_content TEXT;

-- Add landing page
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS landing_page TEXT;

-- Create events table for custom event tracking
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  properties JSONB,
  url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_visitor ON events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_workspace ON events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_device_type ON visitors(device_type);
CREATE INDEX IF NOT EXISTS idx_visitors_utm_source ON visitors(utm_source);
CREATE INDEX IF NOT EXISTS idx_visitors_utm_campaign ON visitors(utm_campaign);

-- Enable RLS on events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Users can view events in their workspace" ON events
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to events" ON events
  FOR ALL USING (auth.role() = 'service_role');

-- Enable realtime for events
ALTER PUBLICATION supabase_realtime ADD TABLE events;
