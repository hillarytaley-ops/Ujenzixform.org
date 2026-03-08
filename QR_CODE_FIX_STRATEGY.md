# QR Code Scanning Fix - Strategic Approach

## Problem Analysis

**Current Issues:**
1. RPC function times out after 45 seconds
2. REST API can't find items (0 matches)
3. QR code format mismatch between scanned codes and database

**Root Cause:**
- The scanned QR code format: `UJP-FILM-PO-1772597930676-IATLA-ITEM001-UNIT001-20260307-5021`
- Database might have different formats or the exact match is failing
- Complex variation matching in RPC is causing timeouts

## Strategic Solution (3-Step Approach)

### Step 1: DIAGNOSE (Do This First)
Use the diagnostic function to see what's actually in the database:

```sql
-- Run this in Supabase SQL Editor
SELECT public.diagnose_qr_code('UJP-FILM-PO-1772597930676-IATLA-ITEM001-UNIT001-20260307-5021');
```

This will show:
- What components were extracted (PO number, item number, unit)
- If exact match exists
- What purchase orders match the PO number
- What material items match the PO + item combination

**Action:** Run this diagnostic and share the results so we can see the actual data format.

### Step 2: SIMPLIFY (Use Simpler Function)
Instead of complex variation matching, use direct PO + Item lookup:

**Option A:** Use the new `record_qr_scan_simple` function
- Tries exact match first (fast)
- If not found, extracts PO number + item number
- Queries directly by `purchase_order_id` + `item_sequence` (indexed, fast)
- No complex pattern matching = no timeouts

**Option B:** Update ReceivingScanner to use PO-based lookup directly
- Extract PO number from QR code
- Query purchase_orders by po_number
- Query material_items by purchase_order_id + item_sequence
- Much faster and more reliable

### Step 3: FIX ROOT CAUSE
Once we know the actual format mismatch:
- If QR codes are generated differently → Fix QR code generation
- If format changed over time → Add migration to normalize formats
- If RLS is blocking → Use SECURITY DEFINER function (already done)

## Recommended Immediate Actions

1. **Run Diagnostic** (5 minutes)
   ```sql
   SELECT public.diagnose_qr_code('YOUR_SCANNED_QR_CODE');
   ```

2. **Test Simple Function** (10 minutes)
   - Try calling `record_qr_scan_simple` instead of `record_qr_scan`
   - See if it's faster and more reliable

3. **Update ReceivingScanner** (15 minutes)
   - Add option to use PO-based lookup as primary method
   - Keep RPC as fallback

## Why This Approach Works

1. **Diagnostic First** - We see the actual problem, not guess
2. **Simpler = Faster** - Direct queries are faster than pattern matching
3. **Indexed Lookups** - Using `purchase_order_id` + `item_sequence` uses indexes
4. **Less Code** - Simpler code = fewer bugs = easier to debug

## Next Steps

1. Run the diagnostic function and share results
2. Test the simplified function
3. Decide: Fix format mismatch OR use PO-based lookup as primary method
