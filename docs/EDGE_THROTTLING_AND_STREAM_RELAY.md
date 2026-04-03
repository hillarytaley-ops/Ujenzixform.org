# Edge throttling and camera stream URL path

This runbook closes the gap where **only** database throttling and direct PostgREST/RPC applied. Optional Edge layers add **per-IP** limits for staff login and **per-user** limits when resolving stream metadata through Functions.

## What was added

| Piece | Role |
|--------|------|
| `supabase/functions/_shared/rateLimitCore.ts` | Shared logic for `rate_limit_requests` / `rate_limit_blocks` (used by `rate-limit`, `verify-admin-staff-login`, `camera-stream-url`, `camera-vision-upload-ticket`). |
| `verify-admin-staff-login` | Applies Edge limits: `admin_login` (per email, same table keys as the standalone `rate-limit` function) + `admin_staff_edge_ip` (per client IP), then calls `verify_admin_staff_login` with the **service role** (same RPC as before). |
| `camera-stream-url` | Requires a valid **user JWT** (`verify_jwt = true`), applies `camera_stream` per-user rate limit, then runs `get_camera_stream_secure` **as that user** via the anon client + `Authorization`. Returns `{ row }` with the same fields as the RPC. **The stream URL is still returned to the browser**; a full HLS/RTSP byte relay is not implemented here. |
| `camera-vision-upload-ticket` | Mints **signed upload URLs** for bucket `site-vision-captures` (`verify_jwt = false`). Auth: user **JWT** + `auth_can_access_camera`, or **`X-Site-Vision-Device-Secret`** when `SITE_VISION_DEVICE_SECRET` is set. Rate limit key `vision_upload_ticket` (per user or per IP for device path). See [SITE_VISION_ADVANCED_INTEGRATION.md](./SITE_VISION_ADVANCED_INTEGRATION.md). |
| `VITE_ADMIN_STAFF_LOGIN_VIA_EDGE` | When `"true"`, `AdminAuth` calls the Edge URL instead of `supabase.rpc('verify_admin_staff_login')`. |
| `VITE_CAMERA_STREAM_VIA_EDGE` | When `"true"`, `useSecureCameras.getSecureCameraStream` uses `supabase.functions.invoke('camera-stream-url')` instead of direct RPC. |

## Steps to enable (production)

1. **Deploy functions** (from repo root, with Supabase CLI linked to the project):

   ```bash
   supabase functions deploy rate-limit
   supabase functions deploy verify-admin-staff-login
   supabase functions deploy camera-stream-url
   supabase functions deploy camera-vision-upload-ticket
   ```

2. **Confirm `config.toml`** (already in repo): `verify-admin-staff-login` and `rate-limit` use `verify_jwt = false`; `camera-stream-url` uses `verify_jwt = true`. Redeploy after any change.

3. **Environment / build flags** for the Vite app:

   - Staff login via Edge: set `VITE_ADMIN_STAFF_LOGIN_VIA_EDGE=true` in the hosting env (e.g. Netlify/Vercel) and rebuild.
   - Camera streams via Edge: set `VITE_CAMERA_STREAM_VIA_EDGE=true` and rebuild.

4. **Smoke tests**

   - Staff: submit wrong codes until Edge returns 429; confirm toast matches “Too many attempts”.
   - Cameras (logged-in builder): open monitoring, confirm streams still load; hammer refresh to see possible 429 from `camera_stream` (40/min per user by default—tune in `_shared/rateLimitCore.ts`).

5. **Rollback**: remove or set the two `VITE_*` flags to anything other than `"true"` and redeploy the frontend; RPC paths remain unchanged.

## Stricter future work (not done here)

- **Signed ticket + one-time URL**: issue short-lived opaque tokens in Postgres, Edge validates token and returns `stream_url` once (or redirects).
- **True stream relay**: Edge (or a worker) proxies HLS segments so the origin URL never reaches the client; higher cost and complexity.

DB-side staff throttling (`staff_login_throttle` inside `verify_admin_staff_login`) remains in place; Edge limits are an additional layer.
