# 🔐 Admin Staff Credentials Guide

## UjenziXform / UjenziPro - IT Administrator Manual

---

## Overview

This guide explains how to create, manage, and revoke admin staff credentials for the UjenziXform Admin Portal.

---

## 📋 Creating New Admin Credentials

### Step 1: Open the Hash Generator Tool

**Location:** `scripts/generate-admin-hash.html`

**How to open:**
- Navigate to your project folder
- Find `scripts/generate-admin-hash.html`
- Double-click to open in your browser

**Or use the full path:**
```
C:\Users\User\OneDrive\Desktop\Cursor3\UjenziPro\scripts\generate-admin-hash.html
```

---

### Step 2: Enter New Admin Details

Fill in the form:

| Field | Example | Required |
|-------|---------|----------|
| Admin Email | `john.kamau@company.com` | ✅ Yes |
| Full Name | `John Kamau` | ✅ Yes |
| Staff Code | `UJPRO-2025-JOHN01` | ✅ Yes |
| Department | `Operations` | ❌ Optional |

**Staff Code Format Suggestions:**
- `UJPRO-2025-XXXX` (year + unique ID)
- `UJPRO-2025-NAME01` (year + name abbreviation)
- Any unique alphanumeric code

---

### Step 3: Generate Hash & SQL

Click the **"Generate Hash & SQL"** button.

The tool will display:
1. **SHA-256 Hash** - The encrypted version of the staff code
2. **SQL Statement** - Ready to copy and run

---

### Step 4: Run SQL in Supabase

1. Open **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Paste the generated SQL statement
5. Click **Run**

**Example SQL:**
```sql
INSERT INTO admin_staff (email, full_name, staff_code_hash, department, created_by)
VALUES (
  'john.kamau@company.com',
  'John Kamau',
  'a1b2c3d4e5f6789...',
  'Operations',
  'admin-tool'
);
```

---

### Step 5: Verify the New Admin

Run this query to confirm:
```sql
SELECT email, full_name, is_active, department,
       CASE WHEN staff_code_hash IS NOT NULL THEN '✅ Ready' ELSE '❌ Missing Hash' END as status
FROM admin_staff
ORDER BY created_at DESC;
```

---

### Step 6: Share Credentials Securely

Send to the new admin via **secure channel only**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 YOUR ADMIN LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Login URL: https://your-domain.com/admin-auth

Email: john.kamau@company.com
Staff Code: UJPRO-2025-JOHN01

⚠️ Keep this code private. Do not share.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Secure channels:**
- ✅ In person
- ✅ Encrypted messaging (Signal, WhatsApp)
- ✅ Secure company portal
- ❌ Never plain email
- ❌ Never SMS

---

## 🔄 Resetting a Staff Code

If an admin forgets their code or it's compromised:

### Step 1: Generate New Code
Open `scripts/generate-admin-hash.html` and create a new staff code for the same email.

### Step 2: Update in Database
```sql
UPDATE admin_staff
SET staff_code_hash = 'new-64-character-hash-here',
    updated_at = NOW()
WHERE email = 'john.kamau@company.com';
```

### Step 3: Share New Code
Send the new staff code to the admin securely.

---

## 🚫 Deactivating an Admin

To temporarily disable an admin (keeps record):

```sql
UPDATE admin_staff
SET is_active = false,
    updated_at = NOW()
WHERE email = 'john.kamau@company.com';
```

To reactivate:
```sql
UPDATE admin_staff
SET is_active = true,
    updated_at = NOW()
WHERE email = 'john.kamau@company.com';
```

---

## 🗑️ Permanently Removing an Admin

To completely remove an admin:

```sql
DELETE FROM admin_staff
WHERE email = 'john.kamau@company.com';
```

⚠️ **Warning:** This cannot be undone!

---

## 📊 Viewing All Admins

```sql
SELECT 
  email,
  full_name,
  department,
  is_active,
  last_login,
  login_count,
  created_at
FROM admin_staff
ORDER BY created_at DESC;
```

---

## 🔒 Security Best Practices

### DO ✅
- Use unique staff codes for each admin
- Share codes via secure channels only
- Deactivate accounts when staff leave
- Rotate codes periodically (every 6-12 months)
- Keep the hash generator tool secure

### DON'T ❌
- Share staff codes via email
- Use simple codes like "admin123"
- Share the same code with multiple admins
- Store plain-text codes anywhere
- Share the SHA-256 hash with anyone

---

## 🆘 Troubleshooting

### "Access Denied" Error
1. Check if email is spelled correctly
2. Verify staff code (case-sensitive)
3. Check if account is active: `SELECT is_active FROM admin_staff WHERE email = '...'`

### "Account Locked" Error
- Wait 10 minutes for automatic unlock
- Or clear lockout in browser console:
  ```javascript
  localStorage.removeItem("admin_lockout_until");
  localStorage.removeItem("admin_login_attempts");
  ```

### Admin Can't Login After Code Reset
- Ensure the new hash was saved correctly
- Verify the admin is using the NEW code, not the old one

---

## 📞 Support

For technical issues with the admin system, contact:
- IT Department
- System Administrator

---

## 📝 Changelog

| Date | Change |
|------|--------|
| 2024-12-08 | Initial secure admin system implemented |
| 2024-12-08 | Removed hardcoded credentials |
| 2024-12-08 | Added SHA-256 hashing |

---

*This document is confidential. For IT administrators only.*




