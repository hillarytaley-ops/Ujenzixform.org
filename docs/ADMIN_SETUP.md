# UjenziXform Admin Setup Guide

This guide will help you set up admin access for the UjenziXform dashboard.

## Quick setup: grant admin in the database

The admin dashboard uses the **normal Supabase anon + JWT client**. Access is enforced by **Row Level Security (RLS)** and your row in `user_roles`. **Do not** put the **service_role** key in any `VITE_*` variable — it would ship in the browser bundle.

### Set up an admin user

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

### Development & production
- **Never** add `VITE_SUPABASE_SERVICE_ROLE_KEY` (or any service role) to the frontend.
- Keep `.env.local` in `.gitignore`.
- If an operation truly requires service role (e.g. Auth Admin API), implement it in a **Supabase Edge Function** with the secret stored server-side only.
- Use strong passwords and 2FA on admin accounts where possible.

---

## Troubleshooting

### "new row violates row-level security policy"
→ Ensure your user has `admin` in `user_roles` and that RLS policies allow admins for that table. Do not use the service role in the browser.

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














