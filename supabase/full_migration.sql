-- FULL MIGRATION SCRIPT FOR NEW SUPABASE PROJECT
-- Run this in Supabase SQL Editor

-- ============================================================================
-- MIGRATION 001: Initial Schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  company TEXT,
  email TEXT,
  name TEXT,
  linkedin_url TEXT,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  page_views INTEGER DEFAULT 1,
  identified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  referrer TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration INTEGER
);

CREATE INDEX IF NOT EXISTS idx_visitors_session ON visitors(session_id);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);
CREATE INDEX IF NOT EXISTS idx_visitors_identified ON visitors(identified);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_views_timestamp ON page_views(timestamp DESC);

ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_visitors_updated_at
  BEFORE UPDATE ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION 002: Workspaces and Auth
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

ALTER TABLE visitors ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_visitors_workspace ON visitors(workspace_id);

CREATE TABLE IF NOT EXISTS integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('slack', 'webhook', 'email')),
  config JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  integration_id UUID REFERENCES integrations(id)
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view visitors in their workspace" ON visitors
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role has full access to visitors" ON visitors
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view page_views in their workspace" ON page_views
  FOR SELECT USING (
    visitor_id IN (
      SELECT id FROM visitors WHERE workspace_id IN (
        SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role has full access to page_views" ON page_views
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their workspaces" ON workspaces
  FOR SELECT USING (id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Workspace owners can update" ON workspaces
  FOR UPDATE USING (id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid() AND role = 'owner'));

CREATE POLICY "Users can view their workspace memberships" ON user_workspaces
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view integrations in their workspace" ON integrations
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage integrations" ON integrations
  FOR ALL USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- ============================================================================
-- MIGRATION 003: Device and UTM Tracking
-- ============================================================================

ALTER TABLE visitors ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS screen_width INTEGER;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS screen_height INTEGER;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS landing_page TEXT;

CREATE INDEX IF NOT EXISTS idx_visitors_device_type ON visitors(device_type);
CREATE INDEX IF NOT EXISTS idx_visitors_utm_source ON visitors(utm_source);
CREATE INDEX IF NOT EXISTS idx_visitors_utm_campaign ON visitors(utm_campaign);

-- ============================================================================
-- MIGRATION 004: Events Tracking
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_events_visitor ON events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_workspace ON events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events in their workspace" ON events
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Service role has full access to events" ON events
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- MIGRATION 005: Advanced Tracking
-- ============================================================================

ALTER TABLE visitors ADD COLUMN IF NOT EXISTS is_returning BOOLEAN DEFAULT FALSE;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS total_time_on_site INTEGER DEFAULT 0;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 1;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS avg_session_duration INTEGER DEFAULT 0;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS bounce_rate DECIMAL(5,2);

ALTER TABLE page_views ADD COLUMN IF NOT EXISTS time_on_page INTEGER;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS scroll_depth INTEGER;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS clicks_count INTEGER DEFAULT 0;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS exit_page BOOLEAN DEFAULT FALSE;

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

CREATE TABLE IF NOT EXISTS form_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  form_id TEXT,
  form_name TEXT,
  action TEXT CHECK (action IN ('started', 'submitted', 'abandoned')),
  fields JSONB,
  time_to_complete INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
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

CREATE INDEX IF NOT EXISTS idx_clicks_visitor ON clicks(visitor_id);
CREATE INDEX IF NOT EXISTS idx_clicks_page_view ON clicks(page_view_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_visitor ON form_interactions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_workspace ON form_interactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);

ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clicks in their workspace" ON clicks
  FOR SELECT USING (visitor_id IN (SELECT id FROM visitors WHERE workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid())));

CREATE POLICY "Service role has full access to clicks" ON clicks
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view form interactions in their workspace" ON form_interactions
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Service role has full access to form interactions" ON form_interactions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view sessions in their workspace" ON sessions
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Service role has full access to sessions" ON sessions
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- MIGRATION 006: Missing Features
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  factors JSONB,
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions JSONB,
  last_used TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrichment_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lookup_key TEXT NOT NULL UNIQUE,
  lookup_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily_summary', 'weekly_summary', 'alert')),
  recipients TEXT[] NOT NULL,
  schedule TEXT,
  last_sent TIMESTAMP WITH TIME ZONE,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  filters JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT,
  row_count INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

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

CREATE INDEX IF NOT EXISTS idx_lead_scores_visitor ON lead_scores(visitor_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_workspace ON lead_scores(workspace_id);
CREATE INDEX IF NOT EXISTS idx_segments_workspace ON segments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_workspace ON alert_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace ON api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_workspace ON activity_feed(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_timestamp ON activity_feed(timestamp DESC);

ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead scores in their workspace" ON lead_scores
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can view segments in their workspace" ON segments
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage segments" ON segments
  FOR ALL USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Users can view alert rules in their workspace" ON alert_rules
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage alert rules" ON alert_rules
  FOR ALL USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Users can view API keys in their workspace" ON api_keys
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage API keys" ON api_keys
  FOR ALL USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Users can view activity feed in their workspace" ON activity_feed
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can view exports in their workspace" ON exports
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can create exports in their workspace" ON exports
  FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Service role has full access to lead_scores" ON lead_scores
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to activity_feed" ON activity_feed
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to enrichment_cache" ON enrichment_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to email_campaigns" ON email_campaigns
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- MIGRATION 007: Retarget Integration
-- ============================================================================

CREATE TABLE IF NOT EXISTS rt_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rt_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rt_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  edid TEXT,
  hem_sha256 TEXT,
  pixel_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, email)
);

CREATE TABLE IF NOT EXISTS rt_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error TEXT
);

CREATE TABLE IF NOT EXISTS rt_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 999,
  is_suppression BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  activity_window_value INT,
  activity_window_unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rt_segment_rule_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_id UUID NOT NULL REFERENCES rt_segments(id) ON DELETE CASCADE,
  logical_op TEXT NOT NULL CHECK (logical_op IN ('AND', 'OR')),
  group_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rt_segment_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_id UUID NOT NULL REFERENCES rt_segments(id) ON DELETE CASCADE,
  group_id UUID REFERENCES rt_segment_rule_groups(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  rule_value TEXT NOT NULL,
  field TEXT,
  operator TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rt_contact_segment_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL UNIQUE REFERENCES rt_contacts(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES rt_segments(id) ON DELETE SET NULL,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rt_knowledge_banks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rt_knowledge_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_bank_id UUID NOT NULL REFERENCES rt_knowledge_banks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  label VARCHAR(120),
  status TEXT NOT NULL DEFAULT 'pending',
  hash TEXT,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rt_knowledge_chunks (
  id TEXT NOT NULL PRIMARY KEY,
  knowledge_bank_id UUID NOT NULL REFERENCES rt_knowledge_banks(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES rt_knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rt_accounts_workspace ON rt_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_rt_contacts_account ON rt_contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_rt_jobs_status ON rt_jobs(status);
CREATE INDEX IF NOT EXISTS idx_rt_segments_account ON rt_segments(account_id);
CREATE INDEX IF NOT EXISTS idx_rt_segment_rule_groups_segment ON rt_segment_rule_groups(segment_id);
CREATE INDEX IF NOT EXISTS idx_rt_segment_rules_group ON rt_segment_rules(group_id);
CREATE INDEX IF NOT EXISTS idx_rt_knowledge_documents_bank ON rt_knowledge_documents(knowledge_bank_id);

ALTER TABLE rt_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rt_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rt_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rt_accounts for their workspace" ON rt_accounts
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Service role has full access to rt_accounts" ON rt_accounts
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- MIGRATION 008-016: Pixels and Email Templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS rt_pixels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  webhook_url TEXT,
  version TEXT NOT NULL DEFAULT 'v4',
  audiencelab_pixel_id TEXT,
  audiencelab_api_key TEXT,
  audiencelab_install_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rt_pixels_account ON rt_pixels(account_id);
CREATE INDEX IF NOT EXISTS idx_rt_pixels_audiencelab_id ON rt_pixels(audiencelab_pixel_id);

CREATE TABLE IF NOT EXISTS rt_contact_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES rt_contacts(id) ON DELETE CASCADE,
  pixel_id UUID REFERENCES rt_pixels(id) ON DELETE SET NULL,
  url TEXT,
  full_url TEXT,
  referrer_url TEXT,
  event_type TEXT NOT NULL,
  ts TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}',
  resolution JSONB DEFAULT '{}',
  source_event_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rt_contact_events_contact ON rt_contact_events(contact_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rt_contact_events_source_key ON rt_contact_events(source_event_key) WHERE source_event_key IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS rt_email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  knowledge_bank_id UUID NOT NULL REFERENCES rt_knowledge_banks(id) ON DELETE CASCADE,
  copy_prompt TEXT,
  subject_template TEXT NOT NULL DEFAULT 'We have something for you',
  template_id TEXT NOT NULL DEFAULT 'minimal_recovery',
  query_hint TEXT,
  cta_url TEXT,
  cta_label TEXT,
  variable_mappings JSONB DEFAULT '{}',
  chunk_query_variables JSONB,
  recovery_type TEXT DEFAULT 'product_interest',
  slot_defaults JSONB DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rt_email_templates_account ON rt_email_templates(account_id);
CREATE INDEX IF NOT EXISTS idx_rt_email_templates_kb ON rt_email_templates(knowledge_bank_id);

CREATE TABLE IF NOT EXISTS rt_segment_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES rt_segments(id) ON DELETE CASCADE,
  knowledge_bank_id UUID NOT NULL REFERENCES rt_knowledge_banks(id) ON DELETE CASCADE,
  email_template_id UUID REFERENCES rt_email_templates(id) ON DELETE SET NULL,
  template_id TEXT NOT NULL,
  subject_text TEXT NOT NULL,
  cta_url TEXT,
  cta_label TEXT,
  query_hint TEXT,
  copy_prompt TEXT,
  email_field_map TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'on_segment_update',
  trigger_interval_type TEXT,
  trigger_interval_value INT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rt_segment_campaigns_email_template ON rt_segment_campaigns(email_template_id);

CREATE TABLE IF NOT EXISTS rt_email_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES rt_contacts(id) ON DELETE CASCADE,
  segment_campaign_id UUID NOT NULL REFERENCES rt_segment_campaigns(id) ON DELETE CASCADE,
  email_template_id UUID REFERENCES rt_email_templates(id) ON DELETE SET NULL,
  template_id TEXT NOT NULL,
  resolved_email TEXT,
  resend_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rt_account_unsubscribes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, email)
);

-- ============================================================================
-- Storage bucket for knowledge documents
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-documents', 'knowledge-documents', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Trigger: Auto-provision rt_account when workspace is created
-- ============================================================================

CREATE OR REPLACE FUNCTION provision_retarget_account()
RETURNS TRIGGER AS $$
DECLARE
  new_account_id UUID;
BEGIN
  INSERT INTO rt_accounts (workspace_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  RETURNING id INTO new_account_id;
  INSERT INTO rt_webhooks (account_id, created_at, updated_at)
  VALUES (new_account_id, NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_workspace_created_provision_retarget ON workspaces;
CREATE TRIGGER on_workspace_created_provision_retarget
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION provision_retarget_account();

-- ============================================================================
-- Enable realtime
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE visitors;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;
