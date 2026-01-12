# IT Helpdesk Dashboard Access Fix

## ✅ Recommended Solution: Option 2 - RLS Policies

I've created a migration that grants IT helpdesk staff proper read access to overview statistics.

---

## 📋 What Was Fixed

### Created Migration: `20260110_allow_it_helpdesk_overview_access.sql`

This migration:
1. ✅ Creates `is_it_helpdesk()` helper function - checks if user is IT helpdesk staff
2. ✅ Creates `is_admin_staff()` helper function - checks if user is any admin staff
3. ✅ Adds RLS policies for IT helpdesk to read:
   - `user_roles` (for user counts)
   - `supplier_applications` (for pending registrations count)
   - `delivery_providers` (for pending registrations count)
   - `feedback` (for feedback count)

---

## 🚀 How to Apply

### Step 1: Run the Migration

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to: SQL Editor → New Query

2. **Copy and Run Migration**
   - Open: `supabase/migrations/20260110_allow_it_helpdesk_overview_access.sql`
   - Copy the entire file contents
   - Paste into SQL Editor
   - Click "Run" or press `Ctrl+Enter`

3. **Verify Success**
   - Should see: "✅ IT Helpdesk overview access policies created!"
   - Check for any errors in the output

### Step 2: Test IT Helpdesk Access

1. **Have Dominic Bwambok log in again**
   - Go to `/admin-login`
   - Sign in with IT helpdesk credentials
   - Should now see real statistics (not zeros)

2. **Verify Dashboard**
   - Overview tab should show actual counts
   - No more "Admin service role key not configured" blocking access
   - Stats should load successfully

---

## 🔍 How It Works

### Before (Problem):
- IT helpdesk staff had no RLS policies to read overview stats
- Queries failed silently or returned empty results
- Dashboard showed `0` for all statistics

### After (Solution):
- IT helpdesk staff can read counts from overview tables
- Policies use `is_it_helpdesk()` function to verify staff role
- Still secure - only read access, no write/modify permissions
- No admin service key needed in client code

---

## 🔐 Security Notes

### What IT Helpdesk CAN Do:
- ✅ Read user role counts (for statistics)
- ✅ Read pending registration counts
- ✅ Read feedback counts
- ✅ Access overview dashboard data

### What IT Helpdesk CANNOT Do:
- ❌ Modify any data (no INSERT/UPDATE/DELETE policies)
- ❌ Access sensitive user details
- ❌ Bypass RLS on other tables
- ❌ View full user records (only counts)

---

## 📊 Expected Results

After running the migration:
- ✅ IT helpdesk can access dashboard successfully
- ✅ Overview statistics show real numbers (not zeros)
- ✅ No more RLS blocking errors in console
- ✅ Better user experience for IT helpdesk staff

---

## 🔄 Alternative: Option 1 (Admin Service Key)

If you still prefer Option 1 (configuring admin service key):

### Pros:
- Quick fix - just add environment variable
- Full access to all data without RLS restrictions

### Cons:
- ⚠️ **Security Risk** - Service key bypasses ALL RLS policies
- ⚠️ Should ideally be server-side only (Edge Functions)
- ⚠️ Not recommended for client-side use

### How to Configure (if needed):
1. Get service role key from: Supabase Dashboard → Settings → API → Service Role Key
2. Add to `.env` file:
   ```
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
3. Restart development server

**⚠️ WARNING:** Never commit service role key to git!

---

## ✅ Recommendation

**Use Option 2 (RLS Policies)** - Already implemented and ready to run!

- ✅ More secure
- ✅ Follows best practices
- ✅ Principle of least privilege
- ✅ No sensitive keys in client code
- ✅ Better long-term solution

---

## 🆘 Troubleshooting

### Error: "function is_it_helpdesk() does not exist"
- Make sure you ran the entire migration file
- Check that the function was created: `SELECT * FROM pg_proc WHERE proname = 'is_it_helpdesk';`

### Stats Still Show Zero
- Check if IT helpdesk staff email matches in `admin_staff` table
- Verify role is set to `'it_helpdesk'` in `admin_staff.role`
- Verify status is `'active'` in `admin_staff.status`

### RLS Still Blocking
- Check browser console for specific error messages
- Verify policies were created: `SELECT * FROM pg_policies WHERE tablename = 'user_roles';`
- Ensure staff is authenticated (has valid session)

---

**Ready to apply?** Run the migration and test IT helpdesk access!

