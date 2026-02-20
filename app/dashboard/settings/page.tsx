"use client";

import { useState, useEffect } from "react";
import { Slack, Mail, Webhook, Save, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-auth";

type Integration = {
  id: string;
  type: 'slack' | 'webhook' | 'email';
  config: any;
  enabled: boolean;
};

export default function SettingsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [showSlackForm, setShowSlackForm] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const user = await getCurrentUser();
    if (user) {
      setWorkspaceId(user.id);
      
      const { data } = await supabase
        .from('integrations')
        .select('*')
        .eq('workspace_id', user.id);
      
      if (data) {
        setIntegrations(data);
      }
    }
  }

  async function saveSlackIntegration() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('integrations')
        .insert({
          workspace_id: workspaceId,
          type: 'slack',
          config: { webhook_url: slackWebhook },
          enabled: true,
        });

      if (!error) {
        setSlackWebhook("");
        setShowSlackForm(false);
        loadSettings();
      }
    } catch (err) {
      console.error('Error saving Slack integration:', err);
    }
    setSaving(false);
  }

  async function saveWebhookIntegration() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('integrations')
        .insert({
          workspace_id: workspaceId,
          type: 'webhook',
          config: { url: webhookUrl },
          enabled: true,
        });

      if (!error) {
        setWebhookUrl("");
        setShowWebhookForm(false);
        loadSettings();
      }
    } catch (err) {
      console.error('Error saving webhook integration:', err);
    }
    setSaving(false);
  }

  async function toggleIntegration(id: string, enabled: boolean) {
    await supabase
      .from('integrations')
      .update({ enabled: !enabled })
      .eq('id', id);
    
    loadSettings();
  }

  async function deleteIntegration(id: string) {
    await supabase
      .from('integrations')
      .delete()
      .eq('id', id);
    
    loadSettings();
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Integrations & Settings</h1>

        {/* Slack Integration */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Slack className="w-8 h-8 text-purple-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Slack Notifications</h2>
                  <p className="text-sm text-gray-600">Get real-time alerts when visitors arrive</p>
                </div>
              </div>
              <button
                onClick={() => setShowSlackForm(!showSlackForm)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Slack
              </button>
            </div>
          </div>

          {showSlackForm && (
            <div className="p-6 bg-gray-50">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Slack Webhook URL
              </label>
              <input
                type="url"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-4 py-2 border rounded-lg mb-4 text-gray-900"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveSlackIntegration}
                  disabled={saving || !slackWebhook}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowSlackForm(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-4">
                <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                  Learn how to create a Slack webhook
                </a>
              </p>
            </div>
          )}

          {integrations.filter(i => i.type === 'slack').map((integration) => (
            <div key={integration.id} className="p-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={integration.enabled}
                  onChange={() => toggleIntegration(integration.id, integration.enabled)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-900">
                  {integration.config.webhook_url?.substring(0, 50)}...
                </span>
              </div>
              <button
                onClick={() => deleteIntegration(integration.id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Webhook Integration */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Webhook className="w-8 h-8 text-purple-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Webhooks</h2>
                  <p className="text-sm text-gray-600">Send visitor data to any endpoint</p>
                </div>
              </div>
              <button
                onClick={() => setShowWebhookForm(!showWebhookForm)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Webhook
              </button>
            </div>
          </div>

          {showWebhookForm && (
            <div className="p-6 bg-gray-50">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-domain.com/webhook"
                className="w-full px-4 py-2 border rounded-lg mb-4 text-gray-900"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveWebhookIntegration}
                  disabled={saving || !webhookUrl}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowWebhookForm(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {integrations.filter(i => i.type === 'webhook').map((integration) => (
            <div key={integration.id} className="p-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={integration.enabled}
                  onChange={() => toggleIntegration(integration.id, integration.enabled)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-900">{integration.config.url}</span>
              </div>
              <button
                onClick={() => deleteIntegration(integration.id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Email Notifications */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <Mail className="w-8 h-8 text-purple-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Email Notifications</h2>
                <p className="text-sm text-gray-600">Daily summary emails (Coming soon)</p>
              </div>
            </div>
          </div>
          <div className="p-6 bg-gray-50">
            <p className="text-sm text-gray-600">Email notifications will be available in the next update.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
