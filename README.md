# Audience Lab 🔬

A modern B2B visitor identification platform built with Next.js and Supabase. Identify anonymous website visitors, track their behavior, and convert them into leads.

## Features

- 🎯 **Person-Level Identification** - Get names, emails, and LinkedIn profiles
- ⚡ **Real-Time Tracking** - Live visitor activity with WebSocket updates
- 📊 **Analytics Dashboard** - Beautiful UI to view visitor data
- 🔗 **Easy Integration** - Simple JavaScript snippet
- 🚀 **Scalable** - Built on Supabase and Vercel

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/codyrutscher/rb2b-audience-lab.git
cd rb2b-audience-lab
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL from `/app/docs/page.tsx` in your Supabase SQL editor
3. Copy your project URL and keys

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials.

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your app!

## Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/codyrutscher/rb2b-audience-lab)

1. Click the button above or run `vercel`
2. Add your environment variables in Vercel dashboard
3. Deploy!

## Usage

### Install Tracking Script

Add to your website's `<head>`:

```html
<script src="https://your-domain.vercel.app/track.js"></script>
```

### Identify Visitors

When you capture user information:

```javascript
audienceLabIdentify({
  email: 'user@company.com',
  name: 'John Doe',
  company: 'Acme Corp',
  linkedinUrl: 'https://linkedin.com/in/johndoe'
});
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Language**: TypeScript

## Project Structure

```
├── app/
│   ├── api/          # API routes (tracking, identification)
│   ├── dashboard/    # Dashboard UI
│   ├── docs/         # Documentation page
│   └── page.tsx      # Landing page
├── lib/
│   └── supabase.ts   # Supabase client & types
├── public/
│   └── track.js      # Tracking script
└── README.md
```

## Roadmap

- [ ] Email notifications for new visitors
- [ ] Slack integration
- [ ] Company enrichment API integration
- [ ] Advanced filtering and search
- [ ] Webhook support
- [ ] Chrome extension

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT

---

Built with ❤️ by [Cody Rutscher](https://github.com/codyrutscher)
