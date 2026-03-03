"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Upload,
  FileText,
  Mail,
} from "lucide-react";

const API_BASE = "/api/reactivate";
const RULE_TYPES = ["url_contains", "url_regex", "event_type", "has_email"] as const;

type RtSegment = {
  id: string;
  name: string;
  priority: number;
  isSuppression: boolean;
  enabled: boolean;
  rules: { id: string; ruleType: string; ruleValue: string }[];
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
  subjectText: string;
  copyPrompt: string | null;
  enabled: boolean;
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
  const [segments, setSegments] = useState<RtSegment[]>([]);
  const [knowledgeBanks, setKnowledgeBanks] = useState<KnowledgeBank[]>([]);
  const [campaigns, setCampaigns] = useState<SegmentCampaign[]>([]);
  const [webhookId, setWebhookId] = useState<string>("");
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showSegmentForm, setShowSegmentForm] = useState(false);
  const [editingSegment, setEditingSegment] = useState<RtSegment | null>(null);
  const [segmentName, setSegmentName] = useState("");
  const [segmentPriority, setSegmentPriority] = useState(999);
  const [segmentSuppression, setSegmentSuppression] = useState(false);

  const [showKbForm, setShowKbForm] = useState(false);
  const [kbName, setKbName] = useState("");
  const [kbDescription, setKbDescription] = useState("");
  const [selectedKbId, setSelectedKbId] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [previewQuery, setPreviewQuery] = useState("");
  const [previewResult, setPreviewResult] = useState<{
    copy?: string;
    html?: string;
    chunksUsed?: number;
    retrievalHint?: string;
  } | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailSent, setTestEmailSent] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string>("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const opts = { credentials: "include" as RequestCredentials };
      const [meRes, segmentsRes, kbRes, campaignsRes] = await Promise.all([
        fetch(API_BASE + "/me", opts),
        fetch(API_BASE + "/segments", opts),
        fetch(API_BASE + "/knowledge-banks", opts),
        fetch(API_BASE + "/segment-campaigns", opts),
      ]);

      if (!meRes.ok) {
        setError(meRes.status === 401 ? "Session expired. Please log in again." : "Failed to load.");
        setLoading(false);
        return;
      }

      const me = await meRes.json();
      if (me.webhooks?.[0]?.id) setWebhookId(me.webhooks[0].id);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
    setLoading(false);
  }

  async function saveSegment() {
    if (!segmentName.trim()) return;
    setError(null);
    try {
      if (editingSegment) {
        await fetchApi(`/segments/${editingSegment.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: segmentName.trim(),
            priority: segmentPriority,
            is_suppression: segmentSuppression,
          }),
        });
      } else {
        await fetchApi("/segments", {
          method: "POST",
          body: JSON.stringify({
            name: segmentName.trim(),
            priority: segmentPriority,
            is_suppression: segmentSuppression,
          }),
        });
      }
      setShowSegmentForm(false);
      setEditingSegment(null);
      setSegmentName("");
      setSegmentPriority(999);
      setSegmentSuppression(false);
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save segment");
    }
  }

  async function deleteSegment(id: string) {
    if (!confirm("Delete this segment?")) return;
    try {
      await fetchApi(`/segments/${id}`, { method: "DELETE" });
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  async function addRule(segmentId: string, ruleType: string, ruleValue: string) {
    try {
      await fetchApi(`/segments/${segmentId}/rules`, {
        method: "POST",
        body: JSON.stringify({ rule_type: ruleType, rule_value: ruleValue }),
      });
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add rule");
    }
  }

  async function createKnowledgeBank() {
    if (!kbName.trim()) return;
    setError(null);
    try {
      await fetchApi("/knowledge-banks", {
        method: "POST",
        body: JSON.stringify({ name: kbName.trim(), description: kbDescription || null }),
      });
      setShowKbForm(false);
      setKbName("");
      setKbDescription("");
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create knowledge bank");
    }
  }

  async function uploadDocument(kbId: string, file: File) {
    setUploadingDoc(kbId);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/knowledge-banks/${kbId}/documents`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setUploadingDoc("");
  }

  async function generatePreview() {
    if (!selectedKbId || !previewQuery.trim()) {
      setError("Select a knowledge base and enter a query.");
      return;
    }
    setError(null);
    setPreviewResult(null);
    try {
      const copyRes = await fetchApi("/test/copy-with-retrieval", {
        method: "POST",
        body: JSON.stringify({
          knowledge_bank_id: selectedKbId,
          query: previewQuery.trim(),
          custom_prompt: customPrompt.trim() || null,
        }),
      });
      const htmlRes = await fetchApi("/test/template-preview", {
        method: "POST",
        body: JSON.stringify({
          first_name: "there",
          personalized_content: copyRes.copy || "Sample content.",
          cta_url: "https://example.com",
          cta_label: "Back to site",
        }),
      });
      setPreviewResult({
        copy: copyRes.copy,
        html: htmlRes.html,
        chunksUsed: copyRes.chunks,
        retrievalHint: copyRes.retrieval_hint,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    }
  }

  async function sendTestEmail() {
    const email = testEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address to send the test to.");
      return;
    }
    if (!previewResult?.copy) {
      setError("Generate copy first, then send test.");
      return;
    }
    setError(null);
    setTestEmailSent(false);
    setSendingTest(true);
    try {
      await fetchApi("/test/send-test-email", {
        method: "POST",
        body: JSON.stringify({
          to: email,
          first_name: "there",
          personalized_content: previewResult.copy,
          cta_url: "https://example.com",
          cta_label: "Back to site",
        }),
      });
      setTestEmailSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error && !segments.length && !reactivateOpen) {
    return (
      <div className="p-8">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Reactivate</h1>

      {/* Segments */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Segments</h2>
        <p className="text-gray-400 text-sm mb-4">
          Create rule-based segments to target visitors for reactivation emails.
        </p>
        {!showSegmentForm ? (
          <button
            onClick={() => setShowSegmentForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-lg hover:bg-accent-primary/30 transition"
          >
            <Plus className="w-4 h-4" /> New Segment
          </button>
        ) : (
          <div className="bg-dark-secondary border border-dark-border rounded-lg p-4 space-y-3 max-w-md">
            <input
              placeholder="Segment name"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500"
            />
            <label className="flex items-center gap-2 text-gray-400">
              <input
                type="number"
                value={segmentPriority}
                onChange={(e) => setSegmentPriority(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-dark-bg border border-dark-border rounded text-white"
              />
              Priority (1 = highest)
            </label>
            <label className="flex items-center gap-2 text-gray-400">
              <input
                type="checkbox"
                checked={segmentSuppression}
                onChange={(e) => setSegmentSuppression(e.target.checked)}
              />
              Suppression (do not email)
            </label>
            <div className="flex gap-2">
              <button
                onClick={saveSegment}
                className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90"
              >
                {editingSegment ? "Update" : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowSegmentForm(false);
                  setEditingSegment(null);
                  setSegmentName("");
                }}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="mt-4 space-y-2">
          {segments.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3 bg-dark-secondary border border-dark-border rounded-lg"
            >
              <div>
                <span className="text-white font-medium">{s.name}</span>
                <span className="text-gray-500 text-sm ml-2">
                  priority {s.priority} {s.isSuppression && "(suppression)"}
                </span>
                {s.rules.length > 0 && (
                  <div className="text-gray-400 text-xs mt-1">
                    {s.rules.map((r) => `${r.ruleType}: ${r.ruleValue}`).join(", ")}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingSegment(s);
                    setSegmentName(s.name);
                    setSegmentPriority(s.priority);
                    setSegmentSuppression(s.isSuppression);
                    setShowSegmentForm(true);
                  }}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteSegment(s.id)}
                  className="p-1 text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Reactivate section */}
      <section>
        <button
          onClick={() => setReactivateOpen(!reactivateOpen)}
          className="flex items-center gap-2 text-lg font-semibold text-white hover:text-accent-primary transition"
        >
          {reactivateOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          Reactivate
        </button>
        <p className="text-gray-400 text-sm mt-1 mb-4">
          Set up knowledge bases, upload documents, and preview email copy.
        </p>

        {reactivateOpen && (
          <div className="space-y-8 pl-4 border-l-2 border-dark-border">
            {/* Webhook URL */}
            {webhookId && (
              <div>
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Webhook URL
                </h3>
                <code className="block p-3 bg-dark-bg rounded text-sm text-gray-300 break-all">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}${API_BASE}/webhooks/leads/${webhookId}`
                    : `.../webhooks/leads/${webhookId}`}
                </code>
              </div>
            )}

            {/* Knowledge Banks */}
            <div>
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Knowledge Banks
              </h3>
              {!showKbForm ? (
                <button
                  onClick={() => setShowKbForm(true)}
                  className="flex items-center gap-2 px-3 py-2 text-accent-primary hover:bg-accent-primary/10 rounded"
                >
                  <Plus className="w-4 h-4" /> Create Knowledge Base
                </button>
              ) : (
                <div className="space-y-2 mb-4">
                  <input
                    placeholder="Name"
                    value={kbName}
                    onChange={(e) => setKbName(e.target.value)}
                    className="w-full max-w-sm px-3 py-2 bg-dark-bg border border-dark-border rounded text-white"
                  />
                  <input
                    placeholder="Description (optional)"
                    value={kbDescription}
                    onChange={(e) => setKbDescription(e.target.value)}
                    className="w-full max-w-sm px-3 py-2 bg-dark-bg border border-dark-border rounded text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createKnowledgeBank}
                      className="px-3 py-2 bg-accent-primary text-white rounded"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowKbForm(false)}
                      className="px-3 py-2 text-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <div className="space-y-2 mt-2">
                {knowledgeBanks.map((kb) => (
                  <div
                    key={kb.id}
                    className="p-3 bg-dark-secondary border border-dark-border rounded flex items-center justify-between"
                  >
                    <div>
                      <span className="text-white">{kb.name}</span>
                      <span className="text-gray-500 text-sm ml-2">
                        {kb._count.documents} docs
                      </span>
                    </div>
                    <label className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-gray-400" />
                      <input
                        type="file"
                        accept=".pdf,.txt,.md"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadDocument(kb.id, f);
                          e.target.value = "";
                        }}
                      />
                      <span className="text-sm text-accent-primary cursor-pointer">
                        {uploadingDoc === kb.id ? "Uploading..." : "Upload"}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate copy & preview */}
            <div>
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Generate Copy & Preview Email
              </h3>
              <div className="space-y-3 max-w-lg">
                <select
                  value={selectedKbId}
                  onChange={(e) => setSelectedKbId(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white"
                >
                  <option value="">Choose knowledge base</option>
                  {knowledgeBanks.map((kb) => (
                    <option key={kb.id} value={kb.id}>
                      {kb.name}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Query (e.g. product benefits)"
                  value={previewQuery}
                  onChange={(e) => setPreviewQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500"
                />
                <textarea
                  placeholder="Custom prompt (optional). Use {{context}}, {{first_name}}, {{query_hint}}, {{cta_label}}"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500"
                />
                <button
                  onClick={generatePreview}
                  className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90"
                >
                  Generate & Preview
                </button>
                {previewResult && (
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>
                        Using knowledge base: <strong className="text-gray-400">{knowledgeBanks.find((kb) => kb.id === selectedKbId)?.name ?? "—"}</strong>
                      </span>
                      {typeof previewResult.chunksUsed === "number" && (
                        <span>
                          {previewResult.chunksUsed > 0
                            ? `(${previewResult.chunksUsed} chunks retrieved)`
                            : "(0 chunks — run worker & ensure docs are indexed)"}
                        </span>
                      )}
                    </div>
                    {previewResult.retrievalHint && (
                      <p className="text-xs text-amber-500/90">{previewResult.retrievalHint}</p>
                    )}
                    {previewResult.copy && (
                      <div className="p-3 bg-dark-bg rounded">
                        <p className="text-xs text-gray-500 mb-1">Generated copy</p>
                        <p className="text-gray-300 text-sm">{previewResult.copy}</p>
                      </div>
                    )}
                    {previewResult.html && (
                      <div className="p-3 bg-white rounded">
                        <p className="text-xs text-gray-600 mb-1">Email preview</p>
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: previewResult.html }}
                        />
                      </div>
                    )}
                    {previewResult.copy && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dark-border">
                        <input
                          type="email"
                          placeholder="Send test to email"
                          value={testEmail}
                          onChange={(e) => {
                            setTestEmail(e.target.value);
                            setTestEmailSent(false);
                          }}
                          className="flex-1 min-w-[180px] px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={sendTestEmail}
                          disabled={sendingTest || !testEmail.trim()}
                          className="px-4 py-2 bg-dark-secondary border border-dark-border text-white rounded hover:bg-dark-bg disabled:opacity-50 text-sm"
                        >
                          {sendingTest ? "Sending…" : "Send test email"}
                        </button>
                        {testEmailSent && (
                          <span className="text-xs text-green-500">Sent.</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {campaigns.length > 0 && (
              <div>
                <h3 className="text-white font-medium mb-2">Campaigns</h3>
                <div className="space-y-2">
                  {campaigns.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-dark-secondary border border-dark-border rounded"
                    >
                      <span className="text-white">{c.segment.name}</span>
                      <span className="text-gray-500 mx-2">→</span>
                      <span className="text-gray-400">{c.knowledgeBank.name}</span>
                      <span className="text-gray-500 text-sm ml-2">
                        {c.enabled ? "enabled" : "disabled"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
