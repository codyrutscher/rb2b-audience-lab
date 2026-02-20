"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Users, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-auth";

type Segment = {
  id: string;
  name: string;
  description: string;
  filters: any;
  visitor_count?: number;
  created_at: string;
};

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filterType, setFilterType] = useState("identified");
  const [filterValue, setFilterValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    loadSegments();
  }, []);

  async function loadSegments() {
    const user = await getCurrentUser();
    if (user) {
      setWorkspaceId(user.id);
      
      const { data } = await supabase
        .from('segments')
        .select('*')
        .eq('workspace_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) {
        setSegments(data);
      }
    }
  }

  async function saveSegment() {
    if (!name.trim()) return;
    
    setSaving(true);
    try {
      const filters = {
        type: filterType,
        value: filterValue,
      };

      if (editingSegment) {
        await supabase
          .from('segments')
          .update({ name, description, filters })
          .eq('id', editingSegment.id);
      } else {
        await supabase
          .from('segments')
          .insert({
            workspace_id: workspaceId,
            name,
            description,
            filters,
          });
      }

      resetForm();
      loadSegments();
    } catch (error) {
      console.error('Error saving segment:', error);
    }
    setSaving(false);
  }

  async function deleteSegment(id: string) {
    if (!confirm('Are you sure you want to delete this segment?')) return;
    
    await supabase
      .from('segments')
      .delete()
      .eq('id', id);
    
    loadSegments();
  }

  function editSegment(segment: Segment) {
    setEditingSegment(segment);
    setName(segment.name);
    setDescription(segment.description || "");
    setFilterType(segment.filters?.type || "identified");
    setFilterValue(segment.filters?.value || "");
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditingSegment(null);
    setName("");
    setDescription("");
    setFilterType("identified");
    setFilterValue("");
  }

  function applySegment(segment: Segment) {
    // Navigate to dashboard with segment filters applied
    const params = new URLSearchParams();
    if (segment.filters?.type) {
      params.set('filter', segment.filters.type);
    }
    if (segment.filters?.value) {
      params.set('value', segment.filters.value);
    }
    window.location.href = `/dashboard?${params.toString()}`;
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Saved Segments</h1>
            <p className="text-gray-600 mt-2">Save and quickly access your favorite visitor filters</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            New Segment
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingSegment ? 'Edit Segment' : 'Create New Segment'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Segment Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., High-Value Leads"
                  className="w-full px-4 py-2 border rounded-lg text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Identified visitors from enterprise companies"
                  className="w-full px-4 py-2 border rounded-lg text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Filter Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-gray-900"
                >
                  <option value="identified">Identified Visitors</option>
                  <option value="anonymous">Anonymous Visitors</option>
                  <option value="company">By Company</option>
                  <option value="location">By Location</option>
                  <option value="device">By Device</option>
                  <option value="utm_source">By UTM Source</option>
                </select>
              </div>

              {(filterType === 'company' || filterType === 'location' || filterType === 'utm_source') && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Filter Value
                  </label>
                  <input
                    type="text"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder={`Enter ${filterType}...`}
                    className="w-full px-4 py-2 border rounded-lg text-gray-900"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={saveSegment}
                  disabled={saving || !name.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg"
                >
                  {saving ? 'Saving...' : editingSegment ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {segments.map((segment) => (
            <div key={segment.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">{segment.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => editSegment(segment)}
                    className="p-1 text-gray-600 hover:text-purple-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteSegment(segment.id)}
                    className="p-1 text-gray-600 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {segment.description && (
                <p className="text-sm text-gray-600 mb-4">{segment.description}</p>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <Users className="w-4 h-4" />
                <span>Filter: {segment.filters?.type || 'All'}</span>
              </div>

              <button
                onClick={() => applySegment(segment)}
                className="w-full px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition"
              >
                Apply Segment
              </button>
            </div>
          ))}

          {segments.length === 0 && !showForm && (
            <div className="col-span-full text-center py-12">
              <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No segments yet</h3>
              <p className="text-gray-600 mb-4">Create your first segment to save filter combinations</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Create Segment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
