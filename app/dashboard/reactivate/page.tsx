"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Mail,
  Radio,
  Download,
  Clock,
} from "lucide-react";

const API_BASE = "/api/reactivate";

type SegmentRule = {
  id: string;
  ruleType: string;
  ruleValue: string;
  field?: string | null;
  operator?: string | null;
  groupId?: string | null;
};

type RuleGroup = {
  id: string;
  logicalOp: string;
  groupOrder: number;
  rules: SegmentRule[];
};

type RtSegment = {
  id: string;
  name: string;
  priority: number;
  isSuppression: boolean;
  enabled: boolean;
  rules: SegmentRule[];
  ruleGroups?: RuleGroup[];
};

type KnowledgeBank = {
  id: string;
  name: string;
  description: string | null;
  _count: { documents: number };
};

type SegmentCampaign = {
  id: string;
  segmentId: string;
  segment: { id: string; name: string };
  knowledgeBankId: string;
  knowledgeBank: { id: string; name: string };
  emailTemplateId: string | null;
  emailTemplate: { id: string; name: string } | null;
  subjectText: string;
  copyPrompt: string | null;
  emailFieldMap: string | null;
  triggerType: string;
  triggerIntervalType: string | null;
  triggerIntervalValue: number | null;
  enabled: boolean;
};

const EMAIL_FIELD_OPTIONS = [
  "PERSONAL_VERIFIED_EMAILS",
  "PERSONAL_EMAILS",
  "BUSINESS_VERIFIED_EMAILS",
  "BUSINESS_EMAIL",
] as const;

type EmailTemplate = {
  id: string;
  name: string;
  knowledgeBankId: string;
  knowledgeBank: { id: string; name: string };
  copyPrompt: string | null;
  subjectTemplate: string;
  templateId: string;
  queryHint: string | null;
  ctaUrl: string | null;
  ctaLabel: string | null;
  enabled: boolean;
};

type PixelSchedule = {
  id: string;
  intervalType: string;
  intervalValue: number;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
} | null;

