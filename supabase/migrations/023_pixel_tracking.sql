-- Add pixel_id column to visitors table to track which pixel/website visitors came from
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS pixel_id UUID REFERENCES rt_pixels(id);

-- Create index for faster filtering by pixel
CREATE INDEX IF NOT EXISTS idx_visitors_pixel_id ON visitors(pixel_id);

-- Update activity_feed trigger to include pixel_id
CREATE OR REPLACE FUNCTION log_visitor_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_feed (activity_type, title, description, metadata, visitor_id, workspace_id)
  VALUES (
    'visitor_arrived',
    COALESCE(NEW.name, 'Anonymous Visitor') || ' arrived',
    'New visitor from ' || COALESCE(NEW.city, 'Unknown') || ', ' || COALESCE(NEW.country, 'Unknown'),
    jsonb_build_object(
      'landing_page', NEW.landing_page,
      'device', NEW.device_type,
      'ip', NEW.ip_address,
      'pixel_id', NEW.pixel_id
    ),
    NEW.id,
    NEW.workspace_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS visitor_activity_trigger ON visitors;
CREATE TRIGGER visitor_activity_trigger
  AFTER INSERT ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION log_visitor_activity();
