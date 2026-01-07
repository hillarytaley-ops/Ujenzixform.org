# MradiPro Admin Setup Guide

This guide will help you set up admin access for the MradiPro dashboard.

## Quick Setup (2 Steps)

### Step 1: Get Your Service Role Key

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard/project/wuuyjjpgzgeimiptuuws/settings/api
2. Find the **"service_role" key** (under "Project API keys")
   - ⚠️ This is the SECRET key, NOT the anon/public key
3. Copy this key

### Step 2: Add to Environment File

Create or edit `.env.local` in your project root:

```env
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_actual_key_here
```

Then restart your dev server:
```bash
npm run dev
```

---

## Alternative: Set Up Admin User in Database

If you prefer not to use the service role key, you can make your user an admin:

### Step 1: Find Your User ID

Run this in **Supabase SQL Editor**:

```sql
-- List all users and their emails
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;
```

Copy your user ID (UUID format like `12345678-1234-1234-1234-123456789abc`)

### Step 2: Make Yourself an Admin

Replace `YOUR_USER_ID_HERE` with your actual user ID:

```sql
-- Insert admin role (replace the UUID!)
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID_HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify it worked
SELECT * FROM user_roles WHERE role = 'admin';
```

### Step 3: Apply Secure Camera Policies

Run the secure camera RLS migration:

```sql
-- Copy and paste the content from:
-- supabase/migrations/20251219_secure_camera_rls.sql
```

---

## Security Best Practices

### For Development
- Using the service role key in `.env.local` is fine
- The `.env.local` file should be in `.gitignore` (never commit it!)

### For Production
- **NEVER expose the service role key in frontend code**
- Move admin operations to **Supabase Edge Functions**
- Use proper authentication flow with admin role check
- Enable 2FA for all admin accounts

---

## Troubleshooting

### "Admin service role key not configured" warning
→ Add `VITE_SUPABASE_SERVICE_ROLE_KEY` to your `.env.local`

### "new row violates row-level security policy"
→ Either:
1. Add service role key (bypasses RLS)
2. OR make your user an admin in `user_roles` table

### Cameras still not loading after adding admin role
→ Make sure you're logged in with the email that has admin role

### How to check if you're an admin:
```sql
SELECT 
    u.email,
    ur.role,
    ur.created_at
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'admin';
```

---

## Quick SQL Reference

```sql
-- View all user roles
SELECT * FROM user_roles;

-- Make a user admin by email
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'your@email.com'
ON CONFLICT DO NOTHING;

-- Remove admin role
DELETE FROM user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your@email.com')
AND role = 'admin';

-- View camera access logs
SELECT * FROM camera_access_log ORDER BY created_at DESC LIMIT 50;
```

---

## Links

- **Supabase Dashboard**: https://supabase.com/dashboard/project/wuuyjjpgzgeimiptuuws
- **API Settings**: https://supabase.com/dashboard/project/wuuyjjpgzgeimiptuuws/settings/api
- **SQL Editor**: https://supabase.com/dashboard/project/wuuyjjpgzgeimiptuuws/sql/new














