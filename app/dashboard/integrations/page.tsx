"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Check, X, Search } from "lucide-react";

const API_BASE = "/api/reactivate";

type PlatformDef = {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  fields: { key: string; label: string; type: string; placeholder: string; required: boolean }[];
};

const PLATFORMS: PlatformDef[] = [
  // Email Marketing
  { id: "klaviyo", name: "Klaviyo", category: "Email Marketing", icon: "📧", color: "bg-green-600",
    fields: [{ key: "apiKey", label: "Private API Key", type: "password", placeholder: "pk_...", required: true }] },
  { id: "mailchimp", name: "Mailchimp", category: "Email Marketing", icon: "🐵", color: "bg-yellow-600",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "xxxxxxxx-us21", required: true },
      { key: "listId", label: "Audience/List ID", type: "text", placeholder: "abc123def4", required: true },
    ] },
  { id: "sendgrid", name: "SendGrid", category: "Email Marketing", icon: "📨", color: "bg-blue-600",
    fields: [{ key: "apiKey", label: "API Key", type: "password", placeholder: "SG...", required: true }] },
  { id: "activecampaign", name: "ActiveCampaign", category: "Email Marketing", icon: "⚡", color: "bg-blue-700",
    fields: [
      { key: "apiUrl", label: "API URL", type: "text", placeholder: "https://yourname.api-us1.com", required: true },
      { key: "apiKey", label: "API Key", type: "password", placeholder: "Your API key", required: true },
    ] },
  { id: "convertkit", name: "ConvertKit", category: "Email Marketing", icon: "✉️", color: "bg-red-500",
    fields: [{ key: "apiKey", label: "API Key", type: "password", placeholder: "Your API key", required: true }] },
  { id: "brevo", name: "Brevo (Sendinblue)", category: "Email Marketing", icon: "💌", color: "bg-blue-500",
    fields: [{ key: "apiKey", label: "API Key", type: "password", placeholder: "xkeysib-...", required: true }] },
  { id: "drip", name: "Drip", category: "Email Marketing", icon: "💧", color: "bg-purple-500",
    fields: [
      { key: "apiKey", label: "API Token", type: "password", placeholder: "Your API token", required: true },
      { key: "accountId", label: "Account ID", type: "text", placeholder: "1234567", required: true },
    ] },
  // CRMs
  { id: "hubspot", name: "HubSpot", category: "CRM", icon: "🟠", color: "bg-orange-500",
    fields: [{ key: "apiKey", label: "Private App Token", type: "password", placeholder: "pat-...", required: true }] },
  { id: "salesforce", name: "Salesforce", category: "CRM", icon: "☁️", color: "bg-blue-400",
    fields: [
      { key: "instanceUrl", label: "Instance URL", type: "text", placeholder: "https://yourorg.my.salesforce.com", required: true },
      { key: "accessToken", label: "Access Token", type: "password", placeholder: "Bearer token", required: true },
    ] },
  { id: "pipedrive", name: "Pipedrive", category: "CRM", icon: "🔵", color: "bg-green-500",
    fields: [{ key: "apiKey", label: "API Token", type: "password", placeholder: "Your API token", required: true }] },
  { id: "zoho_crm", name: "Zoho CRM", category: "CRM", icon: "🟡", color: "bg-red-600",
    fields: [{ key: "accessToken", label: "Access Token", type: "password", placeholder: "OAuth access token", required: true }] },
  { id: "close", name: "Close CRM", category: "CRM", icon: "📞", color: "bg-gray-600",
    fields: [{ key: "apiKey", label: "API Key", type: "password", placeholder: "api_...", required: true }] },
  { id: "copper", name: "Copper", category: "CRM", icon: "🟤", color: "bg-orange-600",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "Your API key", required: true },
      { key: "email", label: "User Email", type: "email", placeholder: "you@company.com", required: true },
    ] },
  // Advertising
  { id: "facebook_ads", name: "Facebook Ads", category: "Advertising", icon: "📘", color: "bg-blue-600",
    fields: [
      { key: "accessToken", label: "Access Token", type: "password", placeholder: "EAA...", required: true },
      { key: "adAccountId", label: "Ad Account ID", type: "text", placeholder: "act_123456", required: true },
    ] },
  { id: "google_ads", name: "Google Ads", category: "Advertising", icon: "🔍", color: "bg-yellow-500",
    fields: [
      { key: "customerId", label: "Customer ID", type: "text", placeholder: "123-456-7890", required: true },
      { key: "developerToken", label: "Developer Token", type: "password", placeholder: "Your dev token", required: true },
    ] },
  { id: "linkedin_ads", name: "LinkedIn Ads", category: "Advertising", icon: "💼", color: "bg-blue-700",
    fields: [{ key: "accessToken", label: "Access Token", type: "password", placeholder: "OAuth token", required: true }] },
  { id: "tiktok_ads", name: "TikTok Ads", category: "Advertising", icon: "🎵", color: "bg-gray-800",
    fields: [{ key: "accessToken", label: "Access Token", type: "password", placeholder: "Your access token", required: true }] },
  // Spreadsheets & Data
  { id: "google_sheets", name: "Google Sheets", category: "Spreadsheets", icon: "📊", color: "bg-green-600",
    fields: [{ key: "sheetId", label: "Sheet ID", type: "text", placeholder: "1BxiMVs0XRA5nFMd...", required: true }] },
  { id: "airtable", name: "Airtable", category: "Spreadsheets", icon: "📋", color: "bg-blue-500",
    fields: [
      { key: "apiKey", label: "Personal Access Token", type: "password", placeholder: "pat...", required: true },
      { key: "baseId", label: "Base ID", type: "text", placeholder: "appXXXXXXXXXXXXXX", required: true },
      { key: "tableId", label: "Table Name", type: "text", placeholder: "Contacts", required: true },
    ] },
  // Messaging
  { id: "slack", name: "Slack", category: "Messaging", icon: "💬", color: "bg-purple-600",
    fields: [{ key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://hooks.slack.com/services/...", required: true }] },
  { id: "discord", name: "Discord", category: "Messaging", icon: "🎮", color: "bg-indigo-600",
    fields: [{ key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://discord.com/api/webhooks/...", required: true }] },
  { id: "microsoft_teams", name: "Microsoft Teams", category: "Messaging", icon: "🟣", color: "bg-purple-700",
    fields: [{ key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://outlook.office.com/webhook/...", required: true }] },
  // Automation
  { id: "zapier", name: "Zapier", category: "Automation", icon: "⚡", color: "bg-orange-500",
    fields: [{ key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://hooks.zapier.com/hooks/catch/...", required: true }] },
  { id: "make", name: "Make (Integromat)", category: "Automation", icon: "🔄", color: "bg-purple-500",
    fields: [{ key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://hook.us1.make.com/...", required: true }] },
  { id: "n8n", name: "n8n", category: "Automation", icon: "🔗", color: "bg-orange-600",
    fields: [{ key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://your-n8n.com/webhook/...", required: true }] },
  // Analytics
  { id: "segment_io", name: "Segment", category: "Analytics", icon: "📈", color: "bg-green-500",
    fields: [{ key: "writeKey", label: "Write Key", type: "password", placeholder: "Your write key", required: true }] },
  { id: "mixpanel", name: "Mixpanel", category: "Analytics", icon: "📉", color: "bg-purple-600",
    fields: [{ key: "token", label: "Project Token", type: "password", placeholder: "Your project token", required: true }] },
  { id: "amplitude", name: "Amplitude", category: "Analytics", icon: "📊", color: "bg-blue-600",
    fields: [{ key: "apiKey", label: "API Key", type: "password", placeholder: "Your API key", required: true }] },
  // Custom
  { id: "webhook", name: "Custom Webhook", category: "Custom", icon: "🔌", color: "bg-gray-600",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://your-api.com/webhook", required: true },
      { key: "headers", label: "Custom Headers (JSON)", type: "text", placeholder: '{"Authorization": "Bearer ..."}', required: false },
    ] },
];

const CATEGORIES = [...new Set(PLATFORMS.map(p => p.category))];

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
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformDef | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [integrationName, setIntegrationName] = useState("");
  const [creating, setCreating] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => { loadIntegrations(); }, []);

  async function loadIntegrations() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/integrations`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function createIntegration() {
    if (!selectedPlatform || !integrationName.trim()) return;
    setCreating(true);
    setConnectError(null);
    try {
      const res = await fetch(`${API_BASE}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: integrationName, platform: selectedPlatform.id, config: formValues }),
        credentials: "include",
      });
      if (res.ok) {
        setSelectedPlatform(null);
        setIntegrationName("");
        setFormValues({});
        setConnectError(null);
        loadIntegrations();
      } else {
        const data = await res.json().catch(() => ({}));
        setConnectError(data.error || `Connection failed (${res.status})`);
      }
    } catch (e: any) {
      setConnectError(e.message || "Network error — please try again.");
    }
    setCreating(false);
  }

  async function deleteIntegration(id: string) {
    if (!confirm("Delete this integration?")) return;
    await fetch(`${API_BASE}/integrations/${id}`, { method: "DELETE", credentials: "include" });
    loadIntegrations();
  }

  const filteredPlatforms = PLATFORMS.filter(p => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getPlatformDef = (id: string) => PLATFORMS.find(p => p.id === id);

  if (loading) return <div className="p-8 text-gray-400">Loading integrations...</div>;

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Integrations</h1>
          <p className="text-gray-400">Connect your favorite tools to sync segment data automatically</p>
        </div>

        {/* Active Integrations */}
        {integrations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Active Integrations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((integration) => {
                const def = getPlatformDef(integration.platform);
                return (
                  <div key={integration.id} className="glass neon-border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${def?.color || 'bg-gray-600'} rounded-lg flex items-center justify-center text-lg`}>
                          {def?.icon || "🔌"}
                        </div>
                        <div>
                          <div className="font-medium text-white">{integration.name}</div>
                          <div className="text-xs text-gray-400">{def?.name || integration.platform}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {integration.enabled ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs"><Check className="w-3 h-3" /> Active</span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-500 text-xs"><X className="w-3 h-3" /> Off</span>
                        )}
                        <button onClick={() => deleteIntegration(integration.id)} className="p-1.5 text-gray-500 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Platform Config Modal */}
        {selectedPlatform && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="glass neon-border rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 ${selectedPlatform.color} rounded-lg flex items-center justify-center text-2xl`}>
                  {selectedPlatform.icon}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Connect {selectedPlatform.name}</h2>
                  <p className="text-sm text-gray-400">{selectedPlatform.category}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Integration Name</label>
                  <input
                    type="text"
                    value={integrationName}
                    onChange={(e) => setIntegrationName(e.target.value)}
                    placeholder={`My ${selectedPlatform.name}`}
                    className="w-full px-3 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm"
                    autoFocus
                  />
                </div>
                {selectedPlatform.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type={field.type}
                      value={formValues[field.key] || ""}
                      onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                {connectError && (
                  <div className="w-full mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                    <div className="font-medium mb-1">Connection failed</div>
                    <div className="text-red-400/80">{connectError}</div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={createIntegration}
                  disabled={creating || !integrationName.trim() || selectedPlatform.fields.some(f => f.required && !formValues[f.key]?.trim())}
                  className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg disabled:opacity-50 text-sm font-medium"
                >
                  {creating ? "Testing connection..." : "Connect"}
                </button>
                <button
                  onClick={() => { setSelectedPlatform(null); setFormValues({}); setIntegrationName(""); setConnectError(null); }}
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Browse Platforms */}
        <h2 className="text-lg font-semibold text-white mb-4">Add New Integration</h2>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search platforms..."
              className="w-full pl-10 pr-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${!categoryFilter ? 'bg-accent-primary text-white' : 'bg-dark-tertiary text-gray-400 hover:text-white'}`}
            >
              All
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? "" : cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${categoryFilter === cat ? 'bg-accent-primary text-white' : 'bg-dark-tertiary text-gray-400 hover:text-white'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredPlatforms.map((platform) => {
            const isConnected = integrations.some(i => i.platform === platform.id);
            return (
              <button
                key={platform.id}
                onClick={() => { setSelectedPlatform(platform); setIntegrationName(`My ${platform.name}`); }}
                className="glass rounded-xl p-4 text-left hover:border-accent-primary/50 border border-dark-border transition group"
              >
                <div className={`w-10 h-10 ${platform.color} rounded-lg flex items-center justify-center text-lg mb-3 group-hover:scale-110 transition`}>
                  {platform.icon}
                </div>
                <div className="font-medium text-white text-sm">{platform.name}</div>
                <div className="text-xs text-gray-500 mt-1">{platform.category}</div>
                {isConnected && (
                  <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Connected
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
