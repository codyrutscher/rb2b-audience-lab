-- Complete Audience Lab Database Setup
-- Run this entire file in Supabase SQL Editor

-- ============================================
-- PART 1: Core Tables
-- ============================================

-- Create visitors table
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

-- Create page_views table
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_visitors_session ON visitors(session_id);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);
CREATE INDEX IF NOT EXISTS idx_visitors_identified ON visitors(identified);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_views_timestamp ON page_views(timestamp DESC);

-- ============================================
-- PART 2: Workspaces & Multi-tenancy
-- ============================================

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

-- ============================================
-- PART 3: Row Level Security
-- ============================================

-- Enable RLS
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all access for service role" ON visitors;
DROP POLICY IF EXISTS "Enable all access for service role" ON page_views;
DROP POLICY IF EXISTS "Users can view visitors in their workspace" ON visitors;
DROP POLICY IF EXISTS "Users can view page_views in their workspace" ON page_views;
DROP POLICY IF EXISTS "Service role has full access to visitors" ON visitors;
DROP POLICY IF EXISTS "Service role has full access to page_views" ON page_views;

-- Visitors policies
CREATE POLICY "Users can view visitors in their workspace" ON visitors
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to visitors" ON visitors
  FOR ALL USING (auth.role() = 'service_role');

-- Page views policies
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

-- ============================================
-- PART 4: Functions & Triggers
-- ============================================

-- Enable realtime for visitors table
ALTER PUBLICATION supabase_realtime ADD TABLE visitors;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_visitors_updated_at ON visitors;
CREATE TRIGGER update_visitors_updated_at
  BEFORE UPDATE ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create workspace on user signup
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
  workspace_name TEXT;
BEGIN
  -- Get workspace name from user metadata or use default
  workspace_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User') || '''s Workspace';
  
  -- Create a default workspace for the new user
  INSERT INTO workspaces (name)
  VALUES (workspace_name)
  RETURNING id INTO new_workspace_id;
  
  -- Add user as owner of the workspace
  INSERT INTO user_workspaces (user_id, workspace_id, role)
  VALUES (NEW.id, new_workspace_id, 'owner');
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Optional: Create a view for recent identified visitors
CREATE OR REPLACE VIEW recent_identified_visitors AS
SELECT 
  v.*,
  COUNT(pv.id) as total_page_views
FROM visitors v
LEFT JOIN page_views pv ON v.id = pv.visitor_id
WHERE v.identified = true
GROUP BY v.id
ORDER BY v.last_seen DESC;
