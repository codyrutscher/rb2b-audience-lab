"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
} from "lucide-react";

const API_BASE = "/api/reactivate";

type Contact = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  pixelData: Record<string, unknown> | null;
  updatedAt: string;
  createdAt: string;
  _count: { events: number };
};

function firstValue(pixelData: Record<string, unknown> | null, keys: string[]): string {
  if (!pixelData || typeof pixelData !== "object") return "";
  for (const k of keys) {
    const v = pixelData[k];
    const s = typeof v === "string" ? v : v != null ? String(v) : "";
    if (s.trim()) return s.trim();
  }
  return "";
}

function firstEmail(pixelData: Record<string, unknown> | null, keys: string[]): string {
  const raw = firstValue(pixelData, keys);
  if (!raw) return "";
  const first = raw.split(",").map((s) => s.trim()).filter(Boolean)[0];
  return first && first.includes("@") ? first : raw;
}

function formatAddress(pixelData: Record<string, unknown> | null): string {
  if (!pixelData || typeof pixelData !== "object") return "";
  const parts: string[] = [];
  const addr = firstValue(pixelData, ["PERSONAL_ADDRESS", "COMPANY_ADDRESS"]);
  const city = firstValue(pixelData, ["PERSONAL_CITY", "COMPANY_CITY"]);
  const state = firstValue(pixelData, ["PERSONAL_STATE", "COMPANY_STATE"]);
  const zip = firstValue(pixelData, ["PERSONAL_ZIP", "COMPANY_ZIP"]);
  if (addr) parts.push(addr);
  if (city) parts.push(city);
  if (state || zip) parts.push([state, zip].filter(Boolean).join(" "));
  return parts.filter(Boolean).join(", ");
}

function getCoreValues(c: Contact): Record<string, string> {
  const pd = c.pixelData && typeof c.pixelData === "object" ? (c.pixelData as Record<string, unknown>) : {};
  return {
    "First Name": firstValue(pd, ["FIRST_NAME"]) || c.firstName || "",
    "Last Name": firstValue(pd, ["LAST_NAME"]) || c.lastName || "",
    Mobiles: firstValue(pd, ["ALL_MOBILES", "MOBILES", "MOBILE"]),
    Company: firstValue(pd, ["COMPANY_NAME", "COMPANY"]),
    Title: firstValue(pd, ["JOB_TITLE", "HEADLINE", "TITLE"]),
    "Business Email": firstEmail(pd, ["BUSINESS_VERIFIED_EMAILS", "BUSINESS_EMAIL"]),
    "Personal Email": firstEmail(pd, ["PERSONAL_VERIFIED_EMAILS", "PERSONAL_EMAILS"]),
    Address: formatAddress(pd),
  };
}

const CORE_KEYS = new Set([
  "FIRST_NAME", "LAST_NAME", "ALL_MOBILES", "MOBILES", "MOBILE",
  "COMPANY_NAME", "COMPANY", "JOB_TITLE", "HEADLINE", "TITLE",
  "BUSINESS_VERIFIED_EMAILS", "BUSINESS_EMAIL", "PERSONAL_VERIFIED_EMAILS", "PERSONAL_EMAILS",
  "PERSONAL_ADDRESS", "PERSONAL_CITY", "PERSONAL_STATE", "PERSONAL_ZIP",
  "COMPANY_ADDRESS", "COMPANY_CITY", "COMPANY_STATE", "COMPANY_ZIP",
]);

function getOtherFields(pixelData: Record<string, unknown> | null): Array<{ key: string; value: string }> {
  if (!pixelData || typeof pixelData !== "object") return [];
  return Object.entries(pixelData)
    .filter(([k]) => !CORE_KEYS.has(k.toUpperCase()))
    .map(([k, v]) => ({ key: k, value: typeof v === "string" ? v : JSON.stringify(v ?? "") }))
    .filter((f) => f.value.trim());
}

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

