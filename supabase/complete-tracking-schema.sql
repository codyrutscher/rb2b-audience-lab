-- Complete Enhanced Tracking Schema
-- Run this after the main setup

-- Add new columns to visitors table
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS is_returning BOOLEAN DEFAULT FALSE;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS total_time_on_site INTEGER DEFAULT 0; -- seconds
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 1;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS avg_session_duration INTEGER DEFAULT 0;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS bounce_rate DECIMAL(5,2);

-- Add new columns to page_views table
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS time_on_page INTEGER; -- seconds
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS scroll_depth INTEGER; -- percentage
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS clicks_count INTEGER DEFAULT 0;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS exit_page BOOLEAN DEFAULT FALSE;

-- Create clicks table
CREATE TABLE IF NOT EXISTS clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  page_view_id UUID REFERENCES page_views(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  tag_name TEXT,
  element_text TEXT,
  element_id TEXT,
  element_classes TEXT,
  href TEXT,
  x_position INTEGER,
  y_position INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create form_interactions table
CREATE TABLE IF NOT EXISTS form_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  form_id TEXT,
  form_name TEXT,
  action TEXT CHECK (action IN ('started', 'submitted', 'abandoned')),
  fields JSONB,
  time_to_complete INTEGER, -- seconds
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table for better session tracking
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- seconds
  page_views_count INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,
  is_bounce BOOLEAN DEFAULT FALSE,
  landing_page TEXT,
  exit_page TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clicks_visitor ON clicks(visitor_id);
CREATE INDEX IF NOT EXISTS idx_clicks_page_view ON clicks(page_view_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_visitor ON form_interactions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_workspace ON form_interactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_action ON form_interactions(action);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_exit ON page_views(exit_page);

-- Enable RLS
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Clicks policies
CREATE POLICY "Users can view clicks in their workspace" ON clicks
  FOR SELECT USING (
    visitor_id IN (
      SELECT id FROM visitors WHERE workspace_id IN (
        SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role has full access to clicks" ON clicks
  FOR ALL USING (auth.role() = 'service_role');

-- Form interactions policies
CREATE POLICY "Users can view form interactions in their workspace" ON form_interactions
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to form interactions" ON form_interactions
  FOR ALL USING (auth.role() = 'service_role');

-- Sessions policies
CREATE POLICY "Users can view sessions in their workspace" ON sessions
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to sessions" ON sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE clicks;
ALTER PUBLICATION supabase_realtime ADD TABLE form_interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

-- Function to calculate bounce rate
CREATE OR REPLACE FUNCTION calculate_bounce_rate(visitor_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_sessions INTEGER;
  bounce_sessions INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_sessions
  FROM sessions
  WHERE visitor_id = visitor_uuid;
  
  SELECT COUNT(*) INTO bounce_sessions
  FROM sessions
  WHERE visitor_id = visitor_uuid AND is_bounce = TRUE;
  
  IF total_sessions = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((bounce_sessions::DECIMAL / total_sessions::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update visitor stats
CREATE OR REPLACE FUNCTION update_visitor_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE visitors
  SET 
    total_sessions = (SELECT COUNT(*) FROM sessions WHERE visitor_id = NEW.visitor_id),
    avg_session_duration = (SELECT AVG(duration) FROM sessions WHERE visitor_id = NEW.visitor_id AND duration IS NOT NULL),
    bounce_rate = calculate_bounce_rate(NEW.visitor_id)
  WHERE id = NEW.visitor_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update visitor stats when session ends
DROP TRIGGER IF EXISTS update_visitor_stats_trigger ON sessions;
CREATE TRIGGER update_visitor_stats_trigger
  AFTER INSERT OR UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_visitor_stats();
