-- ============================================================
-- Update Existing Orders with Correct Delivery Provider Info
-- Created: March 16, 2026
-- ============================================================
-- This migration updates existing purchase_orders that have
-- delivery_provider_id but have placeholder/default provider names
-- with the actual provider_name and phone from delivery_providers table
-- ============================================================

DO $$
DECLARE
  po_record RECORD;
  provider_info RECORD;
  updated_count INTEGER := 0;
  not_found_count INTEGER := 0;
  placeholder_patterns TEXT[] := ARRAY[
    'Delivery Provider',
    'delivery provider',
    'DELIVERY PROVIDER',
    'Delivery provider',
    ''
  ];
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting update of existing orders with provider info...';
  RAISE NOTICE '========================================';
  
  -- Find all purchase_orders that have delivery_provider_id but need provider info updated
  FOR po_record IN
    SELECT 
      po.id,
      po.po_number,
      po.delivery_provider_id,
      po.delivery_provider_name,
      po.delivery_provider_phone
    FROM purchase_orders po
    WHERE po.delivery_provider_id IS NOT NULL
      AND (
        -- Has placeholder/default name
        po.delivery_provider_name IS NULL 
        OR LOWER(TRIM(po.delivery_provider_name)) = ANY(
          SELECT LOWER(TRIM(unnest(placeholder_patterns)))
        )
        -- OR missing phone number
        OR po.delivery_provider_phone IS NULL
        OR TRIM(po.delivery_provider_phone) = ''
      )
  LOOP
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Processing order: % (ID: %)', po_record.po_number, po_record.id;
    RAISE NOTICE '  Current provider_id: %', po_record.delivery_provider_id;
    RAISE NOTICE '  Current provider_name: "%"', COALESCE(po_record.delivery_provider_name, 'NULL');
    RAISE NOTICE '  Current provider_phone: "%"', COALESCE(po_record.delivery_provider_phone, 'NULL');
    
    -- Try to find provider by id first (delivery_providers.id)
    SELECT 
      id,
      provider_name,
      phone,
      user_id
    INTO provider_info
    FROM delivery_providers
    WHERE id = po_record.delivery_provider_id
    LIMIT 1;
    
    -- If not found by id, try by user_id (delivery_provider_id might be user_id)
    IF provider_info IS NULL THEN
      SELECT 
        id,
        provider_name,
        phone,
        user_id
      INTO provider_info
      FROM delivery_providers
      WHERE user_id = po_record.delivery_provider_id
      LIMIT 1;
    END IF;
    
    -- If provider found, update the purchase_order
    IF provider_info IS NOT NULL THEN
      UPDATE purchase_orders
      SET 
        delivery_provider_name = provider_info.provider_name,
        delivery_provider_phone = COALESCE(provider_info.phone, delivery_provider_phone),
        updated_at = NOW()
      WHERE id = po_record.id;
      
      updated_count := updated_count + 1;
      RAISE NOTICE '  ✅ UPDATED: Provider name: "%", Phone: "%"', 
        provider_info.provider_name, 
        COALESCE(provider_info.phone, 'NULL');
    ELSE
      not_found_count := not_found_count + 1;
      RAISE NOTICE '  ⚠️ WARNING: Provider not found for provider_id: %', po_record.delivery_provider_id;
      
      -- Try to get from profiles table as last resort
      DECLARE
        profile_info RECORD;
      BEGIN
        SELECT full_name, phone
        INTO profile_info
        FROM profiles
        WHERE user_id = po_record.delivery_provider_id
           OR id = po_record.delivery_provider_id
        LIMIT 1;
        
        IF profile_info IS NOT NULL AND profile_info.full_name IS NOT NULL THEN
          UPDATE purchase_orders
          SET 
            delivery_provider_name = profile_info.full_name,
            delivery_provider_phone = COALESCE(profile_info.phone, delivery_provider_phone),
            updated_at = NOW()
          WHERE id = po_record.id;
          
          updated_count := updated_count + 1;
          RAISE NOTICE '  ✅ UPDATED (from profiles): Provider name: "%", Phone: "%"', 
            profile_info.full_name, 
            COALESCE(profile_info.phone, 'NULL');
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ⚠️ Could not fetch from profiles: %', SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Update process completed:';
  RAISE NOTICE '  ✅ Updated: % orders', updated_count;
  RAISE NOTICE '  ⚠️ Not found: % orders', not_found_count;
  RAISE NOTICE '========================================';
END $$;
