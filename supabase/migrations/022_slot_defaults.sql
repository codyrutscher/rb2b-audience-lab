-- Migration 022: Slot defaults for template customization
-- Stores user-editable defaults: logo_url, headline, cta_text, etc.

ALTER TABLE rt_email_templates
  ADD COLUMN IF NOT EXISTS slot_defaults JSONB DEFAULT '{}';

COMMENT ON COLUMN rt_email_templates.slot_defaults IS 'User-editable slot defaults: logo_url, brand_name, headline, cta_text, cta_url, hero_image_url, etc.';
