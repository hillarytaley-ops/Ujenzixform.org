-- Make sync_po_to_delivery_request_order_number trigger fault-tolerant so purchase_orders INSERT
-- never fails with 500 when the delivery_requests UPDATE fails (e.g. RLS, missing column).
CREATE OR REPLACE FUNCTION sync_po_to_delivery_request_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    UPDATE delivery_requests
    SET order_number = NEW.po_number,
        updated_at = NOW()
    WHERE purchase_order_id = NEW.id
      AND (order_number IS NULL OR order_number = '' OR order_number LIKE 'PO-%');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_po_to_delivery_request_order_number: % (po_id=%)', SQLERRM, NEW.id;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_po_to_delivery_request_order_number() IS 'Syncs po_number to delivery_requests; faults are logged and do not abort purchase_orders insert.';
