# Audience Lab 🔬

A comprehensive B2B visitor identification and tracking platform built with Next.js 14, Supabase, and TypeScript. Identify anonymous visitors, track their behavior, score leads, and get real-time notifications when high-value prospects visit your website.

## 🚀 Features

### Core Tracking
- ✅ Anonymous visitor tracking with session management
- ✅ Page view tracking with referrer and UTM parameters
- ✅ Custom event tracking API
- ✅ Click tracking (links and buttons)
- ✅ Form interaction tracking
- ✅ Scroll depth tracking (25%, 50%, 75%, 100%)
- ✅ Time on page measurement
- ✅ Returning visitor detection
- ✅ Page exit tracking with sendBeacon

### Visitor Intelligence
- ✅ IP geolocation (city, country, timezone)
- ✅ Company identification from IP address
- ✅ Device detection (mobile/desktop, screen size)
- ✅ Browser & OS detection
- ✅ UTM parameter capture
- ✅ Traffic source tracking
- ✅ ISP and organization detection

### Dashboard & Analytics
- ✅ Real-time visitor dashboard with live updates
- ✅ Visitor detail pages with full activity timeline
- ✅ Search and filtering (by name, email, company, location)
- ✅ Lead scoring system with hot/warm/cold indicators
- ✅ Real-time activity feed
- ✅ Analytics & reports page with charts
- ✅ CSV export functionality
- ✅ Multi-tenant workspace support

### Advanced Features
- ✅ Saved segments for quick filtering
- ✅ Custom alert rules with conditions
- ✅ Team management with invitations
- ✅ API keys management with permissions
- ✅ Slack notifications
- ✅ Webhook support
- 🔜 Email notifications (daily summaries)
- 🔜 CRM integrations (HubSpot, Salesforce)
- 🔜 Company enrichment (Clearbit, ZoomInfo)
- 🔜 LinkedIn profile enrichment

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **Deployment**: Vercel
- **Analytics**: Custom tracking script
- **Icons**: Lucide React
- **Date Formatting**: date-fns

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/codyrutscher/rb2b-audience-lab.git
cd rb2b-audience-lab
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run migrations in order from `supabase/migrations/`:
   - `001_initial_schema.sql`
   - `002_workspaces_and_auth.sql`
   - `003_device_and_utm_tracking.sql`
   - `004_events_tracking.sql`
   - `005_advanced_tracking.sql`
   - `006_missing_features.sql`
   - `007_retarget_integration.sql`
4. Disable email confirmation in Authentication settings
5. Copy your project URL and keys from Settings > API

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# For Reactivate: direct Postgres URL (same Supabase project → Settings → Database)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
# Optional: HUGGINGFACE_TOKEN, PINECONE_API_KEY, PINECONE_INDEX_NAME, RESEND_API_KEY, RESEND_FROM_EMAIL
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your app!

### 5. Reactivate

The **Reactivate** feature adds AI-powered email retargeting:

1. **Apply migration** `007_retarget_integration.sql` in Supabase SQL Editor (creates rt_* tables, links to workspaces).
2. **Add `DATABASE_URL`** to your existing `.env.local` — same database as Supabase; get it from Supabase → Settings → Database → Connection string (URI).
3. **Run `npx prisma generate`** to generate the Prisma client.
4. **Run the worker** (separate terminal) for document processing and email jobs:
   ```bash
   npm run worker
   ```
5. Go to **Dashboard → Reactivate** to create segments, knowledge banks, upload docs, and preview emails.

Optional env for full functionality: `HUGGINGFACE_TOKEN`, `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_BASE_URL`.

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy!

## 🎯 Usage

### Installing the Tracking Script

1. Sign up and create an account at your deployed URL
2. Go to Dashboard → Install
3. Copy your personalized tracking script
4. Add it to your website's `<head>` tag:

```html
<script src="https://your-domain.com/track.js" data-workspace-id="your-workspace-id"></script>
```

### Identifying Visitors

Use the global `AudienceLab` object to identify visitors when you capture their information:

```javascript
AudienceLab.identify({
  name: 'John Doe',
  email: 'john@company.com',
  company: 'Acme Inc',
  linkedin_url: 'https://linkedin.com/in/johndoe'
});
```

### Tracking Custom Events

Track any custom event with metadata:

```javascript
AudienceLab.track('button_clicked', {
  button_name: 'Sign Up',
  page: '/pricing',
  plan: 'enterprise'
});
```

## 📊 Database Schema

The application uses 19 tables organized into categories:

### Core Tables
- `visitors` - Visitor profiles and identification data
- `page_views` - Page view events with metadata
- `events` - Custom event tracking
- `sessions` - User session management
- `clicks` - Click tracking data
- `form_interactions` - Form engagement tracking

### Workspace & Auth
- `workspaces` - Multi-tenant workspace management
- `user_workspaces` - User-workspace relationships

### Advanced Features
- `lead_scores` - Automatic lead scoring
- `segments` - Saved filter combinations
- `alert_rules` - Custom notification rules
- `activity_feed` - Real-time activity stream
- `integrations` - Third-party integrations
- `notifications` - Notification history
- `api_keys` - API key management
- `team_invitations` - Team member invitations
- `enrichment_cache` - Cached enrichment data
- `email_campaigns` - Email notification campaigns
- `exports` - Export history and status

All tables include Row Level Security (RLS) policies for data isolation.

