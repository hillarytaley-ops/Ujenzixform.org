# Security Migration Plan - Phased Approach

## Recommended Approach: **Option B (Incremental)**

This phased approach fixes security issues gradually, allowing testing after each phase.

---

## Phase 1: Critical Security Fixes (RECOMMENDED FIRST)

**File:** `supabase/migrations/20260110_fix_permissive_rls_phase1_critical.sql`

**What it fixes:**
- ✅ Admin staff UPDATE/DELETE (prevents unauthorized admin modifications)
- ✅ User roles UPDATE/DELETE (prevents privilege escalation)
- ✅ Purchase orders UPDATE (prevents unauthorized order modifications)
- ✅ Quote requests UPDATE (prevents unauthorized quote modifications)
- ✅ Delivery orders UPDATE (prevents unauthorized delivery modifications)
- ✅ Support chats/messages UPDATE (prevents unauthorized support access)
- ✅ Invoices UPDATE (prevents unauthorized invoice modifications)
- ✅ Suppliers UPDATE (prevents unauthorized supplier modifications)
- ✅ Chat messages UPDATE (prevents unauthorized chat modifications)

**Impact:** LOW - Only affects UPDATE/DELETE operations on sensitive tables
**Risk:** LOW - These tables should already have restricted access

**Estimated fixes:** ~20-30 of the 106 warnings

---

## Phase 2: Medium Priority (After Phase 1 Testing)

**What it would fix:**
- Delivery status updates
- Tracking updates
- Goods received notes
- Order materials
- Material QR codes
- Job applications UPDATE/DELETE

**Estimated fixes:** ~30-40 more warnings

---

## Phase 3: Low Priority / Logging Tables (Last)

**What it would fix:**
- Logging/audit tables (these may intentionally be permissive)
- Public-facing INSERT operations (feedback, etc.)
- System logging tables

**Estimated fixes:** Remaining warnings (mostly intentional)

---

## Testing Checklist (After Each Phase)

- [ ] Users can still create orders/requests
- [ ] Users can update their own records
- [ ] Admins can still perform admin operations
- [ ] Suppliers can manage their own data
- [ ] Builders can manage their own orders
- [ ] No 403/401 errors in console
- [ ] Critical workflows still function

---

## Rollback Plan

**File:** `supabase/rollback_permissive_rls_fixes.sql`

If something breaks, run the rollback script to restore permissive policies.

**WARNING:** Rollback restores insecure policies - only use if absolutely necessary.

---

## Recommendation

**Start with Phase 1** (`20260110_fix_permissive_rls_phase1_critical.sql`):
1. ✅ Fixes the most critical security issues
2. ✅ Minimal impact on app functionality
3. ✅ Easy to test and verify
4. ✅ Can rollback if needed

After Phase 1 is tested and working, proceed to Phase 2, then Phase 3.

