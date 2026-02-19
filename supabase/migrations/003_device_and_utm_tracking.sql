-- Migration 003: Device and UTM Tracking
-- Created: 2026-02-18
-- Description: Add device info and UTM parameters

-- Add device and browser info to visitors
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS screen_width INTEGER;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS screen_height INTEGER;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Add UTM parameters to visitors
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS utm_content TEXT;

-- Add landing page
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS landing_page TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_visitors_device_type ON visitors(device_type);
CREATE INDEX IF NOT EXISTS idx_visitors_utm_source ON visitors(utm_source);
CREATE INDEX IF NOT EXISTS idx_visitors_utm_campaign ON visitors(utm_campaign);
