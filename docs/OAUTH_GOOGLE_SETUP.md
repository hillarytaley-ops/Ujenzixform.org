# Sign in with Google — setup (UjenziXform + Supabase)

The **Auth** page (`/auth`) already calls `supabase.auth.signInWithOAuth({ provider: 'google' })` and returns to **`/auth`** (with optional `?next=`). You only need **Google Cloud** + **Supabase Dashboard** configuration.

## Pre-launch (Vercel only — not on ujenzixform.org yet)

Use your **stable production Vercel host** (not random preview URLs):

| Setting | Value |
|---------|--------|
| App URL users open | `https://ujenzi-pro.vercel.app/auth` |
| `VITE_PUBLIC_SITE_URL` (Vercel env) | `https://ujenzi-pro.vercel.app` (already in `vercel.json`) |
| Supabase **Site URL** | `https://ujenzi-pro.vercel.app` |
| Supabase **Redirect URLs** | `https://ujenzi-pro.vercel.app/auth` and `https://ujenzi-pro.vercel.app/auth/**` |
| Google **Authorized JavaScript origins** | `https://ujenzi-pro.vercel.app` |

If your Vercel project uses a different production domain, change `VITE_PUBLIC_SITE_URL` in Vercel and `vercel.json` to match **Vercel → Project → Settings → Domains** (the short `*.vercel.app` one, not `*-git-*` or `*-hash-*` URLs).

After custom-domain go-live, switch all of the above to `https://ujenzixform.org`.

Official reference: [Supabase — Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Prerequisites

- A [Google Cloud](https://console.cloud.google.com/) project with billing enabled (OAuth is free; Maps may bill separately).
- Your Supabase **project ref** (subdomain), e.g. `wuuyjjpgzgeimiptuuws` → `https://wuuyjjpgzgeimiptuuws.supabase.co`.

## 1. Google Cloud — OAuth consent screen

1. **APIs & Services** → **OAuth consent screen**.
2. User type: **External** (unless you use Google Workspace internal-only).
3. Fill **App name**, **User support email**, **Developer contact**.
4. **Scopes**: add `.../auth/userinfo.email` and `.../auth/userinfo.profile` (Supabase uses OpenID; the defaults are usually enough).
5. **Test users** (while app is in *Testing*): add emails you use to test. Publish the app when ready for public sign-in.

## 2. Google Cloud — OAuth 2.0 Client ID (Web)

1. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized JavaScript origins** (no path, no trailing slash):

   | Environment | Origin |
   |-------------|--------|
   | Production | `https://ujenzixform.org` (and `https://www.ujenzixform.org` if you use www) |
   | Vercel previews | `https://your-preview.vercel.app` (each preview host you test on) |
   | Local dev | `http://localhost:5173` |

4. **Authorized redirect URIs** — **only** the Supabase callback (not your `/auth` page):

   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

   Example:

   ```
   https://wuuyjjpgzgeimiptuuws.supabase.co/auth/v1/callback
   ```

5. Save and copy the **Client ID** and **Client secret**.

## 3. Supabase — enable Google provider

1. Dashboard → **Authentication** → **Providers** → **Google**.
2. Turn **Google enabled** on.
3. Paste **Client ID** and **Client secret** from step 2.
4. Save.

(Optional) If you use **Google One Tap** or custom hosted domain, see the Supabase doc above; the default web redirect flow does not require extra client code.

## 4. Supabase — URL configuration

**Authentication** → **URL Configuration**:

| Field | Value |
|-------|--------|
| **Site URL** | Production origin, e.g. `https://ujenzixform.org` |
| **Redirect URLs** | Every origin where users can land after OAuth |

Add these (adjust domains to match your deploy):

```
https://ujenzixform.org/auth
https://ujenzixform.org/auth/**
http://localhost:5173/auth
http://localhost:5173/auth/**
```

The app sets `redirectTo` to `{origin}/auth` and preserves `?next=` for post-login navigation. Wildcards (`/**`) cover query strings.

Also add preview/staging URLs if you test OAuth there, e.g. `https://*.vercel.app/auth/**` if your Supabase plan supports wildcard redirect URLs.

**Important:** Do **not** set **Site URL** to a one-off preview like `https://ujenzixform-abc123.vercel.app`. Vercel deletes those deployments; users then see **`DEPLOYMENT_NOT_FOUND`** after Google sign-in. Use your **custom domain** as Site URL.

## 5. Vercel / env (no Google secrets in the frontend)

Google **Client secret** lives only in **Supabase**, not in `VITE_*` variables.

Ensure the app points at the same Supabase project:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Redeploy after changing env vars.

## 6. Test

1. Open `/auth` (production or `http://localhost:5173/auth`).
2. Click **Google** → Google account picker → redirect back to `/auth`.
3. You should be signed in and redirected to a dashboard or `/home` (depends on roles in `user_roles`).
4. **Sign up** uses the same button: first Google login creates the `auth.users` row; profile/role triggers run like email sign-up.

### Common errors

| Symptom | Fix |
|---------|-----|
| **Vercel `404` / `DEPLOYMENT_NOT_FOUND`** after Google | Supabase **Site URL** or redirect target points at an old `*.vercel.app` preview. Set **Site URL** to `https://ujenzixform.org`, add `https://ujenzixform.org/auth/**` under **Redirect URLs**, remove stale preview URLs. Open `/auth` on the **custom domain**, not an old preview link. Set **`VITE_PUBLIC_SITE_URL=https://ujenzixform.org`** on Vercel Production. |
| `redirect_uri_mismatch` (Google) | Redirect URI in Google Console must be exactly `https://REF.supabase.co/auth/v1/callback`. |
| `OAuth redirect URL not allowed` (Supabase) | Add `{origin}/auth` to Supabase **Redirect URLs**. |
| Google button does nothing / immediate toast | Enable Google in Supabase; check browser console. |
| Signed in but “No dashboard role” | User has no row in `user_roles` — assign a role or complete registration flow. |
| Works locally, not production | Add production origin to Google **JavaScript origins** and Supabase **Redirect URLs**. |

## 7. Security notes

- Do not commit the Google **client secret**; keep it in Supabase only.
- Production sessions use **sessionStorage** by default (`VITE_SUPABASE_AUTH_STORAGE=local` keeps login across browser restarts).
- Staff/admin should continue using **`/admin-login`** when required; Google on `/auth` is for general users.

## Code reference

- UI + OAuth call: `src/components/auth/AuthFormPanel.tsx` (`signInWithGoogle`)
- Supabase client (PKCE + `detectSessionInUrl`): `src/integrations/supabase/client.ts`
- Auth page: `src/pages/Auth.tsx`
