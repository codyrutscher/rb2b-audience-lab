-- Migration 002: Workspaces and Multi-tenancy
-- Created: 2026-02-18
-- Description: Add workspace support and user management

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_workspaces junction table
CREATE TABLE IF NOT EXISTS user_workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

-- Add workspace_id to visitors table
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_visitors_workspace ON visitors(workspace_id);

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('slack', 'webhook', 'email')),
  config JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  integration_id UUID REFERENCES integrations(id)
);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Update visitors policies
DROP POLICY IF EXISTS "Enable all access for service role" ON visitors;
DROP POLICY IF EXISTS "Users can view visitors in their workspace" ON visitors;

CREATE POLICY "Users can view visitors in their workspace" ON visitors
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to visitors" ON visitors
  FOR ALL USING (auth.role() = 'service_role');

-- Page views policies
DROP POLICY IF EXISTS "Enable all access for service role" ON page_views;
DROP POLICY IF EXISTS "Users can view page_views in their workspace" ON page_views;

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

-- Workspaces policies
CREATE POLICY "Users can view their workspaces" ON workspaces
  FOR SELECT USING (
    id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Workspace owners can update" ON workspaces
  FOR UPDATE USING (
    id IN (
      SELECT workspace_id FROM user_workspaces 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- User workspaces policies
CREATE POLICY "Users can view their workspace memberships" ON user_workspaces
  FOR SELECT USING (user_id = auth.uid());

-- Integrations policies
CREATE POLICY "Users can view integrations in their workspace" ON integrations
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage integrations" ON integrations
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
