# Supabase Migrations

This folder contains all database migrations for Audience Lab in chronological order.

## Migration Order

Run these migrations in order in your Supabase SQL Editor:

### 1. Initial Setup (001)
**File:** `001_initial_schema.sql`
**Description:** Core tables for visitors and page views
**Creates:**
- `visitors` table
- `page_views` table
- Basic indexes and RLS policies
- Realtime subscriptions

### 2. Workspaces & Authentication (002)
**File:** `002_workspaces_and_auth.sql`
**Description:** Multi-tenant workspace support
**Creates:**
- `workspaces` table
- `user_workspaces` junction table
- `integrations` table
- `notifications` table
- Workspace-scoped RLS policies

### 3. Device & UTM Tracking (003)
**File:** `003_device_and_utm_tracking.sql`
**Description:** Device information and marketing attribution
**Adds to visitors:**
- Device type, screen size, language, timezone
- UTM parameters (source, medium, campaign, term, content)
- Landing page tracking

### 4. Custom Events (004)
**File:** `004_events_tracking.sql`
**Description:** Custom event tracking system
**Creates:**
- `events` table for custom events
- Event-specific indexes and policies

### 5. Advanced Tracking (005)
**File:** `005_advanced_tracking.sql`
**Description:** Scroll depth, clicks, forms, sessions
**Creates:**
- `clicks` table
- `form_interactions` table
- `sessions` table
**Adds to visitors:**
- Returning visitor flag
- Session statistics
- Bounce rate calculation
**Adds to page_views:**
- Time on page
- Scroll depth
- Click count
- Exit page flag

## Quick Setup

### Option 1: Run All Migrations
Copy and paste each migration file in order into Supabase SQL Editor.

### Option 2: Use the Complete Setup Script
If starting fresh, you can use `../setup-complete.sql` which combines migrations 001-002.

## After Running Migrations

1. **Disable the user creation trigger** (if you get signup errors):
   ```sql
   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
   ```

2. **Enable Email Authentication:**
   - Go to Authentication → Providers in Supabase Dashboard
   - Enable Email provider
   - Configure Site URL and Redirect URLs

3. **Set Environment Variables in Vercel:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

## Migration Status Tracking

Keep track of which migrations you've run:

- [ ] 001_initial_schema.sql
- [ ] 002_workspaces_and_auth.sql
- [ ] 003_device_and_utm_tracking.sql
- [ ] 004_events_tracking.sql
- [ ] 005_advanced_tracking.sql

## Rollback

If you need to rollback, drop tables in reverse order:

```sql
-- Rollback 005
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS form_interactions CASCADE;
DROP TABLE IF EXISTS clicks CASCADE;
DROP FUNCTION IF EXISTS calculate_bounce_rate CASCADE;
DROP FUNCTION IF EXISTS update_visitor_stats CASCADE;

-- Rollback 004
DROP TABLE IF EXISTS events CASCADE;

-- Rollback 003
ALTER TABLE visitors DROP COLUMN IF EXISTS device_type;
ALTER TABLE visitors DROP COLUMN IF EXISTS screen_width;
-- ... (drop other columns)

-- Rollback 002
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;
DROP TABLE IF EXISTS user_workspaces CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;

-- Rollback 001
DROP TABLE IF EXISTS page_views CASCADE;
DROP TABLE IF EXISTS visitors CASCADE;
```

## Notes

- Always backup your database before running migrations
- Test migrations in a development environment first
- Some migrations add columns with `IF NOT EXISTS` so they're safe to re-run
- RLS policies are workspace-scoped for multi-tenancy
- Service role bypasses RLS for API operations
