-- ===================================================================
-- INSERT TEST DELIVERY FOR obedt@gmail.com
-- Run this in Supabase SQL Editor
-- ===================================================================

-- STEP 1: Add tracking_number column if it doesn't exist
ALTER TABLE public.delivery_requests 
ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- Create index for tracking number lookups
CREATE INDEX IF NOT EXISTS idx_delivery_requests_tracking 
ON public.delivery_requests(tracking_number);

-- STEP 2: Insert the test delivery
DO $$
DECLARE
    v_user_id UUID;
    v_tracking_number TEXT := 'TRK20251220-OBEDT';
BEGIN
    -- Find the user by email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'obedt@gmail.com'
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User obedt@gmail.com not found. Creating delivery with email only.';
    ELSE
        RAISE NOTICE 'Found user: %', v_user_id;
    END IF;
    
    -- Insert the test delivery request
    INSERT INTO public.delivery_requests (
        builder_id,
        builder_email,
        pickup_location,
        pickup_address,
        dropoff_location,
        dropoff_address,
        item_description,
        estimated_weight,
        preferred_date,
        preferred_time,
        urgency,
        special_instructions,
        status,
        tracking_number,
        estimated_cost,
        current_location,
        tracking_updates,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        'obedt@gmail.com',
        'Nairobi CBD',
        'Kenyatta Avenue, Building Materials Store, Nairobi',
        'Westlands',
        '123 Westlands Road, Construction Site Alpha, Nairobi',
        'Construction Materials - Cement (50 bags), Steel Bars (20 pieces), Roofing Sheets (15 pieces)',
        '2500 kg',
        CURRENT_DATE + INTERVAL '2 days',
        '09:00 AM - 12:00 PM',
        'normal',
        'Handle with care. Call on arrival. Gate code: 1234',
        'in_transit',
        v_tracking_number,
        15000.00,
        'En route to Westlands',
        jsonb_build_array(
            jsonb_build_object(
                'timestamp', NOW() - INTERVAL '2 hours',
                'status', 'Order Placed',
                'location', 'Online',
                'description', 'Delivery request submitted'
            ),
            jsonb_build_object(
                'timestamp', NOW() - INTERVAL '1 hour 30 minutes',
                'status', 'Confirmed',
                'location', 'System',
                'description', 'Delivery request confirmed by provider'
            ),
            jsonb_build_object(
                'timestamp', NOW() - INTERVAL '1 hour',
                'status', 'Picked Up',
                'location', 'Nairobi CBD',
                'description', 'Materials picked up from supplier'
            ),
            jsonb_build_object(
                'timestamp', NOW() - INTERVAL '30 minutes',
                'status', 'In Transit',
                'location', 'Parklands',
                'description', 'En route to delivery location'
            )
        ),
        NOW() - INTERVAL '2 hours',
        NOW()
    );
    
    RAISE NOTICE 'SUCCESS: Test delivery created with tracking number: %', v_tracking_number;
END $$;

-- STEP 3: Verify the insertion
SELECT 
    id,
    builder_email,
    tracking_number,
    status,
    pickup_location,
    dropoff_location,
    item_description,
    estimated_cost,
    created_at
FROM public.delivery_requests 
WHERE builder_email = 'obedt@gmail.com'
ORDER BY created_at DESC
LIMIT 1;












