-- Migration 021: Recovery type for modular template system
-- Maps template to recovery email type (reminder, product_interest, etc.).

ALTER TABLE rt_email_templates
  ADD COLUMN IF NOT EXISTS recovery_type TEXT DEFAULT 'product_interest';

-- Allow: reminder, product_interest, social_proof, objection_handling, survey_qualification
-- Legacy/minimal_recovery templates default to product_interest
COMMENT ON COLUMN rt_email_templates.recovery_type IS 'Recovery email type for recipe selection: reminder, product_interest, social_proof, objection_handling, survey_qualification';
