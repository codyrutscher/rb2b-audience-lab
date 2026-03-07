# DigitalOcean Worker Setup

This guide covers deploying the Reactivate worker to DigitalOcean App Platform so it can process jobs (segment evaluation, email sends, pixel fetches) 24/7 alongside your Vercel-hosted Next.js app.

---

## Option A: App Platform (Recommended – simplest)

### 1. Create a Worker component

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Create a **new app** or add a **component** to an existing app
3. Connect your GitHub/GitLab repo (`rb2b-audience-lab`)
4. Add a **Worker** component (not a Web Service)

### 2. Configure the Worker

| Setting | Value |
|--------|--------|
| **Source** | Same repo as your app |
| **Branch** | `main` (or your default) |
| **Build Command** | `npm install && npx prisma generate` |
| **Run Command** | `npx tsx scripts/reactivate-worker.ts` |

### 3. Resource allocation

- **Instance size**: Basic ($5/mo) is enough for ~1,000 contacts/hour
- No scaling needed for a single-worker setup

### 4. Environment variables

Add these in App Platform → your Worker component → Settings → App-Level Environment Variables (or component-level). Use the **same values** as your Vercel app so both use the same database and services.

#### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string (Supabase pooler URL) |
| `RESEND_API_KEY` | From [resend.com](https://resend.com) |
| `RESEND_FROM_EMAIL` | Verified sender email, e.g. `noreply@yourdomain.com` |
| `HUGGINGFACE_TOKEN` | For copy generation |
| `PINECONE_API_KEY` | For vector retrieval |
| `PINECONE_INDEX_NAME` | Your Pinecone index, e.g. `retarget-mvp` |

#### Required for pixel fetch

| Variable | Description |
|----------|-------------|
| `AUDIENCELAB_API_KEY` | Or set per-pixel in the Campaigns UI |

#### Optional but recommended

| Variable | Description |
|----------|-------------|
| `RESEND_FROM_NAME` | Sender name, e.g. `Audience Lab` |
| `APP_BASE_URL` | Your app URL for unsubscribe links, e.g. `https://your-app.vercel.app` |
| `COPY_GENERATION_MODEL` | LLM model, e.g. `meta-llama/Llama-3.2-3B-Instruct` |
| `UPLOAD_DIR` | Leave default or set to `/tmp/uploads` |

#### For knowledge bank document processing

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL` | Supabase project URL (for downloading documents from Storage) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (for Storage access) |

#### Not needed by the worker

| Variable | Omit or optional |
|----------|-------------------|
| Other `NEXT_PUBLIC_*` | Not used by worker |

### 5. Deploy

- Save and deploy
- The worker starts and polls `rt_jobs` every 2 seconds
- Check **Runtime Logs** for `Reactivate worker started` and job processing output

---

## Option B: Droplet (more control)

For a standard droplet instead of App Platform:

### 1. Create a Droplet

- Image: **Ubuntu 22.04**
- Plan: **Basic $6/mo** (1 GB RAM, 1 vCPU)
- Add your SSH key

### 2. Initial setup

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 3. Deploy the worker

```bash
# Create app directory
sudo mkdir -p /var/www/reactivate-worker
sudo chown $USER:$USER /var/www/reactivate-worker
cd /var/www/reactivate-worker

# Clone repo (or use git pull if updating)
git clone https://github.com/your-org/rb2b-audience-lab.git .

# Install and generate Prisma
npm install
npx prisma generate

# Create .env with your production variables
nano .env   # paste your DATABASE_URL, RESEND_*, HUGGINGFACE_TOKEN, etc.
```

### 4. Create ecosystem file for PM2

Create `/var/www/reactivate-worker/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'reactivate-worker',
    script: 'npx',
    args: 'tsx scripts/reactivate-worker.ts',
    cwd: '/var/www/reactivate-worker',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
    },
  }],
};
```

### 5. Start and enable on boot

```bash
cd /var/www/reactivate-worker
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow prompt to enable on boot
```

### 6. Updates

```bash
cd /var/www/reactivate-worker
git pull
npm install
npx prisma generate
pm2 restart reactivate-worker
```

---

## Shared database

Both Vercel (Next.js) and the DigitalOcean worker must use the **same** `DATABASE_URL` (e.g. your Supabase Postgres connection string). Jobs created by the Next.js app and pixel webhooks are stored in `rt_jobs` and processed by the worker.

---

## Verifying it works

1. In your app, trigger a pixel fetch (Campaigns → Pixels → Fetch now)
2. Or create a contact via the Segments page sample data
3. In DigitalOcean, open the worker’s **Runtime Logs**
4. You should see lines like:
   - `[FetchPixelDataJob] pixel_id=... pages=... contacts=...`
   - `[EvaluateSegmentsJob] contact_id=... -> segment_id=...`
   - `[SendCampaignEmailJob] contact_id=... campaign_id=... sent=true`

---

## Vercel + Knowledge Bank Uploads

Vercel has a read-only filesystem. Document uploads go to **Supabase Storage** (bucket `knowledge-documents`). Ensure:

1. **Create the bucket** – Run `supabase/migrations/019_knowledge_documents_bucket.sql` in Supabase SQL Editor.
2. **Vercel env vars**: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`
3. **Worker env vars**: Same as above so the worker can download and process documents.

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Worker won't start | `DATABASE_URL` correct? Run `npx prisma generate` in build |
| No jobs processing | Same `DATABASE_URL` as Vercel? Worker logs show polling? |
| Emails not sending | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` set? Domain verified in Resend? |
| Copy generation fails | `HUGGINGFACE_TOKEN` set? |
| Pixel fetch fails | `AUDIENCELAB_API_KEY` or per-pixel API key set? |
