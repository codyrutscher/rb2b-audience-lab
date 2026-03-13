"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";

const API_BASE = "/api/reactivate";

type Integration = {
  id: string;
  name: string;
  platform: string;
  enabled: boolean;
  createdAt: string;
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<"klaviyo" | "google_sheets" | "webhook">("klaviyo");
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [sheetId, setSheetId] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/integrations`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function createIntegration() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const config: any = {};
      if (platform === "klaviyo") config.apiKey = apiKey;
      if (platform === "webhook") config.webhookUrl = webhookUrl;
      if (platform === "google_sheets") config.sheetId = sheetId;

      const res = await fetch(`${API_BASE}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, platform, config }),
        credentials: "include",
      });
      
      if (res.ok) {
        setShowCreateForm(false);
        setName("");
        setApiKey("");
        setWebhookUrl("");
        setSheetId("");
        loadIntegrations();
      }
    } catch (e) {
      console.error(e);
    }
    setCreating(false);
  }

  async function deleteIntegration(id: string) {
    if (!confirm("Delete this integration?")) return;
    try {
      await fetch(`${API_BASE}/integrations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      loadIntegrations();
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Loading integrations…</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Integrations</h1>
            <p className="text-gray-400">Connect external platforms to sync segment data</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-purple text-white rounded-lg font-medium hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            Add Integration
          </button>
        </div>

        {showCreateForm && (
          <div className="glass neon-border rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">New Integration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Klaviyo Integration"
                  className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as any)}
                  className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white"
                >
                  <option value="klaviyo">Klaviyo</option>
                  <option value="google_sheets">Google Sheets</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>
              {platform === "klaviyo" && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="pk_..."
                    className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white"
                  />
                </div>
              )}
              {platform === "webhook" && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Webhook URL</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-webhook.com/endpoint"
                    className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white"
                  />
                </div>
              )}
              {platform === "google_sheets" && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Sheet ID</label>
                  <input
                    type="text"
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Coming soon - requires Google OAuth setup</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={createIntegration}
                  disabled={creating || !name.trim()}
                  className="px-4 py-2 bg-accent-primary text-white rounded-lg disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {integrations.length === 0 ? (
            <div className="glass neon-border rounded-xl p-12 text-center">
              <p className="text-gray-500">No integrations yet. Add one to get started.</p>
            </div>
          ) : (
            integrations.map((integration) => (
              <div key={integration.id} className="glass neon-border rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
                    <p className="text-sm text-gray-400 mt-1 capitalize">{integration.platform.replace("_", " ")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {integration.enabled ? (
                      <span className="flex items-center gap-2 text-green-400 text-sm">
                        <Check className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-gray-500 text-sm">
                        <X className="w-4 h-4" />
                        Disabled
                      </span>
                    )}
                    <button
                      onClick={() => deleteIntegration(integration.id)}
                      className="p-2 text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 p-6 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-2">How to use integrations</h3>
          <ol className="text-sm text-gray-400 space-y-2">
            <li>1. Create an integration with your platform credentials</li>
            <li>2. Go to Segments and select a segment</li>
            <li>3. Configure which integration to sync matched visitors to</li>
            <li>4. Visitors matching the segment will automatically sync to your platform</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
