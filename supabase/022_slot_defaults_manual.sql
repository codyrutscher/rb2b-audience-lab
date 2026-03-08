-- =============================================================================
-- Migration 022: Slot defaults (MANUAL)
-- Run preflight-022.sql first. Run verify-022.sql after.
-- =============================================================================

ALTER TABLE rt_email_templates
  ADD COLUMN IF NOT EXISTS slot_defaults JSONB DEFAULT '{}';

COMMENT ON COLUMN rt_email_templates.slot_defaults IS 'User-editable slot defaults: logo_url, brand_name, headline, cta_text, cta_url, hero_image_url, etc.';
