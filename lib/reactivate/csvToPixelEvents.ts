/**
 * Parse resolutions-sample.csv format (tab-separated) into PixelEvent[] for ingest.
 * CSV columns: PIXEL_ID, HEM_SHA256, EVENT_DATE, REFERRER_URL, FULL_URL, EDID, then resolution fields
 */
import type { PixelEvent } from "./pixelApi";

const TOP_LEVEL_FIELDS = ["PIXEL_ID", "HEM_SHA256", "EVENT_DATE", "REFERRER_URL", "FULL_URL", "EDID"];

function splitTsvRows(text: string): string[] {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      current += c;
    } else if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      rows.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  if (current) rows.push(current);
  return rows;
}

function parseDelimitedLine(line: string, delimiter: "\t" | ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === delimiter) {
      result.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseResolutionsCsv(csvText: string): PixelEvent[] {
  const stripped = csvText.replace(/^\uFEFF/, "");
  const lines = splitTsvRows(stripped).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0]!;
  const headersTab = parseDelimitedLine(headerLine, "\t");
  const headersComma = parseDelimitedLine(headerLine, ",");

  const headerCandidates = headersTab.length >= 6 ? headersTab : headersComma;
  const delimiter: "\t" | "," = headersTab.length >= 6 ? "\t" : ",";
  const headers = headerCandidates.map((h) => h.replace(/^["']|["']$/g, "").trim());

  const findCol = (name: string) => headers.findIndex((h) => h.toUpperCase() === name.toUpperCase());
  const pixelIdIdx = findCol("PIXEL_ID");
  const hemIdx = findCol("HEM_SHA256");
  const eventDateIdx = findCol("EVENT_DATE");
  const referrerIdx = findCol("REFERRER_URL");
  const fullUrlIdx = findCol("FULL_URL");
  const edidIdx = findCol("EDID");

  if (pixelIdIdx < 0 || edidIdx < 0) {
    throw new Error(`CSV must have PIXEL_ID, EDID columns. Found: ${headers.slice(0, 10).join(", ")}...`);
  }

  const events: PixelEvent[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseDelimitedLine(lines[i]!, delimiter);
    if (values.length < headers.length) continue;

    const pixelId = String(values[pixelIdIdx] ?? "").trim();
    const edid = String(values[edidIdx] ?? "").trim();
    const fullUrl = fullUrlIdx >= 0 ? String(values[fullUrlIdx] ?? "").trim() : undefined;
    const referrerUrl = referrerIdx >= 0 ? String(values[referrerIdx] ?? "").trim() : undefined;
    const eventTimestamp = eventDateIdx >= 0 ? String(values[eventDateIdx] ?? "").trim() : new Date().toISOString();
    const hemSha256 = hemIdx >= 0 ? String(values[hemIdx] ?? "").trim() : "";

    const resolution: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const h = headers[j]!;
      if (TOP_LEVEL_FIELDS.some((f) => f.toUpperCase() === h.toUpperCase())) continue;
      const val = values[j];
      if (val != null && String(val).trim()) {
        resolution[h] = String(val).trim();
      }
    }

    const email =
      resolution.PERSONAL_VERIFIED_EMAILS?.split(",")[0]?.trim() ||
      resolution.PERSONAL_EMAILS?.split(",")[0]?.trim() ||
      resolution.BUSINESS_VERIFIED_EMAILS?.split(",")[0]?.trim() ||
      resolution.BUSINESS_EMAIL?.split(",")[0]?.trim();
    if (!email || !email.includes("@")) continue;

    events.push({
      pixel_id: pixelId || "sample",
      hem_sha256: hemSha256,
      event_timestamp: eventTimestamp,
      referrer_url: referrerUrl || undefined,
      full_url: fullUrl || undefined,
      edid: edid || `row-${i}`,
      resolution: Object.keys(resolution).length > 0 ? resolution : undefined,
    });
  }

  return events;
}