type Pixel = {
  id: string;
  name: string;
  websiteName: string;
  websiteUrl: string;
  webhookUrl: string | null;
  audiencelabPixelId: string | null;
  canFetch: boolean;
  schedule: PixelSchedule;
  createdAt: string;
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

export default function ReactivatePage() {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [segments, setSegments] = useState<RtSegment[]>([]);
  const [knowledgeBanks, setKnowledgeBanks] = useState<KnowledgeBank[]>([]);
  const [campaigns, setCampaigns] = useState<SegmentCampaign[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [webhookId, setWebhookId] = useState<string>("");
  const [campaignsOpen, setCampaignsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showPixelForm, setShowPixelForm] = useState(false);
  const [pixelName, setPixelName] = useState("");
  const [pixelWebsiteName, setPixelWebsiteName] = useState("");
  const [pixelWebsiteUrl, setPixelWebsiteUrl] = useState("");
  const [pixelWebhookUrl, setPixelWebhookUrl] = useState("");
  const [pixelApiKey, setPixelApiKey] = useState("");
  const [creatingPixel, setCreatingPixel] = useState(false);
  const [fetchingPixelId, setFetchingPixelId] = useState<string | null>(null);
  const [schedulePixelId, setSchedulePixelId] = useState<string | null>(null);
  const [scheduleIntervalType, setScheduleIntervalType] = useState<"minutes" | "hours" | "days">("minutes");
  const [scheduleIntervalValue, setScheduleIntervalValue] = useState(5);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<SegmentCampaign | null>(null);
  const [campaignSegmentId, setCampaignSegmentId] = useState("");
  const [campaignTemplateId, setCampaignTemplateId] = useState("");
  const [campaignEmailField, setCampaignEmailField] = useState<string>(EMAIL_FIELD_OPTIONS[0]);
  const [campaignTriggerType, setCampaignTriggerType] = useState<"on_segment_update" | "scheduled">("on_segment_update");
  const [campaignTriggerIntervalType, setCampaignTriggerIntervalType] = useState<"minutes" | "hours" | "days">("minutes");
  const [campaignTriggerIntervalValue, setCampaignTriggerIntervalValue] = useState(5);
  const [campaignEnabled, setCampaignEnabled] = useState(true);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [runsPixelId, setRunsPixelId] = useState<string | null>(null);
  const [emailSends, setEmailSends] = useState<Array<{
    id: string;
    resolvedEmail: string | null;
    status: string;
    error: string | null;
    createdAt: string;
    contact?: { email?: string };
    segmentCampaign?: { segment: { name: string } };
  }>>([]);
  const [unsubscribes, setUnsubscribes] = useState<Array<{ id: string; email: string; createdAt: string }>>([]);
  const [scheduleRuns, setScheduleRuns] = useState<{
    schedule: { lastRunAt: string | null; nextRunAt: string; enabled: boolean } | null;
    runs: Array<{
      id: string;
      startedAt: string;
      completedAt: string | null;
      status: string;
      pagesFetched: number;
      contactsUpserted: number;
      eventsInserted: number;
      error: string | null;
    }>;
  } | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const opts = { credentials: "include" as RequestCredentials };
      const [meRes, pixelsRes, segmentsRes, kbRes, campaignsRes, templatesRes, sendsRes, unsubsRes] = await Promise.all([
        fetch(API_BASE + "/me", opts),
        fetch(API_BASE + "/pixels", opts),
        fetch(API_BASE + "/segments", opts),
        fetch(API_BASE + "/knowledge-banks", opts),
        fetch(API_BASE + "/segment-campaigns", opts),
        fetch(API_BASE + "/email-templates", opts),
        fetch(API_BASE + "/email-sends?limit=50", opts),
        fetch(API_BASE + "/unsubscribes", opts),
      ]);

      if (!meRes.ok) {
        setError(meRes.status === 401 ? "Session expired. Please log in again." : "Failed to load.");
        setLoading(false);
        return;
      }

      const me = await meRes.json();
      if (me.webhooks?.[0]?.id) setWebhookId(me.webhooks[0].id);

      if (pixelsRes.ok) {
        const d = await pixelsRes.json();
        setPixels(d.pixels || []);
      }
      if (segmentsRes.ok) {
        const d = await segmentsRes.json();
        setSegments(d.segments || []);
      }
      if (kbRes.ok) {
        const d = await kbRes.json();
        setKnowledgeBanks(d.knowledge_banks || []);
      }
      if (campaignsRes.ok) {
        const d = await campaignsRes.json();
        setCampaigns(d.segment_campaigns || []);
      }
      // Hardcoded preset templates — always available, no knowledge base needed
      const presetTemplates = [
        { id: "preset:browse_reminder", name: "Browse Reminder (Preset)", knowledgeBankId: null, knowledgeBank: null, subjectTemplate: "You left something behind", templateId: "browse_reminder", copyPrompt: null, queryHint: null, ctaUrl: null, ctaLabel: null, enabled: true },
        { id: "preset:product_interest", name: "Product Interest (Preset)", knowledgeBankId: null, knowledgeBank: null, subjectTemplate: "Still thinking it over?", templateId: "product_interest", copyPrompt: null, queryHint: null, ctaUrl: null, ctaLabel: null, enabled: true },
        { id: "preset:reengagement", name: "Re-engagement (Preset)", knowledgeBankId: null, knowledgeBank: null, subjectTemplate: "We miss you", templateId: "reengagement", copyPrompt: null, queryHint: null, ctaUrl: null, ctaLabel: null, enabled: true },
      ];

      if (templatesRes.ok) {
        const d = await templatesRes.json();
        const customTemplates = d.templates || [];
        setEmailTemplates([...customTemplates, ...presetTemplates]);
      } else {
        // Even if the API fails, presets are always available
        setEmailTemplates(presetTemplates);
      }
      if (sendsRes.ok) {
        const d = await sendsRes.json();
        setEmailSends(d.sends || []);
      }
      if (unsubsRes.ok) {
        const d = await unsubsRes.json();
        setUnsubscribes(d.unsubscribes || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
    setLoading(false);
  }

  async function createPixel() {
    if (!pixelName.trim() || !pixelWebsiteName.trim() || !pixelWebsiteUrl.trim()) return;
    setError(null);
    setCreatingPixel(true);
    try {
      await fetchApi("/pixels", {
        method: "POST",
        body: JSON.stringify({
          name: pixelName.trim(),
          website_name: pixelWebsiteName.trim(),
          website_url: pixelWebsiteUrl.trim(),
          webhook_url: pixelWebhookUrl.trim() || undefined,
          audiencelab_api_key: pixelApiKey.trim() || undefined,
        }),
      });
      setShowPixelForm(false);
      setPixelName("");
      setPixelWebsiteName("");
      setPixelWebsiteUrl("");
      setPixelWebhookUrl("");
      setPixelApiKey("");
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create pixel");
    } finally {
      setCreatingPixel(false);
    }
  }

  async function saveSchedule(pixelId: string) {
    setError(null);
    setSavingSchedule(true);
    try {
      await fetchApi(`/pixels/${pixelId}/schedule`, {
        method: "POST",
        body: JSON.stringify({
          interval_type: scheduleIntervalType,
          interval_value: scheduleIntervalValue,
          enabled: scheduleEnabled,
        }),
      });
      setSchedulePixelId(null);
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save schedule");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function deleteSchedule(pixelId: string) {
    if (!confirm("Remove schedule for this pixel?")) return;
    try {
      await fetchApi(`/pixels/${pixelId}/schedule`, { method: "DELETE" });
      setSchedulePixelId(null);
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete schedule");
    }
  }

  async function fetchPixelData(pixelId: string) {
    setError(null);
    setFetchingPixelId(pixelId);
    try {
      const res = await fetchApi(`/pixels/${pixelId}/fetch`, { method: "POST" });
      if (res?.job_id) {
        setError(null);
        loadAll();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch pixel data");
    } finally {
      setFetchingPixelId(null);
    }
  }

  async function saveCampaign() {
    if (!campaignSegmentId) {
      setError("Select a segment.");
      return;
    }
    if (!campaignTemplateId) {
      setError("Select an email template (required).");
      return;
    }
    if (campaignEnabled && !campaignEmailField) {
      setError("Select an email field when launching.");
      return;
    }
    if (campaignTriggerType === "scheduled" && (!campaignTriggerIntervalValue || campaignTriggerIntervalValue < 1)) {
      setError("Enter a valid trigger interval (≥1) when using scheduled trigger.");
      return;
    }
    setError(null);
    setSavingCampaign(true);
    try {
      const tpl = emailTemplates.find((t) => t.id === campaignTemplateId);
      const isPreset = campaignTemplateId.startsWith("preset:");
      const payload = {
        segment_id: campaignSegmentId,
        email_template_id: isPreset ? null : campaignTemplateId,
        template_id: isPreset ? campaignTemplateId.replace("preset:", "") : (tpl?.templateId || "minimal_recovery"),
        subject_text: tpl?.subjectTemplate,
        email_field_map: campaignEmailField,
        trigger_type: campaignTriggerType,
        trigger_interval_type: campaignTriggerType === "scheduled" ? campaignTriggerIntervalType : undefined,
        trigger_interval_value: campaignTriggerType === "scheduled" ? campaignTriggerIntervalValue : undefined,
        enabled: campaignEnabled,
      };
      if (editingCampaign) {
        await fetchApi(`/segment-campaigns/${editingCampaign.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi("/segment-campaigns", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setShowCampaignForm(false);
      setEditingCampaign(null);
      resetCampaignForm();
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save campaign");
    } finally {
      setSavingCampaign(false);
    }
  }

  function resetCampaignForm() {
    setCampaignSegmentId("");
    setCampaignTemplateId("");
    setCampaignEmailField(EMAIL_FIELD_OPTIONS[0]);
    setCampaignTriggerType("on_segment_update");
    setCampaignTriggerIntervalType("minutes");
    setCampaignTriggerIntervalValue(5);
    setCampaignEnabled(true);
  }

  function loadCampaignIntoForm(c: SegmentCampaign) {
    setEditingCampaign(c);
    setCampaignSegmentId(c.segmentId);
    setCampaignTemplateId(c.emailTemplateId || "");
    setCampaignEmailField(c.emailFieldMap || EMAIL_FIELD_OPTIONS[0]);
    setCampaignTriggerType((c.triggerType as "on_segment_update" | "scheduled") || "on_segment_update");
    setCampaignTriggerIntervalType((c.triggerIntervalType as "minutes" | "hours" | "days") || "minutes");
    setCampaignTriggerIntervalValue(c.triggerIntervalValue ?? 5);
    setCampaignEnabled(c.enabled);
    setShowCampaignForm(true);
  }

  async function loadScheduleRuns(pixelId: string) {
    if (runsPixelId === pixelId && scheduleRuns) {
      setRunsPixelId(null);
      setScheduleRuns(null);
      return;
    }
    setError(null);
    try {
      const res = await fetchApi(`/pixels/${pixelId}/schedule/runs`);
      setScheduleRuns(res);
      setRunsPixelId(pixelId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load run history");
    }
  }

  async function removeUnsubscribe(email: string) {
    if (!confirm(`Re-subscribe ${email}? They will receive emails again.`)) return;
    try {
      await fetchApi(`/unsubscribes?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    }
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Delete this campaign?")) return;
    try {
      await fetchApi(`/segment-campaigns/${id}`, { method: "DELETE" });
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error && !segments.length && !campaignsOpen) {
    return (
      <div className="p-8">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Reactivate</h1>

      {/* Pixels section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Radio className="w-5 h-5" /> Pixels
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Create and manage tracking pixels to capture visitor data from your websites.
        </p>

        {!showPixelForm ? (
          <button
            onClick={() => setShowPixelForm(true)}
            className="flex items-center gap-2 px-3 py-2 text-accent-primary hover:bg-accent-primary/10 rounded mb-4"
          >
            <Plus className="w-4 h-4" /> New Pixel
          </button>
        ) : (
          <div className="bg-dark-secondary border border-dark-border rounded-lg p-4 space-y-3 max-w-xl mb-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Pixel Name</label>
              <input
                type="text"
                value={pixelName}
                onChange={(e) => setPixelName(e.target.value)}
                placeholder="My Website Pixel"
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Website Name</label>
              <input
                type="text"
                value={pixelWebsiteName}
                onChange={(e) => setPixelWebsiteName(e.target.value)}
                placeholder="My Website"
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Website URL</label>
              <input
                type="text"
                value={pixelWebsiteUrl}
                onChange={(e) => setPixelWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Webhook URL (optional)</label>
              <input
                type="text"
                value={pixelWebhookUrl}
                onChange={(e) => setPixelWebhookUrl(e.target.value)}
                placeholder="https://your-webhook.com/endpoint"
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Audiencelab API Key (optional)</label>
              <input
                type="text"
                value={pixelApiKey}
                onChange={(e) => setPixelApiKey(e.target.value)}
                placeholder="Your API key"
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={createPixel}
                disabled={creatingPixel}
                className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {creatingPixel ? "Creating…" : "Create Pixel"}
              </button>
              <button
                onClick={() => {
                  setShowPixelForm(false);
                  setPixelName("");
                  setPixelWebsiteName("");
                  setPixelWebsiteUrl("");
                  setPixelWebhookUrl("");
                  setPixelApiKey("");
                }}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Pixels list */}
        <div className="space-y-3">
          {pixels.map((pixel) => (
            <div
              key={pixel.id}
              className="p-4 bg-dark-secondary border border-dark-border rounded-lg"
            >
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-white font-medium">{pixel.name}</h3>
                  <p className="text-gray-400 text-sm">{pixel.websiteName} · {pixel.websiteUrl}</p>
                  {pixel.audiencelabPixelId && (
                    <p className="text-gray-500 text-xs mt-1">Pixel ID: {pixel.audiencelabPixelId}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {pixel.canFetch && (
                    <button
                      onClick={() => fetchPixelData(pixel.id)}
                      disabled={fetchingPixelId === pixel.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-accent-primary/20 text-accent-primary rounded text-sm hover:bg-accent-primary/30 disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      {fetchingPixelId === pixel.id ? "Fetching…" : "Fetch Data"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (schedulePixelId === pixel.id) {
                        setSchedulePixelId(null);
                      } else {
                        setSchedulePixelId(pixel.id);
                        if (pixel.schedule) {
                          setScheduleIntervalType(pixel.schedule.intervalType as "minutes" | "hours" | "days");
                          setScheduleIntervalValue(pixel.schedule.intervalValue);
                          setScheduleEnabled(pixel.schedule.enabled);
                        } else {
                          setScheduleIntervalType("minutes");
                          setScheduleIntervalValue(5);
                          setScheduleEnabled(true);
                        }
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-dark-tertiary text-gray-300 rounded text-sm hover:bg-dark-border"
                  >
                    <Clock className="w-4 h-4" />
                    Schedule
                  </button>
                  <button
                    onClick={() => loadScheduleRuns(pixel.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-dark-tertiary text-gray-300 rounded text-sm hover:bg-dark-border"
                  >
                    History
                  </button>
                </div>
              </div>

              {/* Schedule form */}
              {schedulePixelId === pixel.id && (
                <div className="mt-4 p-3 bg-dark-bg border border-dark-border rounded space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Fetch every</span>
                    <input
                      type="number"
                      min={1}
                      value={scheduleIntervalValue}
                      onChange={(e) => setScheduleIntervalValue(Number(e.target.value) || 1)}
                      className="w-20 px-2 py-1 bg-dark-tertiary border border-dark-border rounded text-white text-sm"
                    />
                    <select
                      value={scheduleIntervalType}
                      onChange={(e) => setScheduleIntervalType(e.target.value as "minutes" | "hours" | "days")}
                      className="px-2 py-1 bg-dark-tertiary border border-dark-border rounded text-white text-sm"
                    >
                      <option value="minutes">minutes</option>
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-gray-400 text-sm">
                    <input
                      type="checkbox"
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                    />
                    Enabled
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveSchedule(pixel.id)}
                      disabled={savingSchedule}
                      className="px-3 py-1.5 bg-accent-primary text-white rounded text-sm hover:opacity-90 disabled:opacity-50"
                    >
                      {savingSchedule ? "Saving…" : "Save Schedule"}
                    </button>
                    {pixel.schedule && (
                      <button
                        onClick={() => deleteSchedule(pixel.id)}
                        className="px-3 py-1.5 text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      onClick={() => setSchedulePixelId(null)}
                      className="px-3 py-1.5 text-gray-400 hover:text-white text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  {pixel.schedule && (
                    <p className="text-gray-500 text-xs">
                      Last run: {pixel.schedule.lastRunAt ? new Date(pixel.schedule.lastRunAt).toLocaleString() : "Never"} · 
                      Next run: {new Date(pixel.schedule.nextRunAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Run history */}
              {runsPixelId === pixel.id && scheduleRuns && (
                <div className="mt-4 p-3 bg-dark-bg border border-dark-border rounded">
                  <h4 className="text-white text-sm font-medium mb-2">Run History</h4>
                  {scheduleRuns.runs.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {scheduleRuns.runs.map((run) => (
                        <div key={run.id} className="flex flex-wrap items-center gap-2 text-xs p-2 bg-dark-secondary rounded">
                          <span className="text-gray-400">{new Date(run.startedAt).toLocaleString()}</span>
                          <span className={`px-2 py-0.5 rounded ${
                            run.status === "completed" ? "bg-green-500/20 text-green-400" :
                            run.status === "failed" ? "bg-red-500/20 text-red-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          }`}>{run.status}</span>
                          <span className="text-gray-500">
                            {run.contactsUpserted} contacts · {run.eventsInserted} events
                          </span>
                          {run.error && <span className="text-red-400 truncate max-w-[200px]" title={run.error}>{run.error}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No runs yet.</p>
                  )}
                </div>
              )}
            </div>
          ))}
          {pixels.length === 0 && !showPixelForm && (
            <p className="text-gray-500 text-sm">No pixels yet. Create one to start tracking visitor data.</p>
          )}
        </div>
      </section>

      {/* Campaigns section */}
      <section>
        <button
          onClick={() => setCampaignsOpen(!campaignsOpen)}
          className="flex items-center gap-2 text-lg font-semibold text-white hover:text-accent-primary transition"
        >
          {campaignsOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          Campaigns
        </button>
        <p className="text-gray-400 text-sm mt-1 mb-4">
          Create campaigns, choose templates, set triggers, and launch. Segments are updated dynamically.
        </p>

        {campaignsOpen && (
          <div className="space-y-8">
            <div>
              <h3 className="text-white font-medium mb-2">1. Create a new campaign</h3>
              <p className="text-gray-400 text-sm mb-3">
                <a href="/dashboard/segments" className="text-accent-primary hover:underline">Segments</a>
                {" · "}
                <a href="/dashboard/templates" className="text-accent-primary hover:underline">Templates</a>
              </p>
              {emailTemplates.length === 0 && (
                <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>
                    You need at least one email template before creating a campaign.{" "}
                    <a href="/dashboard/templates" className="underline font-medium hover:text-yellow-300">
                      Go to Templates →
                    </a>
                  </span>
                </div>
              )}
              {!showCampaignForm ? (
                <button
                  onClick={() => { setShowCampaignForm(true); setEditingCampaign(null); resetCampaignForm(); }}
                  disabled={emailTemplates.length === 0}
                  title={emailTemplates.length === 0 ? "Create a template first before creating a campaign" : undefined}
                  className="flex items-center gap-2 px-3 py-2 text-accent-primary hover:bg-accent-primary/10 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" /> New Campaign
                </button>
              ) : (
                <div className="bg-dark-secondary border border-dark-border rounded-lg p-4 space-y-3 max-w-2xl mb-4">
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Segment</label>
                    <select
                      value={campaignSegmentId}
                      onChange={(e) => setCampaignSegmentId(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white"
                    >
                      <option value="">Select segment</option>
                      {segments.filter((s) => !s.isSuppression).map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">2. Template (required)</label>
                    {emailTemplates.length === 0 ? (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                        No templates found.{" "}
                        <a href="/dashboard/templates" className="underline font-medium hover:text-yellow-300">
                          Create a template first →
                        </a>
                      </div>
                    ) : (
                      <select
                        value={campaignTemplateId}
                        onChange={(e) => setCampaignTemplateId(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white"
                      >
                        <option value="">Choose template</option>
                        {emailTemplates.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">3. Trigger schedule</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                        <input
                          type="radio"
                          name="trigger"
                          checked={campaignTriggerType === "on_segment_update"}
                          onChange={() => setCampaignTriggerType("on_segment_update")}
                          className="text-accent-primary"
                        />
                        As segments are updated (send immediately when contact matches)
                      </label>
                      <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                        <input
                          type="radio"
                          name="trigger"
                          checked={campaignTriggerType === "scheduled"}
                          onChange={() => setCampaignTriggerType("scheduled")}
                          className="text-accent-primary"
                        />
                        Scheduled: every
                      </label>
                      {campaignTriggerType === "scheduled" && (
                        <div className="flex items-center gap-2 pl-6">
                          <input
                            type="number"
                            min={1}
                            value={campaignTriggerIntervalValue}
                            onChange={(e) => setCampaignTriggerIntervalValue(Number(e.target.value) || 1)}
                            className="w-20 px-2 py-2 bg-dark-bg border border-dark-border rounded text-white"
                          />
                          <select
                            value={campaignTriggerIntervalType}
                            onChange={(e) => setCampaignTriggerIntervalType(e.target.value as "minutes" | "hours" | "days")}
                            className="px-2 py-2 bg-dark-bg border border-dark-border rounded text-white"
                          >
                            <option value="minutes">minutes</option>
                            <option value="hours">hours</option>
                            <option value="days">days</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Email field</label>
                    <select
                      value={campaignEmailField}
                      onChange={(e) => setCampaignEmailField(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white"
                    >
                      {EMAIL_FIELD_OPTIONS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-gray-400">
                    <input
                      type="checkbox"
                      checked={campaignEnabled}
                      onChange={(e) => setCampaignEnabled(e.target.checked)}
                    />
                    4. Launch campaign (enabled)
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={saveCampaign}
                      disabled={savingCampaign}
                      className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                    >
                      {savingCampaign ? "Saving…" : editingCampaign ? "Update" : "Create"}
                    </button>
                    <button
                      onClick={() => { setShowCampaignForm(false); setEditingCampaign(null); resetCampaignForm(); }}
                      className="px-4 py-2 text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <h4 className="text-white font-medium mt-6 mb-2">5. All campaigns</h4>
              <p className="text-gray-400 text-sm mb-3">
                View and edit your campaigns. Click edit to change template, trigger, or launch status.
              </p>
              <div className="space-y-2">
                {campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-dark-secondary border border-dark-border rounded flex items-center justify-between flex-wrap gap-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-white font-medium">{c.segment.name}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-gray-400">
                        {c.emailTemplate ? c.emailTemplate.name : c.knowledgeBank?.name ?? "—"}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {c.triggerType === "on_segment_update"
                          ? "· As segments update"
                          : `· Every ${c.triggerIntervalValue ?? "?"} ${c.triggerIntervalType ?? ""}`}
                      </span>
                      {c.emailFieldMap && (
                        <span className="text-gray-500 text-sm">· {c.emailFieldMap}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${c.enabled ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-500"}`}>
                        {c.enabled ? "Launched" : "Paused"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadCampaignIntoForm(c)}
                        className="px-3 py-1.5 bg-accent-primary/20 text-accent-primary rounded text-sm hover:bg-accent-primary/30"
                      >
                        Edit
                      </button>
                      <button onClick={() => deleteCampaign(c.id)} className="p-1.5 text-gray-400 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {campaigns.length === 0 && !showCampaignForm && (
                  <p className="text-gray-500 text-sm">No campaigns yet. Create one above to send segment-matched emails.</p>
                )}
              </div>
            </div>

            {/* Email logs */}
            <div>
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email logs
              </h3>
              <p className="text-gray-400 text-sm mb-3">
                Recent campaign sends (resolved email, segment, status).
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {emailSends.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-2 text-sm p-2 bg-dark-secondary rounded">
                    <span className="text-gray-400">{new Date(s.createdAt).toLocaleString()}</span>
                    <span className="text-white truncate max-w-[180px]" title={s.resolvedEmail || s.contact?.email || "—"}>
                      {s.resolvedEmail || s.contact?.email || "—"}
                    </span>
                    <span className="text-gray-500">{s.segmentCampaign?.segment?.name || "—"}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      s.status === "sent" ? "bg-green-500/20 text-green-400" :
                      s.status === "failed" ? "bg-red-500/20 text-red-400" :
                      "bg-gray-500/20 text-gray-400"
                    }`}>{s.status}</span>
                    {s.error && <span className="text-red-400 text-xs truncate max-w-[120px]" title={s.error}>{s.error}</span>}
                  </div>
                ))}
                {emailSends.length === 0 && (
                  <p className="text-gray-500 text-sm">No sends yet.</p>
                )}
              </div>
            </div>

            {/* Unsubscribe management */}
            <div>
              <h3 className="text-white font-medium mb-2">Unsubscribes</h3>
              <p className="text-gray-400 text-sm mb-3">
                Emails that have unsubscribed. Remove to allow them to receive emails again.
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {unsubscribes.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2 bg-dark-secondary rounded">
                    <span className="text-gray-300 text-sm">{u.email}</span>
                    <button
                      onClick={() => removeUnsubscribe(u.email)}
                      className="text-xs text-accent-primary hover:underline"
                    >
                      Re-subscribe
                    </button>
                  </div>
                ))}
                {unsubscribes.length === 0 && (
                  <p className="text-gray-500 text-sm">No unsubscribes.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
