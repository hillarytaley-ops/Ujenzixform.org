-- Optional: email supplier when delivery_notes row is inserted (in addition to in-app create_notification).
--
-- Setup (one-time per project):
-- 1. Deploy Edge Function: notify-supplier-delivery-note
-- 2. Set Edge secrets: DELIVERY_NOTE_EMAIL_SECRET (random), RESEND_API_KEY, RESEND_FROM_DELIVERY_NOTE (optional)
-- 3. Enable extension Database → Extensions → pg_net (if not already)
-- 4. Run (replace SECRET with same value as DELIVERY_NOTE_EMAIL_SECRET):
--    ALTER DATABASE postgres SET app.dn_email_notify_secret = 'SECRET';
--
-- Without step 4, only in-app notifications run (no HTTP call).

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_net extension: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.notify_supplier_on_delivery_note_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_label TEXT;
  v_secret TEXT;
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

  -- Optional Resend email via Edge Function (async after commit when using pg_net)
  BEGIN
    v_secret := NULLIF(TRIM(current_setting('app.dn_email_notify_secret', true)), '');
    IF v_secret IS NOT NULL AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
      PERFORM net.http_post(
        url := 'https://wuuyjjpgzgeimiptuuws.supabase.co/functions/v1/notify-supplier-delivery-note',
        body := jsonb_build_object('delivery_note_id', NEW.id),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-dn-email-secret', v_secret
        )
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'notify_supplier_on_delivery_note_insert email http: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'notify_supplier_on_delivery_note_insert: %', SQLERRM;
    RETURN NEW;
END;
$$;
