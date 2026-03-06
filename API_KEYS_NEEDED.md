# API Keys & Integrations Setup

## Required API Keys

### 1. IP Geolocation (Already Implemented)
**Current:** Using free APIs (ipapi.co, ip-api.com)
**Upgrade Options:**
- **IPinfo.io** - https://ipinfo.io/signup
  - Free: 50k requests/month
  - Paid: $99/month for 250k requests
  - Key: `IPINFO_API_KEY`

- **MaxMind GeoIP2** - https://www.maxmind.com/en/geoip2-services-and-databases
  - Paid: $50/month
  - Key: `MAXMIND_LICENSE_KEY`

### 2. Company Enrichment (To Implement)
**Clearbit** - https://clearbit.com/
- Pricing: $99-$999/month
- Features: Company data, logo, employee count, revenue
- Keys needed:
  - `CLEARBIT_API_KEY`
- Endpoints:
  - Company API: `https://company.clearbit.com/v2/companies/find?domain={domain}`
  - Reveal API: `https://reveal.clearbit.com/v1/companies/find?ip={ip}`

**ZoomInfo** - https://www.zoominfo.com/
- Enterprise pricing (contact sales)
- Features: B2B contact data, company info
- Keys needed:
  - `ZOOMINFO_API_KEY`
  - `ZOOMINFO_USERNAME`
  - `ZOOMINFO_PASSWORD`

**Alternative (Free/Cheaper):**
- **Builtwith** - https://api.builtwith.com/
  - $295/month for 10k lookups
  - Key: `BUILTWITH_API_KEY`

### 3. Email Discovery & Validation
**Hunter.io** - https://hunter.io/
- Free: 25 searches/month
- Paid: $49-$399/month
- Features: Find emails, verify emails
- Keys needed:
  - `HUNTER_API_KEY`
- Endpoints:
  - Email Finder: `https://api.hunter.io/v2/email-finder?domain={domain}&first_name={first}&last_name={last}`
  - Email Verifier: `https://api.hunter.io/v2/email-verifier?email={email}`

**Clearbit Enrichment** (Alternative)
- Included with Clearbit subscription
- Person API: `https://person.clearbit.com/v2/combined/find?email={email}`

### 4. LinkedIn Enrichment
**Proxycurl** - https://nubela.co/proxycurl/
- $300/month for 3k credits
- Features: LinkedIn profile data
- Keys needed:
  - `PROXYCURL_API_KEY`
- Endpoints:
  - Person Profile: `https://nubela.co/proxycurl/api/v2/linkedin?url={linkedin_url}`
  - Company Profile: `https://nubela.co/proxycurl/api/v2/linkedin/company?url={company_url}`

**RocketReach** (Alternative) - https://rocketreach.co/
- $99-$999/month
- Key: `ROCKETREACH_API_KEY`

### 5. CRM Integrations

#### HubSpot
- **Free** - https://developers.hubspot.com/
- Keys needed:
  - `HUBSPOT_API_KEY` or OAuth tokens
  - `HUBSPOT_PORTAL_ID`
- Endpoints:
  - Create Contact: `POST https://api.hubapi.com/crm/v3/objects/contacts`
  - Update Contact: `PATCH https://api.hubapi.com/crm/v3/objects/contacts/{id}`

#### Salesforce
- **Free** with Salesforce account - https://developer.salesforce.com/
- Keys needed:
  - `SALESFORCE_CLIENT_ID`
  - `SALESFORCE_CLIENT_SECRET`
  - `SALESFORCE_USERNAME`
  - `SALESFORCE_PASSWORD`
  - `SALESFORCE_SECURITY_TOKEN`
- OAuth flow required

#### Pipedrive
- **Free** with Pipedrive account - https://developers.pipedrive.com/
- Keys needed:
  - `PIPEDRIVE_API_KEY`
  - `PIPEDRIVE_DOMAIN`
- Endpoints:
  - Create Person: `POST https://{domain}.pipedrive.com/v1/persons`

### 6. Email Sending (For Notifications)
**SendGrid** - https://sendgrid.com/
- Free: 100 emails/day
- Paid: $19.95/month for 50k emails
- Keys needed:
  - `SENDGRID_API_KEY`

**Resend** (Alternative) - https://resend.com/
- Free: 100 emails/day
- Paid: $20/month for 50k emails
- Keys needed:
  - `RESEND_API_KEY`

### 7. Slack (Already Implemented)
**Slack Webhooks** - https://api.slack.com/messaging/webhooks
- **Free**
- No API key needed, just webhook URL
- Setup: Create Slack App → Incoming Webhooks

## Environment Variables Setup

Add these to your `.env` and Vercel:

```bash
# Supabase (Already configured)
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# IP Geolocation (Optional - using free APIs by default)
IPINFO_API_KEY=optional

# Company Enrichment (Choose one)
CLEARBIT_API_KEY=your-clearbit-key
# OR
ZOOMINFO_API_KEY=your-zoominfo-key
ZOOMINFO_USERNAME=your-username
ZOOMINFO_PASSWORD=your-password

# Email Discovery
HUNTER_API_KEY=your-hunter-key

# LinkedIn Enrichment
PROXYCURL_API_KEY=your-proxycurl-key

# CRM Integrations
HUBSPOT_API_KEY=your-hubspot-key
SALESFORCE_CLIENT_ID=your-sf-client-id
SALESFORCE_CLIENT_SECRET=your-sf-client-secret
PIPEDRIVE_API_KEY=your-pipedrive-key

# Email Sending
SENDGRID_API_KEY=your-sendgrid-key
# OR
RESEND_API_KEY=your-resend-key
```

## Cost Breakdown (Monthly)

### Minimum Setup (Free Tier)
- Supabase: Free (up to 500MB)
- Vercel: Free (hobby)
- IP Geolocation: Free (ipapi.co)
- Slack: Free
- **Total: $0/month**

### Starter Setup
- Supabase: Free
- Vercel: Free
- Hunter.io: $49/month
- SendGrid: $19.95/month
- **Total: ~$69/month**

### Professional Setup
- Supabase: $25/month
- Vercel: $20/month
- Clearbit: $99/month
- Hunter.io: $99/month
- Proxycurl: $300/month
- SendGrid: $19.95/month
- **Total: ~$563/month**

### Enterprise Setup
- Supabase: $599/month
- Vercel: $20/month
- Clearbit: $999/month
- ZoomInfo: $1000+/month (custom)
- Proxycurl: $300/month
- SendGrid: $89.95/month
- **Total: ~$3000+/month**

## Recommended Starting Point

1. **Start Free:**
   - Use free IP geolocation
   - Slack webhooks
   - No enrichment

2. **Add When Needed:**
   - Hunter.io for email finding ($49/month)
   - SendGrid for email notifications ($19.95/month)

3. **Scale Up:**
   - Clearbit for company enrichment ($99/month)
   - Proxycurl for LinkedIn data ($300/month)

## API Rate Limits

- **ipapi.co**: 1,000/day (free)
- **ip-api.com**: 45/minute (free)
- **Hunter.io**: 25-10,000/month depending on plan
- **Clearbit**: 20 requests/second
- **Proxycurl**: Based on credits purchased
- **HubSpot**: 100 requests/10 seconds
- **Salesforce**: 15,000-1,000,000/day depending on edition

## Security Notes

1. **Never commit API keys** to git
2. **Use environment variables** for all keys
3. **Rotate keys** regularly
4. **Monitor usage** to avoid unexpected charges
5. **Use service role key** only server-side
6. **Implement rate limiting** in your app
