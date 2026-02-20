"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Eye, 
  LayoutDashboard, 
  Activity, 
  BarChart3, 
  Filter, 
  Bell, 
  Users, 
  Key, 
  Settings, 
  Code,
  LogOut 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: "/dashboard/activity", label: "Activity", icon: <Activity className="w-5 h-5" /> },
  { href: "/dashboard/analytics", label: "Analytics", icon: <BarChart3 className="w-5 h-5" /> },
  { href: "/dashboard/segments", label: "Segments", icon: <Filter className="w-5 h-5" /> },
  { href: "/dashboard/alerts", label: "Alerts", icon: <Bell className="w-5 h-5" /> },
  { href: "/dashboard/team", label: "Team", icon: <Users className="w-5 h-5" /> },
  { href: "/dashboard/api-keys", label: "API Keys", icon: <Key className="w-5 h-5" /> },
  { href: "/dashboard/settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
  { href: "/dashboard/install", label: "Install", icon: <Code className="w-5 h-5" /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b">
          <Link href="/" className="flex items-center gap-2">
            <Eye className="w-6 h-6 text-purple-600" />
            <span className="text-xl font-bold text-gray-900">Audience Lab</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
                           (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" />
            <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
