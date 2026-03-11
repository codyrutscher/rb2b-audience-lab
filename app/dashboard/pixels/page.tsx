"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Radio, Download, Clock, Trash2, ExternalLink, Copy, Check } from "lucide-react";

const API_BASE = "/api/reactivate";

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
  audiencelabInstallUrl: string | null;
  canFetch: boolean;
  schedule: PixelSchedule;
  createdAt: string;
};

type ScheduleRun = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  pagesFetched: number;
  contactsUpserted: number;
  eventsInserted: number;
  error: string | null;
};

export default function PixelsPage() {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pixelName, setPixelName] = useState("");
  const [pixelWebsiteName, setPixelWebsiteName] = useState("");
  const [pixelWebsiteUrl, setPixelWebsiteUrl] = useState("");
  const [pixelWebhookUrl, setPixelWebhookUrl] = useState("");
  const [pixelApiKey, setPixelApiKey] = useState("");
  const [creating, setCreating] = useState(false);

  // Schedule state
  const [schedulePixelId, setSchedulePixelId] = useState<string | null>(null);
  const [scheduleIntervalType, setScheduleIntervalType] = useState<"minutes" | "hours" | "days">("hours");
  const [scheduleIntervalValue, setScheduleIntervalValue] = useState(1);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Fetch state
  const [fetchingPixelId, setFetchingPixelId] = useState<string | null>(null);

  // Run history state
  const [runsPixelId, setRunsPixelId] = useState<string | null>(null);
  const [scheduleRuns, setScheduleRuns] = useState<ScheduleRun[]>([]);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadPixels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/pixels`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) {
          setError("Session expired. Please log in again.");
        } else {
          setError("Failed to load pixels");
        }
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPixels(data.pixels || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pixels");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPixels();
  }, [loadPixels]);

  async function createPixel() {
    if (!pixelName.trim() || !pixelWebsiteName.trim() || !pixelWebsiteUrl.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/pixels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: pixelName.trim(),
          website_name: pixelWebsiteName.trim(),
          website_url: pixelWebsiteUrl.trim(),
          webhook_url: pixelWebhookUrl.trim() || undefined,
          audiencelab_api_key: pixelApiKey.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create pixel");
        setCreating(false);
        return;
      }
      setShowCreateForm(false);
      setPixelName("");
      setPixelWebsiteName("");
      setPixelWebsiteUrl("");
      setPixelWebhookUrl("");
      setPixelApiKey("");
      loadPixels();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create pixel");
    }
    setCreating(false);
  }

  async function fetchPixelData(pixelId: string) {
    setFetchingPixelId(pixelId);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/pixels/${pixelId}/fetch`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to fetch pixel data");
      }
      loadPixels();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch pixel data");
    }
    setFetchingPixelId(null);
  }

  async function saveSchedule(pixelId: string) {
    setSavingSchedule(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/pixels/${pixelId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          interval_type: scheduleIntervalType,
          interval_value: scheduleIntervalValue,
          enabled: scheduleEnabled,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save schedule");
      }
      setSchedulePixelId(null);
      loadPixels();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save schedule");
    }
    setSavingSchedule(false);
  }

  async function deleteSchedule(pixelId: string) {
    if (!confirm("Remove schedule for this pixel?")) return;
    try {
      await fetch(`${API_BASE}/pixels/${pixelId}/schedule`, {
        method: "DELETE",
        credentials: "include",
      });
      setSchedulePixelId(null);
      loadPixels();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete schedule");
    }
  }

  async function loadScheduleRuns(pixelId: string) {
    if (runsPixelId === pixelId) {
      setRunsPixelId(null);
      setScheduleRuns([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/pixels/${pixelId}/schedule/runs`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setScheduleRuns(data.runs || []);
        setRunsPixelId(pixelId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load run history");
    }
  }

  function copyInstallScript(pixel: Pixel) {
    let script: string;
    if (pixel.audiencelabInstallUrl) {
      script = `<script src="${pixel.audiencelabInstallUrl}" async></script>`;
    } else {
      // Use our own tracking script with workspace ID
      const baseUrl = window.location.origin;
      script = `<script src="${baseUrl}/track.js" data-workspace-id="${pixel.id}" async></script>`;
    }
    navigator.clipboard.writeText(script);
    setCopiedId(pixel.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-400">Loading pixels…</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Pixels</h1>
            <p className="text-gray-400">
              Create and manage tracking pixels to capture visitor data from your websites
            </p>
          </div>
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-purple text-white rounded-lg font-medium hover:shadow-lg hover:shadow-accent-primary/30 transition"
            >
              <Plus className="w-5 h-5" />
              New Pixel
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Create form */}
        {showCreateForm && (
          <div className="glass neon-border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Pixel</h2>
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Pixel Name *</label>
                <input
                  type="text"
                  value={pixelName}
                  onChange={(e) => setPixelName(e.target.value)}
                  placeholder="My Website Pixel"
                  className="w-full px-4 py-2.5 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Website Name *</label>
                <input
                  type="text"
                  value={pixelWebsiteName}
                  onChange={(e) => setPixelWebsiteName(e.target.value)}
                  placeholder="My Website"
                  className="w-full px-4 py-2.5 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Website URL *</label>
                <input
                  type="text"
                  value={pixelWebsiteUrl}
                  onChange={(e) => setPixelWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2.5 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Webhook URL (optional)</label>
                <input
                  type="text"
                  value={pixelWebhookUrl}
                  onChange={(e) => setPixelWebhookUrl(e.target.value)}
                  placeholder="https://your-webhook.com/endpoint"
                  className="w-full px-4 py-2.5 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-gray-400 text-sm block mb-1">Audiencelab API Key (optional)</label>
                <input
                  type="text"
                  value={pixelApiKey}
                  onChange={(e) => setPixelApiKey(e.target.value)}
                  placeholder="Your API key for Audiencelab integration"
                  className="w-full px-4 py-2.5 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={createPixel}
                disabled={creating || !pixelName.trim() || !pixelWebsiteName.trim() || !pixelWebsiteUrl.trim()}
                className="px-5 py-2.5 bg-gradient-purple text-white rounded-lg font-medium hover:shadow-lg hover:shadow-accent-primary/30 disabled:opacity-50 transition"
              >
                {creating ? "Creating…" : "Create Pixel"}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setPixelName("");
                  setPixelWebsiteName("");
                  setPixelWebsiteUrl("");
                  setPixelWebhookUrl("");
                  setPixelApiKey("");
                }}
                className="px-5 py-2.5 text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Pixels list */}
        <div className="space-y-4">
          {pixels.map((pixel) => (
            <div key={pixel.id} className="glass neon-border rounded-xl p-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-purple rounded-lg">
                    <Radio className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{pixel.name}</h3>
                    <p className="text-gray-400">{pixel.websiteName}</p>
                    <a
                      href={pixel.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-primary text-sm hover:underline flex items-center gap-1 mt-1"
                    >
                      {pixel.websiteUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {pixel.audiencelabPixelId && (
                      <p className="text-gray-500 text-xs mt-2">
                        Pixel ID: {pixel.audiencelabPixelId}
                      </p>
                    )}
                    {pixel.schedule && (
                      <p className="text-gray-500 text-xs mt-1">
                        Schedule: Every {pixel.schedule.intervalValue} {pixel.schedule.intervalType}
                        {pixel.schedule.enabled ? " (active)" : " (paused)"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => copyInstallScript(pixel)}
                    className="flex items-center gap-2 px-3 py-2 bg-dark-tertiary text-gray-300 rounded-lg text-sm hover:bg-dark-border transition"
                  >
                    {copiedId === pixel.id ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Script
                      </>
                    )}
                  </button>
                  {pixel.canFetch && (
                    <button
                      onClick={() => fetchPixelData(pixel.id)}
                      disabled={fetchingPixelId === pixel.id}
                      className="flex items-center gap-2 px-3 py-2 bg-accent-primary/20 text-accent-primary rounded-lg text-sm hover:bg-accent-primary/30 disabled:opacity-50 transition"
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
                          setScheduleIntervalType("hours");
                          setScheduleIntervalValue(1);
                          setScheduleEnabled(true);
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-dark-tertiary text-gray-300 rounded-lg text-sm hover:bg-dark-border transition"
                  >
                    <Clock className="w-4 h-4" />
                    Schedule
                  </button>
                  <button
                    onClick={() => loadScheduleRuns(pixel.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-dark-tertiary text-gray-300 rounded-lg text-sm hover:bg-dark-border transition"
                  >
                    History
                  </button>
                </div>
              </div>

              {/* Schedule form */}
              {schedulePixelId === pixel.id && (
                <div className="mt-6 p-4 bg-dark-tertiary/50 border border-dark-border rounded-lg">
                  <h4 className="text-white font-medium mb-3">Auto-Fetch Schedule</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-gray-400 text-sm">Fetch every</span>
                    <input
                      type="number"
                      min={1}
                      value={scheduleIntervalValue}
                      onChange={(e) => setScheduleIntervalValue(Number(e.target.value) || 1)}
                      className="w-20 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white text-sm"
                    />
                    <select
                      value={scheduleIntervalType}
                      onChange={(e) => setScheduleIntervalType(e.target.value as "minutes" | "hours" | "days")}
                      className="px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white text-sm"
                    >
                      <option value="minutes">minutes</option>
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </select>
                    <label className="flex items-center gap-2 text-gray-400 text-sm ml-4">
                      <input
                        type="checkbox"
                        checked={scheduleEnabled}
                        onChange={(e) => setScheduleEnabled(e.target.checked)}
                        className="rounded"
                      />
                      Enabled
                    </label>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => saveSchedule(pixel.id)}
                      disabled={savingSchedule}
                      className="px-4 py-2 bg-accent-primary text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {savingSchedule ? "Saving…" : "Save Schedule"}
                    </button>
                    {pixel.schedule && (
                      <button
                        onClick={() => deleteSchedule(pixel.id)}
                        className="px-4 py-2 text-red-400 hover:text-red-300 text-sm transition"
                      >
                        Remove Schedule
                      </button>
                    )}
                    <button
                      onClick={() => setSchedulePixelId(null)}
                      className="px-4 py-2 text-gray-400 hover:text-white text-sm transition"
                    >
                      Cancel
                    </button>
                  </div>
                  {pixel.schedule && (
                    <p className="text-gray-500 text-xs mt-3">
                      Last run: {pixel.schedule.lastRunAt ? new Date(pixel.schedule.lastRunAt).toLocaleString() : "Never"} · 
                      Next run: {new Date(pixel.schedule.nextRunAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Run history */}
              {runsPixelId === pixel.id && (
                <div className="mt-6 p-4 bg-dark-tertiary/50 border border-dark-border rounded-lg">
                  <h4 className="text-white font-medium mb-3">Fetch History</h4>
                  {scheduleRuns.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {scheduleRuns.map((run) => (
                        <div key={run.id} className="flex flex-wrap items-center gap-3 text-sm p-3 bg-dark-bg rounded-lg">
                          <span className="text-gray-400">{new Date(run.startedAt).toLocaleString()}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            run.status === "completed" ? "bg-green-500/20 text-green-400" :
                            run.status === "failed" ? "bg-red-500/20 text-red-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          }`}>{run.status}</span>
                          <span className="text-gray-500">
                            {run.contactsUpserted} contacts · {run.eventsInserted} events
                          </span>
                          {run.error && (
                            <span className="text-red-400 text-xs truncate max-w-[200px]" title={run.error}>
                              {run.error}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No fetch runs yet.</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {pixels.length === 0 && !showCreateForm && (
            <div className="glass neon-border rounded-xl p-12 text-center">
              <Radio className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No pixels yet</h3>
              <p className="text-gray-400 mb-6">
                Create your first pixel to start tracking visitor data from your website
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-purple text-white rounded-lg font-medium hover:shadow-lg hover:shadow-accent-primary/30 transition"
              >
                <Plus className="w-5 h-5" />
                Create Your First Pixel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
