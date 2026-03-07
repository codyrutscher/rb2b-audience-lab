-- Create storage bucket for knowledge bank documents (used when deploying to Vercel - no local filesystem)
-- Run in Supabase SQL Editor: Supabase Dashboard → SQL Editor → New query
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-documents', 'knowledge-documents', false)
ON CONFLICT (id) DO NOTHING;
