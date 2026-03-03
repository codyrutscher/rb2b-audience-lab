export interface LeadWebhookPayload {
  external_contact_id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  url?: string;
  event_type: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export function parseLeadPayload(body: unknown): LeadWebhookPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Body must be a JSON object");
  }
  const o = body as Record<string, unknown>;
  if (typeof o.email !== "string" || !o.email.trim()) {
    throw new Error("email is required and must be a non-empty string");
  }
  if (typeof o.event_type !== "string" || !o.event_type.trim()) {
    throw new Error("event_type is required and must be a non-empty string");
  }
  if (typeof o.timestamp !== "string" || !o.timestamp.trim()) {
    throw new Error("timestamp is required (ISO 8601 string)");
  }
  const ts = new Date(o.timestamp);
  if (Number.isNaN(ts.getTime())) {
    throw new Error("timestamp must be a valid ISO 8601 date string");
  }
  return {
    external_contact_id:
      typeof o.external_contact_id === "string"
        ? o.external_contact_id
        : undefined,
    email: o.email.trim().toLowerCase(),
    first_name: typeof o.first_name === "string" ? o.first_name : undefined,
    last_name: typeof o.last_name === "string" ? o.last_name : undefined,
    url: typeof o.url === "string" ? o.url : undefined,
    event_type: o.event_type.trim(),
    timestamp: o.timestamp,
    metadata:
      o.metadata && typeof o.metadata === "object" && !Array.isArray(o.metadata)
        ? (o.metadata as Record<string, unknown>)
        : undefined,
  };
}