async function fetchApi(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.detail || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [fetchResult, setFetchResult] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadContacts = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search.trim()) params.set("q", search.trim());
      const data = await fetchApi(`/contacts?${params}`);
      setContacts(data.contacts || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => loadContacts(1), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, loadContacts]);

  async function handleFetchAll() {
    setError(null);
    setFetchResult(null);
    setFetchingAll(true);
    try {
      const data = await fetchApi("/pixels/fetch-all", { method: "POST" });
      setFetchResult(data.message || `${data.jobs?.length ?? 0} fetch job(s) enqueued.`);
      loadContacts(pagination.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch pixel data");
    } finally {
      setFetchingAll(false);
    }
  }

  function formatDate(s: string) {
    try {
      const d = new Date(s);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  }

  if (loading && contacts.length === 0) {
    return (
      <div className="p-8">
        <div className="text-gray-400">Loading contacts…</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Users className="w-8 h-8 text-accent-primary" /> Contacts
          </h1>
          <p className="text-gray-400">
            View contacts populated from your pixels. To auto-populate every 5 minutes, set each pixel&apos;s schedule in{" "}
            <a
              href="/dashboard/reactivate"
              className="text-accent-primary hover:underline inline-flex items-center gap-1"
            >
              Campaigns → Pixels <ExternalLink className="w-3.5 h-3.5" />
            </a>{" "}
            to &quot;Every 5 minutes&quot;.
          </p>
        </div>

        {/* Auto-fetch info & Fetch now */}
        <div className="mb-6 p-4 bg-dark-secondary border border-dark-border rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5" /> Auto-populate from Audiencelab
          </h2>
          <p className="text-gray-400 text-sm mb-3">
            Contacts are populated when your pixels fetch data via the Audiencelab GET endpoint. Configure pixel schedules in Campaigns to auto-fetch every 5 minutes, or trigger a fetch now:
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleFetchAll}
              disabled={fetchingAll}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${fetchingAll ? "bg-gray-600 cursor-not-allowed" : "bg-accent-primary text-white hover:opacity-90"}`}
            >
              <RefreshCw className={`w-4 h-4 ${fetchingAll ? "animate-spin" : ""}`} />
              {fetchingAll ? "Enqueueing…" : "Fetch all pixels now"}
            </button>
            {fetchResult && (
              <span className="text-green-400 text-sm">{fetchResult}</span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by email or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-secondary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="bg-dark-secondary border border-dark-border rounded-lg overflow-hidden">
          {contacts.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No contacts yet. Fetch pixel data from Campaigns or use sample data on the Segments page.
            </div>
          ) : (
            <div className="divide-y divide-dark-border">
              {contacts.map((c) => {
                const core = getCoreValues(c);
                const other = getOtherFields(c.pixelData);
                const isExpanded = expandedId === c.id;
                return (
                  <div key={c.id} className="p-4 hover:bg-dark-tertiary/20">
                    {/* Primary email & meta */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="font-medium text-white">{c.email}</div>
                        <div className="text-gray-500 text-sm">
                          {c._count.events} events · Updated {formatDate(c.updatedAt)}
                        </div>
                      </div>
                      {(other.length > 0 || isExpanded) && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          className="flex items-center gap-1.5 text-accent-primary hover:text-accent-primary/80 text-sm"
                        >
                          {isExpanded ? (
                            <>View less <ChevronUp className="w-4 h-4" /></>
                          ) : (
                            <>View more <ChevronDown className="w-4 h-4" /></>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Core fields grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                      {Object.entries(core).map(([label, val]) => (
                        <div key={label} className="flex flex-col min-w-0">
                          <span className="text-gray-500 text-xs">{label}</span>
                          <span className="text-gray-300 truncate" title={val || undefined}>
                            {val || "—"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* View more: other fields */}
                    {isExpanded && other.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-dark-border">
                        <div className="text-gray-500 text-xs font-medium mb-2">Other fields</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                          {other.map(({ key, value }) => (
                            <div key={key} className="flex flex-col min-w-0">
                              <span className="text-gray-500 text-xs">{key}</span>
                              <span className="text-gray-400 truncate break-words" title={value}>
                                {value.length > 80 ? `${value.slice(0, 80)}…` : value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-dark-border bg-dark-tertiary/30">
              <span className="text-gray-400 text-sm">
                {pagination.total} contact{pagination.total !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadContacts(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded hover:bg-dark-secondary disabled:opacity-40 disabled:cursor-not-allowed text-gray-400"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-gray-400 text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => loadContacts(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 rounded hover:bg-dark-secondary disabled:opacity-40 disabled:cursor-not-allowed text-gray-400"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
