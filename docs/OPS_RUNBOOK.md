# Ops runbook (single entry point)

**Purpose:** One short checklist and priority order. Deep detail stays in the linked docs—open those when a step fails.

---

## Recommended delivery order

1. **Operationalize what ships today** — migrations applied everywhere, Vercel env vars match Supabase, monitoring access-code flow smoke-tested, optional Edge flags only if you deploy functions.
2. **Payments and notifications** — end-to-end where you promise them (see payment guide and delivery notification docs).
3. **Hardening** — monitoring RLS assumptions, staff secrets, admin session/JWT alignment ([SECURITY_OPERATIONS](./SECURITY_OPERATIONS.md)).
4. **Later phases** — site vision worker at scale, custom CV, PTZ / two-way audio via a gateway ([UJENZIXFORM_PENDING_AND_FUTURE_WORK.txt](./UJENZIXFORM_PENDING_AND_FUTURE_WORK.txt)).

Goal: core marketplace and admin flows **boringly reliable** before investing in vision/PTZ depth.

---

## Merged release / ops checklist

### A. Source and frontend (Vercel or equivalent)

- [ ] Latest `main` built and **Ready** on the host; footer **Build** matches expected git SHA ([DEPLOYMENT](./DEPLOYMENT.md)).
- [ ] Hard-refresh or clear site data if the UI looks stale (cache / PWA).
- [ ] `npm run lint`, `npm run test:run`, `npm run build` green locally or in CI ([MAINTENANCE_AND_SCOPE](./MAINTENANCE_AND_SCOPE.md)).

### B. Environment variables (Vite / hosting)

- [ ] `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` set for **this** Supabase project ([ENV_SETUP](./ENV_SETUP.md)).
- [ ] Optional: `VITE_SENTRY_DSN`, maps, Stripe publishable, `VITE_GA_MEASUREMENT_ID`, PWA flags—only if you use those features.
- [ ] Optional monitoring: `VITE_CAMERA_STREAM_VIA_EDGE=true` **only** if `camera-stream-url` is deployed ([EDGE_THROTTLING_AND_STREAM_RELAY](./EDGE_THROTTLING_AND_STREAM_RELAY.md)).
- [ ] Redeploy frontend after any env change.

### C. Supabase: migrations and database

- [ ] `supabase link` to the correct project; `supabase db push` (or run pending SQL) so **production** matches repo ([PRODUCTION_SETUP](./PRODUCTION_SETUP.md) if you use it).
- [ ] Monitoring / cameras: ensure `resolve_monitoring_access_code`, `auth_can_access_camera`, and related migrations are applied (e.g. `20260331120000_*`, `20260401140000_*`).
- [ ] Optional: run project-specific verify scripts under `supabase/` if present (e.g. provider RPC checks mentioned in [DEPLOYMENT](./DEPLOYMENT.md)).

### D. Supabase Edge Functions (optional)

- [ ] Deploy only what you enable: e.g. `camera-stream-url`, `verify-admin-staff-login`, `rate-limit`, email functions ([MAINTENANCE_AND_SCOPE](./MAINTENANCE_AND_SCOPE.md), [EDGE_THROTTLING_AND_STREAM_RELAY](./EDGE_THROTTLING_AND_STREAM_RELAY.md)).
- [ ] Secrets in Supabase dashboard (Resend, `SITE_URL`, service role never in the browser).

### E. Monitoring (smoke)

- [ ] Admin: assign camera to approved monitoring request; camera has playable `stream_url` or `embed_code` (direct MP4/HLS/YouTube/Vimeo or iframe—not a generic “share” HTML page).
- [ ] Builder: open `/monitoring?access_code=…` (or enter code); at least one assigned camera loads; signed-in user can resolve stream ([workflows/MONITORING_AND_QR_FLOWS](./workflows/MONITORING_AND_QR_FLOWS.md)).

### F. Site vision worker (on-site / VM, optional for core marketplace)

- [ ] Migration `site_vision_events` applied.
- [ ] Run Python venv **or** Docker from [`workers/site-vision/README.md`](../workers/site-vision/README.md) (see also `Dockerfile`, `docker-compose.yml`).
- [ ] Service role key only on the worker host—never in the SPA.
- [ ] Confirm events on **Analytics → Site vision** when the worker runs.

### G. People / escalation (fill in for your org)

| Area | Owner / channel |
|------|------------------|
| Vercel / DNS / domain | *your team* |
| Supabase project / billing / support | *your team* |
| App code / GitHub | *your team* |
| On-site cameras / NVR / ISP | *site contact* |
| Site vision PC / Docker host | *site contact* |

---

## Deep docs (when you need detail)

| Topic | Document |
|--------|----------|
| Env vars | [ENV_SETUP](./ENV_SETUP.md) |
| Deploy & cache | [DEPLOYMENT](./DEPLOYMENT.md) |
| Security & RLS mindset | [SECURITY_OPERATIONS](./SECURITY_OPERATIONS.md) |
| Module map | [MAINTENANCE_AND_SCOPE](./MAINTENANCE_AND_SCOPE.md) |
| Edge + camera stream flag | [EDGE_THROTTLING_AND_STREAM_RELAY](./EDGE_THROTTLING_AND_STREAM_RELAY.md) |
| Payments | [PAYMENT_INTEGRATION_GUIDE](./PAYMENT_INTEGRATION_GUIDE.md), [workflows/PAYMENT_AND_SECURITY_FLOWS](./workflows/PAYMENT_AND_SECURITY_FLOWS.md) |
| Admin / staff | [ADMIN_SETUP](./ADMIN_SETUP.md), [ADMIN_STAFF_GUIDE](./ADMIN_STAFF_GUIDE.md) |
| Gaps & roadmap tone | [UJENZIXFORM_PENDING_AND_FUTURE_WORK.txt](./UJENZIXFORM_PENDING_AND_FUTURE_WORK.txt) |
| Full index | [README](./README.md) |

---

*Last aligned with repo layout early 2026. Update the “Who to call” table and any project-specific verify scripts as your process evolves.*
