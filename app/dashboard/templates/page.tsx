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

type RecoveryType = "reminder" | "product_interest" | "social_proof" | "objection_handling" | "survey_qualification";

type RecipeMeta = {
  recovery_type: RecoveryType;
  description: string;
  sections: string[];
};

type ElementStyle = { fontSize?: string; color?: string };
/** CTA can also set button background colour */
type CtaStyle = ElementStyle & { backgroundColor?: string };
type CustomiseStyle = {
  headline?: ElementStyle;
  subheading?: ElementStyle;
  bullet?: ElementStyle;
  cta?: CtaStyle;
};
type SlotDefaults = {
  logo_url?: string;
  cta_url?: string;
  hero_image_url?: string;
  unsubscribe_footer?: string;
  style?: CustomiseStyle;
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
  variableMappings?: Record<string, string> | null;
  recoveryType?: string | null;
  slotDefaults?: SlotDefaults | null;
  enabled: boolean;
};

type VariableMapping = { varName: string; pixelField: string };

type PresetMeta = { id: string; name: string; description: string; subject: string };

type PresetTemplate = {
  id: string;
  name: string;
  description: string;
  subject: string;
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
  const [pixelFields, setPixelFields] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<RecipeMeta[]>([]);
  const [recoveryType, setRecoveryType] = useState<RecoveryType>("product_interest");
  const [slotDefaults, setSlotDefaults] = useState<SlotDefaults>({ style: {} });
  const [variableMappings, setVariableMappings] = useState<VariableMapping[]>([]);
  const [previewVariableValues, setPreviewVariableValues] = useState<Record<string, string>>({});
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
    retrievedPreview?: string;
  } | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailSent, setTestEmailSent] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string>("");

  useEffect(() => {
    loadAll();
  }, []);
  useEffect(() => {
    fetch(`${API_BASE}/segment-fields`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.fields && setPixelFields(d.fields))
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch(`${API_BASE}/recipe-metadata`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.recipes && setRecipes(d.recipes))
      .catch(() => {});
  }, []);
  const [presets, setPresets] = useState<{ id: string; name: string; description: string; subject: string }[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>("browse_reminder");
  const [manualBody, setManualBody] = useState("");
  useEffect(() => {
    fetch(`${API_BASE}/preset-templates`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.presets && setPresets(d.presets))
      .catch(() => {});
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

  function buildExtraVariables(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const { varName, pixelField } of variableMappings) {
      if (!varName?.trim()) continue;
      out[varName.trim()] = previewVariableValues[varName] ?? "Sample";
    }
    return out;
  }
  async function generatePreview() {
    if (!selectedPresetId) {
      setError("Choose a template first.");
      return;
    }
    if (!selectedKbId || !previewQuery.trim()) {
      setError("Select a knowledge base and enter a query (e.g. product benefits), then click Generate & Preview to create copy.");
      return;
    }
    setError(null);
    setPreviewResult(null);
    try {
      let bodyContent = "";
      let chunksUsed: number | undefined;
      let retrievalHint: string | undefined;
      let retrievedPreview: string | undefined;

      let structuredHeadline: string | undefined;
      let structuredSubheading: string | undefined;
      let structuredBullets: string[] | undefined;
      let structuredCta: string | undefined;

      const extraVars = buildExtraVariables();
      const copyRes = await fetchApi("/test/copy-with-retrieval", {
        method: "POST",
        body: JSON.stringify({
          knowledge_bank_id: selectedKbId,
          query: previewQuery.trim(),
          custom_prompt: customPrompt.trim() || null,
          first_name: "there",
          extra_variables: Object.keys(extraVars).length > 0 ? extraVars : undefined,
        }),
      });
      const hasStructured = copyRes.headline != null || copyRes.subheading != null || (copyRes.bullets?.length ?? 0) > 0 || copyRes.cta != null;
      bodyContent = hasStructured
        ? (copyRes.body?.trim() ?? "We thought you might find this useful.")
        : (copyRes.body ?? copyRes.copy ?? "");
      structuredHeadline = copyRes.headline;
      structuredSubheading = copyRes.subheading;
      structuredBullets = copyRes.bullets;
      structuredCta = copyRes.cta;
      chunksUsed = copyRes.chunks;
      retrievalHint = copyRes.retrieval_hint;
      retrievedPreview = copyRes.retrieved_preview;

      if (!bodyContent || !bodyContent.trim()) {
        setError("No copy was generated. Check the browser console and server logs, and ensure HUGGINGFACE_TOKEN and COPY_GENERATION_MODEL are set in .env.");
        return;
      }

      const slotDefaultsForPreview = Object.fromEntries(
        Object.entries(slotDefaults).filter(([k, v]) => {
          if (v == null) return false;
          if (k === "style") return typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0;
          return String(v).trim() !== "";
        })
      ) as SlotDefaults;
      const extraVarsForPreview = buildExtraVariables();
      const firstNameForPreview = extraVarsForPreview.First_Name ?? extraVarsForPreview.first_name ?? "there";
      const htmlRes = await fetchApi("/test/template-preview", {
        method: "POST",
        body: JSON.stringify({
          preset_id: selectedPresetId,
          slot_defaults: Object.keys(slotDefaultsForPreview).length > 0 ? slotDefaultsForPreview : undefined,
          first_name: firstNameForPreview,
          personalized_content: bodyContent,
          cta_url: slotDefaults.cta_url || "https://example.com",
          cta_label: structuredCta ?? "Back to site",
          headline: structuredHeadline ?? subjectTemplate,
          subheading: structuredSubheading,
          bullets: structuredBullets,
          cta: structuredCta ?? "Back to site",
          style: slotDefaults.style && Object.keys(slotDefaults.style).length > 0 ? slotDefaults.style : undefined,
          unsubscribe_footer: slotDefaults.unsubscribe_footer?.trim() || undefined,
          variable_values: Object.keys(extraVarsForPreview).length > 0 ? extraVarsForPreview : undefined,
        }),
      });
      setPreviewResult({
        copy: bodyContent,
        html: htmlRes.html,
        chunksUsed,
        retrievalHint,
        retrievedPreview,
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
      const extraVars = buildExtraVariables();
      const firstNameForTest = extraVars.First_Name ?? extraVars.first_name ?? "there";
      await fetchApi("/test/send-test-email", {
        method: "POST",
        body: JSON.stringify({
          to: email,
          first_name: firstNameForTest,
          personalized_content: previewResult.copy,
          cta_url: "https://example.com",
          cta_label: "Back to site",
          subject: subjectTemplate.trim() || "We have something for you",
          variable_values: Object.keys(extraVars).length > 0 ? extraVars : undefined,
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
      const varMap: Record<string, string> = {};
      for (const { varName, pixelField } of variableMappings) {
        if (varName?.trim() && pixelField?.trim()) varMap[varName.trim()] = pixelField;
      }
      const slotDefaultsToSave: SlotDefaults = {
        ...(slotDefaults.logo_url?.trim() && { logo_url: slotDefaults.logo_url.trim() }),
        ...(slotDefaults.cta_url?.trim() && { cta_url: slotDefaults.cta_url.trim() }),
        ...(slotDefaults.hero_image_url?.trim() && { hero_image_url: slotDefaults.hero_image_url.trim() }),
        ...(slotDefaults.unsubscribe_footer?.trim() && { unsubscribe_footer: slotDefaults.unsubscribe_footer.trim() }),
        ...(slotDefaults.style && Object.keys(slotDefaults.style).length > 0 && { style: slotDefaults.style }),
      };
      const ctaUrl = slotDefaults.cta_url?.trim() || "https://example.com";
      await fetchApi("/email-templates", {
        method: "POST",
        body: JSON.stringify({
          name,
          knowledge_bank_id: selectedKbId,
          copy_prompt: customPrompt.trim() || null,
          subject_template: subjectTemplate.trim() || "We have something for you",
          template_id: "minimal_recovery",
          query_hint: previewQuery.trim(),
          cta_url: ctaUrl,
          cta_label: "Back to site",
          recovery_type: recoveryType,
          slot_defaults: Object.keys(slotDefaultsToSave).length > 0 ? slotDefaultsToSave : undefined,
          variable_mappings: Object.keys(varMap).length > 0 ? varMap : undefined,
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
    const valid: RecoveryType[] = ["reminder", "product_interest", "social_proof", "objection_handling", "survey_qualification"];
    if (t.recoveryType && valid.includes(t.recoveryType as RecoveryType)) {
      setRecoveryType(t.recoveryType as RecoveryType);
    } else {
      setRecoveryType("product_interest");
    }
    const sd = t.slotDefaults as SlotDefaults | null;
    if (sd && typeof sd === "object") {
      setSlotDefaults({
        logo_url: sd.logo_url ?? "",
        cta_url: sd.cta_url ?? t.ctaUrl ?? "",
        hero_image_url: sd.hero_image_url ?? "",
        unsubscribe_footer: sd.unsubscribe_footer ?? "",
        style: sd.style ?? {},
      });
    } else {
      setSlotDefaults({
        logo_url: "",
        cta_url: t.ctaUrl ?? "",
        hero_image_url: "",
        unsubscribe_footer: "",
        style: {},
      });
    }
    const vm = t.variableMappings;
    if (vm && typeof vm === "object") {
      setVariableMappings(
        Object.entries(vm).map(([varName, pixelField]) => ({ varName, pixelField }))
      );
    } else {
      setVariableMappings([]);
    }
  }
  function addVariableMapping() {
    setVariableMappings((prev) => [...prev, { varName: "", pixelField: pixelFields[0] || "" }]);
  }
  function updateVariableMapping(index: number, field: "varName" | "pixelField", value: string) {
    setVariableMappings((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }
  function removeVariableMapping(index: number) {
    setVariableMappings((prev) => prev.filter((_, i) => i !== index));
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

          {/* Choose a preset template */}
          <div className="mb-6 p-4 bg-dark-secondary border border-dark-border rounded-lg">
            <h3 className="text-white font-medium mb-2">Choose a template</h3>
            <p className="text-gray-400 text-sm mb-3">
              Pick a high-converting template, then add your message (or generate with AI from your knowledge base).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "browse_reminder", name: "Browse Reminder", description: "Gentle nudge for visitors who left without converting.", subject: "You left something behind" },
                { id: "product_interest", name: "Product Interest", description: "For visitors who viewed products or features.", subject: "Still thinking it over?" },
                { id: "reengagement", name: "Re-engagement", description: "Win back inactive users.", subject: "We miss you" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setSelectedPresetId(p.id); setSubjectTemplate(p.subject); }}
                  className={`flex flex-col rounded-lg border text-left transition overflow-hidden ${selectedPresetId === p.id ? "border-accent-primary bg-accent-primary/10 ring-1 ring-accent-primary" : "border-dark-border hover:border-gray-500"}`}
                >
                  <div className="w-full h-32 bg-white overflow-hidden relative shrink-0">
                    <iframe
                      src={`${API_BASE}/preset-templates/${p.id}/preview`}
                      title={`${p.name} preview`}
                      className="absolute top-0 left-0 w-[600px] h-[400px] origin-top-left pointer-events-none"
                      style={{ transform: "scale(0.27)" }}
                    />
                  </div>
                  <div className="p-3">
                    <span className="text-white font-medium block">{p.name}</span>
                    <span className="text-gray-400 text-sm line-clamp-2">{p.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Customise: style/format only (font size & colour) */}
          <div className="mb-6 p-4 bg-dark-secondary border border-dark-border rounded-lg">
            <h3 className="text-white font-medium mb-2">Customise</h3>
            <p className="text-gray-400 text-sm mb-3">
              Set font size and colour for Headline, Sub-heading, Bullet point, and Call to Action. Content for these comes from your prompt using {`{{Headline}}`}, {`{{Sub_Heading}}`}, {`{{Bullet_Point}}`}, {`{{CTA}}`}.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              {(["headline", "subheading", "bullet", "cta"] as const).map((key) => (
                <div key={key} className={key === "cta" ? "sm:col-span-2 flex flex-wrap gap-2 items-end" : "flex flex-wrap gap-2 items-end"}>
                  <div className="flex-1 min-w-[80px]">
                    <label className="text-gray-400 text-xs block mb-1">
                      {key === "headline" ? "Headline" : key === "subheading" ? "Sub-heading" : key === "bullet" ? "Bullet point" : "CTA"} font size
                    </label>
                    <input
                      placeholder="e.g. 24px"
                      value={slotDefaults.style?.[key]?.fontSize ?? ""}
                      onChange={(e) =>
                        setSlotDefaults((p) => ({
                          ...p,
                          style: {
                            ...p.style,
                            [key]: { ...p.style?.[key], fontSize: e.target.value },
                          },
                        }))
                      }
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500 text-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-[80px]">
                    <label className="text-gray-400 text-xs block mb-1">
                      {key === "cta" ? "CTA text colour" : "Colour"}
                    </label>
                    <input
                      placeholder="e.g. #3730a3"
                      value={slotDefaults.style?.[key]?.color ?? ""}
                      onChange={(e) =>
                        setSlotDefaults((p) => ({
                          ...p,
                          style: {
                            ...p.style,
                            [key]: { ...p.style?.[key], color: e.target.value },
                          },
                        }))
                      }
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500 text-sm"
                    />
                  </div>
                  {key === "cta" && (
                    <div className="flex-1 min-w-[80px]">
                      <label className="text-gray-400 text-xs block mb-1">CTA button background</label>
                      <input
                        placeholder="e.g. #6366f1"
                        value={slotDefaults.style?.cta?.backgroundColor ?? ""}
                        onChange={(e) =>
                          setSlotDefaults((p) => ({
                            ...p,
                            style: {
                              ...p.style,
                              cta: { ...p.style?.cta, backgroundColor: e.target.value },
                            },
                          }))
                        }
                        className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500 text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Template links & media */}
          <div className="mb-6 p-4 bg-dark-secondary border border-dark-border rounded-lg">
            <h3 className="text-white font-medium mb-2">Template links &amp; media</h3>
            <p className="text-gray-400 text-sm mb-3">Logo, CTA link, and optional hero image for the preset.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              <div>
                <label className="text-gray-400 text-xs block mb-1">Logo URL</label>
                <input
                  placeholder="https://..."
                  value={slotDefaults.logo_url ?? ""}
                  onChange={(e) => setSlotDefaults((p) => ({ ...p, logo_url: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">CTA URL</label>
                <input
                  placeholder="https://example.com"
                  value={slotDefaults.cta_url ?? ""}
                  onChange={(e) => setSlotDefaults((p) => ({ ...p, cta_url: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-gray-400 text-xs block mb-1">Hero image URL (optional)</label>
                <input
                  placeholder="https://..."
                  value={slotDefaults.hero_image_url ?? ""}
                  onChange={(e) => setSlotDefaults((p) => ({ ...p, hero_image_url: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-gray-400 text-xs block mb-1">Unsubscribe footer text</label>
                <input
                  placeholder="e.g. You received this because you visited our site. Unsubscribe from these emails."
                  value={slotDefaults.unsubscribe_footer ?? ""}
                  onChange={(e) => setSlotDefaults((p) => ({ ...p, unsubscribe_footer: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500 text-sm"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Use <code className="text-accent-primary">{`{{unsubscribe_url}}`}</code> inside a link for the unsubscribe link, e.g. <code className="text-gray-400">&lt;a href="{`{{unsubscribe_url}}`}"&gt;Unsubscribe&lt;/a&gt;</code>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-w-lg">
            <p className="text-gray-400 text-sm font-medium">Content & knowledge base</p>
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
            <div>
              <input
                placeholder="Subject line (e.g. Hi {{First_Name}}, we have something for you)"
                value={subjectTemplate}
                onChange={(e) => setSubjectTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500"
              />
              <p className="text-gray-500 text-xs mt-1">
                Use the same variables as in your prompt (e.g. <code className="text-accent-primary">{`{{First_Name}}`}</code>, <code className="text-accent-primary">{`{{Company_Name}}`}</code>). They are replaced per contact when sending.
              </p>
            </div>
            <textarea
              placeholder="Custom prompt. Use {{Headline}}, {{Sub_Heading}}, {{Bullet_Point}}, {{CTA}} for structured slots (filled by the model). Also {{context}}, {{first_name}}, {{query_hint}}, or variables below."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500"
            />
            <div className="space-y-2">
              <p className="text-gray-400 text-sm font-medium">Template variables (from pixel/contact fields)</p>
              <p className="text-gray-500 text-xs">Map variables for your prompt and template. Use <code className="text-accent-primary">{`{{var_name}}`}</code> or <code className="text-accent-primary">[var_name]</code> in copy. <strong>Preview value</strong> is used when you click Generate &amp; Preview so you can test how the email will look.</p>
              {variableMappings.map((m, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-center">
                  <span className="text-gray-500 text-sm">{`{{`}</span>
                  <input
                    placeholder="variable_name"
                    value={m.varName}
                    onChange={(e) => updateVariableMapping(i, "varName", e.target.value)}
                    className="w-28 px-2 py-1.5 bg-dark-bg border border-dark-border rounded text-white text-sm placeholder-gray-500"
                  />
                  <span className="text-gray-500 text-sm">{`}}`}</span>
                  <span className="text-gray-500">←</span>
                  <select
                    value={m.pixelField}
                    onChange={(e) => updateVariableMapping(i, "pixelField", e.target.value)}
                    className="px-2 py-1.5 bg-dark-bg border border-dark-border rounded text-white text-sm min-w-[140px]"
                  >
                    {pixelFields.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Preview value"
                    value={previewVariableValues[m.varName] ?? ""}
                    onChange={(e) => setPreviewVariableValues((prev) => ({ ...prev, [m.varName]: e.target.value }))}
                    className="w-24 px-2 py-1.5 bg-dark-bg border border-dark-border rounded text-white text-sm placeholder-gray-500"
                    title="Sample value for preview"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariableMapping(i)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addVariableMapping}
                disabled={!pixelFields.length}
                className="text-sm text-accent-primary hover:underline disabled:text-gray-500 disabled:no-underline"
              >
                + Add variable
              </button>
            </div>
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
                {previewResult.retrievedPreview && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-400">Context passed to LLM</summary>
                    <pre className="mt-1 p-2 bg-dark-bg rounded text-gray-400 overflow-x-auto whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                      {previewResult.retrievedPreview}
                    </pre>
                  </details>
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
                  {t.recoveryType && (
                    <span className="text-xs px-2 py-0.5 bg-dark-bg rounded text-gray-400 ml-2">
                      {t.recoveryType.replace(/_/g, " ")}
                    </span>
                  )}
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
