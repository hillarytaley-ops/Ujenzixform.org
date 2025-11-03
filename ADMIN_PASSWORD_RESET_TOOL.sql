-- ⚡ ADMIN PASSWORD RESET TOOL
-- Use this to reset any user's password when they forget it

-- ============================================
-- OPTION 1: Reset Password for Specific Email
-- ============================================

-- Step 1: Find the user
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE@example.com';
-- Replace YOUR_EMAIL_HERE with the actual email

-- Step 2: Delete the user (they can re-register with same email)
-- WARNING: This deletes the user account! They'll need to sign up again.
DELETE FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE@example.com';

-- Step 3: User can now sign up again with the same email and new password


-- ============================================
-- OPTION 2: Create Temporary Login Code
-- ============================================

-- Generate a magic link/OTP for the user
-- This doesn't change their password but lets them log in once
-- Run this in your Supabase SQL editor:

-- Note: Supabase doesn't allow direct password updates via SQL for security
-- You need to use the Auth API or let user reset via email


-- ============================================
-- OPTION 3: Quick New Account for Testing
-- ============================================

-- Create a brand new test private client account:

-- Step 1: User signs up at /auth with:
-- Email: test-private-client@example.com
-- Password: TestPass123!

-- Step 2: After signup, run this to set them as private client:
-- (Replace USER_ID with the actual user ID from auth.users)

INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'private_client')
ON CONFLICT (user_id) DO UPDATE SET role = 'private_client';

-- Step 3: Create their profile:
INSERT INTO profiles (
  user_id,
  full_name,
  phone,
  location,
  builder_category
) VALUES (
  'USER_ID_HERE',
  'Test Private Client',
  '+254 712 345 678',
  'Nairobi',
  'private'
) ON CONFLICT (user_id) DO UPDATE SET
  builder_category = 'private';


-- ============================================
-- OPTION 4: Find and Use Existing Account
-- ============================================

-- Check if you have existing private client accounts:
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.full_name,
  p.phone,
  r.role
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
LEFT JOIN user_roles r ON r.user_id = u.id
WHERE r.role = 'private_client'
ORDER BY u.created_at DESC
LIMIT 10;

-- Use one of these emails to log in
-- Or create a new password for them


-- ============================================
-- RECOMMENDED SOLUTION: Create Fresh Account
-- ============================================

-- Instead of resetting, create a new test account:

-- 1. Go to: /auth
-- 2. Sign Up with:
--    Email: private.client.test@ujenzipro.co.ke
--    Password: PrivateClient2024!

-- 3. After signup, the account is ready!
-- 4. Go to /private-client-registration to complete profile
-- 5. Start shopping!


-- ============================================
-- ADMIN TOOL: Check User's Role
-- ============================================

-- To verify what role a user has:
SELECT 
  u.email,
  r.role,
  p.builder_category,
  p.full_name
FROM auth.users u
LEFT JOIN user_roles r ON r.user_id = u.id
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.email = 'YOUR_EMAIL_HERE@example.com';


-- ============================================
-- NOTES
-- ============================================

/*
WHY PASSWORD RESET HAS ISSUES:
1. Supabase email delivery can be slow
2. Email links don't work in all browsers
3. OTP codes need proper Supabase email template setup

BEST SOLUTION FOR NOW:
- Create a new test account
- Or delete old account and re-register
- This is faster than troubleshooting email delivery

FUTURE FIX:
- Disable email confirmation in Supabase
- Use SMS for password reset (faster)
- Add admin password reset feature in UI
*/

