-- Add document label (e.g. "Pricing") to knowledge bank documents.
-- Enables "variable + instruction query" scoped to a labeled upload.
ALTER TABLE rt_knowledge_documents
  ADD COLUMN IF NOT EXISTS label VARCHAR(120) NULL;

-- Optional: add chunk_query_variables to email templates if not already present.
-- Stores variable -> { document_label, query } for labeled chunk retrieval.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rt_email_templates'
      AND column_name = 'chunk_query_variables'
  ) THEN
    ALTER TABLE rt_email_templates
      ADD COLUMN chunk_query_variables JSONB NULL;
  END IF;
END $$;
