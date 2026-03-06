-- Migration 012: Email Templates (Milestone 15)
-- Saved templates: KB + prompt + subject, previewable.

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
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rt_email_templates_account ON rt_email_templates(account_id);
CREATE INDEX IF NOT EXISTS idx_rt_email_templates_kb ON rt_email_templates(knowledge_bank_id);

COMMENT ON TABLE rt_email_templates IS 'Saved email templates: KB + copy prompt + subject; used by campaigns (M16)';
