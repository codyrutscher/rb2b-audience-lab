/**
 * Supabase Storage for knowledge bank documents.
 * Used because Vercel has a read-only filesystem; uploads must go to cloud storage.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "knowledge-documents";

let _client: SupabaseClient | null = null;

function getStorageClient(): SupabaseClient | null {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    _client = createClient(url, key);
  }
  return _client;
}

/** Upload a buffer to Supabase Storage. Returns the storage path (key) or null on failure. */
export async function uploadDocument(
  accountId: string,
  knowledgeBankId: string,
  documentId: string,
  filename: string,
  buffer: Buffer
): Promise<string | null> {
  const client = getStorageClient();
  if (!client) return null;

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
  const path = `${accountId}/${knowledgeBankId}/${documentId}/${safeName}`;

  const { error } = await client.storage.from(BUCKET).upload(path, buffer, {
    contentType: getContentType(filename),
    upsert: true,
  });

  if (error) {
    console.error("[storage] upload error:", error);
    return null;
  }
  return path;
}

/** Download a file from Supabase Storage. Returns buffer or null. */
export async function downloadDocument(storagePath: string): Promise<Buffer | null> {
  const client = getStorageClient();
  if (!client) return null;

  const { data, error } = await client.storage.from(BUCKET).download(storagePath);
  if (error || !data) {
    console.error("[storage] download error:", error);
    return null;
  }
  return Buffer.from(await data.arrayBuffer());
}

function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "txt") return "text/plain";
  if (ext === "md" || ext === "markdown") return "text/markdown";
  return "application/octet-stream";
}
