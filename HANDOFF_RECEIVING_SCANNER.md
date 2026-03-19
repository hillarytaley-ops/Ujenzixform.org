# Handoff: Receiving Scanner "No Deliveries Found"

**For the next agent: start by verifying that migration `20260429` has been run on the project.**

---

## Symptom

- Delivery dashboard shows **"Total Deliveries: 1"** and Deliveries tab badge **"1"**.
- **Scan QR** shows **"No Deliveries Found"**.

## Cause

- Receiving Scanner gets `deliveryRequestsFromDashboard` (1 item).
- When it loads `purchase_orders` and `material_items` by ID, **RLS blocks the provider**.
- So it builds **0 orders** and shows the empty state.

## Root fix

Apply migration **`supabase/migrations/20260429_provider_see_po_for_receiving_scanner.sql`** in Supabase (SQL Editor).

That migration **restores** `purchase_order_visible_to_delivery_provider()` so that providers linked via **`delivery_providers.id`** (not only `auth.uid()`) can read the relevant `purchase_orders`.  
Earlier migration `20260330_fix_purchase_orders_rls_recursion.sql` had replaced the function with a version that only checks `dr.provider_id = auth.uid()` and `po.delivery_provider_id = auth.uid()`. Many `delivery_requests` have `provider_id = delivery_providers.id`, so those providers got 0 rows → scanner showed nothing.

## Next steps for the next agent

1. **Verify migration 20260429 has been run**  
   Use **`supabase/verify_20260429_applied.sql`** in the Supabase SQL Editor (see that file).

2. **If not applied**  
   Run the full contents of **`supabase/migrations/20260429_provider_see_po_for_receiving_scanner.sql`** in the SQL Editor.

3. **Confirm behavior**  
   - Scanner receives `isolatedActiveDeliveries` with `purchase_order_id`.
   - PO and `material_items` queries run **after** the migration and return rows.

## Note on recent code changes

Recent app changes (skip full fetch when FAST PATH has data, show orders when items are empty, fallback fetch) improve behavior but **do not fix the root cause** if the migration is not applied. Applying **20260429** is required.