## 📈 Lead Scoring

Automatic lead scoring based on visitor behavior:

- Identified visitor: +20 points
- Company identified: +15 points
- Page views: +2 points each (max 30)
- Returning visitor: +10 points
- LinkedIn profile: +10 points
- UTM campaign: +15 points

Score ranges:
- 🔥 Hot: 70+ points
- ⚡ Warm: 40-69 points
- 💡 Interested: 20-39 points
- ❄️ Cold: <20 points

## 🚦 API Endpoints

- `POST /api/track` - Track page views
- `POST /api/identify` - Identify visitors
- `POST /api/event` - Track custom events
- `POST /api/page-exit` - Track page exits
- `POST /api/export` - Export data to CSV
- `GET /api/health` - Health check

## 🎨 Dashboard Pages

- `/` - Landing page with features showcase
- `/login` - User login
- `/signup` - User registration
- `/dashboard` - Main visitor dashboard with real-time updates
- `/dashboard/activity` - Real-time activity feed
- `/dashboard/analytics` - Analytics & reports with charts
- `/dashboard/segments` - Saved segments management
- `/dashboard/reactivate` - Reactivate (AI email retargeting: segments, knowledge banks, copy preview)
- `/dashboard/alerts` - Custom alert rules
- `/dashboard/team` - Team member management
- `/dashboard/api-keys` - API key management
- `/dashboard/settings` - Integrations & settings
- `/dashboard/install` - Installation guide
- `/dashboard/visitors/[id]` - Detailed visitor profile

## 🔄 Real-time Updates

The dashboard uses Supabase Realtime subscriptions for live updates:
- New visitors appear instantly
- Activity feed updates in real-time
- Visitor stats refresh automatically
- No page refresh needed

## 🔐 Security Features

- Row Level Security (RLS) enabled on all tables
- API keys with granular permissions (read, write, delete)
- Secure authentication with Supabase Auth
- Environment variables for sensitive data
- HTTPS-only tracking script
- Workspace isolation for multi-tenancy

## 📝 Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── event/        # Custom event tracking
│   │   ├── export/       # CSV export
│   │   ├── health/       # Health check
│   │   ├── identify/     # Visitor identification
│   │   ├── page-exit/    # Page exit tracking
│   │   └── track/        # Page view tracking
│   ├── dashboard/        # Dashboard pages
│   │   ├── activity/     # Real-time activity feed
│   │   ├── alerts/       # Alert rules management
│   │   ├── analytics/    # Analytics & reports
│   │   ├── api-keys/     # API key management
│   │   ├── install/      # Installation guide
│   │   ├── segments/     # Saved segments
│   │   ├── settings/     # Integrations settings
│   │   ├── team/         # Team management
│   │   └── visitors/[id] # Visitor detail page
│   ├── docs/             # Documentation
│   ├── login/            # Login page
│   ├── signup/           # Signup page
│   └── page.tsx          # Landing page
├── lib/
│   ├── ip-lookup.ts      # IP geolocation service
│   ├── notifications.ts  # Slack notifications
│   ├── supabase-auth.ts  # Auth helpers
│   └── supabase.ts       # Supabase client & types
├── public/
│   └── track.js          # Tracking script
├── supabase/
│   └── migrations/       # Database migrations
└── README.md
```

## 🔌 Integrations

### Slack Notifications
1. Go to Dashboard → Settings
2. Create a Slack webhook at https://api.slack.com/messaging/webhooks
3. Add the webhook URL
4. Get notified when visitors arrive!

### Webhooks
1. Go to Dashboard → Settings
2. Add your webhook URL
3. Receive visitor data in real-time

### API Keys
1. Go to Dashboard → API Keys
2. Create a new API key with desired permissions
3. Use the key in your API requests

## 🤝 Team Collaboration

Invite team members to collaborate:
1. Go to Dashboard → Team
2. Click "Invite Member"
3. Enter email and select role (Member, Admin, Owner)
4. They'll receive an invitation to join

## 📊 Analytics & Reports

View comprehensive analytics:
- Total visitors and identification rate
- Page views and average time on site
- Top countries and companies
- Device breakdown
- Traffic sources (UTM)
- Daily visitor trends

## 🎯 Saved Segments

Create and save filter combinations:
- Identified vs anonymous visitors
- By company, location, or UTM source
- By device type
- Quick access to frequently used filters

## 🔔 Custom Alerts

Set up conditional alerts:
- When visitor is identified
- When page views exceed threshold
- When specific company visits
- When lead score exceeds threshold
- Send to Slack, email, or webhook

## 📤 Data Export

Export your data to CSV:
- Export all visitors
- Export page views
- Export with filters applied
- Download instantly

## 🚧 Roadmap

- [ ] Email notifications (daily summaries, weekly reports)
- [ ] HubSpot CRM integration
- [ ] Salesforce CRM integration
- [ ] Clearbit company enrichment
- [ ] ZoomInfo integration
- [ ] LinkedIn profile enrichment
- [ ] Session replay
- [ ] A/B testing
- [ ] Advanced filtering with date ranges
- [ ] Bulk actions
- [ ] Custom properties

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Inspired by RB2B
- Built with Next.js and Supabase
- Icons by Lucide
- Deployed on Vercel

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check the documentation at `/docs`
- Review the installation guide at `/dashboard/install`

---

Built with ❤️ by [Cody Rutscher](https://github.com/codyrutscher)
