/**
 * Resolve email from contact for campaign sends.
 * When campaign has email_field_map, use that pixel field from contact.pixelData.
 * Otherwise fall back to contact.email (webhook-only contacts).
 */
import type { RtContact } from "@prisma/client";

export const EMAIL_FIELD_MAP_OPTIONS = [
  "PERSONAL_VERIFIED_EMAILS",
  "PERSONAL_EMAILS",
  "BUSINESS_VERIFIED_EMAILS",
  "BUSINESS_EMAIL",
] as const;

export type EmailFieldMapOption = (typeof EMAIL_FIELD_MAP_OPTIONS)[number];

/**
 * Resolve the send-to email for a contact.
 * - When emailFieldMap is set: read from contact.pixelData[field], first valid email from comma-separated
 * - Otherwise: use contact.email (for webhook contacts or legacy)
 */
export function resolveEmailForSend(
  contact: Pick<RtContact, "email" | "pixelData">,
  emailFieldMap: string | null | undefined
): string | null {
  const pixelData = contact.pixelData as Record<string, unknown> | null | undefined;
  if (emailFieldMap?.trim() && pixelData && typeof pixelData === "object") {
    const val = pixelData[emailFieldMap.trim()];
    if (typeof val === "string") {
      const first = val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)[0];
      if (first && first.includes("@")) return first;
    }
  }
  return contact.email || null;
}
