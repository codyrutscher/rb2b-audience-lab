/**
 * Audiencelab Pixel API – https://api.audiencelab.io (Pixel_Fields.md)
 * Create: POST /pixels
 * Look-up: GET /pixels/{id}/v4?page=1&page_size=100
 */
const PIXEL_API_BASE = "https://api.audiencelab.io";

export interface CreatePixelInput {
  websiteName: string;
  websiteUrl: string;
  webhookUrl?: string;
  version?: string;
}

export interface CreatePixelResponse {
  id?: string;
  pixel_id?: string;
  [key: string]: unknown;
}

export interface PixelEvent {
  pixel_id: string;
  hem_sha256: string;
  event_timestamp: string;
  referrer_url?: string;
  full_url?: string;
  edid: string;
  resolution?: Record<string, string>;
}

export interface FetchPixelDataResponse {
  total_records: number;
  page_size: number;
  page: number;
  total_pages: number;
  events: PixelEvent[];
}

/**
 * Create a new pixel via Audiencelab API.
 * Returns the created pixel (including id) or throws.
 */
export async function createPixel(
  apiKey: string,
  input: CreatePixelInput
): Promise<CreatePixelResponse> {
  const res = await fetch(`${PIXEL_API_BASE}/pixels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey.trim(),
    },
    body: JSON.stringify({
      websiteName: input.websiteName,
      websiteUrl: input.websiteUrl,
      webhookUrl: input.webhookUrl || null,
      version: input.version || "v4",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Audiencelab API error ${res.status}: ${err}`);
  }

  return res.json() as Promise<CreatePixelResponse>;
}

const DELAY_BETWEEN_PAGES_MS = 500;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(
  url: string,
  apiKey: string,
  attempt = 1
): Promise<Response> {
  const res = await fetch(url, {
    headers: { "X-Api-Key": apiKey.trim() },
  });
  const shouldRetry =
    (res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES;
  if (shouldRetry) {
    const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
    await delay(backoff);
    return fetchWithRetry(url, apiKey, attempt + 1);
  }
  return res;
}

/**
 * Fetch pixel events (v4) with pagination.
 * Retries on 429/5xx with exponential backoff. Adds delay between pages to reduce rate limits.
 */
export async function fetchPixelData(
  apiKey: string,
  pixelId: string,
  page = 1,
  pageSize = 100
): Promise<FetchPixelDataResponse> {
  const url = `${PIXEL_API_BASE}/pixels/${encodeURIComponent(pixelId)}/v4?page=${page}&page_size=${pageSize}`;
  const res = await fetchWithRetry(url, apiKey);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Audiencelab API error ${res.status}: ${err}`);
  }

  return res.json() as Promise<FetchPixelDataResponse>;
}

/** Delay between paginated requests (for use by caller). */
export const PAGE_DELAY_MS = DELAY_BETWEEN_PAGES_MS;

export interface AudiencelabPixelListItem {
  id: string;
  install_url?: string;
  website_name?: string;
  website_url?: string;
  [key: string]: unknown;
}

/**
 * List all pixels from Audiencelab (for fetching install_url).
 */
export async function listPixels(apiKey: string): Promise<{ data: AudiencelabPixelListItem[] }> {
  const res = await fetch(`${PIXEL_API_BASE}/pixels`, {
    headers: { "X-Api-Key": apiKey.trim() },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Audiencelab API error ${res.status}: ${err}`);
  }
  return res.json();
}
