-- Columns from 20260305 CREATE TABLE for goods_received_notes that were never added via ALTER
-- for pre-existing tables. auto_create_grn() INSERT references total_quantity, received_time, created_by.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'goods_received_notes'
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'goods_received_notes' AND column_name = 'total_quantity'
  ) THEN
    ALTER TABLE public.goods_received_notes ADD COLUMN total_quantity INTEGER;
    RAISE NOTICE 'Added total_quantity to goods_received_notes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'goods_received_notes' AND column_name = 'received_time'
  ) THEN
    ALTER TABLE public.goods_received_notes ADD COLUMN received_time TIMESTAMPTZ;
    RAISE NOTICE 'Added received_time to goods_received_notes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'goods_received_notes' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.goods_received_notes ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added created_by to goods_received_notes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'goods_received_notes' AND column_name = 'condition_notes'
  ) THEN
    ALTER TABLE public.goods_received_notes ADD COLUMN condition_notes TEXT;
    RAISE NOTICE 'Added condition_notes to goods_received_notes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'goods_received_notes' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.goods_received_notes ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added created_at to goods_received_notes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'goods_received_notes' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.goods_received_notes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at to goods_received_notes';
  END IF;
END $$;
