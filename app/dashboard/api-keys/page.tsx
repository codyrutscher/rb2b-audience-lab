"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, Key, Copy, Check, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  last_used_at?: string;
  created_at: string;
};

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>(["read"]);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => { loadApiKeys(); }, []);

  async function loadApiKeys() {
    try {
      const res = await fetch("/api/reactivate/api-keys", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setApiKeys(data.keys || []);
        setCreateError(null);
      } else {
        // Show debug info if available
        const debugInfo = data.debug ? `\n\nDebug: ${JSON.stringify(data.debug, null, 2)}` : "";
        setCreateError(`${data.error}${debugInfo}`);
      }
    } catch (e: any) {
      setCreateError("Failed to load API keys: " + (e.message || "unknown error"));
    }
  }

  async function createApiKey() {
    if (!name.trim() || permissions.length === 0) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/reactivate/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), permissions }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewKey(data.key);
        setName("");
        setPermissions(["read"]);
        loadApiKeys();
      } else {
        setCreateError(data.error || "Failed to create API key");
      }
    } catch (err: any) {
      setCreateError(err.message || "Unexpected error");
    }
    setCreating(false);
  }

  async function deleteApiKey(id: string) {
    if (!confirm("Delete this API key? This cannot be undone.")) return;
    await fetch(`/api/reactivate/api-keys?id=${id}`, { method: "DELETE", credentials: "include" });
    loadApiKeys();
  }

  function togglePermission(permission: string) {
    setPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">API Keys</h1>
            <p className="text-gray-400">Manage API keys for programmatic access to your visitor data</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setCreateError(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-purple hover:shadow-lg hover:shadow-accent-primary/30 text-white rounded-lg transition-all font-medium"
          >
            <Plus className="w-4 h-4" /> Create API Key
          </button>
        </div>

        {/* Debug/Error Banner */}
        {createError && !showForm && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <pre className="text-sm text-red-400 whitespace-pre-wrap break-all">{createError}</pre>
          </div>
        )}

        {/* New Key Modal */}
        {newKey && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="glass neon-border rounded-xl p-6 w-full max-w-lg">
              <h2 className="text-xl font-semibold text-white mb-4">API Key Created</h2>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
                <p className="text-sm text-yellow-400">⚠️ Copy your API key now — you won&apos;t be able to see it again.</p>
              </div>
              <div className="p-4 bg-dark-tertiary rounded-lg mb-6 flex items-center justify-between gap-4">
                <code className="text-sm text-green-400 break-all">{newKey}</code>
                <button onClick={() => copyToClipboard(newKey)} className="flex-shrink-0 p-2 text-gray-400 hover:text-white transition">
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <button onClick={() => { setNewKey(null); setShowForm(false); }} className="w-full px-4 py-2 bg-gradient-purple text-white rounded-lg font-medium">Done</button>
            </div>
          </div>
        )}

        {/* Create Form */}
        {showForm && !newKey && (
          <div className="glass neon-border rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Create New API Key</h2>
            {createError && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-400">{createError}</div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Key Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Production API Key" autoFocus
                  className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Permissions</label>
                <div className="space-y-2">
                  {[
                    { key: "read", label: "Read", desc: "View visitors and analytics" },
                    { key: "write", label: "Write", desc: "Track events and identify visitors" },
                    { key: "delete", label: "Delete", desc: "Remove visitor data" },
                  ].map(({ key, label, desc }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={permissions.includes(key)} onChange={() => togglePermission(key)} className="w-4 h-4 accent-accent-primary" />
                      <span className="text-sm text-gray-300 group-hover:text-white transition">
                        <span className="font-medium">{label}</span><span className="text-gray-500"> — {desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={createApiKey} disabled={creating || !name.trim() || permissions.length === 0}
                  className="px-4 py-2 bg-gradient-purple hover:shadow-lg hover:shadow-accent-primary/30 disabled:opacity-50 text-white rounded-lg transition-all font-medium">
                  {creating ? "Creating..." : "Create Key"}
                </button>
                <button onClick={() => { setShowForm(false); setCreateError(null); }}
                  className="px-4 py-2 bg-dark-tertiary hover:bg-dark-border text-gray-300 rounded-lg transition">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Keys List */}
        <div className="glass neon-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border">
            <h2 className="text-xl font-semibold text-white">Your API Keys</h2>
          </div>
          <div className="divide-y divide-dark-border">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-2 bg-accent-primary/20 rounded-lg flex-shrink-0"><Key className="w-5 h-5 text-accent-primary" /></div>
                  <div className="min-w-0">
                    <div className="font-medium text-white">{apiKey.name}</div>
                    <div className="text-sm text-gray-400 space-y-0.5 mt-1">
                      <div className="font-mono">{apiKey.key_prefix}••••••••••••</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex gap-1">
                          {(apiKey.permissions || []).map((p: string) => (
                            <span key={p} className="px-1.5 py-0.5 bg-dark-tertiary rounded text-xs text-gray-400 capitalize">{p}</span>
                          ))}
                        </span>
                        <span className="text-gray-600">·</span>
                        <span>Created {formatDistanceToNow(new Date(apiKey.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteApiKey(apiKey.id)} className="text-gray-500 hover:text-red-400 transition flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {apiKeys.length === 0 && (
              <div className="text-center py-12">
                <Key className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No API keys yet</h3>
                <p className="text-gray-400 mb-4">Create your first API key to access the API programmatically</p>
                <button onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-purple hover:shadow-lg hover:shadow-accent-primary/30 text-white rounded-lg transition-all font-medium">
                  <Plus className="w-4 h-4" /> Create API Key
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 glass neon-border rounded-xl">
          <h3 className="font-semibold text-white mb-1">Using the API</h3>
          <p className="text-sm text-gray-400 mb-2">
            Pass your API key in the <code className="text-accent-primary">Authorization</code> header as <code className="text-accent-primary">Bearer &lt;key&gt;</code>.
          </p>
          <Link href="/docs" className="text-sm text-accent-primary hover:underline">View API Documentation →</Link>
        </div>
      </div>
    </div>
  );
}
