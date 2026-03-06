-- Migration 016: Add install_url for pixel tracking script
ALTER TABLE rt_pixels ADD COLUMN IF NOT EXISTS audiencelab_install_url TEXT;
COMMENT ON COLUMN rt_pixels.audiencelab_install_url IS 'Script URL from Audiencelab (returned on create); used for Install page';
