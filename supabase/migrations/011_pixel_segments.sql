-- Migration 011: Pixel Segments with Boolean Logic (Milestone 13)
-- Extends segments for pixel fields + AND/OR groups.

-- Rule groups: (A AND B) OR (C)
CREATE TABLE IF NOT EXISTS rt_segment_rule_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_id UUID NOT NULL REFERENCES rt_segments(id) ON DELETE CASCADE,
  logical_op TEXT NOT NULL CHECK (logical_op IN ('AND', 'OR')),
  group_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rt_segment_rule_groups_segment ON rt_segment_rule_groups(segment_id);

-- Extend rt_segment_rules: field (pixel field name), operator, group_id
ALTER TABLE rt_segment_rules ADD COLUMN IF NOT EXISTS field TEXT;
ALTER TABLE rt_segment_rules ADD COLUMN IF NOT EXISTS operator TEXT;
ALTER TABLE rt_segment_rules ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES rt_segment_rule_groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rt_segment_rules_group ON rt_segment_rules(group_id);

COMMENT ON COLUMN rt_segment_rules.field IS 'Pixel field: FULL_URL, REFERRER_URL, JOB_TITLE, etc.';
COMMENT ON COLUMN rt_segment_rules.operator IS 'contains, equals, regex, not_contains, is_empty, is_not_empty';
