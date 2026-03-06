-- Migration 009: Pixel Ingest Schema (Milestone 12)
-- Extends rt_contacts and rt_contact_events for pixel v4 data.

-- =============================================================================
-- 1) Extend rt_contacts for pixel data
-- =============================================================================
ALTER TABLE rt_contacts
  ADD COLUMN IF NOT EXISTS edid TEXT,
  ADD COLUMN IF NOT EXISTS hem_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS pixel_data JSONB DEFAULT '{}';

COMMENT ON COLUMN rt_contacts.edid IS 'Pixel event device/entity ID';
COMMENT ON COLUMN rt_contacts.hem_sha256 IS 'Hashed email from pixel';
COMMENT ON COLUMN rt_contacts.pixel_data IS 'Latest resolution (pixel fields) for segment matching';

-- =============================================================================
-- 2) Extend rt_contact_events for pixel v4 fields
-- =============================================================================
ALTER TABLE rt_contact_events
  ADD COLUMN IF NOT EXISTS full_url TEXT,
  ADD COLUMN IF NOT EXISTS referrer_url TEXT,
  ADD COLUMN IF NOT EXISTS resolution JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pixel_id UUID REFERENCES rt_pixels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_event_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rt_contact_events_source_key
  ON rt_contact_events (source_event_key) WHERE source_event_key IS NOT NULL;

COMMENT ON COLUMN rt_contact_events.full_url IS 'Pixel full_url';
COMMENT ON COLUMN rt_contact_events.referrer_url IS 'Pixel referrer_url';
COMMENT ON COLUMN rt_contact_events.resolution IS 'Pixel resolution (all v4 fields)';
COMMENT ON COLUMN rt_contact_events.pixel_id IS 'Pixel this event came from';
COMMENT ON COLUMN rt_contact_events.source_event_key IS 'Dedup key: hash of pixel_id+edid+ts+url';
