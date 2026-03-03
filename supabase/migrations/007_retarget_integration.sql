-- Migration 007: Retarget Integration
-- Links workspaces to retarget accounts. Uses rt_ prefix to avoid collision with rb2b's "segments" table.

-- Retarget accounts: 1:1 with workspace
CREATE TABLE IF NOT EXISTS rt_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rt_accounts_workspace ON rt_accounts(workspace_id);

-- Retarget webhooks
CREATE TABLE IF NOT EXISTS rt_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Retarget contacts
CREATE TABLE IF NOT EXISTS rt_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, email)
);

-- Retarget contact events
CREATE TABLE IF NOT EXISTS rt_contact_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES rt_contacts(id) ON DELETE CASCADE,
  url TEXT,
  event_type TEXT NOT NULL,
  ts TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Retarget jobs (worker polls this)
CREATE TABLE IF NOT EXISTS rt_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error TEXT
);

-- Retarget segments (rule-based for campaigns; distinct from rb2b "segments" = saved filters)
CREATE TABLE IF NOT EXISTS rt_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 999,
  is_suppression BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rt_segment_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_id UUID NOT NULL REFERENCES rt_segments(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  rule_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rt_contact_segment_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL UNIQUE REFERENCES rt_contacts(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES rt_segments(id) ON DELETE SET NULL,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge banks
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

-- Segment campaigns
CREATE TABLE IF NOT EXISTS rt_segment_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES rt_segments(id) ON DELETE CASCADE,
  knowledge_bank_id UUID NOT NULL REFERENCES rt_knowledge_banks(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  subject_text TEXT NOT NULL,
  cta_url TEXT,
  cta_label TEXT,
  query_hint TEXT,
  copy_prompt TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rt_email_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES rt_contacts(id) ON DELETE CASCADE,
  segment_campaign_id UUID NOT NULL REFERENCES rt_segment_campaigns(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rt_contacts_account ON rt_contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_rt_contact_events_contact ON rt_contact_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_rt_jobs_status ON rt_jobs(status);
CREATE INDEX IF NOT EXISTS idx_rt_segments_account ON rt_segments(account_id);
CREATE INDEX IF NOT EXISTS idx_rt_knowledge_documents_bank ON rt_knowledge_documents(knowledge_bank_id);

-- RLS: Retarget tables use service role for now; app resolves account via workspace from user_workspaces
ALTER TABLE rt_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rt_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rt_contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access rt_accounts for their workspaces
CREATE POLICY "Users can view rt_accounts for their workspace" ON rt_accounts
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role has full access to rt_accounts" ON rt_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger: Auto-provision rt_account + webhook when workspace is created
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

-- Backfill: Create rt_accounts + webhooks for existing workspaces
INSERT INTO rt_accounts (workspace_id, created_at, updated_at)
SELECT id, NOW(), NOW() FROM workspaces w
WHERE NOT EXISTS (SELECT 1 FROM rt_accounts a WHERE a.workspace_id = w.id);

INSERT INTO rt_webhooks (account_id, created_at, updated_at)
SELECT a.id, NOW(), NOW() FROM rt_accounts a
WHERE NOT EXISTS (SELECT 1 FROM rt_webhooks wh WHERE wh.account_id = a.id);
