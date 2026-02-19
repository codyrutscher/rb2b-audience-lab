"use client";

import { useEffect, useState } from "react";
import { supabase, type Visitor } from "@/lib/supabase";
import { Eye, Users, TrendingUp, Clock, Search, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [filteredVisitors, setFilteredVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    identified: 0,
    today: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIdentified, setFilterIdentified] = useState<'all' | 'identified' | 'anonymous'>('all');
  const [filterDevice, setFilterDevice] = useState<'all' | 'mobile' | 'desktop'>('all');

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
  }, []);

  useEffect(() => {
    applyFilters();
  }, [visitors, searchTerm, filterIdentified, filterDevice]);

  async function loadVisitors() {
    const { data } = await supabase
      .from('visitors')
      .select('*')
      .order('last_seen', { ascending: false })
      .limit(50);

    if (data) {
      setVisitors(data);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      setStats({
        total: data.length,
        identified: data.filter(v => v.identified).length,
        today: data.filter(v => new Date(v.first_seen) >= today).length,
      });
    }
  }

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

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <Eye className="w-6 h-6 text-purple-600" />
              <span className="text-xl font-bold text-gray-900">Audience Lab</span>
            </Link>
            <div className="flex gap-4">
              <Link href="/dashboard" className="text-purple-600 font-medium">
                Dashboard
              </Link>
              <Link href="/dashboard/install" className="text-gray-600 hover:text-gray-900">
                Install
              </Link>
              <Link href="/dashboard/settings" className="text-gray-600 hover:text-gray-900">
                Settings
              </Link>
              <Link href="/docs" className="text-gray-600 hover:text-gray-900">
                Docs
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Visitor Dashboard</h1>

        {stats.total === 0 && (
          <div className="mb-8 p-6 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              🚀 Get Started: Install Tracking Script
            </h3>
            <p className="text-purple-800 mb-4">
              You haven&apos;t tracked any visitors yet. Install the tracking script on your website to start identifying visitors.
            </p>
            <Link
              href="/dashboard/install"
              className="inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
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
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search visitors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-gray-900"
                />
              </div>
            </div>
            <select
              value={filterIdentified}
              onChange={(e) => setFilterIdentified(e.target.value as any)}
              className="px-4 py-2 border rounded-lg text-gray-900"
            >
              <option value="all">All Visitors</option>
              <option value="identified">Identified Only</option>
              <option value="anonymous">Anonymous Only</option>
            </select>
            <select
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value as any)}
              className="px-4 py-2 border rounded-lg text-gray-900"
            >
              <option value="all">All Devices</option>
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Recent Visitors</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visitor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page Views</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVisitors.map((visitor) => (
                  <tr key={visitor.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/dashboard/visitors/${visitor.id}`}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{visitor.name || 'Anonymous'}</div>
                        <div className="text-sm text-gray-500">{visitor.email || visitor.ip_address}</div>
                        {visitor.is_returning && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Returning
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{visitor.company || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {visitor.city && visitor.country ? `${visitor.city}, ${visitor.country}` : visitor.country || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {visitor.device_type ? (
                        <span className="capitalize">{visitor.device_type}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {visitor.utm_source || visitor.utm_medium ? (
                        <div>
                          <div>{visitor.utm_source || '-'}</div>
                          {visitor.utm_campaign && (
                            <div className="text-xs text-gray-500">{visitor.utm_campaign}</div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{visitor.page_views}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDistanceToNow(new Date(visitor.last_seen), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-600">{label}</div>
        </div>
      </div>
    </div>
  );
}
