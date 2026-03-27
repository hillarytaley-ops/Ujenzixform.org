# Maintenance, scope, and production verification

## Why this doc exists

The app spans many domains (marketplace, admin, delivery, monitoring, security tooling). That power comes with **ongoing maintenance cost**. This file maps where things live and how to shrink “unknowns” before a release.

## Module map (where to look)

| Area | Primary locations |
|------|-------------------|
| Routes / pages | `src/pages/`, `src/App.tsx` (or router entry) |
| Shared UI | `src/components/`, `src/components/ui/` |
| Supabase client usage | `src/integrations/supabase/` |
| RLS and schema | `supabase/migrations/` |
| Edge functions | `supabase/functions/` |
| Site vision / workers | `workers/site-vision/` |
| PWA / offline | `public/sw.js`, `public/manifest.json` |

Treat features as **independent slices**: changing delivery should not require loading every admin tab in your head—use this map to jump to the right folder.

## Identity and storage keys

Canonical defaults live in `src/config/appIdentity.ts`:

- `VITE_SITE_URL` — public site base for links (optional; default `https://ujenzixform.org`).
- `VITE_SUPPORT_EMAIL` — support address in UI and exports.
- `VITE_SOCIAL_INSTAGRAM_URL`, `VITE_SOCIAL_TIKTOK_URL` — social links.

**localStorage / sessionStorage** use `ujenzixform_*` keys with **automatic read migration** from legacy `mradipro_*` keys so existing users are not logged out or lose carts on upgrade.

## Edge functions (email)

Resend “from” addresses must use a **verified domain** in Resend. Defaults point at `@ujenzixform.org`; override in Supabase secrets if your verified domain differs:

- `RESEND_FROM_MONITORING` — `send-monitoring-email`
- `RESEND_FROM_REPORTS` — `send-scheduled-report`
- `SITE_URL` — links in report emails

## Production verification checklist

Run locally or in CI (see `.github/workflows/ci.yml`):

1. `npm run lint`
2. `npm run test:run`
3. `npm run build`

After deploy:

4. Smoke-test **your** critical paths (auth, checkout or PO, one admin action).
5. Confirm **RLS** with a non-admin test user (not only the dashboard as superuser).
6. Optional: Lighthouse or axe on top landing and one authenticated screen.
7. Production: enable **Sentry** (if used), host analytics, and Supabase metrics for latency and errors.

Load testing and formal accessibility audits are **out of scope** for a quick release checklist but should be scheduled for high-traffic launches.
