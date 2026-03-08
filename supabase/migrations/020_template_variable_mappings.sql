-- Migration 020: Template variable mappings
-- Maps template placeholders (e.g. company_name) to pixel fields (e.g. COMPANY_NAME).
-- Used in custom prompts and email body for personalization from contact pixel data.

ALTER TABLE rt_email_templates
  ADD COLUMN IF NOT EXISTS variable_mappings JSONB DEFAULT '{}';

COMMENT ON COLUMN rt_email_templates.variable_mappings IS 'Maps variable name to pixel field, e.g. {"company_name": "COMPANY_NAME", "job_title": "JOB_TITLE"}';
