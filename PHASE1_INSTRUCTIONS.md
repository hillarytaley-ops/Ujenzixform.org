# Phase 1 Security Migration - Step-by-Step Instructions

## ✅ What Phase 1 Fixes

This migration fixes the **most critical** security vulnerabilities:
- Admin staff UPDATE/DELETE (prevents unauthorized admin modifications)
- User roles UPDATE/DELETE (prevents privilege escalation attacks)
- Purchase orders UPDATE (prevents unauthorized order tampering)
- Quote requests UPDATE (prevents unauthorized quote modifications)
- Delivery orders UPDATE (prevents unauthorized delivery changes)
- Support chats/messages UPDATE (prevents unauthorized support access)
- Invoices UPDATE (prevents unauthorized invoice modifications)
- Suppliers UPDATE (prevents unauthorized supplier data changes)
- Chat messages UPDATE (prevents unauthorized chat modifications)

**Estimated impact:** Fixes ~20-30 of the 106 security warnings

---

## 📋 Pre-Migration Checklist

Before running Phase 1, ensure:
- [ ] You have admin access to Supabase dashboard
- [ ] You have a backup of your database (recommended)
- [ ] You can test the app after migration
- [ ] You have the rollback script ready (`supabase/rollback_permissive_rls_fixes.sql`)

---

## 🚀 Step 1: Run Phase 1 Migration

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to: SQL Editor → New Query

2. **Copy the Phase 1 migration**
   - Open: `supabase/migrations/20260110_fix_permissive_rls_phase1_critical.sql`
   - Copy the entire file contents

3. **Paste and Run**
   - Paste into SQL Editor
   - Click "Run" or press `Ctrl+Enter`

4. **Verify Success**
   - Should see: "Success. No rows returned"
   - Check for any errors in the output

---

## ✅ Step 2: Test Critical Functionality

After running Phase 1, test these workflows:

### Admin Operations
- [ ] Admin can update/delete staff members
- [ ] Admin can update user roles
- [ ] Admin dashboard loads correctly

### Builder Operations
- [ ] Builder can create purchase orders
- [ ] Builder can update their own purchase orders
- [ ] Builder can create quote requests
- [ ] Builder can update their own quote requests
- [ ] Builder can update their own delivery orders

### Supplier Operations
- [ ] Supplier can update their own supplier profile
- [ ] Supplier can update orders assigned to them
- [ ] Supplier can update quotes they've sent

### Support/Chat
- [ ] Users can create support chats
- [ ] Users can view their own support chats
- [ ] Users can send support messages
- [ ] Chat messages can be updated (if needed)

### General
- [ ] No 403/401 errors in browser console
- [ ] No RLS policy errors in logs
- [ ] App loads without errors

---

## 📊 Step 3: Verify Security Improvements

1. **Check Security Advisor**
   - Go to Admin Dashboard → Security tab
   - Check the RLS Policy Warnings count
   - Should see a reduction from 106 warnings

2. **Expected Results**
   - RLS Policy Warnings: Should drop to ~76-86 (from 106)
   - Critical UPDATE/DELETE warnings should be gone
   - Some INSERT warnings may remain (intentional for logging)

---

## 🔄 Step 4: If Something Breaks

### Quick Rollback

1. **Open Supabase SQL Editor**
2. **Copy rollback script**
   - Open: `supabase/rollback_permissive_rls_fixes.sql`
   - Copy entire contents
3. **Run rollback**
   - Paste and execute
   - This restores permissive policies

**⚠️ WARNING:** Rollback restores insecure policies. Only use if absolutely necessary.

---

## 📈 Step 5: After Successful Phase 1

Once Phase 1 is tested and working:

1. ✅ Document any issues you found
2. ✅ Note which workflows still work correctly
3. ✅ Check security advisor for remaining warnings
4. ✅ Proceed to Phase 2 when ready (we'll create it next)

---

## 🆘 Troubleshooting

### Error: "column does not exist"
- Check the error message for the specific column
- We may need to adjust the migration for your schema
- Report the error and we'll fix it

### Error: "policy already exists"
- This is normal - the migration uses `DROP POLICY IF EXISTS`
- Should still work correctly

### Functionality Broken
- Check browser console for specific errors
- Note which operation failed
- Use rollback script if needed
- Report the issue and we'll fix it

---

## 📝 Notes

- Phase 1 only fixes UPDATE/DELETE operations
- INSERT operations remain mostly unchanged (intentional)
- Some logging tables keep permissive policies (by design)
- This is the safest first step

---

**Ready to proceed?** Run Phase 1 migration and test thoroughly!

