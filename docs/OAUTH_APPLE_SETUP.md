# Sign in with Apple — finish setup (UjenziXform + Supabase)

The **Auth** page already calls `signInWithOAuth({ provider: 'apple' })` and redirects back to **`/home`**. What is left is **Apple Developer** + **Supabase Dashboard** configuration.

Official reference: [Supabase — Login with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple).

## Prerequisites

- **Apple Developer Program** membership (paid).
- **Supabase project**: note your **project ref** (subdomain), e.g. `https://YOUR_PROJECT_REF.supabase.co`.

## 1. Apple Developer — App ID

1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list/bundleId) → **Identifiers** → **App IDs**.
2. Create or select an App ID (e.g. `com.yourorg.ujenzixform`).
3. Enable capability **Sign in with Apple**.
4. **Server-to-Server notification endpoint**: leave blank (Supabase does not use it for this flow).

## 2. Apple Developer — Services ID (web / OAuth)

1. **Identifiers** → filter **Services IDs** → **+** to create one (e.g. `com.yourorg.ujenzixform.web`).
2. Enable **Sign in with Apple** → **Configure**:
   - **Primary App ID**: the App ID from step 1.
   - **Website URLs**:
     - **Domains and subdomains**: `YOUR_PROJECT_REF.supabase.co` (no `https://`).
     - **Return URLs**:  
       `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`  
       (exactly this path — Supabase exchanges the code here.)
3. Save, then **Continue** / **Save** on the Services ID.

If Apple asks to **verify the domain**, follow Apple’s file/ DNS steps for that host. Many projects use the Supabase callback host as above; if verification fails, check Supabase’s current Apple guide for any updated domain instructions.

## 3. Apple Developer — Signing key (`.p8`)

1. **Keys** → **+** → name it → enable **Sign in with Apple** → **Configure** → pick the **Primary App ID** → save.
2. **Download** the key once (**AuthKey_XXXXXXXXXX.p8**). Store it securely; you cannot re-download.

You need:

- **Key ID** (10 characters, shown on the key detail page).
- **Team ID** (Apple Developer account, top right / Membership page).
- **Services ID** string (identifier from step 2) — this is the **OAuth client ID**.

## 4. Generate the Apple **client secret** (JWT)

Apple expects a **JWT** signed with your `.p8` key. It **expires** (max ~6 months). Supabase documents a **browser-based generator** (use Chrome/Firefox, not Safari) on their Apple auth page — use that, or their script, to produce `external_apple_secret`.

Set a **calendar reminder** to rotate the secret before expiry or Apple sign-in will break.

## 5. Supabase — enable Apple provider

1. Dashboard → **Authentication** → **Providers** → **Apple**.
2. Turn **Apple enabled** on.
3. **Client IDs**: enter your **Services ID** (e.g. `com.yourorg.ujenzixform.web`).  
   If you also use a native iOS app with Sign in with Apple, add its **bundle IDs** here too (comma-separated if the UI allows).
4. **Secret Key (for OAuth)**: paste the **JWT** from step 4 (not the raw `.p8` file contents unless the dashboard explicitly asks for that format — follow the field label in Supabase).

Save.

## 6. Supabase — redirect URLs

**Authentication** → **URL Configuration**:

- **Site URL**: your production site origin, e.g. `https://ujenzixform.org`.
- **Redirect URLs** — add every URL the app uses after OAuth. This app uses:

  - `https://YOUR_PRODUCTION_DOMAIN/home`
  - `http://localhost:5173/home` (Vite dev)
  - Any staging origins you use, e.g. `https://your-preview.vercel.app/home`

Without these, Supabase may reject the redirect after Apple returns.

## 7. Test

1. Open `/auth` on production or localhost.
2. Click **Apple** — you should be sent to Apple, then back to `/home` with a session (`detectSessionInUrl` is enabled on the Supabase client).
3. If you see an immediate error toast, read the message — often **provider disabled** or **invalid client**.

## Notes

- **Name**: Apple often does **not** send full name on web OAuth after the first authorization; you may need a profile/onboarding step to collect display name.
- **Private email**: users may use Apple’s relay address; that is normal.
- **Capacitor / native iOS**: prefer native Sign in with Apple + `signInWithIdToken` and register the **bundle ID** in Supabase Apple **Client IDs**; this doc is for the **web** button on `Auth.tsx`.
