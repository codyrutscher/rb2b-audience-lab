-- Make knowledge_bank_id optional for preset template campaigns
ALTER TABLE rt_segment_campaigns ALTER COLUMN knowledge_bank_id DROP NOT NULL;
