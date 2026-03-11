import { retrieveChunks } from "./retrieval";

const DEFAULT_MAX_CHARS_PER_VARIABLE = 4000;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Variable → query only (legacy). */
export type ChunkQueryVariablesInput =
  | string[]
  | Record<string, string>
  | null
  | undefined;

/** Variable → { documentLabel, query } for labeled-document + instruction query. */
export type LabeledChunkQueryVariablesInput =
  | Record<string, { documentLabel: string; query: string }>
  | null
  | undefined;

export interface ChunkQuerySpec {
  query: string;
  documentLabel?: string | null;
}

/**
 * Normalize chunk query config to a map: placeholder name -> { query, documentLabel? }.
 * - string[]: variable name is the query, no document label.
 * - Record<string, string>: key is placeholder, value is query (legacy).
 * - Record<string, { documentLabel, query }>: labeled doc + instruction query (new).
 */
export function normalizeChunkQueryMap(
  input: ChunkQueryVariablesInput | LabeledChunkQueryVariablesInput
): Map<string, ChunkQuerySpec> {
  const map = new Map<string, ChunkQuerySpec>();
  if (!input) return map;
  if (Array.isArray(input)) {
    for (const name of input) {
      const key = String(name).trim();
      if (key) map.set(key, { query: key });
    }
    return map;
  }
  if (typeof input !== "object") return map;
  for (const [key, val] of Object.entries(input)) {
    const k = key?.trim();
    if (!k) continue;
    if (val != null && typeof val === "object" && "documentLabel" in val && "query" in val) {
      const docLabel = (val as { documentLabel?: string; query?: string }).documentLabel?.trim();
      const query = (val as { query?: string }).query?.trim();
      if (query) map.set(k, { query, documentLabel: docLabel || undefined });
    } else if (typeof val === "string" && val.trim()) {
      map.set(k, { query: val.trim() });
    } else if (typeof val === "string" && !val.trim()) {
      map.set(k, { query: k });
    }
  }
  return map;
}

/** Legacy: map to simple string map (variable -> query) for callers that only need query. */
export function normalizeChunkQueryMapToQueryOnly(
  input: ChunkQueryVariablesInput
): Map<string, string> {
  const spec = normalizeChunkQueryMap(input);
  const out = new Map<string, string>();
  spec.forEach((v, k) => out.set(k, v.query));
  return out;
}

export interface ResolveChunkQueryVariablesOptions {
  accountId: string;
  knowledgeBankId: string;
  /** Variable names, name->query, or name->{ documentLabel, query } for labeled docs */
  chunkQueryVariables: ChunkQueryVariablesInput | LabeledChunkQueryVariablesInput;
  /** Already-known values (e.g. from pixel); these are not retrieved */
  variableValues?: Record<string, string> | null;
  maxCharsPerVariable?: number;
  topKPerQuery?: number;
}

/**
 * Replace {{VarName}} placeholders that are "chunk query" variables with retrieved
 * text from the knowledge base. Supports documentLabel so retrieval is scoped to
 * documents with that label (e.g. "Pricing").
 */
export async function resolveChunkQueryVariables(
  text: string,
  options: ResolveChunkQueryVariablesOptions
): Promise<string> {
  const {
    accountId,
    knowledgeBankId,
    chunkQueryVariables,
    variableValues,
    maxCharsPerVariable = DEFAULT_MAX_CHARS_PER_VARIABLE,
    topKPerQuery = 10,
  } = options;

  const specMap = normalizeChunkQueryMap(chunkQueryVariables);
  if (specMap.size === 0) return text;

  const placeholders = [...text.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)];
  const toResolve = new Map<string, ChunkQuerySpec>();
  for (const m of placeholders) {
    const name = m[1];
    if (!name) continue;
    if (variableValues && variableValues[name] != null) continue;
    const spec = specMap.get(name) ?? specMap.get(name.replace(/_/g, " "));
    if (spec) toResolve.set(name, spec);
  }
  if (toResolve.size === 0) return text;

  let out = text;
  for (const [varName, spec] of toResolve) {
    const chunks = await retrieveChunks({
      accountId,
      knowledgeBankId,
      queryText: spec.query,
      documentLabel: spec.documentLabel ?? undefined,
      topK: topKPerQuery,
    });
    const combined = chunks.length > 0
      ? chunks.map((c) => c.text).join("\n\n")
      : "";
    const value =
      combined.length > maxCharsPerVariable
        ? combined.slice(0, maxCharsPerVariable).trim() + "…"
        : combined;
    const escaped = escapeRegex(varName);
    const re = new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "gi");
    out = out.replace(re, value);
  }
  return out;
}
