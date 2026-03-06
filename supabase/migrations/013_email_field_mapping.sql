-- Migration 013: Email Field Mapping + Template Link (Milestone 16)
-- User maps pixel field → email; link campaigns to rt_email_templates.

ALTER TABLE rt_segment_campaigns
  ADD COLUMN IF NOT EXISTS email_field_map TEXT,
  ADD COLUMN IF NOT EXISTS email_template_id UUID REFERENCES rt_email_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rt_segment_campaigns_email_template ON rt_segment_campaigns(email_template_id);

COMMENT ON COLUMN rt_segment_campaigns.email_field_map IS 'Pixel field for email: PERSONAL_VERIFIED_EMAILS, BUSINESS_EMAIL, etc. Required when enabled.';
COMMENT ON COLUMN rt_segment_campaigns.email_template_id IS 'Optional: use template KB, prompt, subject instead of campaign fields';
