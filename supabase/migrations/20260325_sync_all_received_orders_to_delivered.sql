-- ============================================================
-- One-time: Sync all POs to delivered where all material_items
-- have receive_scanned = true but po/dr status is not delivered.
-- Fixes: Orders scanned as delivered (before trigger/migrations)
-- show Delivered on supplier but In Transit on delivery dashboard.
-- Also fixes: auto_create_delivery_note INSERT fails when file_name
-- is NOT NULL and trigger tries to create DN on status update.
-- Created: March 25, 2026
-- ============================================================

-- 1. Fix auto_create_delivery_note to set file_name (NOT NULL) so future DN creates succeed
CREATE OR REPLACE FUNCTION public.auto_create_delivery_note()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_po_builder_id UUID;
    v_po_supplier_id UUID;
    v_po_delivery_provider_id UUID;
    v_po_delivery_address TEXT;
    v_po_items JSONB;
    v_dn_number TEXT;
    v_items JSONB;
    v_delivery_request_id UUID;
BEGIN
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        IF EXISTS (SELECT 1 FROM delivery_notes WHERE purchase_order_id = NEW.id AND status != 'cancelled') THEN
            RETURN NEW;
        END IF;

        SELECT
            po.buyer_id,
            po.supplier_id,
            po.delivery_provider_id,
            po.delivery_address,
            po.items
        INTO
            v_po_builder_id,
            v_po_supplier_id,
            v_po_delivery_provider_id,
            v_po_delivery_address,
            v_po_items
        FROM purchase_orders po
        WHERE po.id = NEW.id;

        IF NOT FOUND OR v_po_builder_id IS NULL THEN
            RETURN NEW;
        END IF;

        SELECT id INTO v_delivery_request_id
        FROM delivery_requests
        WHERE purchase_order_id = NEW.id
        ORDER BY created_at DESC
        LIMIT 1;

        v_dn_number := generate_dn_number();
        v_items := COALESCE(v_po_items, '[]'::JSONB);

        INSERT INTO delivery_notes (
            purchase_order_id,
            delivery_request_id,
            dn_number,
            delivery_note_number,
            builder_id,
            supplier_id,
            delivery_provider_id,
            delivery_address,
            delivery_date,
            delivery_time,
            items,
            status,
            created_by,
            file_path,
            file_name
        ) VALUES (
            NEW.id,
            v_delivery_request_id,
            v_dn_number,
            v_dn_number,
            v_po_builder_id,
            v_po_supplier_id,
            v_po_delivery_provider_id,
            v_po_delivery_address,
            CURRENT_DATE,
            NOW(),
            v_items,
            'pending_signature',
            auth.uid(),
            COALESCE(v_dn_number || '.pdf', ''),
            COALESCE(v_dn_number || '.pdf', 'delivery_note.pdf')
        );

        RAISE NOTICE 'Auto-created Delivery Note % for purchase order %', v_dn_number, NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Disable trigger during sync so UPDATE purchase_orders doesn't fire auto_create_delivery_note
DROP TRIGGER IF EXISTS trigger_auto_create_dn ON purchase_orders;

-- 3. Sync POs to delivered where all material_items received
DO $$
DECLARE
  r RECORD;
  v_updated_po INT := 0;
  v_updated_dr INT := 0;
  v_dr_rows INT;
BEGIN
  FOR r IN (
    SELECT mi.purchase_order_id AS po_id
    FROM material_items mi
    GROUP BY mi.purchase_order_id
    HAVING COUNT(*) > 0
      AND COUNT(*) = COUNT(*) FILTER (WHERE mi.receive_scanned = TRUE)
  )
  LOOP
    UPDATE purchase_orders
    SET status = 'delivered',
        delivered_at = COALESCE(delivered_at, NOW()),
        updated_at = NOW()
    WHERE id = r.po_id
      AND status NOT IN ('delivered', 'completed');
    GET DIAGNOSTICS v_dr_rows = ROW_COUNT;
    IF v_dr_rows > 0 THEN
      v_updated_po := v_updated_po + 1;
    END IF;

    UPDATE delivery_requests
    SET status = 'delivered',
        delivered_at = COALESCE(delivered_at, NOW()),
        updated_at = NOW()
    WHERE purchase_order_id = r.po_id
      AND status NOT IN ('delivered', 'completed', 'cancelled');
    GET DIAGNOSTICS v_dr_rows = ROW_COUNT;
    v_updated_dr := v_updated_dr + v_dr_rows;
  END LOOP;

  RAISE NOTICE 'sync_all_received_to_delivered: updated % purchase_orders and % delivery_requests rows for POs with all items received', v_updated_po, v_updated_dr;
END;
$$;

-- 4. Re-create trigger
CREATE TRIGGER trigger_auto_create_dn
    AFTER UPDATE OF status ON purchase_orders
    FOR EACH ROW
    WHEN (NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered'))
    EXECUTE FUNCTION auto_create_delivery_note();
