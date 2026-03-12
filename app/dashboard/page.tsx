"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase, type Visitor } from "@/lib/supabase";
import { Users, TrendingUp, Clock, Search, Download, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getCurrentUser } from "@/lib/supabase-auth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type Pixel = {
  id: string;
  name: string;
  websiteName: string;
  websiteUrl: string;
};

export default function Dashboard() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [filteredVisitors, setFilteredVisitors] = useState<Visitor[]>([]);
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [selectedPixel, setSelectedPixel] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    identified: 0,
    today: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIdentified, setFilterIdentified] = useState<'all' | 'identified' | 'anonymous'>('all');
  const [filterDevice, setFilterDevice] = useState<'all' | 'mobile' | 'desktop'>('all');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Load pixels for the filter dropdown
  useEffect(() => {
    async function loadPixels() {
      try {
        const res = await fetch('/api/reactivate/pixels', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setPixels(data.pixels || []);
        }
      } catch (e) {
        console.error('Failed to load pixels:', e);
      }
    }
    loadPixels();
  }, []);

  const loadVisitors = useCallback(async () => {
    let query = supabase
      .from('visitors')
      .select('*')
      .order('last_seen', { ascending: false })
      .limit(50);

    // Filter by pixel if selected
    if (selectedPixel !== 'all') {
      query = query.eq('pixel_id', selectedPixel);
    }

    const { data } = await query;

    if (data) {
      setVisitors(data);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      setStats({
        total: data.length,
        identified: data.filter((v: Visitor) => v.identified).length,
        today: data.filter((v: Visitor) => new Date(v.first_seen) >= today).length,
      });
    }
  }, [selectedPixel]);

  useEffect(() => {
    loadVisitors();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('visitors-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, () => {
        loadVisitors();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadVisitors]);

  useEffect(() => {
    applyFilters();
  }, [visitors, searchTerm, filterIdentified, filterDevice]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilters() {
    let filtered = [...visitors];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v => 
        v.name?.toLowerCase().includes(term) ||
        v.email?.toLowerCase().includes(term) ||
        v.company?.toLowerCase().includes(term) ||
        v.city?.toLowerCase().includes(term) ||
        v.country?.toLowerCase().includes(term)
      );
    }

    // Identified filter
    if (filterIdentified === 'identified') {
      filtered = filtered.filter(v => v.identified);
    } else if (filterIdentified === 'anonymous') {
      filtered = filtered.filter(v => !v.identified);
    }

    // Device filter
    if (filterDevice !== 'all') {
      filtered = filtered.filter(v => v.device_type === filterDevice);
    }

    setFilteredVisitors(filtered);
  }

  function calculateLeadScore(visitor: Visitor): number {
    let score = 0;
    if (visitor.identified) score += 20;
    if (visitor.company) score += 15;
    score += Math.min((visitor.page_views || 0) * 2, 30);
    if (visitor.is_returning) score += 10;
    if (visitor.linkedin_url) score += 10;
    if (visitor.utm_campaign) score += 15;
    return score;
  }

  function getLeadScoreBadge(score: number) {
    if (score >= 70) {
      return <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">🔥 Hot</span>;
    } else if (score >= 40) {
      return <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">⚡ Warm</span>;
    } else if (score >= 20) {
      return <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">💡 Interested</span>;
    }
    return <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">❄️ Cold</span>;
  }

  async function exportToCSV() {
    setExporting(true);
    setExportError(null);
    try {
      const user = await getCurrentUser();
      if (!user) {
        setExportError('Please log in to export data');
        setExporting(false);
        return;
      }

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: user.id,
          type: 'visitors',
          filters: {},
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visitors_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setExportError('Export failed. Please try again.');
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExportError('Export failed. Please check your connection and try again.');
    }
    setExporting(false);
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Visitor Dashboard</h1>
            <p className="text-gray-400">Track and analyze your website visitors in real-time</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={exportToCSV}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-purple hover:shadow-lg hover:shadow-accent-primary/30 disabled:bg-gray-700 text-white rounded-lg transition-all font-medium"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            {exportError && (
              <div className="text-sm text-red-400">{exportError}</div>
            )}
          </div>
        </div>

        {stats.total === 0 && (
          <div className="mb-8 p-6 glass neon-border rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              🚀 Get Started: Install Tracking Script
            </h3>
            <p className="text-gray-400 mb-4">
              You haven&apos;t tracked any visitors yet. Install the tracking script on your website to start identifying visitors.
            </p>
            <Link
              href="/dashboard/install"
              className="inline-block px-6 py-2 bg-gradient-purple hover:shadow-lg hover:shadow-accent-primary/30 text-white rounded-lg font-semibold transition-all"
            >
              View Installation Instructions
            </Link>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatCard icon={<Users />} label="Total Visitors" value={stats.total} />
          <StatCard icon={<TrendingUp />} label="Identified" value={stats.identified} />
          <StatCard icon={<Clock />} label="Today" value={stats.today} />
        </div>

        {/* Search and Filters */}
        <div className="glass neon-border rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Website/Pixel Filter */}
            {pixels.length > 0 && (
              <select
                value={selectedPixel}
                onChange={(e) => setSelectedPixel(e.target.value)}
                className="px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-primary focus:outline-none transition"
              >
                <option value="all">All Websites</option>
                {pixels.map(p => (
                  <option key={p.id} value={p.id}>{p.websiteName || p.name}</option>
                ))}
              </select>
            )}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search visitors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none transition"
                />
              </div>
            </div>
            <select
              value={filterIdentified}
              onChange={(e) => setFilterIdentified(e.target.value as any)}
              className="px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-primary focus:outline-none transition"
            >
              <option value="all">All Visitors</option>
              <option value="identified">Identified Only</option>
              <option value="anonymous">Anonymous Only</option>
            </select>
            <select
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value as any)}
              className="px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-primary focus:outline-none transition"
            >
              <option value="all">All Devices</option>
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
            </select>
          </div>
        </div>

        <div className="glass neon-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border bg-dark-tertiary/50">
            <h2 className="text-xl font-semibold text-white">Recent Visitors</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-tertiary/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Visitor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Page Views</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filteredVisitors.map((visitor) => (
                  <tr key={visitor.id} className="hover:bg-dark-tertiary/30 cursor-pointer transition" onClick={() => window.location.href = `/dashboard/visitors/${visitor.id}`}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-white">{visitor.name || 'Anonymous'}</div>
                          {getLeadScoreBadge(calculateLeadScore(visitor))}
                        </div>
                        <div className="text-sm text-gray-400">{visitor.email || visitor.ip_address}</div>
                        {visitor.is_returning && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            Returning
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{visitor.company || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {visitor.city && visitor.country ? `${visitor.city}, ${visitor.country}` : visitor.country || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {visitor.device_type ? (
                        <span className="capitalize">{visitor.device_type}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {visitor.utm_source || visitor.utm_medium ? (
                        <div>
                          <div>{visitor.utm_source || '-'}</div>
                          {visitor.utm_campaign && (
                            <div className="text-xs text-gray-500">{visitor.utm_campaign}</div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-medium">{visitor.page_views}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {formatDistanceToNow(new Date(visitor.last_seen), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass neon-border rounded-xl p-6 hover:shadow-lg hover:shadow-accent-primary/10 transition-all group">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-purple rounded-lg text-white shadow-lg shadow-accent-primary/20 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <div className="text-3xl font-bold text-white">{value}</div>
          <div className="text-sm text-gray-400">{label}</div>
        </div>
      </div>
    </div>
  );
}
