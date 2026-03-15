-- ============================================================
-- Notify Builders When Delivery Address is Missing
-- Created: March 16, 2026
-- ============================================================
-- This migration creates notifications for builders when their
-- delivery requests are missing addresses

-- Function to create notification for missing address
CREATE OR REPLACE FUNCTION notify_builder_missing_address()
RETURNS TRIGGER AS $$
DECLARE
  builder_user_id UUID;
  po_number TEXT;
  notification_id UUID;
BEGIN
  -- Only create notification for active delivery requests
  IF NEW.status IN ('pending', 'requested', 'assigned', 'accepted', 'scheduled', 'in_transit', 'picked_up', 'out_for_delivery') THEN
    -- Check if delivery_address is NULL or empty
    IF NEW.delivery_address IS NULL OR TRIM(NEW.delivery_address) = '' THEN
      -- Get builder's user_id (builder_id might be profile.id or auth.users.id)
      -- Try to get from profiles first
      SELECT user_id INTO builder_user_id
      FROM profiles
      WHERE id = NEW.builder_id
      LIMIT 1;
      
      -- If not found, assume builder_id is already user_id
      IF builder_user_id IS NULL THEN
        builder_user_id := NEW.builder_id;
      END IF;
      
      -- Get purchase order number for better notification message
      SELECT po_number INTO po_number
      FROM purchase_orders
      WHERE id = NEW.purchase_order_id
      LIMIT 1;
      
      -- Create notification (if notifications table exists)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          related_id,
          delivery_request_id,
          is_read,
          created_at
        ) VALUES (
          builder_user_id,
          'delivery_address_missing',
          'Delivery Address Required',
          COALESCE(
            'Your delivery request for order ' || po_number || ' is missing a delivery address. Please provide the address so delivery providers can accept your request.',
            'Your delivery request is missing a delivery address. Please provide the address so delivery providers can accept your request.'
          ),
          NEW.purchase_order_id,
          NEW.id,
          false,
          NOW()
        )
        ON CONFLICT DO NOTHING; -- Prevent duplicate notifications
      END IF;
      
      -- Also try user_notifications table if it exists
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notifications') THEN
        INSERT INTO user_notifications (
          user_id,
          type,
          title,
          message,
          related_id,
          is_read,
          created_at
        ) VALUES (
          builder_user_id,
          'delivery_address_missing',
          'Delivery Address Required',
          COALESCE(
            'Your delivery request for order ' || po_number || ' is missing a delivery address. Please provide the address so delivery providers can accept your request.',
            'Your delivery request is missing a delivery address. Please provide the address so delivery providers can accept your request.'
          ),
          NEW.id,
          false,
          NOW()
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger AFTER INSERT to notify builder
DROP TRIGGER IF EXISTS notify_builder_missing_address_insert_trigger ON delivery_requests;
CREATE TRIGGER notify_builder_missing_address_insert_trigger
  AFTER INSERT ON delivery_requests
  FOR EACH ROW
  WHEN (NEW.delivery_address IS NULL OR TRIM(NEW.delivery_address) = '')
  EXECUTE FUNCTION notify_builder_missing_address();

-- Also create trigger for UPDATE if address becomes NULL (shouldn't happen, but safety)
DROP TRIGGER IF EXISTS notify_builder_missing_address_update_trigger ON delivery_requests;
CREATE TRIGGER notify_builder_missing_address_update_trigger
  AFTER UPDATE OF delivery_address ON delivery_requests
  FOR EACH ROW
  WHEN (
    (NEW.delivery_address IS NULL OR TRIM(NEW.delivery_address) = '')
    AND NEW.status IN ('pending', 'requested', 'assigned', 'accepted', 'scheduled', 'in_transit', 'picked_up', 'out_for_delivery')
  )
  EXECUTE FUNCTION notify_builder_missing_address();

-- Add comment
COMMENT ON FUNCTION notify_builder_missing_address() IS 'Creates notifications for builders when their delivery requests are missing addresses. Helps ensure delivery providers can see and accept delivery requests.';

-- Also create notifications for existing delivery requests with NULL addresses
DO $$
DECLARE
  dr_record RECORD;
  builder_user_id UUID;
  po_number TEXT;
  notification_count INTEGER := 0;
  rows_inserted INTEGER;
BEGIN
  RAISE NOTICE 'Creating notifications for existing delivery requests with missing addresses...';
  
  FOR dr_record IN
    SELECT 
      dr.id,
      dr.builder_id,
      dr.purchase_order_id,
      dr.status
    FROM delivery_requests dr
    WHERE 
      (dr.delivery_address IS NULL OR TRIM(dr.delivery_address) = '')
      AND dr.status IN ('pending', 'requested', 'assigned', 'accepted', 'scheduled', 'in_transit', 'picked_up', 'out_for_delivery')
  LOOP
    -- Get builder's user_id
    SELECT user_id INTO builder_user_id
    FROM profiles
    WHERE id = dr_record.builder_id
    LIMIT 1;
    
    IF builder_user_id IS NULL THEN
      builder_user_id := dr_record.builder_id;
    END IF;
    
    -- Get purchase order number
    SELECT po_number INTO po_number
    FROM purchase_orders
    WHERE id = dr_record.purchase_order_id
    LIMIT 1;
    
    -- Create notification in notifications table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        related_id,
        delivery_request_id,
        is_read,
        created_at
      ) VALUES (
        builder_user_id,
        'delivery_address_missing',
        'Delivery Address Required',
        COALESCE(
          'Your delivery request for order ' || po_number || ' is missing a delivery address. Please provide the address so delivery providers can accept your request.',
          'Your delivery request is missing a delivery address. Please provide the address so delivery providers can accept your request.'
        ),
        dr_record.purchase_order_id,
        dr_record.id,
        false,
        NOW()
      )
      ON CONFLICT DO NOTHING;
      
      GET DIAGNOSTICS rows_inserted = ROW_COUNT;
      notification_count := notification_count + rows_inserted;
    END IF;
    
    -- Also try user_notifications table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notifications') THEN
      INSERT INTO user_notifications (
        user_id,
        type,
        title,
        message,
        related_id,
        is_read,
        created_at
      ) VALUES (
        builder_user_id,
        'delivery_address_missing',
        'Delivery Address Required',
        COALESCE(
          'Your delivery request for order ' || po_number || ' is missing a delivery address. Please provide the address so delivery providers can accept your request.',
          'Your delivery request is missing a delivery address. Please provide the address so delivery providers can accept your request.'
        ),
        dr_record.id,
        false,
        NOW()
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Created % notifications for missing addresses', notification_count;
END $$;
