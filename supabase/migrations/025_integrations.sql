-- Migration 025: Integrations for pushing segment data to external platforms

-- Integrations table to store connection configs
CREATE TABLE IF NOT EXISTS rt_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL, -- 'klaviyo', 'google_sheets', 'webhook'
  config JSONB NOT NULL DEFAULT '{}', -- API keys, sheet IDs, etc.
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrations_account ON rt_integrations(account_id);

-- Segment sync configs - which segments push to which integrations
CREATE TABLE IF NOT EXISTS rt_segment_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES rt_segments(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES rt_integrations(id) ON DELETE CASCADE,
  sync_on_match BOOLEAN DEFAULT true, -- Auto-sync when visitor matches segment
  field_mapping JSONB DEFAULT '{}', -- Map visitor fields to platform fields
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(segment_id, integration_id)
);

CREATE INDEX IF NOT EXISTS idx_segment_syncs_segment ON rt_segment_syncs(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_syncs_integration ON rt_segment_syncs(integration_id);

-- Sync logs to track what was pushed
CREATE TABLE IF NOT EXISTS rt_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_sync_id UUID NOT NULL REFERENCES rt_segment_syncs(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'skipped'
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_segment_sync ON rt_sync_logs(segment_sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_visitor ON rt_sync_logs(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_synced_at ON rt_sync_logs(synced_at);
