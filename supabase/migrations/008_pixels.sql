-- Migration 008: Pixels (Milestone 10)
-- Stores Audiencelab pixels for scheduled data fetch. API: https://api.audiencelab.io/pixels

CREATE TABLE IF NOT EXISTS rt_pixels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES rt_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  webhook_url TEXT,
  version TEXT NOT NULL DEFAULT 'v4',
  audiencelab_pixel_id TEXT,
  audiencelab_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rt_pixels_account ON rt_pixels(account_id);
CREATE INDEX IF NOT EXISTS idx_rt_pixels_audiencelab_id ON rt_pixels(audiencelab_pixel_id);

COMMENT ON TABLE rt_pixels IS 'Audiencelab pixels for scheduled fetch; api.audiencelab.io';
COMMENT ON COLUMN rt_pixels.audiencelab_pixel_id IS 'Pixel ID from api.audiencelab.io (returned on create)';
COMMENT ON COLUMN rt_pixels.audiencelab_api_key IS 'API key for X-Api-Key header when calling Audiencelab API';
