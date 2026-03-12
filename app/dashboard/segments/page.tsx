"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Eye, Filter, X } from "lucide-react";

const API_BASE = "/api/reactivate";

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

// Rule Builder Component
function SegmentRuleBuilder({
  segment,
  fields,
  operators,
  onAddRule,
  onDeleteRule,
  onAddGroup,
  onDeleteGroup,
  onPreview,
  previewing,
  previewResult,
}: {
  segment: RtSegment;
  fields: string[];
  operators: string[];
  onAddRule: (segmentId: string, field: string, operator: string, value: string, groupId?: string) => Promise<void>;
  onDeleteRule: (segmentId: string, ruleId: string) => Promise<void>;
  onAddGroup: (segmentId: string, logicalOp: "AND" | "OR") => Promise<void>;
  onDeleteGroup: (segmentId: string, groupId: string) => Promise<void>;
  onPreview: () => void;
  previewing: boolean;
  previewResult: { count: number; sample: any[] } | null;
}) {
  const [newRule, setNewRule] = useState({ field: "", operator: "", value: "", groupId: "" });
  const [addingRule, setAddingRule] = useState(false);

  const ungroupedRules = segment.rules?.filter((r) => !r.groupId) || [];
  const groups = segment.ruleGroups || [];

  async function handleAddRule() {
    if (!newRule.field || !newRule.operator) return;
    setAddingRule(true);
    try {
      await onAddRule(
        segment.id,
        newRule.field,
        newRule.operator,
        newRule.value,
        newRule.groupId || undefined
      );
      setNewRule({ field: "", operator: "", value: "", groupId: "" });
    } finally {
      setAddingRule(false);
    }
  }

  return (
    <div className="glass neon-border rounded-xl overflow-hidden">
      <div className="p-6 border-b border-dark-border bg-dark-tertiary/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{segment.name}</h2>
            <p className="text-sm text-gray-400 mt-1">Configure rules to match visitors</p>
          </div>
          <button
            onClick={onPreview}
            disabled={previewing}
            className="flex items-center gap-2 px-4 py-2 bg-accent-secondary text-white rounded-lg hover:shadow-lg hover:shadow-accent-secondary/30 transition disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            {previewing ? "Loading..." : "Preview"}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Ungrouped Rules */}
        {ungroupedRules.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-400">Base Rules (All must match)</div>
            {ungroupedRules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-3 p-3 bg-dark-tertiary/50 rounded-lg border border-dark-border">
                <div className="flex-1 text-sm text-white">
                  <span className="text-accent-primary font-medium">{rule.field || rule.ruleType}</span>
                  <span className="text-gray-500 mx-2">{rule.operator || "="}</span>
                  <span className="text-gray-300">{rule.ruleValue}</span>
                </div>
                <button
                  onClick={() => onDeleteRule(segment.id, rule.id)}
                  className="p-1 text-gray-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Rule Groups */}
        {groups.map((group, idx) => (
          <div key={group.id} className="relative">
            {idx > 0 && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-dark-secondary text-xs font-medium text-gray-400 rounded-full border border-dark-border">
                OR
              </div>
            )}
            <div className="p-4 bg-gradient-to-br from-accent-primary/5 to-accent-secondary/5 rounded-xl border-2 border-accent-primary/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-accent-primary/20 text-accent-primary text-xs font-bold rounded">
                    {group.logicalOp} GROUP
                  </div>
                  <span className="text-xs text-gray-500">All rules in this group must match</span>
                </div>
                <button
                  onClick={() => onDeleteGroup(segment.id, group.id)}
                  className="p-1 text-gray-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {group.rules.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm border border-dashed border-dark-border rounded-lg">
                  No rules in this group yet
                </div>
              ) : (
                <div className="space-y-2">
                  {group.rules.map((rule, ruleIdx) => (
                    <div key={rule.id}>
                      {ruleIdx > 0 && (
                        <div className="text-center text-xs font-medium text-accent-primary my-1">AND</div>
                      )}
                      <div className="flex items-center gap-3 p-3 bg-dark-secondary/80 rounded-lg border border-dark-border">
                        <div className="flex-1 text-sm text-white">
                          <span className="text-accent-secondary font-medium">{rule.field || rule.ruleType}</span>
                          <span className="text-gray-500 mx-2">{rule.operator || "="}</span>
                          <span className="text-gray-300">{rule.ruleValue}</span>
                        </div>
                        <button
                          onClick={() => onDeleteRule(segment.id, rule.id)}
                          className="p-1 text-gray-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Rule to Group */}
              <div className="mt-3 p-3 bg-dark-secondary/50 rounded-lg border border-dashed border-accent-primary/30">
                <div className="text-xs font-medium text-gray-400 mb-2">Add rule to this {group.logicalOp} group</div>
                <div className="flex gap-2">
                  <select
                    value={newRule.groupId === group.id ? newRule.field : ""}
                    onChange={(e) => setNewRule({ ...newRule, field: e.target.value, groupId: group.id })}
                    className="flex-1 px-3 py-2 bg-dark-tertiary border border-dark-border rounded text-white text-sm"
                  >
                    <option value="">Select field...</option>
                    {fields.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <select
                    value={newRule.groupId === group.id ? newRule.operator : ""}
                    onChange={(e) => setNewRule({ ...newRule, operator: e.target.value, groupId: group.id })}
                    className="px-3 py-2 bg-dark-tertiary border border-dark-border rounded text-white text-sm"
                  >
                    <option value="">Operator...</option>
                    {operators.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newRule.groupId === group.id ? newRule.value : ""}
                    onChange={(e) => setNewRule({ ...newRule, value: e.target.value, groupId: group.id })}
                    placeholder="Value..."
                    className="flex-1 px-3 py-2 bg-dark-tertiary border border-dark-border rounded text-white text-sm placeholder-gray-600"
                  />
                  <button
                    onClick={handleAddRule}
                    disabled={!newRule.field || !newRule.operator || addingRule || newRule.groupId !== group.id}
                    className="px-4 py-2 bg-accent-primary text-white rounded text-sm font-medium disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add Base Rule (ungrouped) */}
        <div className="p-4 bg-dark-tertiary/30 rounded-lg border border-dashed border-dark-border">
          <div className="text-sm font-medium text-gray-400 mb-3">Add Base Rule (applies to all visitors)</div>
          <div className="flex gap-2">
            <select
              value={!newRule.groupId ? newRule.field : ""}
              onChange={(e) => setNewRule({ ...newRule, field: e.target.value, groupId: "" })}
              className="flex-1 px-3 py-2 bg-dark-secondary border border-dark-border rounded text-white text-sm"
            >
              <option value="">Select field...</option>
              {fields.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select
              value={!newRule.groupId ? newRule.operator : ""}
              onChange={(e) => setNewRule({ ...newRule, operator: e.target.value, groupId: "" })}
              className="px-3 py-2 bg-dark-secondary border border-dark-border rounded text-white text-sm"
            >
              <option value="">Operator...</option>
              {operators.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
            <input
              type="text"
              value={!newRule.groupId ? newRule.value : ""}
              onChange={(e) => setNewRule({ ...newRule, value: e.target.value, groupId: "" })}
              placeholder="Value..."
              className="flex-1 px-3 py-2 bg-dark-secondary border border-dark-border rounded text-white text-sm placeholder-gray-600"
            />
            <button
              onClick={handleAddRule}
              disabled={!newRule.field || !newRule.operator || addingRule || !!newRule.groupId}
              className="px-4 py-2 bg-accent-primary text-white rounded text-sm font-medium disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>

        {/* Add Group Buttons */}
        <div className="flex gap-3 pt-4 border-t border-dark-border">
          <button
            onClick={() => onAddGroup(segment.id, "AND")}
            className="flex-1 px-4 py-3 bg-dark-tertiary border border-accent-primary/30 rounded-lg text-white font-medium hover:bg-accent-primary/10 transition"
          >
            + Add AND Group
          </button>
          <button
            onClick={() => onAddGroup(segment.id, "OR")}
            className="flex-1 px-4 py-3 bg-dark-tertiary border border-accent-secondary/30 rounded-lg text-white font-medium hover:bg-accent-secondary/10 transition"
          >
            + Add OR Group
          </button>
        </div>

        {/* Logic Explanation */}
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <div className="text-sm text-blue-300 font-medium mb-2">How Segment Logic Works:</div>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Base rules must ALL match (AND logic)</li>
            <li>• Each group's rules must ALL match (AND within group)</li>
            <li>• Visitor matches if they pass base rules AND at least ONE group (OR between groups)</li>
          </ul>
        </div>

        {/* Preview Results */}
        {previewResult && (
          <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
            <div className="text-sm font-medium text-green-300 mb-2">
              Preview: {previewResult.count} visitors match this segment
            </div>
            {previewResult.sample.length > 0 && (
              <div className="space-y-2 mt-3">
                {previewResult.sample.slice(0, 3).map((v: any) => (
                  <div key={v.id} className="text-xs text-gray-400 p-2 bg-dark-secondary rounded">
                    {v.email || v.company || v.city || "Anonymous"} - {v.page_views} views
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<RtSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<RtSegment | null>(null);
  const [segmentFields, setSegmentFields] = useState<{ fields: string[]; operators: string[] }>({ fields: [], operators: [] });
  
  // Create segment form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState("");
  
  // Preview
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<{ count: number; sample: any[] } | null>(null);

  useEffect(() => {
    loadSegments();
    loadFields();
  }, []);

  async function loadSegments() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/segments`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setSegments(d.segments || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
    setLoading(false);
  }

  async function loadFields() {
    try {
      const res = await fetch(`${API_BASE}/segment-fields`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setSegmentFields({ fields: d.fields || [], operators: d.operators || [] });
      }
    } catch {}
  }

  async function createSegment() {
    if (!newSegmentName.trim()) return;
    try {
      await fetchApi("/segments", {
        method: "POST",
        body: JSON.stringify({ name: newSegmentName.trim(), priority: 999 }),
      });
      setNewSegmentName("");
      setShowCreateForm(false);
      loadSegments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    }
  }

  async function deleteSegment(id: string) {
    if (!confirm("Delete this segment?")) return;
    try {
      await fetchApi(`/segments/${id}`, { method: "DELETE" });
      if (selectedSegment?.id === id) setSelectedSegment(null);
      loadSegments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  async function addRule(segmentId: string, field: string, operator: string, value: string, groupId?: string) {
    try {
      await fetchApi(`/segments/${segmentId}/rules`, {
        method: "POST",
        body: JSON.stringify({ field, operator, rule_value: value, group_id: groupId }),
      });
      await refreshSelectedSegment(segmentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add rule");
    }
  }

  async function deleteRule(segmentId: string, ruleId: string) {
    try {
      await fetchApi(`/segments/${segmentId}/rules/${ruleId}`, { method: "DELETE" });
      await refreshSelectedSegment(segmentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete rule");
    }
  }

  async function addGroup(segmentId: string, logicalOp: "AND" | "OR") {
    try {
      await fetchApi(`/segments/${segmentId}/groups`, {
        method: "POST",
        body: JSON.stringify({ logical_op: logicalOp }),
      });
      await refreshSelectedSegment(segmentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add group");
    }
  }

  async function deleteGroup(segmentId: string, groupId: string) {
    try {
      await fetchApi(`/segments/${segmentId}/groups/${groupId}`, { method: "DELETE" });
      await refreshSelectedSegment(segmentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete group");
    }
  }

  async function refreshSelectedSegment(segmentId: string) {
    const res = await fetch(`${API_BASE}/segments`, { credentials: "include" });
    if (res.ok) {
      const d = await res.json();
      setSegments(d.segments || []);
      const updated = (d.segments || []).find((s: RtSegment) => s.id === segmentId);
      if (updated) setSelectedSegment(updated);
    }
  }

  async function previewSegment(segmentId: string) {
    setPreviewing(true);
    setPreviewResult(null);
    try {
      const data = await fetchApi(`/segments/${segmentId}/preview`);
      setPreviewResult({ count: data.count, sample: data.sample || [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to preview");
    }
    setPreviewing(false);
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Loading segments…</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Segments</h1>
            <p className="text-gray-400">Create rule-based segments to target specific visitors</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-purple text-white rounded-lg font-medium hover:shadow-lg hover:shadow-accent-primary/30 transition"
          >
            <Plus className="w-5 h-5" />
            New Segment
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-white">×</button>
          </div>
        )}

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass neon-border rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold text-white mb-4">Create New Segment</h2>
              <input
                type="text"
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
                placeholder="Segment name (e.g., High-Value Leads)"
                className="w-full px-4 py-3 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={createSegment}
                  disabled={!newSegmentName.trim()}
                  className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowCreateForm(false); setNewSegmentName(""); }}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-6">
          {/* Segment List */}
          <div className="w-1/3">
            <div className="glass neon-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-dark-border bg-dark-tertiary/30">
                <h2 className="text-lg font-semibold text-white">Your Segments</h2>
              </div>
              {segments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Filter className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>No segments yet</p>
                </div>
              ) : (
                <div className="divide-y divide-dark-border">
                  {segments.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => { setSelectedSegment(s); setPreviewResult(null); }}
                      className={`p-4 cursor-pointer transition ${
                        selectedSegment?.id === s.id
                          ? "bg-accent-primary/10 border-l-2 border-accent-primary"
                          : "hover:bg-dark-tertiary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">{s.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {(s.rules?.length || 0) + (s.ruleGroups?.reduce((acc, g) => acc + g.rules.length, 0) || 0)} rules
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSegment(s.id); }}
                          className="p-1 text-gray-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rule Builder */}
          <div className="w-2/3">
            {selectedSegment ? (
              <SegmentRuleBuilder
                segment={selectedSegment}
                fields={segmentFields.fields}
                operators={segmentFields.operators}
                onAddRule={addRule}
                onDeleteRule={deleteRule}
                onAddGroup={addGroup}
                onDeleteGroup={deleteGroup}
                onPreview={() => previewSegment(selectedSegment.id)}
                previewing={previewing}
                previewResult={previewResult}
              />
            ) : (
              <div className="glass neon-border rounded-xl p-12 text-center">
                <Filter className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Select a Segment</h3>
                <p className="text-gray-400">Choose a segment from the list to configure its rules</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
