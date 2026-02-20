"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, Key, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-auth";
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
  const [permissions, setPermissions] = useState<string[]>(['read']);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    loadApiKeys();
  }, []);

  async function loadApiKeys() {
    const user = await getCurrentUser();
    if (user) {
      setWorkspaceId(user.id);
      
      const { data } = await supabase
        .from('api_keys')
        .select('*')
        .eq('workspace_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) {
        setApiKeys(data);
      }
    }
  }

  async function createApiKey() {
    if (!name.trim()) return;
    
    setCreating(true);
    try {
      // Generate a random API key
      const fullKey = `al_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      const keyPrefix = fullKey.substring(0, 12);

      const { error } = await supabase
        .from('api_keys')
        .insert({
          workspace_id: workspaceId,
          name,
          key_hash: fullKey, // In production, hash this!
          key_prefix: keyPrefix,
          permissions,
        });

      if (!error) {
        setNewKey(fullKey);
        setName("");
        setPermissions(['read']);
        loadApiKeys();
      }
    } catch (error) {
      console.error('Error creating API key:', error);
    }
    setCreating(false);
  }

  async function deleteApiKey(id: string) {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return;
    
    await supabase
      .from('api_keys')
      .delete()
      .eq('id', id);
    
    loadApiKeys();
  }

  function togglePermission(permission: string) {
    if (permissions.includes(permission)) {
      setPermissions(permissions.filter(p => p !== permission));
    } else {
      setPermissions([...permissions, permission]);
    }
  }

  function copyToClipboard(text: string) {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function closeNewKeyModal() {
    setNewKey(null);
    setShowForm(false);
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
            <p className="text-gray-600 mt-2">Manage API keys for programmatic access</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Create API Key
          </button>
        </div>

        {/* New Key Modal */}
        {newKey && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">API Key Created</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 mb-2">
                  ⚠️ Make sure to copy your API key now. You won&apos;t be able to see it again!
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <code className="text-sm text-gray-900 break-all">{newKey}</code>
                  <button
                    onClick={() => copyToClipboard(newKey)}
                    className="ml-4 p-2 text-purple-600 hover:bg-purple-50 rounded"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                onClick={closeNewKeyModal}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {showForm && !newKey && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New API Key</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Production API Key"
                  className="w-full px-4 py-2 border rounded-lg text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={permissions.includes('read')}
                      onChange={() => togglePermission('read')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-900">Read - View visitors and analytics</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={permissions.includes('write')}
                      onChange={() => togglePermission('write')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-900">Write - Track events and identify visitors</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={permissions.includes('delete')}
                      onChange={() => togglePermission('delete')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-900">Delete - Remove visitor data</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={createApiKey}
                  disabled={creating || !name.trim() || permissions.length === 0}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg"
                >
                  {creating ? 'Creating...' : 'Create Key'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Your API Keys</h2>
          </div>
          <div className="divide-y">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Key className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{apiKey.name}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Key: {apiKey.key_prefix}...</div>
                      <div className="flex items-center gap-2">
                        <span>Permissions: {apiKey.permissions.join(', ')}</span>
                        <span>·</span>
                        <span>Created {formatDistanceToNow(new Date(apiKey.created_at), { addSuffix: true })}</span>
                      </div>
                      {apiKey.last_used_at && (
                        <div className="text-xs">
                          Last used {formatDistanceToNow(new Date(apiKey.last_used_at), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteApiKey(apiKey.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {apiKeys.length === 0 && (
              <div className="text-center py-12">
                <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No API keys yet</h3>
                <p className="text-gray-600 mb-4">Create your first API key to access the API</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  Create API Key
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">API Documentation</h3>
          <p className="text-sm text-blue-800 mb-2">
            Use your API key to access the Audience Lab API programmatically.
          </p>
          <Link href="/docs" className="text-sm text-blue-600 hover:underline">
            View API Documentation →
          </Link>
        </div>
      </div>
    </div>
  );
}
