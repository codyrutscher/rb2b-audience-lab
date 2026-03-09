# Vercel NOT_FOUND (404) – Troubleshooting

When you see **NOT_FOUND** on Vercel, the requested resource could not be found. Use this checklist.

Reference: [Vercel NOT_FOUND docs](https://vercel.com/docs/errors/NOT_FOUND)

## 1. Use the correct URL

- **Production:** Use the URL Vercel shows as **Production** (e.g. `https://your-project.vercel.app` or your custom domain).
- **Preview:** Each push creates a **Preview** deployment with its own URL (e.g. `https://rb2b-audience-lab-xxx.vercel.app`). Use that exact URL; old preview URLs can 404 after cleanup.
- Avoid typos and wrong paths (e.g. `/dashbord` vs `/dashboard`).

## 2. Confirm the deployment exists and succeeded

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → your project.
2. **Deployments** → check the latest deployment is **Ready** (green), not Failed or Canceled.
3. If the latest build **failed**, fix the build (check build logs); there is no valid deployment to serve, so you get NOT_FOUND.
4. Open the deployment and use the **Visit** link; that URL is the one that should work.

## 3. Check which URL you’re opening

- **Root:** `https://<your-domain>/` should load the landing page (`app/page.tsx`).
- **Login:** `https://<your-domain>/login`
- **Dashboard:** `https://<your-domain>/dashboard` (redirects to login if not authenticated).

If you bookmarked an old preview URL or a deployment that was deleted, use the current Production or Preview URL from the dashboard instead.

## 4. Permissions

- Ensure your Vercel account has access to the project.
- For team projects, confirm you have a role that can view deployments.

## 5. If it’s still NOT_FOUND

- **Deployment logs:** Project → Deployments → select deployment → **Logs** / **Building** to see build errors.
- **Redeploy:** Deployments → … → **Redeploy** (optionally “Redeploy with existing Build Cache” unchecked for a clean build).
- **Contact support:** [Vercel Help](https://vercel.com/help#issues) if the deployment is Ready but the Visit URL still returns 404.
