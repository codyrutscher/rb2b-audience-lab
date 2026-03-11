/**
 * Normalize chunk_query_variables API payload for storage.
 * Accepts: array of strings (legacy) or object with variable name -> string | { document_label, query }.
 */
export function normalizeChunkQueryVariablesPayload(
  payload: unknown
): string[] | Record<string, string | { documentLabel: string; query: string }> | null {
  if (payload == null) return null;
  if (Array.isArray(payload)) {
    return payload.filter((v) => typeof v === "string" && v.trim()).map((v) => String(v).trim());
  }
  if (typeof payload === "object" && !Array.isArray(payload)) {
    const out: Record<string, string | { documentLabel: string; query: string }> = {};
    for (const [key, val] of Object.entries(payload)) {
      if (!key?.trim()) continue;
      if (val != null && typeof val === "object" && "query" in (val as object)) {
        const v = val as { document_label?: string; documentLabel?: string; query?: string };
        const query = typeof v.query === "string" ? v.query.trim() : "";
        const documentLabel = (v.documentLabel ?? v.document_label ?? "").toString().trim();
        if (query) out[key.trim()] = { documentLabel, query };
      } else if (typeof val === "string") {
        out[key.trim()] = val.trim() || key.trim();
      }
    }
    return Object.keys(out).length ? out : null;
  }
  return null;
}
