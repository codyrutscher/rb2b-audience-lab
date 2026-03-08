-- =============================================================================
-- Migration 021: Recovery type (MANUAL)
-- Run preflight-021.sql first. Run verify-021.sql after.
-- =============================================================================

ALTER TABLE rt_email_templates
  ADD COLUMN IF NOT EXISTS recovery_type TEXT DEFAULT 'product_interest';

COMMENT ON COLUMN rt_email_templates.recovery_type IS 'Recovery email type: reminder, product_interest, social_proof, objection_handling, survey_qualification';
