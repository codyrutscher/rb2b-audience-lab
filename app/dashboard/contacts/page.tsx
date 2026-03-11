"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  Phone,
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  Activity,
  ExternalLink,
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
  const city = firstValue(pixelData, ["PERSONAL_CITY", "COMPANY_CITY"]);
  const state = firstValue(pixelData, ["PERSONAL_STATE", "COMPANY_STATE"]);
  const country = firstValue(pixelData, ["COUNTRY"]);
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (country) parts.push(country);
  return parts.filter(Boolean).join(", ");
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
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

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
      return new Date(s).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  }

  function getContactName(c: Contact): string {
    const pd = c.pixelData as Record<string, unknown> | null;
    const first = firstValue(pd, ["FIRST_NAME"]) || c.firstName || "";
    const last = firstValue(pd, ["LAST_NAME"]) || c.lastName || "";
    return [first, last].filter(Boolean).join(" ") || "Unknown";
  }

  function getContactCompany(c: Contact): string {
    const pd = c.pixelData as Record<string, unknown> | null;
    return firstValue(pd, ["COMPANY_NAME", "COMPANY"]);
  }

  function getContactTitle(c: Contact): string {
    const pd = c.pixelData as Record<string, unknown> | null;
    return firstValue(pd, ["JOB_TITLE", "HEADLINE", "TITLE"]);
  }

  function getContactPhone(c: Contact): string {
    const pd = c.pixelData as Record<string, unknown> | null;
    return firstValue(pd, ["ALL_MOBILES", "MOBILES", "MOBILE", "PHONE"]);
  }

  function getContactLocation(c: Contact): string {
    const pd = c.pixelData as Record<string, unknown> | null;
    return formatAddress(pd);
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Contacts</h1>
            <p className="text-gray-400">
              {pagination.total} contact{pagination.total !== 1 ? "s" : ""} from your pixels
            </p>
          </div>
          <button
            onClick={handleFetchAll}
            disabled={fetchingAll}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-purple text-white rounded-lg font-medium hover:shadow-lg hover:shadow-accent-primary/30 disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${fetchingAll ? "animate-spin" : ""}`} />
            {fetchingAll ? "Syncing…" : "Sync All Pixels"}
          </button>
        </div>

        {fetchResult && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
            {fetchResult}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by email, name, or company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none transition"
            />
          </div>
        </div>

        <div className="flex gap-6">
          {/* Contact List */}
          <div className={`${selectedContact ? 'w-1/2' : 'w-full'} transition-all`}>
            <div className="glass neon-border rounded-xl overflow-hidden">
              {contacts.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No contacts yet</h3>
                  <p className="text-gray-400 mb-4">Sync your pixels to populate contacts</p>
                  <button
                    onClick={handleFetchAll}
                    disabled={fetchingAll}
                    className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90 transition"
                  >
                    Sync Now
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-dark-border">
                  {contacts.map((c) => {
                    const name = getContactName(c);
                    const company = getContactCompany(c);
                    const title = getContactTitle(c);
                    const isSelected = selectedContact?.id === c.id;
                    
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedContact(c)}
                        className={`p-4 cursor-pointer transition ${
                          isSelected 
                            ? 'bg-accent-primary/10 border-l-2 border-accent-primary' 
                            : 'hover:bg-dark-tertiary/30'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-purple flex items-center justify-center text-white font-semibold shadow-lg shadow-accent-primary/20">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white">{name}</div>
                            {title && company ? (
                              <div className="text-sm text-gray-400 truncate">{title} at {company}</div>
                            ) : company ? (
                              <div className="text-sm text-gray-400 truncate">{company}</div>
                            ) : (
                              <div className="text-sm text-gray-500 truncate">{c.email}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">{c._count.events} events</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-dark-border bg-dark-tertiary/30">
                  <span className="text-gray-400 text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadContacts(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2 rounded hover:bg-dark-secondary disabled:opacity-40 disabled:cursor-not-allowed text-gray-400"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
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

          {/* Contact Detail Panel */}
          {selectedContact && (
            <div className="w-1/2">
              <ContactDetailPanel 
                contact={selectedContact} 
                onClose={() => setSelectedContact(null)}
                formatDate={formatDate}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactDetailPanel({ 
  contact, 
  onClose,
  formatDate 
}: { 
  contact: Contact; 
  onClose: () => void;
  formatDate: (s: string) => string;
}) {
  const pd = contact.pixelData as Record<string, unknown> | null;
  
  const firstName = firstValue(pd, ["FIRST_NAME"]) || contact.firstName || "";
  const lastName = firstValue(pd, ["LAST_NAME"]) || contact.lastName || "";
  const name = [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
  const company = firstValue(pd, ["COMPANY_NAME", "COMPANY"]);
  const title = firstValue(pd, ["JOB_TITLE", "HEADLINE", "TITLE"]);
  const phone = firstValue(pd, ["ALL_MOBILES", "MOBILES", "MOBILE", "PHONE"]);
  const businessEmail = firstEmail(pd, ["BUSINESS_VERIFIED_EMAILS", "BUSINESS_EMAIL"]);
  const personalEmail = firstEmail(pd, ["PERSONAL_VERIFIED_EMAILS", "PERSONAL_EMAILS"]);
  const linkedIn = firstValue(pd, ["LINKEDIN_URL", "LINKEDIN"]);
  
  const city = firstValue(pd, ["PERSONAL_CITY", "COMPANY_CITY"]);
  const state = firstValue(pd, ["PERSONAL_STATE", "COMPANY_STATE"]);
  const country = firstValue(pd, ["COUNTRY"]);
  const location = [city, state, country].filter(Boolean).join(", ");

  // Get other fields that aren't in the main display
  const coreKeys = new Set([
    "FIRST_NAME", "LAST_NAME", "COMPANY_NAME", "COMPANY", "JOB_TITLE", "HEADLINE", "TITLE",
    "ALL_MOBILES", "MOBILES", "MOBILE", "PHONE", "BUSINESS_VERIFIED_EMAILS", "BUSINESS_EMAIL",
    "PERSONAL_VERIFIED_EMAILS", "PERSONAL_EMAILS", "LINKEDIN_URL", "LINKEDIN",
    "PERSONAL_CITY", "COMPANY_CITY", "PERSONAL_STATE", "COMPANY_STATE", "COUNTRY",
    "PERSONAL_ADDRESS", "COMPANY_ADDRESS", "PERSONAL_ZIP", "COMPANY_ZIP"
  ]);
  
  const otherFields = pd 
    ? Object.entries(pd)
        .filter(([k]) => !coreKeys.has(k.toUpperCase()))
        .filter(([, v]) => v != null && String(v).trim())
        .slice(0, 10)
    : [];

  return (
    <div className="glass neon-border rounded-xl overflow-hidden sticky top-8">
      {/* Header */}
      <div className="p-6 border-b border-dark-border bg-dark-tertiary/30">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-purple flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-accent-primary/20">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{name}</h2>
              {title && <p className="text-gray-400">{title}</p>}
              {company && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {company}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-tertiary rounded-lg text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Contact Info */}
      <div className="p-6 space-y-6">
        {/* Primary Contact */}
        <div>
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Contact Information</h3>
          <div className="space-y-3">
            <InfoRow icon={<Mail />} label="Primary Email" value={contact.email} isLink />
            {businessEmail && businessEmail !== contact.email && (
              <InfoRow icon={<Mail />} label="Business Email" value={businessEmail} isLink />
            )}
            {personalEmail && personalEmail !== contact.email && (
              <InfoRow icon={<Mail />} label="Personal Email" value={personalEmail} isLink />
            )}
            {phone && <InfoRow icon={<Phone />} label="Phone" value={phone} />}
            {location && <InfoRow icon={<MapPin />} label="Location" value={location} />}
            {linkedIn && (
              <InfoRow 
                icon={<ExternalLink />} 
                label="LinkedIn" 
                value="View Profile" 
                href={linkedIn.startsWith('http') ? linkedIn : `https://${linkedIn}`}
              />
            )}
          </div>
        </div>

        {/* Activity */}
        <div>
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Activity</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-dark-tertiary/50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-xs">Events</span>
              </div>
              <div className="text-xl font-bold text-white">{contact._count.events}</div>
            </div>
            <div className="p-3 bg-dark-tertiary/50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Added</span>
              </div>
              <div className="text-sm font-medium text-white">{formatDate(contact.createdAt)}</div>
            </div>
          </div>
        </div>

        {/* Additional Fields */}
        {otherFields.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Additional Data</h3>
            <div className="space-y-2">
              {otherFields.map(([key, value]) => (
                <div key={key} className="flex justify-between items-start py-2 border-b border-dark-border/50 last:border-0">
                  <span className="text-xs text-gray-500">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm text-gray-300 text-right max-w-[60%] truncate" title={String(value)}>
                    {String(value).length > 50 ? `${String(value).slice(0, 50)}…` : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ 
  icon, 
  label, 
  value, 
  isLink, 
  href 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  isLink?: boolean;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3">
      <div className="text-gray-500 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`text-sm ${isLink || href ? 'text-accent-primary hover:underline' : 'text-white'}`}>
          {value}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  if (isLink && value.includes('@')) {
    return (
      <a href={`mailto:${value}`} className="block">
        {content}
      </a>
    );
  }

  return content;
}
