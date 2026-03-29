-- When a delivery provider marks delivery_requests delivered/completed, ensure purchase_orders.status
-- becomes 'delivered' so trigger_auto_create_dn runs (supplier sees delivery_notes, workflow continues).
-- Also notify supplier (in-app) when a delivery_note row is inserted.

CREATE OR REPLACE FUNCTION public.sync_purchase_order_on_delivery_request_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.purchase_order_id IS NOT NULL
     AND NEW.status IN ('delivered', 'completed')
     AND (OLD.status IS DISTINCT FROM NEW.status)
  THEN
    UPDATE public.purchase_orders po
    SET
      status = 'delivered',
      delivery_status = COALESCE(NULLIF(TRIM(po.delivery_status), ''), 'delivered'),
      delivered_at = COALESCE(po.delivered_at, NOW()),
      updated_at = NOW()
    WHERE po.id = NEW.purchase_order_id
      AND po.status NOT IN ('delivered', 'completed', 'cancelled');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_po_on_dr_delivered ON public.delivery_requests;
CREATE TRIGGER trg_sync_po_on_dr_delivered
  AFTER UPDATE OF status ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_purchase_order_on_delivery_request_delivered();

CREATE OR REPLACE FUNCTION public.notify_supplier_on_delivery_note_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_label TEXT;
BEGIN
  v_label := COALESCE(NULLIF(TRIM(NEW.dn_number), ''), LEFT(NEW.id::TEXT, 8));

  SELECT s.user_id INTO v_user
  FROM public.suppliers s
  WHERE s.id = NEW.supplier_id
  LIMIT 1;

  IF v_user IS NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.supplier_id) THEN
    v_user := NEW.supplier_id;
  END IF;

  IF v_user IS NOT NULL THEN
    PERFORM public.create_notification(
      v_user,
      'delivery_update',
      'Delivery note ready',
      format(
        'Delivery note %s is available after delivery. Open your supplier dashboard → Invoice → Delivery notes.',
        v_label
      ),
      jsonb_build_object(
        'delivery_note_id', NEW.id,
        'purchase_order_id', NEW.purchase_order_id,
        'dn_number', NEW.dn_number
      ),
      '/supplier-dashboard',
      'Open supplier dashboard',
      'normal',
      NULL
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'notify_supplier_on_delivery_note_insert: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_supplier_on_delivery_note ON public.delivery_notes;
CREATE TRIGGER trg_notify_supplier_on_delivery_note
  AFTER INSERT ON public.delivery_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_supplier_on_delivery_note_insert();
