"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, TrendingUp, Globe, Monitor, Users, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-auth";

type AnalyticsData = {
  totalVisitors: number;
  identifiedVisitors: number;
  totalPageViews: number;
  avgTimeOnSite: number;
  topCountries: Array<{ country: string; count: number }>;
  topCompanies: Array<{ company: string; count: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
  utmSources: Array<{ source: string; count: number }>;
  dailyVisitors: Array<{ date: string; count: number }>;
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    const user = await getCurrentUser();
    if (!user) return;

    // Get actual workspace_id from user_workspaces
    const { data: uw } = await supabase
      .from('user_workspaces')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    const workspaceId = uw?.workspace_id || user.id;

    // Calculate date range
    const now = new Date();
    const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Fetch visitors
    const { data: visitors } = await supabase
      .from('visitors')
      .select('*')
      .eq('workspace_id', workspaceId)
      .gte('first_seen', startDate.toISOString());

    // Fetch page views - page_views doesn't have workspace_id, so filter by visitor_ids
    let pageViews: any[] = [];
    if (visitors && visitors.length > 0) {
      const visitorIds = visitors.map((v: any) => v.id);
      // Supabase .in() has a limit, batch if needed
      const batchSize = 100;
      for (let i = 0; i < visitorIds.length; i += batchSize) {
        const batch = visitorIds.slice(i, i + batchSize);
        const { data: pvBatch } = await supabase
          .from('page_views')
          .select('*')
          .in('visitor_id', batch)
          .gte('timestamp', startDate.toISOString());
        if (pvBatch) pageViews.push(...pvBatch);
      }
    }

    if (visitors) {
      // Calculate metrics
      const totalVisitors = visitors.length;
      const identifiedVisitors = visitors.filter((v: any) => v.identified).length;
      const totalPageViews = pageViews.length;
      
      // Average time on site
      const avgTime = pageViews
        .filter((pv: any) => pv.time_on_page)
        .reduce((sum: number, pv: any) => sum + (pv.time_on_page || 0), 0) / pageViews.length;

      // Top countries
      const countryCounts = visitors.reduce((acc: any, v: any) => {
        if (v.country) {
          acc[v.country] = (acc[v.country] || 0) + 1;
        }
        return acc;
      }, {});
      const topCountries = Object.entries(countryCounts)
        .map(([country, count]) => ({ country, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Top companies
      const companyCounts = visitors.reduce((acc: any, v: any) => {
        if (v.company) {
          acc[v.company] = (acc[v.company] || 0) + 1;
        }
        return acc;
      }, {});
      const topCompanies = Object.entries(companyCounts)
        .map(([company, count]) => ({ company, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Device breakdown
      const deviceCounts = visitors.reduce((acc: any, v: any) => {
        const device = v.device_type || 'unknown';
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {});
      const deviceBreakdown = Object.entries(deviceCounts)
        .map(([device, count]) => ({ device, count: count as number }));

      // UTM sources
      const utmCounts = visitors.reduce((acc: any, v: any) => {
        if (v.utm_source) {
          acc[v.utm_source] = (acc[v.utm_source] || 0) + 1;
        }
        return acc;
      }, {});
      const utmSources = Object.entries(utmCounts)
        .map(([source, count]) => ({ source, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Daily visitors (simplified)
      const dailyVisitors: Array<{ date: string; count: number }> = [];
      for (let i = daysAgo - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const count = visitors.filter((v: any) => 
          v.first_seen.startsWith(dateStr)
        ).length;
        dailyVisitors.push({ date: dateStr, count });
      }

      setAnalytics({
        totalVisitors,
        identifiedVisitors,
        totalPageViews,
        avgTimeOnSite: Math.round(avgTime) || 0,
        topCountries,
        topCompanies,
        deviceBreakdown,
        utmSources,
        dailyVisitors,
      });
    }

    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAnalytics from useCallback(dateRange)
  }, [loadAnalytics]);

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics &amp; Reports</h1>
            <p className="text-gray-400">Insights and metrics for your visitor data</p>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-primary focus:outline-none transition"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading analytics...</div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid md:grid-cols-4 gap-6">
              <MetricCard
                icon={<Users />}
                label="Total Visitors"
                value={analytics.totalVisitors.toString()}
                color="purple"
              />
              <MetricCard
                icon={<TrendingUp />}
                label="Identified"
                value={analytics.identifiedVisitors.toString()}
                color="green"
              />
              <MetricCard
                icon={<Eye />}
                label="Page Views"
                value={analytics.totalPageViews.toString()}
                color="blue"
              />
              <MetricCard
                icon={<BarChart3 />}
                label="Avg. Time on Site"
                value={formatTime(analytics.avgTimeOnSite)}
                color="orange"
              />
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Countries */}
              <div className="glass neon-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-accent-primary" />
                  <h2 className="text-lg font-semibold text-white">Top Countries</h2>
                </div>
                <div className="space-y-3">
                  {analytics.topCountries.length > 0 ? analytics.topCountries.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-white">{item.country}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-dark-tertiary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-purple"
                            style={{ width: `${(item.count / analytics.totalVisitors) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400 w-8 text-right">{item.count}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-gray-500 text-sm">No country data available</p>
                  )}
                </div>
              </div>

              {/* Device Breakdown */}
              <div className="glass neon-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="w-5 h-5 text-accent-primary" />
                  <h2 className="text-lg font-semibold text-white">Device Breakdown</h2>
                </div>
                <div className="space-y-3">
                  {analytics.deviceBreakdown.length > 0 ? analytics.deviceBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-white capitalize">{item.device}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-dark-tertiary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${(item.count / analytics.totalVisitors) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400 w-8 text-right">{item.count}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-gray-500 text-sm">No device data available</p>
                  )}
                </div>
              </div>
            </div>

            {/* More Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Companies */}
              <div className="glass neon-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Top Companies</h2>
                <div className="space-y-3">
                  {analytics.topCompanies.length > 0 ? analytics.topCompanies.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-white">{item.company}</span>
                      <span className="text-sm font-medium text-gray-400">{item.count} visitors</span>
                    </div>
                  )) : (
                    <p className="text-gray-500 text-sm">No company data available</p>
                  )}
                </div>
              </div>

              {/* UTM Sources */}
              <div className="glass neon-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Traffic Sources</h2>
                <div className="space-y-3">
                  {analytics.utmSources.length > 0 ? analytics.utmSources.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-white">{item.source}</span>
                      <span className="text-sm font-medium text-gray-400">{item.count} visitors</span>
                    </div>
                  )) : (
                    <p className="text-gray-500 text-sm">No UTM source data available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Daily Visitors Chart */}
            <div className="glass neon-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Daily Visitors</h2>
              <div className="flex items-end gap-2 h-48">
                {analytics.dailyVisitors.map((item, idx) => {
                  const maxCount = Math.max(...analytics.dailyVisitors.map(d => d.count));
                  const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-gradient-purple rounded-t hover:shadow-lg hover:shadow-accent-primary/30 transition-all" 
                        style={{ height: `${Math.max(height, 2)}%` }} 
                      />
                      <span className="text-xs text-gray-400">{new Date(item.date).getDate()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">No data available</div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorClasses = {
    purple: 'bg-gradient-purple shadow-accent-primary/20',
    green: 'bg-green-500 shadow-green-500/20',
    blue: 'bg-blue-500 shadow-blue-500/20',
    orange: 'bg-orange-500 shadow-orange-500/20',
  };

  return (
    <div className="glass neon-border rounded-xl p-6 hover:shadow-lg hover:shadow-accent-primary/10 transition-all group">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg text-white shadow-lg ${colorClasses[color as keyof typeof colorClasses]} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-sm text-gray-400">{label}</div>
        </div>
      </div>
    </div>
  );
}
