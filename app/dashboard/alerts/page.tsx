"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Bell, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-auth";

type AlertRule = {
  id: string;
  name: string;
  conditions: any;
  actions: any;
  enabled: boolean;
  created_at: string;
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null);
  const [name, setName] = useState("");
  const [conditionType, setConditionType] = useState("visitor_identified");
  const [conditionValue, setConditionValue] = useState("");
  const [actionType, setActionType] = useState("slack");
  const [actionSlackUrl, setActionSlackUrl] = useState("");
  const [actionEmail, setActionEmail] = useState("");
  const [actionWebhookUrl, setActionWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    const user = await getCurrentUser();
    if (user) {
      // Get actual workspace_id from user_workspaces
      const { data: uw } = await supabase
        .from('user_workspaces')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      const wsId = uw?.workspace_id || user.id;
      setWorkspaceId(wsId);

      const { data } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: false });
      
      if (data) {
        setAlerts(data);
      }
    }
  }

  async function saveAlert() {
    if (!name.trim()) return;
    
    setSaving(true);
    try {
      const conditions = {
        type: conditionType,
        value: conditionValue,
      };

      const actions = {
        type: actionType,
        ...(actionType === "slack" ? { slack_webhook_url: actionSlackUrl } : {}),
        ...(actionType === "email" ? { email_to: actionEmail } : {}),
        ...(actionType === "webhook" ? { webhook_url: actionWebhookUrl } : {}),
      };

      if (editingAlert) {
        await supabase
          .from('alert_rules')
          .update({ name, conditions, actions })
          .eq('id', editingAlert.id);
      } else {
        await supabase
          .from('alert_rules')
          .insert({
            workspace_id: workspaceId,
            name,
            conditions,
            actions,
            enabled: true,
          });
      }

      resetForm();
      loadAlerts();
    } catch (error) {
      console.error('Error saving alert:', error);
    }
    setSaving(false);
  }

  async function toggleAlert(id: string, enabled: boolean) {
    await supabase
      .from('alert_rules')
      .update({ enabled: !enabled })
      .eq('id', id);
    
    loadAlerts();
  }

  async function deleteAlert(id: string) {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;
    
    await supabase
      .from('alert_rules')
      .delete()
      .eq('id', id);
    
    loadAlerts();
  }

  function editAlert(alert: AlertRule) {
    setEditingAlert(alert);
    setName(alert.name);
    setConditionType(alert.conditions?.type || "visitor_identified");
    setConditionValue(alert.conditions?.value || "");
    setActionType(alert.actions?.type || "slack");
    setActionSlackUrl(alert.actions?.slack_webhook_url || "");
    setActionEmail(alert.actions?.email_to || "");
    setActionWebhookUrl(alert.actions?.webhook_url || "");
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditingAlert(null);
    setName("");
    setConditionType("visitor_identified");
    setConditionValue("");
    setActionType("slack");
    setActionSlackUrl("");
    setActionEmail("");
    setActionWebhookUrl("");
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Alert Rules</h1>
            <p className="text-gray-400">Get notified when specific conditions are met</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-purple hover:shadow-lg hover:shadow-accent-primary/30 text-white rounded-lg transition-all font-medium"
          >
            <Plus className="w-4 h-4" />
            New Alert
          </button>
        </div>

        {showForm && (
          <div className="glass neon-border rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingAlert ? 'Edit Alert Rule' : 'Create New Alert Rule'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Alert Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., High-Value Visitor Alert"
                  className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  When this happens...
                </label>
                <select
                  value={conditionType}
                  onChange={(e) => setConditionType(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-primary focus:outline-none transition"
                >
                  <option value="visitor_identified">Visitor is identified</option>
                  <option value="visitor_arrived">New visitor arrives</option>
                  <option value="page_views_threshold">Page views exceed threshold</option>
                  <option value="company_match">Company matches</option>
                  <option value="location_match">Location matches</option>
                  <option value="utm_source_match">UTM source matches</option>
                  <option value="lead_score_threshold">Lead score exceeds threshold</option>
                </select>
              </div>

              {(conditionType === 'page_views_threshold' || conditionType === 'lead_score_threshold') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Threshold Value
                  </label>
                  <input
                    type="number"
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    placeholder="e.g., 5"
                    className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none transition"
                  />
                </div>
              )}

              {(conditionType === 'company_match' || conditionType === 'location_match' || conditionType === 'utm_source_match') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Match Value
                  </label>
                  <input
                    type="text"
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    placeholder={`Enter ${conditionType.replace('_match', '')}...`}
                    className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Then do this...
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-primary focus:outline-none transition"
                >
                  <option value="slack">Send Slack notification</option>
                  <option value="email">Send email</option>
                  <option value="webhook">Call webhook</option>
                </select>
              </div>

              {/* Action configuration */}
              {actionType === "slack" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Slack Webhook URL
                  </label>
                  <input
                    type="url"
                    value={actionSlackUrl}
                    onChange={(e) => setActionSlackUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/T.../B.../..."
                    className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Create an incoming webhook in your Slack workspace at{" "}
                    <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
                      api.slack.com/messaging/webhooks
                    </a>
                  </p>
                </div>
              )}

              {actionType === "email" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={actionEmail}
                    onChange={(e) => setActionEmail(e.target.value)}
                    placeholder="alerts@yourcompany.com"
                    className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Alert details will be sent to this email when the condition is triggered.
                  </p>
                </div>
              )}

              {actionType === "webhook" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={actionWebhookUrl}
                    onChange={(e) => setActionWebhookUrl(e.target.value)}
                    placeholder="https://your-api.com/alerts/webhook"
                    className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    A POST request with alert details (JSON) will be sent to this URL when triggered.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={saveAlert}
                  disabled={saving || !name.trim()}
                  className="px-4 py-2 bg-gradient-purple hover:shadow-lg hover:shadow-accent-primary/30 disabled:opacity-50 text-white rounded-lg transition-all font-medium"
                >
                  {saving ? 'Saving...' : editingAlert ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-dark-tertiary hover:bg-dark-border text-gray-300 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="glass neon-border rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-2 bg-accent-primary/20 rounded-lg">
                    <Bell className="w-5 h-5 text-accent-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white">{alert.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        alert.enabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {alert.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>When: {alert.conditions?.type?.replace(/_/g, ' ')}</span>
                        {alert.conditions?.value && <span className="font-medium text-gray-300">({alert.conditions.value})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="ml-6">Then: Send {alert.actions?.type} notification</span>
                        {alert.actions?.slack_webhook_url && (
                          <span className="text-gray-500 text-xs truncate max-w-[200px]" title={alert.actions.slack_webhook_url}>
                            → {alert.actions.slack_webhook_url.replace('https://hooks.slack.com/services/', 'hooks.slack.com/...')}
                          </span>
                        )}
                        {alert.actions?.email_to && (
                          <span className="text-gray-500 text-xs">→ {alert.actions.email_to}</span>
                        )}
                        {alert.actions?.webhook_url && (
                          <span className="text-gray-500 text-xs truncate max-w-[200px]" title={alert.actions.webhook_url}>
                            → {alert.actions.webhook_url}
                          </span>
                        )}
                        {!alert.actions?.slack_webhook_url && !alert.actions?.email_to && !alert.actions?.webhook_url && (
                          <span className="text-yellow-400 text-xs">⚠ Not configured</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAlert(alert.id, alert.enabled)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      alert.enabled 
                        ? 'bg-dark-tertiary hover:bg-dark-border text-gray-300' 
                        : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                    }`}
                  >
                    {alert.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => editAlert(alert)}
                    className="p-2 text-gray-400 hover:text-accent-primary transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {alerts.length === 0 && !showForm && (
            <div className="text-center py-12 glass neon-border rounded-xl">
              <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No alert rules yet</h3>
              <p className="text-gray-400 mb-4">Create your first alert to get notified about important events</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-purple hover:shadow-lg hover:shadow-accent-primary/30 text-white rounded-lg transition-all font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Alert
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
