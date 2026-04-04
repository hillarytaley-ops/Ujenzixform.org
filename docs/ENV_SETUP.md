# Environment Variables Setup Guide

This document describes all environment variables used by UjenziPro / UjenziXform.

## Quick Start

1. Create a `.env.local` file in the project root
2. Copy the variables below and fill in your values
3. Restart the development server

## Required Variables

### Supabase Configuration

Get these from your Supabase project: [Dashboard](https://supabase.com/dashboard) → Project Settings → API

```env
# Your Supabase project URL
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Your Supabase anonymous/public key (safe for client-side)
# Use the "anon" key, NOT the "service_role" key
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Optional Variables

### Security - reCAPTCHA

Get from: [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)

Use reCAPTCHA v2 "I'm not a robot" Checkbox type.

```env
VITE_RECAPTCHA_SITE_KEY=6Le...your-site-key
```

### Payments - Stripe

Get from: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

⚠️ Use the **PUBLISHABLE** key (starts with `pk_`), NOT the secret key!

```env
VITE_STRIPE_PUBLIC_KEY=pk_test_...or...pk_live_...
```

### Maps & Location - Google Maps

Get from: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

Enable these APIs:
- Maps JavaScript API
- Places API
- Geocoding API

```env
VITE_GOOGLE_MAPS_API_KEY=AIza...
```

### Error Tracking - Sentry

Get from: [Sentry Project Settings](https://sentry.io/settings/)

```env
VITE_SENTRY_DSN=https://...@sentry.io/...
# Optional: send errors from local/dev builds (default is production-only)
VITE_SENTRY_DEV_ENABLED=true
```

### Analytics - Google Analytics

```env
VITE_GA_MEASUREMENT_ID=G-...
```

### Feature Flags

```env
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_CHAT=true
```

## Server-Side Only Secrets

These should **NEVER** be prefixed with `VITE_` as they would be exposed to the client:

| Variable | Description | Where to Configure |
|----------|-------------|-------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Admin database operations | Supabase Edge Functions |
| `STRIPE_SECRET_KEY` | Payment processing | Supabase Edge Functions |
| `RESEND_API_KEY` | Email sending | Supabase Edge Functions |
| `AFRICASTALKING_API_KEY` | SMS notifications | Supabase Edge Functions |
| `AFRICASTALKING_USERNAME` | SMS account (`sandbox` for sandbox API) | Supabase Edge Functions |
| `AFRICASTALKING_SENDER_ID` | Optional short code / sender ID | Supabase Edge Functions |

### Africa's Talking (SMS) — finish setup

1. Create an account at [Africa's Talking](https://africastalking.com) and generate an API key.
2. For testing, keep username `sandbox` and add [sandbox test numbers](https://developers.africastalking.com/docs/sms/sandbox) in the AT dashboard.
3. In Supabase: **Project Settings → Edge Functions → Secrets**, add the three variables above (minimum: `AFRICASTALKING_API_KEY`, `AFRICASTALKING_USERNAME`).
4. Deploy the function from the repo root:

   ```bash
   supabase functions deploy send-sms
   ```

5. The web app calls `send-sms` via the Supabase client — **do not** put `AFRICASTALKING_API_KEY` in any `VITE_` variable.
6. Optional in `.env.local`: `VITE_AFRICASTALKING_SENDER_ID` (passed as `from` when sending) and `VITE_SMS_SIMULATE_ONLY=true` to force console-only SMS during local dev.

### Still seeing "The supplied authentication is invalid" (401)?

- **Secrets live in Supabase only** — Dashboard → **Project Settings** → **Edge Functions** → **Secrets**. Updating Vercel env vars or a local `.env` file does **not** change what `send-sms` uses.
- **`AFRICASTALKING_USERNAME=sandbox`** → use the API key from Africa's Talking **Sandbox** (toggle environment in the AT dashboard, then copy the sandbox key). A newly generated **live** key will still return 401 with `username=sandbox`.
- **Live SMS** → set `AFRICASTALKING_USERNAME` to your **production app username** (not the word `sandbox`) and use the **live** API key for that app.
- After rotating a key in AT, wait **~5 minutes** before testing ([AT help](https://help.africastalking.com/en/articles/1036048-why-am-i-getting-the-error-supplied-authentication-is-invalid)).

### Sign in with Apple (OAuth)

The **Apple** button on `/auth` is wired in code; enable the provider in Supabase and complete Apple Developer steps: **[OAUTH_APPLE_SETUP.md](./OAUTH_APPLE_SETUP.md)**.

## Security Best Practices

1. **Never commit credentials** - Add `.env.local` to `.gitignore`
2. **Never expose secret keys** - Only use `VITE_` prefix for public/safe values
3. **Use different keys** - Separate development and production credentials
4. **Rotate compromised keys** - If accidentally exposed, rotate immediately
5. **Validate in code** - Use `src/utils/envValidation.ts` to check configuration

## Database Setup for Admin Authentication

To set up secure admin authentication, create the `admin_staff` table in Supabase:

```sql
-- Create admin_staff table for secure admin authentication
CREATE TABLE IF NOT EXISTS admin_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  staff_code_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  last_login TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE admin_staff ENABLE ROW LEVEL SECURITY;

-- Only allow admins to read admin_staff table
CREATE POLICY "Only admins can view admin_staff" ON admin_staff
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_admin_staff_email ON admin_staff(email);
CREATE INDEX idx_admin_staff_active ON admin_staff(is_active);
```

### Adding an Admin User

To add a new admin, hash their staff code and insert:

```sql
-- Example: Add an admin with staff code "UJPRO-2024-0001"
-- First, generate the SHA-256 hash of the code (in JavaScript):
-- const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('UJPRO-2024-0001'));

INSERT INTO admin_staff (email, full_name, staff_code_hash, created_by)
VALUES (
  'admin@ujenzipro.com',
  'Admin Name',
  '< SHA-256 hash of staff code >',
  'system'
);
```

## Validation

The application includes automatic environment validation. In development mode, check the browser console for:

- ✅ Configured variables
- ⚠️ Missing optional variables
- ❌ Missing required variables
- 🚨 Potential exposed secrets




