-- Migration 024: Add pixel_id to segments
-- Segments should be tied to specific pixels (websites)

-- Add pixel_id column to rt_segments
ALTER TABLE rt_segments 
ADD COLUMN IF NOT EXISTS pixel_id UUID REFERENCES rt_pixels(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_segments_pixel_id ON rt_segments(pixel_id);

-- Note: Existing segments will have NULL pixel_id (workspace-level segments)
-- New segments should specify a pixel_id
