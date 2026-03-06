"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Upload, Eye } from "lucide-react";

const API_BASE = "/api/reactivate";
const RULE_TYPES = ["url_contains", "url_regex", "event_type", "has_email"] as const;

type SegmentRule = {
  id: string;
  ruleType: string;
  ruleValue: string;
  field?: string | null;
  operator?: string | null;
  groupId?: string | null;
};

type RuleGroup = {
  id: string;
  logicalOp: string;
  groupOrder: number;
  rules: SegmentRule[];
};

type RtSegment = {
  id: string;
  name: string;
  priority: number;
  isSuppression: boolean;
  enabled: boolean;
  rules: SegmentRule[];
  ruleGroups?: RuleGroup[];
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

export default function SegmentsPage() {
  const [segments, setSegments] = useState<RtSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showSegmentForm, setShowSegmentForm] = useState(false);
  const [editingSegment, setEditingSegment] = useState<RtSegment | null>(null);
  const [segmentName, setSegmentName] = useState("");
  const [segmentPriority, setSegmentPriority] = useState(999);
  const [segmentSuppression, setSegmentSuppression] = useState(false);

  const [expandedSegmentId, setExpandedSegmentId] = useState<string | null>(null);
  const [segmentFields, setSegmentFields] = useState<{ fields: string[]; operators: string[] }>({ fields: [], operators: [] });
  const [newRuleField, setNewRuleField] = useState("");
  const [newRuleOperator, setNewRuleOperator] = useState("contains");
  const [newRuleValue, setNewRuleValue] = useState("");
  const [newRuleGroupId, setNewRuleGroupId] = useState<string | null>(null);
  const [newRuleLegacyType, setNewRuleLegacyType] = useState("url_contains");
  const [newRuleMode, setNewRuleMode] = useState<"pixel" | "legacy">("pixel");

  const [previewingSegmentId, setPreviewingSegmentId] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<{
    segmentId: string;
    count: number;
    sample: Array<{ email: string; firstName: string | null; lastName: string | null }>;
    evaluatedCount: number;
  } | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [seedingSample, setSeedingSample] = useState(false);
  const [sampleResult, setSampleResult] = useState<{
    contactsUpserted: number;
    eventsInserted: number;
    contactsEnqueued: number;
  } | null>(null);

  useEffect(() => {
    loadSegments();
  }, []);

  useEffect(() => {
    fetch(API_BASE + "/segment-fields", { credentials: "include" })
      .then((r) => r.ok && r.json())
      .then((d) => d && setSegmentFields({ fields: d.fields || [], operators: d.operators || [] }))
      .catch(() => {});
  }, []);

  async function loadSegments(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/segments`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setSegments(d.segments || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
    if (!silent) setLoading(false);
  }

  async function saveSegment() {
    if (!segmentName.trim()) return;
    setError(null);
    try {
      const payload = {
        name: segmentName.trim(),
        priority: segmentPriority,
        is_suppression: segmentSuppression,
      };
      if (editingSegment) {
        await fetchApi(`/segments/${editingSegment.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi("/segments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setShowSegmentForm(false);
      setEditingSegment(null);
      setSegmentName("");
      setSegmentPriority(999);
      setSegmentSuppression(false);
      loadSegments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save segment");
    }
  }

  async function deleteSegment(id: string) {
    if (!confirm("Delete this segment?")) return;
    try {
      await fetchApi(`/segments/${id}`, { method: "DELETE" });
      loadSegments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  async function addRule(
    segmentId: string,
    opts: { rule_type?: string; rule_value: string } | { field: string; operator: string; rule_value: string; group_id?: string }
  ) {
    try {
      await fetchApi(`/segments/${segmentId}/rules`, {
        method: "POST",
        body: JSON.stringify(opts),
      });
      setNewRuleField("");
      setNewRuleOperator("contains");
      setNewRuleValue("");
      setNewRuleGroupId(null);
      setPreviewResult(null);
      await loadSegments(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add rule");
    }
  }

  async function addGroup(segmentId: string, logicalOp: "AND" | "OR") {
    try {
      await fetchApi(`/segments/${segmentId}/groups`, {
        method: "POST",
        body: JSON.stringify({ logical_op: logicalOp }),
      });
      setPreviewResult(null);
      await loadSegments(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add group");
    }
  }

  async function deleteRule(segmentId: string, ruleId: string) {
    try {
      await fetchApi(`/segments/${segmentId}/rules/${ruleId}`, { method: "DELETE" });
      setPreviewResult(null);
      await loadSegments(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete rule");
    }
  }

  async function deleteGroup(segmentId: string, groupId: string) {
    try {
      await fetchApi(`/segments/${segmentId}/groups/${groupId}`, { method: "DELETE" });
      setPreviewResult(null);
      await loadSegments(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete group");
    }
  }

  async function previewSegment(segmentId: string) {
    const seg = segments.find((s) => s.id === segmentId);
    const hasRules =
      (seg?.rules?.filter((r) => r.field || r.ruleType)?.length ?? 0) > 0 ||
      (seg?.ruleGroups?.some((g) => g.rules.length > 0) ?? false);
    if (!hasRules) {
      setError("Add at least one rule or group rule to preview.");
      return;
    }
    setError(null);
    setPreviewingSegmentId(segmentId);
    setPreviewResult(null);
    try {
      const data = await fetchApi(`/segments/${segmentId}/preview`);
      setPreviewResult({
        segmentId,
        count: data.count,
        sample: data.sample ?? [],
        evaluatedCount: data.evaluatedCount ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to preview segment");
    } finally {
      setPreviewingSegmentId(null);
    }
  }

  async function loadSampleCsv(file: File) {
    setError(null);
    setSampleResult(null);
    setLoadingSample(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/test/load-sample`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      setSampleResult({
        contactsUpserted: data.contactsUpserted ?? 0,
        eventsInserted: data.eventsInserted ?? 0,
        contactsEnqueued: data.contactsEnqueued ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sample");
    } finally {
      setLoadingSample(false);
    }
  }

  async function seedTestRecords(count = 20) {
    setError(null);
    setSampleResult(null);
    setSeedingSample(true);
    try {
      const res = await fetch(`${API_BASE}/test/seed-sample?count=${count}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Seed failed");
      setSampleResult({
        contactsUpserted: data.contactsUpserted ?? 0,
        eventsInserted: data.eventsInserted ?? 0,
        contactsEnqueued: data.contactsEnqueued ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to seed test records");
    } finally {
      setSeedingSample(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-400">Loading segments…</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Segments</h1>
          <p className="text-gray-400">
            Create rule-based segments to target visitors for reactivation emails. Link segments to campaigns in Reactivate.
          </p>
        </div>

        {/* Load sample data */}
        <div className="mb-8 p-4 bg-dark-secondary border border-dark-border rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Upload className="w-5 h-5" /> Test with sample data
          </h2>
          <p className="text-gray-400 text-sm mb-3">
            Upload <code className="text-accent-primary">resolutions-sample.csv</code> or seed 10–20 test records directly. Contacts go into <code className="text-gray-500">rt_contacts</code> and <code className="text-gray-500">rt_contact_events</code>. Segment jobs are enqueued (worker required to process).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => seedTestRecords(20)}
              disabled={seedingSample}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${seedingSample ? "bg-gray-600 cursor-not-allowed" : "bg-accent-primary text-white hover:opacity-90"}`}
            >
              {seedingSample ? "Seeding…" : "Seed 20 test records"}
            </button>
            <span className="text-gray-500 text-sm">or</span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              id="sample-csv-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadSampleCsv(f);
                e.target.value = "";
              }}
            />
            <label
              htmlFor="sample-csv-input"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition ${loadingSample ? "bg-gray-600 cursor-not-allowed" : "bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30"}`}
            >
              <Upload className="w-4 h-4" />
              {loadingSample ? "Loading…" : "Load resolutions-sample.csv"}
            </label>
            {sampleResult && (
              <span className="text-green-400 text-sm">
                {sampleResult.contactsUpserted} contacts, {sampleResult.eventsInserted} events, {sampleResult.contactsEnqueued} queued for segment eval
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {!showSegmentForm ? (
          <button
            onClick={() => setShowSegmentForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-lg hover:bg-accent-primary/30 transition"
          >
            <Plus className="w-4 h-4" /> New Segment
          </button>
        ) : (
          <div className="bg-dark-secondary border border-dark-border rounded-lg p-4 space-y-3 max-w-md mb-6">
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
                  setSegmentPriority(999);
                  setSegmentSuppression(false);
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
            <div key={s.id} className="bg-dark-secondary border border-dark-border rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-dark-bg/30"
                onClick={() => setExpandedSegmentId(expandedSegmentId === s.id ? null : s.id)}
              >
                <div>
                  <span className="text-white font-medium">{s.name}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    priority {s.priority} {s.isSuppression && "(suppression)"}
                  </span>
                  {(s.rules.length > 0 || (s.ruleGroups?.filter((g) => g.rules.length > 0)?.length ?? 0) > 0) && (
                    <div className="text-gray-400 text-xs mt-1">
                      {[
                        ...(s.ruleGroups?.filter((g) => g.rules.length > 0).map((g) => `(${g.rules.map((r) => r.field ? `${r.field} ${r.operator} "${r.ruleValue}"` : `${r.ruleType}: ${r.ruleValue}`).join(` ${g.logicalOp} `)})`) ?? []),
                        ...(s.rules?.filter((r) => !r.groupId).map((r) => r.field ? `${r.field} ${r.operator} "${r.ruleValue}"` : `${r.ruleType}: ${r.ruleValue}`) ?? []),
                      ].join(" OR ")}
                    </div>
                  )}
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
                  <button onClick={() => deleteSegment(s.id)} className="p-1 text-gray-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="text-gray-500">{expandedSegmentId === s.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
                </div>
              </div>
              {expandedSegmentId === s.id && (
                <div className="border-t border-dark-border p-4 space-y-4">
                  {/* Preview */}
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => previewSegment(s.id)}
                      disabled={previewingSegmentId === s.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-accent-primary/20 text-accent-primary rounded-lg hover:bg-accent-primary/30 transition disabled:opacity-60 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      {previewingSegmentId === s.id ? "Previewing…" : "Preview segment"}
                    </button>
                    {previewResult?.segmentId === s.id && (
                      <div className="text-sm text-gray-400">
                        <span className="text-white font-medium">{previewResult.count}</span> matching contact{previewResult.count !== 1 ? "s" : ""}
                        {previewResult.evaluatedCount > 0 && (
                          <span className="ml-1 text-gray-500">
                            (evaluated {previewResult.evaluatedCount} contacts)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {previewResult?.segmentId === s.id && previewResult.sample.length > 0 && (
                    <div className="bg-dark-bg rounded p-3">
                      <div className="text-gray-500 text-xs font-medium mb-2">Sample contacts</div>
                      <div className="flex flex-wrap gap-2">
                        {previewResult.sample.map((c, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-dark-secondary rounded text-gray-300 text-sm"
                            title={c.email}
                          >
                            {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {s.ruleGroups?.map((g) => (
                    <div key={g.id} className="bg-dark-bg rounded p-3 flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-gray-500 text-xs font-medium">{g.logicalOp} group</span>
                        {g.rules.length > 0 ? (
                          g.rules.map((r) => (
                            <div key={r.id} className="flex items-center gap-2 mt-1">
                              <span className="text-gray-400 text-sm">{r.field ? `${r.field} ${r.operator} "${r.ruleValue}"` : `${r.ruleType}: ${r.ruleValue}`}</span>
                              <button onClick={() => deleteRule(s.id, r.id)} className="text-red-400 text-xs hover:underline">Delete</button>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-xs mt-1 italic">Empty — add a rule below and select &quot;{g.logicalOp} group&quot;</p>
                        )}
                      </div>
                      <button onClick={() => deleteGroup(s.id, g.id)} className="text-gray-500 text-xs hover:text-red-400 shrink-0">Delete group</button>
                    </div>
                  ))}
                  {s.rules.filter((r) => !r.groupId).map((r) => (
                    <div key={r.id} className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">{r.field ? `${r.field} ${r.operator} "${r.ruleValue}"` : `${r.ruleType}: ${r.ruleValue}`}</span>
                      <button onClick={() => deleteRule(s.id, r.id)} className="text-red-400 text-xs hover:underline">Delete</button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-dark-border">
                    <button onClick={() => addGroup(s.id, "AND")} className="px-2 py-1 bg-dark-bg border border-dark-border rounded text-sm text-gray-300 hover:border-gray-500">+ AND group</button>
                    <button onClick={() => addGroup(s.id, "OR")} className="px-2 py-1 bg-dark-bg border border-dark-border rounded text-sm text-gray-300 hover:border-gray-500">+ OR group</button>
                  </div>
                  <div className="bg-dark-bg rounded p-3 space-y-2">
                    <div className="flex gap-2">
                      <button onClick={() => setNewRuleMode("pixel")} className={`px-2 py-1 rounded text-sm ${newRuleMode === "pixel" ? "bg-accent-primary/30" : ""}`}>Pixel field</button>
                      <button onClick={() => setNewRuleMode("legacy")} className={`px-2 py-1 rounded text-sm ${newRuleMode === "legacy" ? "bg-accent-primary/30" : ""}`}>URL/Event</button>
                    </div>
                    {newRuleMode === "pixel" && segmentFields.fields.length > 0 ? (
                      <div className="flex flex-wrap gap-2 items-center">
                        <select value={newRuleField} onChange={(e) => setNewRuleField(e.target.value)} className="px-2 py-1 bg-dark-secondary border border-dark-border rounded text-sm text-white">
                          <option value="">Select field</option>
                          {segmentFields.fields.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <select value={newRuleOperator} onChange={(e) => setNewRuleOperator(e.target.value)} className="px-2 py-1 bg-dark-secondary border border-dark-border rounded text-sm text-white">
                          {segmentFields.operators.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                        {!["is_empty", "is_not_empty"].includes(newRuleOperator) && (
                          <input placeholder="Value" value={newRuleValue} onChange={(e) => setNewRuleValue(e.target.value)} className="px-2 py-1 bg-dark-secondary border border-dark-border rounded text-sm text-white w-32" />
                        )}
                        <select value={newRuleGroupId ?? ""} onChange={(e) => setNewRuleGroupId(e.target.value || null)} className="px-2 py-1 bg-dark-secondary border border-dark-border rounded text-sm text-white">
                          <option value="">No group</option>
                          {s.ruleGroups?.map((g, i) => (
                            <option key={g.id} value={g.id}>
                              {g.logicalOp} group{s.ruleGroups!.length > 1 ? ` ${i + 1}` : ""}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => newRuleField && addRule(s.id, { field: newRuleField, operator: newRuleOperator, rule_value: newRuleValue, group_id: newRuleGroupId || undefined })} className="px-3 py-1 bg-accent-primary text-white rounded text-sm">Add</button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 items-center">
                        <select value={newRuleLegacyType} onChange={(e) => setNewRuleLegacyType(e.target.value)} className="px-2 py-1 bg-dark-secondary border border-dark-border rounded text-sm text-white">
                          {RULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input placeholder="Value" value={newRuleValue} onChange={(e) => setNewRuleValue(e.target.value)} className="px-2 py-1 bg-dark-secondary border border-dark-border rounded text-sm text-white w-32" />
                        <button onClick={() => addRule(s.id, { rule_type: newRuleLegacyType, rule_value: newRuleValue })} className="px-3 py-1 bg-accent-primary text-white rounded text-sm">Add</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {segments.length === 0 && !showSegmentForm && (
            <p className="text-gray-500 text-sm">No segments yet. Create one to target visitors for email campaigns.</p>
          )}
        </div>
      </div>
    </div>
  );
}
