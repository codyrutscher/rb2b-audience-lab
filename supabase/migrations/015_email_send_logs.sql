-- Migration 015: Email send logs - resolved email, template (Milestone 18)
ALTER TABLE rt_email_sends
  ADD COLUMN IF NOT EXISTS resolved_email TEXT,
  ADD COLUMN IF NOT EXISTS email_template_id UUID REFERENCES rt_email_templates(id) ON DELETE SET NULL;

COMMENT ON COLUMN rt_email_sends.resolved_email IS 'Email address used for send (pixel-resolved or contact.email)';
COMMENT ON COLUMN rt_email_sends.email_template_id IS 'Template used if campaign linked to rt_email_templates';
