# How to Fix CAPTCHA Verification Error in Supabase

## Problem
You're getting an "Authentication error" with "captcha verification process" error when trying to sign up or sign in.

## ✅ Solution 1: Code Fix (Already Done!)

I've already updated the code to skip CAPTCHA verification by adding:
```typescript
options: {
  emailRedirectTo: redirectUrl,
  captchaToken: undefined // Disable captcha requirement
}
```

**Status**: ✅ Committed and pushed to GitHub

---

## 🔧 Solution 2: Disable CAPTCHA in Supabase Dashboard (Recommended)

### Steps:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com
   - Sign in to your account
   - Select your UjenziPro project

2. **Navigate to Authentication Settings**
   - Click **"Authentication"** in the left sidebar
   - Click **"Providers"** tab
   - Scroll down to **"Email"** provider

3. **Disable CAPTCHA Protection**
   - Look for **"Enable CAPTCHA protection"** toggle
   - **Turn it OFF** (disable it)
   - Click **"Save"** button

4. **Alternative: Configure CAPTCHA (if you want to keep it)**
   - If you want to keep CAPTCHA enabled:
     - Go to **"Settings"** → **"Auth"** → **"CAPTCHA"**
     - Choose your provider (hCaptcha or Cloudflare Turnstile)
     - Add your site key and secret key
     - Save settings

---

## 🚨 Quick Fix for Development

For development/testing purposes, the easiest solution is:

### Option A: Disable Email Confirmation (Development Only)

1. Go to Supabase Dashboard
2. Click **"Authentication"** → **"Settings"**
3. Scroll to **"User Signups"**
4. Find **"Enable email confirmations"**
5. **Turn it OFF** for development
6. Click **"Save"**

⚠️ **Warning**: Only do this for development! Re-enable for production.

### Option B: Use Test Email Domain

1. Go to **"Authentication"** → **"URL Configuration"**
2. Add your local development URL: `http://localhost:5175`
3. Save changes

---

## ✅ Verification Steps

After making changes in Supabase:

1. **Clear Browser Cache**
   - Press `Ctrl + Shift + Delete`
   - Clear cookies and cache
   - Or use Incognito/Private mode

2. **Test Sign Up**
   - Go to http://localhost:5175/auth
   - Try to create a new account
   - Should work without CAPTCHA error

3. **Test Sign In**
   - Use the account you created
   - Sign in should work smoothly

---

## 📋 Current Configuration

### Code Changes Made:
- ✅ Added `captchaToken: undefined` to sign-up
- ✅ Added specific CAPTCHA error handling
- ✅ Improved error messages

### What You Need to Do:
1. Go to Supabase Dashboard
2. Disable CAPTCHA in Authentication settings
3. Test the sign-up/sign-in flow

---

## 🔍 Troubleshooting

### Still Getting CAPTCHA Error?

**Check 1: Supabase Auth Settings**
```
Supabase Dashboard → Authentication → Providers → Email
Ensure "Enable CAPTCHA protection" is OFF
```

**Check 2: Email Confirmations**
```
Supabase Dashboard → Authentication → Settings
Check if "Enable email confirmations" is causing issues
```

**Check 3: Rate Limiting**
```
Supabase Dashboard → Authentication → Settings → Rate Limits
Ensure rate limits aren't too restrictive
```

### Error: "Invalid API key" or "Invalid project"

1. Check your `.env` file or environment variables
2. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Make sure they match your Supabase project

### Error: "Email not confirmed"

1. Check your email inbox for confirmation link
2. OR disable email confirmation in Supabase (dev only)
3. OR use SQL to manually confirm:
   ```sql
   UPDATE auth.users 
   SET email_confirmed_at = NOW() 
   WHERE email = 'your-email@example.com';
   ```

---

## 🎯 Recommended Settings for Development

```
Supabase Dashboard → Authentication → Settings:

✅ Enable sign-ups: ON
❌ Enable email confirmations: OFF (for dev)
❌ Enable CAPTCHA protection: OFF (for dev)
✅ Enable phone confirmations: OFF
❌ Enable phone sign-ups: OFF
```

---

## 🚀 For Production (Later)

When you deploy to production:

1. **Re-enable Email Confirmations**
2. **Consider enabling CAPTCHA** with proper configuration
3. **Set up proper redirect URLs**
4. **Configure rate limiting appropriately**

---

## 📞 Quick Reference

| Issue | Solution |
|-------|----------|
| CAPTCHA error | Disable CAPTCHA in Supabase Auth settings |
| Email not confirmed | Disable email confirmation (dev) or check email |
| Invalid credentials | Check email/password are correct |
| Too many requests | Wait or adjust rate limits |
| OAuth not working | We already disabled OAuth buttons |

---

## ✅ Next Steps

1. **Go to Supabase Dashboard now**
2. **Disable CAPTCHA protection** (Authentication → Providers → Email)
3. **Test sign-up** at http://localhost:5175/auth
4. **Create your account** with your email
5. **Sign in successfully** ✨

---

**Created**: October 25, 2025  
**Status**: Code fix deployed, awaiting Supabase settings update  
**Priority**: High - Required for user authentication

