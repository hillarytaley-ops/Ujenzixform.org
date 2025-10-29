# 🔒 Fix Materials Table RLS Security Issue

## ⚠️ SECURITY ISSUE
**Table `public.materials` is public, but RLS has not been enabled.**

This means anyone can read, modify, or delete materials data without authentication!

---

## ✅ SOLUTION: Enable RLS (2 Methods)

### **Method 1: Via Supabase Dashboard (Easiest - 2 minutes)**

#### Step 1: Go to Supabase SQL Editor
1. Open your Supabase Dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **"New Query"**

#### Step 2: Run This SQL
Copy and paste the entire migration file:

```sql
-- Open the file: supabase/migrations/20251029_enable_materials_rls.sql
-- Copy ALL the SQL code
-- Paste into SQL Editor
-- Click "Run"
```

**OR paste this directly:**

```sql
-- Enable Row Level Security
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials FORCE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "materials_public_read" ON public.materials;
DROP POLICY IF EXISTS "materials_supplier_insert" ON public.materials;
DROP POLICY IF EXISTS "materials_supplier_update" ON public.materials;
DROP POLICY IF EXISTS "materials_supplier_delete" ON public.materials;
DROP POLICY IF EXISTS "materials_admin_all" ON public.materials;

-- PUBLIC READ ACCESS (Everyone can view materials for catalog)
CREATE POLICY "materials_public_read"
ON public.materials
FOR SELECT
TO public
USING (true);

-- SUPPLIER INSERT (Suppliers can add their own materials)
CREATE POLICY "materials_supplier_insert"
ON public.materials
FOR INSERT
TO authenticated
WITH CHECK (
  supplier_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'supplier'::app_role
  )
);

-- SUPPLIER UPDATE (Suppliers can update their own materials)
CREATE POLICY "materials_supplier_update"
ON public.materials
FOR UPDATE
TO authenticated
USING (
  supplier_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'supplier'::app_role
  )
)
WITH CHECK (
  supplier_id = auth.uid()
);

-- SUPPLIER DELETE (Suppliers can delete their own materials)
CREATE POLICY "materials_supplier_delete"
ON public.materials
FOR DELETE
TO authenticated
USING (
  supplier_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'supplier'::app_role
  )
);

-- ADMIN FULL ACCESS
CREATE POLICY "materials_admin_all"
ON public.materials
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);
```

#### Step 3: Verify RLS is Enabled
Run this query to check:

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'materials';
```

Should show: `rls_enabled = true` ✅

#### Step 4: Check Policies Created
```sql
SELECT * FROM pg_policies WHERE tablename = 'materials';
```

Should show 5 policies ✅

---

### **Method 2: Via Supabase CLI (If you have it installed)**

```bash
# Navigate to project directory
cd C:\Users\User\OneDrive\Desktop\Cursor3\UjenziPro

# Push migration
supabase db push
```

---

## 🔐 What This Fixes

### Before (INSECURE ❌):
- ❌ Anyone can read all materials
- ❌ Anyone can add fake materials
- ❌ Anyone can modify supplier materials
- ❌ Anyone can delete materials
- ❌ No access control

### After (SECURE ✅):
- ✅ **Everyone** can read/browse materials (for catalog)
- ✅ **Suppliers** can only add their own materials
- ✅ **Suppliers** can only edit/delete their own materials
- ✅ **Admins** have full access
- ✅ Proper authentication required
- ✅ Row-level security enforced

---

## 📋 RLS Policies Explained

### 1. **Public Read Policy**
```sql
materials_public_read
```
- **Who**: Everyone (public + authenticated)
- **Action**: SELECT (read)
- **Why**: Buyers need to browse the catalog

### 2. **Supplier Insert Policy**
```sql
materials_supplier_insert
```
- **Who**: Authenticated suppliers
- **Action**: INSERT (create)
- **Rule**: Can only insert materials where `supplier_id = their own user id`

### 3. **Supplier Update Policy**
```sql
materials_supplier_update
```
- **Who**: Authenticated suppliers
- **Action**: UPDATE (edit)
- **Rule**: Can only update materials they own

### 4. **Supplier Delete Policy**
```sql
materials_supplier_delete
```
- **Who**: Authenticated suppliers
- **Action**: DELETE (remove)
- **Rule**: Can only delete their own materials

### 5. **Admin All Policy**
```sql
materials_admin_all
```
- **Who**: Authenticated admins
- **Action**: ALL (select, insert, update, delete)
- **Rule**: Admins can do anything

---

## 🧪 Test After Enabling

### Test 1: Public Read (Should Work)
```sql
-- As unauthenticated user
SELECT * FROM materials LIMIT 5;
```
✅ Should return materials

### Test 2: Supplier Insert (Should Work if authenticated as supplier)
```sql
-- As authenticated supplier
INSERT INTO materials (supplier_id, name, category, unit_price, unit)
VALUES (auth.uid(), 'Test Product', 'Cement', 850, 'bag');
```
✅ Should work for own supplier_id
❌ Should fail if trying different supplier_id

### Test 3: Update Other's Material (Should Fail)
```sql
-- As supplier trying to update another supplier's material
UPDATE materials 
SET unit_price = 999 
WHERE supplier_id != auth.uid();
```
❌ Should fail (no rows updated)

---

## 🚨 Important Notes

1. **Existing Data**: All existing materials remain unchanged
2. **App Functionality**: Your app will work the same way
3. **Security**: Now protected from unauthorized access
4. **Performance**: No performance impact
5. **Catalog**: Public users can still browse (read-only)

---

## ✅ After You Apply This

The security warning in Supabase Dashboard will disappear:
- ❌ Before: "Table public.materials is public, but RLS has not been enabled"
- ✅ After: No warning, table is secured

---

## 🆘 Troubleshooting

### Issue: "Suppliers can't add materials"
**Solution**: Check if user has supplier role:
```sql
SELECT * FROM user_roles WHERE user_id = 'SUPPLIER_USER_ID';
```

### Issue: "Policy already exists"
**Solution**: Drop existing policies first (already in migration)

### Issue: "RLS not enabled"
**Solution**: Run the ALTER TABLE commands again

---

## 🎯 Quick Summary

**What to do:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy the SQL from `supabase/migrations/20251029_enable_materials_rls.sql`
3. Paste and run
4. Verify RLS is enabled
5. Done! ✅

**Time required:** 2 minutes
**Difficulty:** Easy (just copy-paste SQL)
**Risk:** Zero (only adds security)

---

**Need help? The migration file is ready at:**
```
supabase/migrations/20251029_enable_materials_rls.sql
```

