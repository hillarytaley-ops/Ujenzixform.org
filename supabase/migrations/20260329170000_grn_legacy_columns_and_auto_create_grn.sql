-- Legacy goods_received_notes (pre–workflow migration) may require denormalized columns that
-- auto_create_grn() does not set. Relax NOT NULL so workflow inserts succeed, and populate supplier_name when the column exists.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'goods_received_notes'
      AND column_name IN ('supplier_name', 'overall_condition', 'received_by')
  LOOP
    EXECUTE format(
      'ALTER TABLE public.goods_received_notes ALTER COLUMN %I DROP NOT NULL',
      r.column_name
    );
    RAISE NOTICE 'Dropped NOT NULL on goods_received_notes.%', r.column_name;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION auto_create_grn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grn_number TEXT;
  v_supplier_name TEXT;
  v_total_qty INTEGER;
  v_has_supplier_name_col BOOLEAN;
BEGIN
  IF NEW.builder_decision = 'accepted'
     AND (OLD.builder_decision IS NULL OR OLD.builder_decision != 'accepted') THEN

    IF EXISTS (SELECT 1 FROM goods_received_notes WHERE delivery_note_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    IF NEW.builder_id IS NULL OR NEW.supplier_id IS NULL OR NEW.purchase_order_id IS NULL THEN
      RAISE NOTICE 'Cannot create GRN: missing required fields (builder_id: %, supplier_id: %, purchase_order_id: %)',
        NEW.builder_id, NEW.supplier_id, NEW.purchase_order_id;
      RETURN NEW;
    END IF;

    v_grn_number := generate_grn_number();

    SELECT company_name INTO v_supplier_name
    FROM suppliers
    WHERE id = NEW.supplier_id
    LIMIT 1;
    v_supplier_name := COALESCE(v_supplier_name, 'Unknown supplier');

    SELECT COALESCE(SUM((elem->>'quantity')::INTEGER), 0)
    INTO v_total_qty
    FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb)) AS elem;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'goods_received_notes'
        AND column_name = 'supplier_name'
    ) INTO v_has_supplier_name_col;

    IF v_has_supplier_name_col THEN
      INSERT INTO goods_received_notes (
        delivery_note_id,
        purchase_order_id,
        grn_number,
        builder_id,
        supplier_id,
        items,
        total_quantity,
        received_date,
        received_time,
        status,
        created_by,
        supplier_name
      ) VALUES (
        NEW.id,
        NEW.purchase_order_id,
        v_grn_number,
        NEW.builder_id,
        NEW.supplier_id,
        NEW.items,
        v_total_qty,
        CURRENT_DATE,
        NOW(),
        'generated',
        auth.uid(),
        v_supplier_name
      );
    ELSE
      INSERT INTO goods_received_notes (
        delivery_note_id,
        purchase_order_id,
        grn_number,
        builder_id,
        supplier_id,
        items,
        total_quantity,
        received_date,
        received_time,
        status,
        created_by
      ) VALUES (
        NEW.id,
        NEW.purchase_order_id,
        v_grn_number,
        NEW.builder_id,
        NEW.supplier_id,
        NEW.items,
        v_total_qty,
        CURRENT_DATE,
        NOW(),
        'generated',
        auth.uid()
      );
    END IF;

    RAISE NOTICE 'Auto-created GRN % for delivery note %', v_grn_number, NEW.dn_number;
  END IF;

  RETURN NEW;
END;
$$;
