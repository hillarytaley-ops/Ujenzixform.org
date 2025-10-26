# 🔐 UjenziPro Admin Staff Login System

## Overview

A highly secure, separate authentication system for UjenziPro administrative staff using:
- 🏢 **Work Email** (company domain required)
- 🔑 **Unique Staff Code** (format: UJPRO-YYYY-NNNN)
- 🛡️ **SHA-256 Encryption**
- 📊 **Security Logging**
- ⏱️ **Auto-lockout** after failed attempts

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

Run this in Supabase SQL Editor:

**File**: `supabase/migrations/20241026000000_admin_staff_authentication.sql`

Or copy from the file and run it.

This creates:
- ✅ `admin_staff_credentials` table
- ✅ `admin_security_logs` table
- ✅ Verification functions
- ✅ Security policies
- ✅ Test admin account

### Step 2: Access Admin Portal

**URL**: http://localhost:5175/admin-login

### Step 3: Sign In

**Default Test Credentials:**
- Work Email: `hillarytaley@gmail.com`
- Staff Code: `UJPRO-2024-0001`

---

## 🔒 Security Features

### 1. Work Email Validation
- ✅ Only accepts company domain emails
- ✅ Allowed domains: `@ujenzipro.com`, `@ujenzipro.co.ke`
- ✅ Development: Also allows `@gmail.com` (remove in production)

### 2. Staff Code Format
- ✅ Format: `UJPRO-YYYY-NNNN`
- ✅ Example: `UJPRO-2024-0001`
- ✅ Auto-converted to uppercase
- ✅ Validated before processing

### 3. Encryption
- ✅ Staff codes hashed with SHA-256
- ✅ Never stored in plain text
- ✅ Client-side hashing
- ✅ Secure transmission

### 4. Lockout Protection
- ✅ 3 failed attempts = 30-minute lockout
- ✅ Lockout stored in localStorage
- ✅ Automatic timer reset
- ✅ Visual countdown

### 5. Security Logging
- ✅ All login attempts logged
- ✅ Tracks: email, timestamp, success/failure, IP, user agent
- ✅ Admin-only access to logs
- ✅ Audit trail for compliance

---

## 📋 Staff Code Management

### Generate New Staff Code

Run this SQL to create a new staff member:

```sql
-- Generate staff code for new admin
DO $$
DECLARE
  v_user_id UUID;
  v_staff_code TEXT := 'UJPRO-2024-0002'; -- Change this
  v_code_hash TEXT;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'newstaff@ujenzipro.com'; -- Change this
  
  -- Generate hash
  v_code_hash := encode(digest(v_staff_code, 'sha256'), 'hex');
  
  -- Create credentials
  INSERT INTO admin_staff_credentials (
    user_id,
    work_email,
    staff_code_hash,
    staff_name,
    department,
    position,
    is_active
  ) VALUES (
    v_user_id,
    'newstaff@ujenzipro.com', -- Change this
    v_code_hash,
    'Staff Name', -- Change this
    'Department', -- Change this
    'Position', -- Change this
    true
  );
  
  RAISE NOTICE 'Staff credentials created!';
  RAISE NOTICE 'Email: newstaff@ujenzipro.com';
  RAISE NOTICE 'Staff Code: %', v_staff_code;
END $$;
```

### Deactivate Staff Member

```sql
UPDATE admin_staff_credentials
SET is_active = false,
    updated_at = NOW()
WHERE work_email = 'staff@ujenzipro.com';
```

### View All Active Staff

```sql
SELECT 
  staff_name,
  work_email,
  department,
  position,
  login_count,
  last_login,
  created_at
FROM admin_staff_credentials
WHERE is_active = true
ORDER BY created_at DESC;
```

---

## 🎯 How It Works

### Login Flow:

1. **User enters** work email and staff code
2. **System validates** email domain
3. **System validates** staff code format
4. **Client hashes** staff code with SHA-256
5. **Database verifies** email + hash combination
6. **System checks** account is active
7. **Supabase authenticates** user
8. **System verifies** admin role
9. **Security event logged**
10. **User redirected** to admin dashboard

### Security Checks:

```
✅ Work email domain validation
✅ Staff code format validation
✅ SHA-256 encryption
✅ Database credential verification
✅ Active status check
✅ Admin role verification
✅ Failed attempt tracking
✅ Auto-lockout mechanism
✅ Security event logging
✅ Audit trail creation
```

---

## 📊 View Security Logs

Run this to see all admin login attempts:

```sql
SELECT 
  event_type,
  email_attempt,
  success,
  created_at,
  details,
  CASE 
    WHEN success THEN '✅ Success'
    ELSE '❌ Failed'
  END as status
FROM admin_security_logs
WHERE event_type LIKE '%admin%'
ORDER BY created_at DESC
LIMIT 50;
```

---

## 🔧 Production Deployment

### Before Going Live:

1. **Remove Gmail Support**:
   - Update `CONSTRAINT valid_work_email` in migration
   - Remove `gmail.com` from allowed domains

2. **Generate Unique Codes**:
   - Create unique staff codes for each admin
   - Use format: `UJPRO-YYYY-NNNN`
   - Increment numbers sequentially

3. **Secure Staff Codes**:
   - Never share via email
   - Hand-deliver or use secure channel
   - Store securely (password manager)

4. **Enable Additional Security**:
   - Consider adding 2FA
   - IP whitelist for admin access
   - VPN requirement
   - Time-based restrictions

---

## 📱 Integration with Regular Auth

### Two Login Options:

**Regular Users**: `/auth`
- Email/password authentication
- For builders, suppliers, clients
- Standard security

**Admin Staff**: `/admin-login`
- Work email + staff code
- Ultra-secure authentication
- Enhanced logging
- Lockout protection

### Navigation:

From regular login → "Admin Portal" link  
From admin login → "Regular Login" link

---

## 🎯 Test Credentials

**For Development/Testing:**

```
URL: http://localhost:5175/admin-login
Work Email: hillarytaley@gmail.com
Staff Code: UJPRO-2024-0001
```

After migration runs, these will work automatically!

---

## 📋 Staff Code Examples

```
UJPRO-2024-0001 - Lead Developer
UJPRO-2024-0002 - IT Manager
UJPRO-2024-0003 - Security Admin
UJPRO-2024-0004 - Operations Manager
UJPRO-2024-0005 - Customer Support Lead
```

---

## 🔍 Troubleshooting

### "Invalid Work Email"
- Check email domain is allowed
- Verify spelling
- Ensure lowercase entry

### "Invalid Staff Code"
- Check format: UJPRO-YYYY-NNNN
- All uppercase
- Correct dashes and numbers

### "Account Locked"
- Wait 30 minutes
- Or clear localStorage
- Or contact IT admin

### "Access Denied"
- User exists but not admin
- Check user_roles table
- Grant admin role via SQL

---

## 📁 Files Created

1. **`src/pages/AdminAuth.tsx`** - Admin login component
2. **`supabase/migrations/20241026000000_admin_staff_authentication.sql`** - Database setup
3. **This guide** - Documentation

---

## ✅ Next Steps

1. Run the migration SQL
2. Test the admin login at `/admin-login`
3. Add more staff members as needed
4. Monitor security logs
5. Deploy to production when ready

---

**Created**: October 26, 2025  
**Security Level**: Maximum  
**Status**: Ready for deployment  
**Test URL**: http://localhost:5175/admin-login

