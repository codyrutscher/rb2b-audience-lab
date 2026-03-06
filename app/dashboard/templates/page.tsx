"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, BookOpen, Upload, FileText, Mail } from "lucide-react";

const API_BASE = "/api/reactivate";

type KnowledgeBank = {
  id: string;
  name: string;
  description: string | null;
  _count: { documents: number };
};

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

export default function TemplatesPage() {
  const [knowledgeBanks, setKnowledgeBanks] = useState<KnowledgeBank[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showKbForm, setShowKbForm] = useState(false);
  const [kbName, setKbName] = useState("");
  const [kbDescription, setKbDescription] = useState("");
  const [selectedKbId, setSelectedKbId] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [subjectTemplate, setSubjectTemplate] = useState("We have something for you");
  const [previewQuery, setPreviewQuery] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [previewingTemplateId, setPreviewingTemplateId] = useState<string | null>(null);
  const [templatePreviewResult, setTemplatePreviewResult] = useState<{
    copy?: string;
    html?: string;
    subject?: string;
  } | null>(null);
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
      const [kbRes, templatesRes] = await Promise.all([
        fetch(`${API_BASE}/knowledge-banks`, { credentials: "include" }),
        fetch(`${API_BASE}/email-templates`, { credentials: "include" }),
      ]);
      if (kbRes.ok) {
        const d = await kbRes.json();
        setKnowledgeBanks(d.knowledge_banks || []);
      }
      if (templatesRes.ok) {
        const d = await templatesRes.json();
        setEmailTemplates(d.templates || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
    setLoading(false);
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
          subject: subjectTemplate.trim() || "We have something for you",
        }),
      });
      setTestEmailSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  }

  async function saveAsTemplate() {
    const name = templateName.trim();
    if (!name) {
      setError("Enter a template name.");
      return;
    }
    if (!selectedKbId || !previewQuery.trim()) {
      setError("Select a knowledge base and enter a query first.");
      return;
    }
    setError(null);
    setSavingTemplate(true);
    try {
      await fetchApi("/email-templates", {
        method: "POST",
        body: JSON.stringify({
          name,
          knowledge_bank_id: selectedKbId,
          copy_prompt: customPrompt.trim() || null,
          subject_template: subjectTemplate.trim() || "We have something for you",
          template_id: "minimal_recovery",
          query_hint: previewQuery.trim(),
          cta_url: "https://example.com",
          cta_label: "Back to site",
        }),
      });
      setTemplateName("");
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function previewEmailTemplate(t: EmailTemplate) {
    setError(null);
    setPreviewingTemplateId(t.id);
    setTemplatePreviewResult(null);
    try {
      const res = await fetchApi(`/email-templates/${t.id}/preview`, {
        method: "POST",
        body: JSON.stringify({ query: t.queryHint || "benefits" }),
      });
      setTemplatePreviewResult({
        copy: res.copy,
        html: res.html,
        subject: res.subject,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setPreviewingTemplateId(null);
    }
  }

  async function deleteEmailTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      await fetchApi(`/email-templates/${id}`, { method: "DELETE" });
      setTemplatePreviewResult(null);
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  function loadTemplateIntoForm(t: EmailTemplate) {
    setSelectedKbId(t.knowledgeBankId);
    setCustomPrompt(t.copyPrompt || "");
    setSubjectTemplate(t.subjectTemplate || "We have something for you");
    setPreviewQuery(t.queryHint || "");
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Templates</h1>
          <p className="text-gray-400">
            Manage knowledge bases, generate email copy with AI, and save reusable email templates. Then create a campaign in Reactivate to link a template to a segment and start sending.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Knowledge Banks */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> Knowledge Banks
          </h2>
          {!showKbForm ? (
            <button
              onClick={() => setShowKbForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-lg hover:bg-accent-primary/30 transition"
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
                <button onClick={createKnowledgeBank} className="px-3 py-2 bg-accent-primary text-white rounded hover:opacity-90">
                  Create
                </button>
                <button onClick={() => setShowKbForm(false)} className="px-3 py-2 text-gray-400 hover:text-white">
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="space-y-2 mt-4">
            {knowledgeBanks.map((kb) => (
              <div key={kb.id} className="p-3 bg-dark-secondary border border-dark-border rounded flex items-center justify-between">
                <div>
                  <span className="text-white">{kb.name}</span>
                  <span className="text-gray-500 text-sm ml-2">{kb._count.documents} docs</span>
                </div>
                <label className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.markdown"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadDocument(kb.id, f);
                      e.target.value = "";
                    }}
                  />
                  <span className="text-sm text-accent-primary cursor-pointer">
                    {uploadingDoc === kb.id ? "Uploading…" : "Upload"}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* Generate Copy & Preview */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" /> Generate Copy & Preview Email
          </h2>
          <div className="space-y-3 max-w-lg">
            <select
              value={selectedKbId}
              onChange={(e) => setSelectedKbId(e.target.value)}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white"
            >
              <option value="">Choose knowledge base</option>
              {knowledgeBanks.map((kb) => (
                <option key={kb.id} value={kb.id}>{kb.name}</option>
              ))}
            </select>
            <input
              placeholder="Query (e.g. product benefits)"
              value={previewQuery}
              onChange={(e) => setPreviewQuery(e.target.value)}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500"
            />
            <input
              placeholder="Subject line"
              value={subjectTemplate}
              onChange={(e) => setSubjectTemplate(e.target.value)}
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
                    <div className="prose prose-sm max-w-none text-gray-900 [&_*]:text-gray-900 [&_*]:bg-transparent" dangerouslySetInnerHTML={{ __html: previewResult.html }} />
                  </div>
                )}
                {previewResult.copy && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dark-border">
                    <input
                      placeholder="Template name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="flex-1 min-w-[140px] px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500 text-sm"
                    />
                    <button
                      onClick={saveAsTemplate}
                      disabled={savingTemplate || !templateName.trim()}
                      className="px-4 py-2 bg-accent-primary/20 text-accent-primary rounded hover:opacity-90 disabled:opacity-50 text-sm"
                    >
                      {savingTemplate ? "Saving…" : "Save as template"}
                    </button>
                    <input
                      type="email"
                      placeholder="Send test to email"
                      value={testEmail}
                      onChange={(e) => { setTestEmail(e.target.value); setTestEmailSent(false); }}
                      className="flex-1 min-w-[180px] px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500 text-sm"
                    />
                    <button
                      onClick={sendTestEmail}
                      disabled={sendingTest || !testEmail.trim()}
                      className="px-4 py-2 bg-dark-secondary border border-dark-border text-white rounded hover:bg-dark-bg disabled:opacity-50 text-sm"
                    >
                      {sendingTest ? "Sending…" : "Send test email"}
                    </button>
                    {testEmailSent && <span className="text-xs text-green-500">Sent.</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Email Templates */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <Mail className="w-5 h-5" /> Email Templates
          </h2>
          <p className="text-gray-400 text-sm mb-3">
            Save and reuse email templates. Use Edit to load a template into the builder above.
          </p>
          <div className="mb-4 p-4 bg-accent-primary/10 border border-accent-primary/20 rounded-lg">
            <p className="text-white font-medium mb-1">Ready to send?</p>
            <p className="text-gray-300 text-sm mb-2">
              Create a <strong>Campaign</strong> in Campaigns: link a segment to this template. When pixel data flows in and contacts match that segment, the worker will automatically send the email (24h cooldown per contact).
            </p>
            <a href="/dashboard/reactivate" className="text-accent-primary hover:underline text-sm font-medium">
              Go to Campaigns → Create campaign
            </a>
          </div>
          <div className="space-y-2">
            {emailTemplates.map((t) => (
              <div
                key={t.id}
                className="p-3 bg-dark-secondary border border-dark-border rounded flex items-center justify-between flex-wrap gap-2"
              >
                <div>
                  <span className="text-white font-medium">{t.name}</span>
                  <span className="text-gray-500 text-sm ml-2">{t.knowledgeBank.name}</span>
                  <span className="text-gray-500 text-sm ml-2">· {t.subjectTemplate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => previewEmailTemplate(t)}
                    disabled={previewingTemplateId === t.id}
                    className="px-3 py-1.5 bg-dark-bg border border-dark-border rounded text-sm text-gray-300 hover:border-gray-500 disabled:opacity-50"
                  >
                    {previewingTemplateId === t.id ? "Generating…" : "Preview"}
                  </button>
                  <button
                    onClick={() => loadTemplateIntoForm(t)}
                    className="px-3 py-1.5 bg-accent-primary/20 text-accent-primary rounded text-sm hover:bg-accent-primary/30"
                  >
                    Edit
                  </button>
                  <button onClick={() => deleteEmailTemplate(t.id)} className="p-1.5 text-gray-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {templatePreviewResult && (
              <div className="mt-4 p-4 bg-dark-bg border border-dark-border rounded space-y-2">
                <p className="text-xs text-gray-500">Preview: {templatePreviewResult.subject}</p>
                {templatePreviewResult.copy && (
                  <div className="p-2 bg-dark-secondary rounded text-sm text-gray-300">{templatePreviewResult.copy}</div>
                )}
                {templatePreviewResult.html && (
                  <div className="p-3 bg-white rounded max-h-64 overflow-auto prose prose-sm max-w-none text-gray-900 [&_*]:text-gray-900 [&_*]:bg-transparent" dangerouslySetInnerHTML={{ __html: templatePreviewResult.html }} />
                )}
              </div>
            )}
            {emailTemplates.length === 0 && (
              <p className="text-gray-500 text-sm">No templates yet. Generate copy above and use &quot;Save as template&quot;.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
