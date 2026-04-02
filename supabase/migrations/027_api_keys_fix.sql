-- Ensure api_keys table exists with correct schema
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions JSONB DEFAULT '["read"]'::jsonb,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add last_used_at if table already exists with old column name
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_api_keys_workspace ON api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view API keys in their workspace" ON api_keys;
DROP POLICY IF EXISTS "Admins can manage API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can manage their own api keys" ON api_keys;

-- SELECT: any workspace member can view
CREATE POLICY "Users can view API keys in their workspace" ON api_keys
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: any workspace member can manage (not just owner/admin)
CREATE POLICY "Users can manage API keys in their workspace" ON api_keys
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );
