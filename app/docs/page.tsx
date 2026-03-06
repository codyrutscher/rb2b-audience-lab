import Link from "next/link";
import { Eye, Code, Database, Zap } from "lucide-react";

export default function Docs() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <Eye className="w-6 h-6 text-purple-600" />
              <span className="text-xl font-bold">Audience Lab</span>
            </Link>
            <div className="flex gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/docs" className="text-purple-600 font-medium">
                Docs
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-4">Documentation</h1>
        <p className="text-xl text-gray-600 mb-12">
          Get started with Audience Lab in minutes
        </p>

        <Section icon={<Database />} title="1. Setup Supabase">
          <p className="mb-4">Create a new Supabase project and run the SQL schema:</p>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Go to your Supabase project dashboard</li>
            <li>Navigate to SQL Editor</li>
            <li>Copy the contents of <code className="bg-gray-100 px-2 py-1 rounded">supabase/schema.sql</code></li>
            <li>Paste and run the SQL</li>
          </ol>
          <p className="text-sm text-gray-600">
            The schema includes visitors and page_views tables, indexes, RLS policies, and real-time subscriptions.
          </p>
        </Section>

        <Section icon={<Code />} title="2. Install Tracking Script">
          <p className="mb-4">Add this script to your website&apos;s HTML:</p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`<script src="https://your-domain.vercel.app/track.js"></script>`}
          </pre>
        </Section>

        <Section icon={<Zap />} title="3. Identify Visitors">
          <p className="mb-4">When you capture user info (form submission, login, etc.), call:</p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`audienceLabIdentify({
  email: 'user@company.com',
  name: 'John Doe',
  company: 'Acme Corp',
  linkedinUrl: 'https://linkedin.com/in/johndoe'
});`}
          </pre>
        </Section>

        <div className="mt-12 p-6 bg-purple-50 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-lg mb-2">Environment Variables</h3>
          <p className="text-sm text-gray-700 mb-4">
            Copy .env.example to .env and add your Supabase credentials
          </p>
          <pre className="bg-white p-3 rounded text-sm">
{`NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key`}
          </pre>
        </div>
      </main>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-purple-600">{icon}</div>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="text-gray-700">{children}</div>
    </div>
  );
}
