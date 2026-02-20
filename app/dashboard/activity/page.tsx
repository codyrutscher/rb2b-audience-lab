"use client";

import { useEffect, useState } from "react";
import { Eye, Activity, User, MousePointer, FileText, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

type ActivityItem = {
  id: string;
  activity_type: string;
  title: string;
  description?: string;
  metadata?: any;
  timestamp: string;
  visitor_id?: string;
};

export default function ActivityFeedPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, (payload) => {
        setActivities(prev => [payload.new as ActivityItem, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadActivities() {
    const { data } = await supabase
      .from('activity_feed')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (data) {
      setActivities(data);
    }
    setLoading(false);
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case 'visitor_arrived':
        return <User className="w-5 h-5 text-green-600" />;
      case 'page_view':
        return <Eye className="w-5 h-5 text-blue-600" />;
      case 'button_clicked':
      case 'link_clicked':
        return <MousePointer className="w-5 h-5 text-purple-600" />;
      case 'form_submitted':
        return <FileText className="w-5 h-5 text-orange-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Real-Time Activity</h1>
            <p className="text-gray-600 mt-1">Live stream of visitor activity</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-800 font-medium">Live</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading activity...</div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No activity yet. Waiting for visitors...</p>
            </div>
          ) : (
            <div className="divide-y">
              {activities.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{activity.title}</p>
                          {activity.description && (
                            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          )}
                          {activity.metadata && (
                            <div className="mt-2 text-xs text-gray-500">
                              {Object.entries(activity.metadata).map(([key, value]) => (
                                <span key={key} className="mr-3">
                                  <span className="font-medium">{key}:</span> {String(value)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
