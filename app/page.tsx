import Link from "next/link";
import { Eye, Users, Zap, BarChart3, Slack, Globe, MousePointer, Clock, TrendingUp, Shield, Webhook, Mail, Filter, Bell, Target, Activity, MapPin, Monitor, Smartphone } from "lucide-react";

export default function Home() {
  console.log('=== HOME PAGE RENDERING ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Timestamp:', new Date().toISOString());
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-sm fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Eye className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">Audience Lab</span>
            </div>
            <div className="flex gap-4">
              <Link href="/login" className="text-white hover:text-purple-300 transition">
                Login
              </Link>
              <Link href="/signup" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full border border-purple-500/30 mb-8">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-purple-200 text-sm">Real-time B2B visitor intelligence</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 leading-tight">
            Know Who&apos;s<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              On Your Site
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-purple-200 mb-12 max-w-3xl mx-auto">
            Identify anonymous B2B visitors, get their contact info, and turn website traffic into qualified pipeline. 
            Like RB2B, but better.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/signup"
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-lg transition shadow-lg shadow-purple-500/50"
            >
              Start Free Trial
            </Link>
            <Link
              href="/docs"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold text-lg transition backdrop-blur-sm border border-white/20"
            >
              View Demo
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-4xl font-bold text-white mb-2">95%</div>
              <div className="text-purple-300 text-sm">Visitor Identification</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">&lt;100ms</div>
              <div className="text-purple-300 text-sm">Real-time Tracking</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">24/7</div>
              <div className="text-purple-300 text-sm">Instant Alerts</div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Track Section */}
      <section className="py-20 px-4 bg-black/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything About Your Visitors
            </h2>
            <p className="text-xl text-purple-200">
              Our pixel tracks 50+ data points automatically
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <TrackingCard
              icon={<Users className="w-8 h-8" />}
              title="Identity"
              items={["Name & Email", "Company", "Job Title", "LinkedIn Profile"]}
            />
            <TrackingCard
              icon={<MapPin className="w-8 h-8" />}
              title="Location"
              items={["City & Country", "IP Address", "Timezone", "ISP Detection"]}
            />
            <TrackingCard
              icon={<Monitor className="w-8 h-8" />}
              title="Device"
              items={["Desktop/Mobile", "Screen Size", "Browser", "Operating System"]}
            />
            <TrackingCard
              icon={<Activity className="w-8 h-8" />}
              title="Behavior"
              items={["Page Views", "Time on Site", "Scroll Depth", "Click Tracking"]}
            />
            <TrackingCard
              icon={<Target className="w-8 h-8" />}
              title="Marketing"
              items={["UTM Parameters", "Traffic Source", "Campaign", "Landing Page"]}
            />
            <TrackingCard
              icon={<MousePointer className="w-8 h-8" />}
              title="Engagement"
              items={["Form Interactions", "Button Clicks", "Exit Intent", "Session Recording"]}
            />
            <TrackingCard
              icon={<Clock className="w-8 h-8" />}
              title="Sessions"
              items={["Session Duration", "Return Visits", "Bounce Rate", "Page Sequence"]}
            />
            <TrackingCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Intent Signals"
              items={["Pricing Views", "Demo Requests", "High-Value Pages", "Lead Scoring"]}
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-purple-200">
              Everything you need to convert visitors into customers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Slack className="w-12 h-12 text-purple-400" />}
              title="Slack Notifications"
              description="Get instant alerts when high-value visitors land on your site. See their name, company, and what they're viewing in real-time."
            />
            <FeatureCard
              icon={<Users className="w-12 h-12 text-purple-400" />}
              title="Person-Level ID"
              description="Identify individual visitors, not just companies. Get names, emails, job titles, and LinkedIn profiles automatically."
            />
            <FeatureCard
              icon={<Globe className="w-12 h-12 text-purple-400" />}
              title="Company Enrichment"
              description="Automatically identify companies from IP addresses. Get company size, industry, revenue, and tech stack."
            />
            <FeatureCard
              icon={<Filter className="w-12 h-12 text-purple-400" />}
              title="Advanced Filtering"
              description="Filter visitors by company, location, source, device, and more. Save custom segments for quick access."
            />
            <FeatureCard
              icon={<BarChart3 className="w-12 h-12 text-purple-400" />}
              title="Analytics Dashboard"
              description="Beautiful, real-time dashboard showing visitor activity, traffic sources, and conversion funnels."
            />
            <FeatureCard
              icon={<Bell className="w-12 h-12 text-purple-400" />}
              title="Smart Alerts"
              description="Set up custom alerts based on visitor behavior, company size, or engagement level. Never miss a hot lead."
            />
            <FeatureCard
              icon={<Webhook className="w-12 h-12 text-purple-400" />}
              title="Webhooks & API"
              description="Send visitor data anywhere with webhooks. Full REST API for custom integrations and automation."
            />
            <FeatureCard
              icon={<Mail className="w-12 h-12 text-purple-400" />}
              title="CRM Integration"
              description="Sync leads directly to HubSpot, Salesforce, or any CRM. Automatic contact creation and enrichment."
            />
            <FeatureCard
              icon={<Shield className="w-12 h-12 text-purple-400" />}
              title="Privacy First"
              description="GDPR & CCPA compliant. Respect Do Not Track. Full data control and automatic deletion options."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-black/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-purple-200">
              Get started in 3 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <StepCard
              number="1"
              title="Install Pixel"
              description="Add one line of code to your website. Takes less than 60 seconds. No developer needed."
            />
            <StepCard
              number="2"
              title="Connect Integrations"
              description="Link your Slack, CRM, or webhook. Get notified instantly when visitors arrive."
            />
            <StepCard
              number="3"
              title="Convert Visitors"
              description="See who's on your site in real-time. Reach out while they're hot and close more deals."
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-12">
            Trusted by Growing Teams
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              quote="Audience Lab helped us identify 10x more leads than Google Analytics. Game changer."
              author="Sarah Chen"
              role="Head of Growth"
            />
            <TestimonialCard
              quote="The Slack notifications are incredible. We close deals faster because we know who's interested."
              author="Mike Rodriguez"
              role="Sales Director"
            />
            <TestimonialCard
              quote="Finally, a visitor tracking tool that actually identifies people, not just companies."
              author="Emily Watson"
              role="Marketing Manager"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Ready to Know Your Visitors?
          </h2>
          <p className="text-xl text-purple-200 mb-12">
            Start your free trial today. No credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-block px-12 py-5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-xl transition shadow-2xl shadow-purple-500/50"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-6 h-6 text-purple-400" />
                <span className="text-xl font-bold text-white">Audience Lab</span>
              </div>
              <p className="text-purple-300 text-sm">
                B2B visitor intelligence platform
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-purple-300 text-sm">
                <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
                <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
                <li><Link href="/dashboard/install" className="hover:text-white">Installation</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-purple-300 text-sm">
                <li><Link href="#" className="hover:text-white">About</Link></li>
                <li><Link href="#" className="hover:text-white">Blog</Link></li>
                <li><Link href="#" className="hover:text-white">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-purple-300 text-sm">
                <li><Link href="#" className="hover:text-white">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white">Terms</Link></li>
                <li><Link href="#" className="hover:text-white">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-purple-300 text-sm">
            © 2026 Audience Lab. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function TrackingCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition">
      <div className="text-purple-400 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-purple-200 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
            {item}
          </li>
        ))}
      </ul>
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

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-purple-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
        {number}
      </div>
      <h3 className="text-2xl font-semibold text-white mb-4">{title}</h3>
      <p className="text-purple-200">{description}</p>
    </div>
  );
}

function TestimonialCard({ quote, author, role }: { quote: string; author: string; role: string }) {
  return (
    <div className="p-8 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
      <p className="text-purple-100 mb-6 text-lg">&quot;{quote}&quot;</p>
      <div>
        <div className="font-semibold text-white">{author}</div>
        <div className="text-sm text-purple-300">{role}</div>
      </div>
    </div>
  );
}
