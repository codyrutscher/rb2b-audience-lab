import Link from "next/link";
import { Eye, Users, Zap, BarChart3 } from "lucide-react";

export default function Home() {
  console.log('=== HOME PAGE RENDERING ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Timestamp:', new Date().toISOString());
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Eye className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">Audience Lab</span>
            </div>
            <div className="flex gap-4">
              <Link href="/dashboard" className="text-white hover:text-purple-300 transition">
                Dashboard
              </Link>
              <Link href="/docs" className="text-white hover:text-purple-300 transition">
                Docs
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Know Who&apos;s On Your Site
          </h1>
          <p className="text-xl md:text-2xl text-purple-200 mb-8 max-w-3xl mx-auto">
            Identify anonymous B2B visitors, get their contact info, and turn traffic into pipeline
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
            >
              Get Started
            </Link>
            <Link
              href="/docs"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition backdrop-blur-sm"
            >
              View Docs
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <FeatureCard
            icon={<Users className="w-12 h-12 text-purple-400" />}
            title="Person-Level ID"
            description="Get names, emails, and LinkedIn profiles of actual people visiting your site"
          />
          <FeatureCard
            icon={<Zap className="w-12 h-12 text-purple-400" />}
            title="Real-Time Alerts"
            description="Instant notifications when high-value prospects land on your pages"
          />
          <FeatureCard
            icon={<BarChart3 className="w-12 h-12 text-purple-400" />}
            title="Rich Analytics"
            description="Track visitor behavior, page views, and engagement patterns"
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-purple-200">{description}</p>
    </div>
  );
}
