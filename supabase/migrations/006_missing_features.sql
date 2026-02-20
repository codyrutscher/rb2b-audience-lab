-- Migration 006: Missing Features & Tables
-- Created: 2026-02-18
-- Description: Add lead scoring, segments, alerts, and more

-- Lead Scores Table
CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  factors JSONB, -- What contributed to the score
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_visitor ON lead_scores(visitor_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_workspace ON lead_scores(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_score ON lead_scores(score DESC);

-- Segments Table (Saved Filters)
CREATE TABLE IF NOT EXISTS segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL, -- Filter criteria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_segments_workspace ON segments(workspace_id);

-- Alert Rules Table
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL, -- When to trigger
  actions JSONB NOT NULL, -- What to do (slack, email, webhook)
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_workspace ON alert_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL, -- First 8 chars for display
  permissions JSONB, -- What this key can do
  last_used TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_workspace ON api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- Activity Feed Table
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'visitor_arrived', 'page_view', 'form_submit', etc.
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_workspace ON activity_feed(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_timestamp ON activity_feed(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON activity_feed(activity_type);

-- Enrichment Cache Table
CREATE TABLE IF NOT EXISTS enrichment_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lookup_key TEXT NOT NULL UNIQUE, -- email, domain, or IP
  lookup_type TEXT NOT NULL, -- 'email', 'domain', 'ip'
  provider TEXT NOT NULL, -- 'clearbit', 'hunter', 'ipinfo'
  data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_enrichment_cache_key ON enrichment_cache(lookup_key);
CREATE INDEX IF NOT EXISTS idx_enrichment_cache_type ON enrichment_cache(lookup_type);
CREATE INDEX IF NOT EXISTS idx_enrichment_cache_expires ON enrichment_cache(expires_at);

-- Email Campaigns Table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily_summary', 'weekly_summary', 'alert')),
  recipients TEXT[] NOT NULL,
  schedule TEXT, -- Cron expression
  last_sent TIMESTAMP WITH TIME ZONE,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_workspace ON email_campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_enabled ON email_campaigns(enabled);

-- Exports Table
CREATE TABLE IF NOT EXISTS exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'visitors', 'page_views', 'events'
  filters JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT,
  row_count INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_exports_workspace ON exports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_exports_status ON exports(status);

-- Team Invitations Table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_workspace ON team_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);

-- Enable RLS on all new tables
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view lead scores in their workspace" ON lead_scores
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view segments in their workspace" ON segments
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage segments" ON segments
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view alert rules in their workspace" ON alert_rules
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage alert rules" ON alert_rules
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view API keys in their workspace" ON api_keys
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage API keys" ON api_keys
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view activity feed in their workspace" ON activity_feed
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view exports in their workspace" ON exports
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create exports in their workspace" ON exports
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

-- Service role has full access to all tables
CREATE POLICY "Service role has full access to lead_scores" ON lead_scores
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to activity_feed" ON activity_feed
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to enrichment_cache" ON enrichment_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to email_campaigns" ON email_campaigns
  FOR ALL USING (auth.role() = 'service_role');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE lead_scores;

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(visitor_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  visitor_data RECORD;
BEGIN
  SELECT * INTO visitor_data FROM visitors WHERE id = visitor_uuid;
  
  -- Identified visitor: +20 points
  IF visitor_data.identified THEN
    score := score + 20;
  END IF;
  
  -- Has company: +15 points
  IF visitor_data.company IS NOT NULL THEN
    score := score + 15;
  END IF;
  
  -- Page views: +2 per view (max 30)
  score := score + LEAST(visitor_data.page_views * 2, 30);
  
  -- Returning visitor: +10 points
  IF visitor_data.is_returning THEN
    score := score + 10;
  END IF;
  
  -- Has LinkedIn: +10 points
  IF visitor_data.linkedin_url IS NOT NULL THEN
    score := score + 10;
  END IF;
  
  -- UTM campaign (marketing qualified): +15 points
  IF visitor_data.utm_campaign IS NOT NULL THEN
    score := score + 15;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function to update lead score
CREATE OR REPLACE FUNCTION update_lead_score()
RETURNS TRIGGER AS $$
DECLARE
  new_score INTEGER;
  score_factors JSONB;
BEGIN
  new_score := calculate_lead_score(NEW.id);
  
  score_factors := jsonb_build_object(
    'identified', NEW.identified,
    'has_company', NEW.company IS NOT NULL,
    'page_views', NEW.page_views,
    'is_returning', NEW.is_returning,
    'has_linkedin', NEW.linkedin_url IS NOT NULL,
    'has_utm', NEW.utm_campaign IS NOT NULL
  );
  
  INSERT INTO lead_scores (visitor_id, workspace_id, score, factors)
  VALUES (NEW.id, NEW.workspace_id, new_score, score_factors)
  ON CONFLICT (visitor_id) 
  DO UPDATE SET 
    score = new_score,
    factors = score_factors,
    last_calculated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate lead score
DROP TRIGGER IF EXISTS calculate_lead_score_trigger ON visitors;
CREATE TRIGGER calculate_lead_score_trigger
  AFTER INSERT OR UPDATE ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_score();
