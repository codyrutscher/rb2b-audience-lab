"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Copy, Check, Code, Plus } from "lucide-react";

const API_BASE = "/api/reactivate";

type Pixel = {
  id: string;
  name: string;
  websiteName: string;
  websiteUrl: string;
  audiencelabPixelId: string | null;
  audiencelabInstallUrl: string | null;
  canFetch: boolean;
};

export default function InstallPage() {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPixelId, setSelectedPixelId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pixelName, setPixelName] = useState("");
  const [pixelWebsiteName, setPixelWebsiteName] = useState("");
  const [pixelWebsiteUrl, setPixelWebsiteUrl] = useState("");

  const loadPixels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pixels`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        const list = d.pixels || [];
        setPixels(list);
        const withInstallUrl = list.filter((p: Pixel) => p.audiencelabInstallUrl);
        if (withInstallUrl.length > 0 && !selectedPixelId) {
          setSelectedPixelId(withInstallUrl[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPixels();
  }, [loadPixels]);

  const selectedPixel = pixels.find((p) => p.id === selectedPixelId);
  const pixelsWithInstallUrl = pixels.filter((p) => p.audiencelabInstallUrl);

  async function refreshInstallUrl(pixelId: string) {
    setRefreshingId(pixelId);
    try {
      const res = await fetch(`${API_BASE}/pixels/${pixelId}/refresh-install-url`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        await loadPixels();
      }
    } finally {
      setRefreshingId(null);
    }
  }

  async function createPixel() {
    if (!pixelName.trim() || !pixelWebsiteName.trim() || !pixelWebsiteUrl.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(`${API_BASE}/pixels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: pixelName.trim(),
          website_name: pixelWebsiteName.trim(),
          website_url: pixelWebsiteUrl.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error || "Failed to create pixel");
        return;
      }
      setShowCreateForm(false);
      setPixelName("");
      setPixelWebsiteName("");
      setPixelWebsiteUrl("");
      await loadPixels();
      if (data.pixel?.id) {
        setSelectedPixelId(data.pixel.id);
      }
    } finally {
      setCreating(false);
    }
  }

  const installScript = selectedPixel?.audiencelabInstallUrl
    ? `<!-- Audiencelab Pixel - ${selectedPixel.websiteName} -->
<script src="${selectedPixel.audiencelabInstallUrl}" async></script>`
    : null;

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Install Pixel</h1>
          <p className="text-gray-400">
            Add the Audiencelab pixel to your website to track visitors and feed data into Reactivate
          </p>
        </div>

        {/* Create pixel form - shown when no pixels or "New pixel" clicked */}
        {(pixels.length === 0 || showCreateForm) ? (
          <div className="bg-dark-secondary border border-dark-border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">
              {pixels.length === 0 ? "Create your first pixel" : "Create new pixel"}
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Uses your configured API key — no login required.
            </p>
            <div className="space-y-3 max-w-md">
              <input
                placeholder="Pixel name (e.g. Main Site)"
                value={pixelName}
                onChange={(e) => setPixelName(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-primary focus:border-transparent"
              />
              <input
                placeholder="Website name"
                value={pixelWebsiteName}
                onChange={(e) => setPixelWebsiteName(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-primary focus:border-transparent"
              />
              <input
                placeholder="Website URL (https://...)"
                value={pixelWebsiteUrl}
                onChange={(e) => setPixelWebsiteUrl(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-primary focus:border-transparent"
              />
              {createError && (
                <p className="text-red-400 text-sm">{createError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={createPixel}
                  disabled={creating || !pixelName.trim() || !pixelWebsiteName.trim() || !pixelWebsiteUrl.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-accent-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition"
                >
                  <Plus className="w-4 h-4" />
                  {creating ? "Creating…" : "Create pixel"}
                </button>
                {pixels.length > 0 && (
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateError(null);
                    }}
                    className="px-4 py-2.5 text-gray-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : pixelsWithInstallUrl.length === 0 ? (
          <div className="bg-dark-secondary border border-dark-border rounded-lg p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Pixels need install URL</h2>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-lg text-sm font-medium hover:bg-accent-primary/30 transition"
              >
                <Plus className="w-4 h-4" />
                Create new pixel
              </button>
            </div>
            <p className="text-gray-400 mb-4">
              Refresh existing pixels to fetch their install URL, or create a new one:
            </p>
            <div className="space-y-2">
              {pixels.filter((p) => p.audiencelabPixelId).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-dark-border">
                  <span className="text-white">{p.name}</span>
                  <button
                    onClick={() => refreshInstallUrl(p.id)}
                    disabled={refreshingId === p.id}
                    className="px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-lg text-sm hover:bg-accent-primary/30 disabled:opacity-50"
                  >
                    {refreshingId === p.id ? "Refreshing…" : "Fetch install URL"}
                  </button>
                </div>
              ))}
            </div>
            {!pixels.some((p) => p.audiencelabPixelId) && (
              <p className="text-gray-500 text-sm mt-4">
                Your pixels weren&apos;t created via Audiencelab. Use &quot;Create new pixel&quot; above to add one (uses your configured API key).
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <label className="block text-sm font-medium text-gray-400">Select pixel</label>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-lg text-sm font-medium hover:bg-accent-primary/30 transition"
              >
                <Plus className="w-4 h-4" />
                New pixel
              </button>
            </div>
            <div className="mb-6">
              {pixelsWithInstallUrl.length === 1 ? (
                <div className="px-4 py-3 bg-dark-secondary border border-dark-border rounded-lg text-white">
                  {selectedPixel?.name} — {selectedPixel?.websiteUrl}
                </div>
              ) : (
                <select
                  value={selectedPixelId || ""}
                  onChange={(e) => setSelectedPixelId(e.target.value || null)}
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                >
                  <option value="">Select a pixel</option>
                  {pixelsWithInstallUrl.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.websiteUrl}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Install script */}
            <div className="bg-dark-secondary border border-dark-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-dark-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-accent-primary/20 rounded-full flex items-center justify-center text-accent-primary font-bold">
                    1
                  </div>
                  <h2 className="text-xl font-semibold text-white">Add Pixel Script</h2>
                </div>
                <p className="text-gray-400 ml-11">
                  Copy and paste this code into the <code className="bg-dark-bg px-2 py-0.5 rounded text-gray-300">&lt;head&gt;</code> section of your website
                </p>
              </div>
              <div className="p-4">
                <div className="relative">
                  <pre className="bg-dark-bg text-gray-100 p-4 rounded-lg overflow-x-auto text-sm border border-dark-border">
                    {installScript}
                  </pre>
                  <button
                    onClick={() => installScript && copyToClipboard(installScript)}
                    className="absolute top-4 right-4 p-2 bg-dark-tertiary hover:bg-dark-border rounded-lg transition text-gray-400 hover:text-white"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Verify */}
            <div className="mt-8 bg-dark-secondary border border-dark-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-dark-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-accent-primary/20 rounded-full flex items-center justify-center text-accent-primary font-bold">
                    2
                  </div>
                  <h2 className="text-xl font-semibold text-white">Verify Installation</h2>
                </div>
                <p className="text-gray-400 ml-11">
                  Visit your website and check the Reactivate dashboard to see when visitor data starts syncing
                </p>
              </div>
              <div className="p-4">
                <Link
                  href="/dashboard/reactivate"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-accent-primary text-white rounded-lg font-semibold hover:opacity-90 transition"
                >
                  <Code className="w-5 h-5" />
                  Go to Reactivate
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
