-- ============================================================
-- Delivery Provider Testing Access
-- Ensure ALL registered delivery providers can see ALL pending requests
-- Created: February 7, 2026
-- ============================================================

-- 1. Update RLS policy for delivery_requests to allow all providers to view pending requests
DO $$
BEGIN
    DROP POLICY IF EXISTS "Delivery providers can view pending requests" ON delivery_requests;
    
    -- Check which column exists: provider_id or driver_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_requests' AND column_name = 'provider_id') THEN
        EXECUTE 'CREATE POLICY "Delivery providers can view pending requests"
            ON delivery_requests FOR SELECT
            USING (
                (status = ''pending'' AND provider_id IS NULL)
                OR (provider_id = auth.uid())
                OR (builder_id = auth.uid())
                OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin''))
            )';
        RAISE NOTICE 'Created SELECT policy for delivery_requests using provider_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_requests' AND column_name = 'driver_id') THEN
        EXECUTE 'CREATE POLICY "Delivery providers can view pending requests"
            ON delivery_requests FOR SELECT
            USING (
                (status = ''pending'' AND driver_id IS NULL)
                OR (driver_id = auth.uid())
                OR (builder_id = auth.uid())
                OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin''))
            )';
        RAISE NOTICE 'Created SELECT policy for delivery_requests using driver_id';
    ELSE
        EXECUTE 'CREATE POLICY "Delivery providers can view pending requests"
            ON delivery_requests FOR SELECT
            USING (
                (status = ''pending'')
                OR (builder_id = auth.uid())
                OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin''))
            )';
        RAISE NOTICE 'Created SELECT policy for delivery_requests (no provider/driver column)';
    END IF;
END $$;

-- 2. Update RLS policy for deliveries table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deliveries' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Delivery providers can view pending deliveries" ON deliveries;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliveries' AND column_name = 'provider_id') THEN
            EXECUTE 'CREATE POLICY "Delivery providers can view pending deliveries"
                ON deliveries FOR SELECT
                USING (
                    (status = ''pending'' AND (provider_id IS NULL OR provider_id = auth.uid()))
                    OR (provider_id = auth.uid())
                    OR (builder_id = auth.uid())
                    OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin''))
                )';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliveries' AND column_name = 'driver_id') THEN
            EXECUTE 'CREATE POLICY "Delivery providers can view pending deliveries"
                ON deliveries FOR SELECT
                USING (
                    (status = ''pending'' AND (driver_id IS NULL OR driver_id = auth.uid()))
                    OR (driver_id = auth.uid())
                    OR (builder_id = auth.uid())
                    OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin''))
                )';
        ELSE
            EXECUTE 'CREATE POLICY "Delivery providers can view pending deliveries"
                ON deliveries FOR SELECT
                USING (
                    (status = ''pending'')
                    OR (builder_id = auth.uid())
                    OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin''))
                )';
        END IF;
        RAISE NOTICE 'Created RLS policy for deliveries table';
    ELSE
        RAISE NOTICE 'deliveries table does not exist, skipping';
    END IF;
END $$;

-- 3. Update RLS policy for delivery_notifications (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_notifications' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Delivery providers can view notifications" ON delivery_notifications;
        EXECUTE 'CREATE POLICY "Delivery providers can view notifications"
            ON delivery_notifications FOR SELECT
            USING (
                EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.user_id = auth.uid())
                OR EXISTS (SELECT 1 FROM delivery_provider_registrations dpr WHERE dpr.auth_user_id = auth.uid())
                OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin''))
            )';
        RAISE NOTICE 'Created RLS policy for delivery_notifications';
    END IF;
END $$;

-- 4. Ensure delivery_communications allows providers to receive notifications (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_communications' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Delivery providers can view communications" ON delivery_communications;
        EXECUTE 'CREATE POLICY "Delivery providers can view communications"
            ON delivery_communications FOR SELECT
            USING (
                (message_type = ''delivery_request'')
                OR (sender_id = auth.uid()::text)
                OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin''))
            )';
        RAISE NOTICE 'Created RLS policy for delivery_communications';
    END IF;
END $$;

-- 5. Allow providers to accept delivery requests
DO $$
BEGIN
    DROP POLICY IF EXISTS "Delivery providers can accept requests" ON delivery_requests;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_requests' AND column_name = 'provider_id') THEN
        EXECUTE 'CREATE POLICY "Delivery providers can accept requests"
            ON delivery_requests FOR UPDATE
            USING (
                (status = ''pending'' AND provider_id IS NULL)
                OR (provider_id = auth.uid())
            )
            WITH CHECK (
                EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.user_id = auth.uid())
                OR EXISTS (SELECT 1 FROM delivery_provider_registrations dpr WHERE dpr.auth_user_id = auth.uid())
                OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin''))
            )';
        RAISE NOTICE 'Created UPDATE policy for delivery_requests using provider_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_requests' AND column_name = 'driver_id') THEN
        EXECUTE 'CREATE POLICY "Delivery providers can accept requests"
            ON delivery_requests FOR UPDATE
            USING (
                (status = ''pending'' AND driver_id IS NULL)
                OR (driver_id = auth.uid())
            )
            WITH CHECK (
                EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.user_id = auth.uid())
                OR EXISTS (SELECT 1 FROM delivery_provider_registrations dpr WHERE dpr.auth_user_id = auth.uid())
                OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin''))
            )';
        RAISE NOTICE 'Created UPDATE policy for delivery_requests using driver_id';
    ELSE
        EXECUTE 'CREATE POLICY "Delivery providers can accept requests"
            ON delivery_requests FOR UPDATE
            USING (status = ''pending'')
            WITH CHECK (
                EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.user_id = auth.uid())
                OR EXISTS (SELECT 1 FROM delivery_provider_registrations dpr WHERE dpr.auth_user_id = auth.uid())
                OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin''))
            )';
        RAISE NOTICE 'Created UPDATE policy for delivery_requests (no provider/driver column)';
    END IF;
END $$;

-- 6. Allow providers to accept deliveries (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deliveries' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Delivery providers can accept deliveries" ON deliveries;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliveries' AND column_name = 'provider_id') THEN
            EXECUTE 'CREATE POLICY "Delivery providers can accept deliveries"
                ON deliveries FOR UPDATE
                USING (
                    (status = ''pending'' AND provider_id IS NULL)
                    OR (provider_id = auth.uid())
                )
                WITH CHECK (
                    EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.user_id = auth.uid())
                    OR EXISTS (SELECT 1 FROM delivery_provider_registrations dpr WHERE dpr.auth_user_id = auth.uid())
                    OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin''))
                )';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliveries' AND column_name = 'driver_id') THEN
            EXECUTE 'CREATE POLICY "Delivery providers can accept deliveries"
                ON deliveries FOR UPDATE
                USING (
                    (status = ''pending'' AND driver_id IS NULL)
                    OR (driver_id = auth.uid())
                )
                WITH CHECK (
                    EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.user_id = auth.uid())
                    OR EXISTS (SELECT 1 FROM delivery_provider_registrations dpr WHERE dpr.auth_user_id = auth.uid())
                    OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin''))
                )';
        ELSE
            EXECUTE 'CREATE POLICY "Delivery providers can accept deliveries"
                ON deliveries FOR UPDATE
                USING (status = ''pending'')
                WITH CHECK (
                    EXISTS (SELECT 1 FROM delivery_providers dp WHERE dp.user_id = auth.uid())
                    OR EXISTS (SELECT 1 FROM delivery_provider_registrations dpr WHERE dpr.auth_user_id = auth.uid())
                    OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ''admin''))
                )';
        END IF;
        RAISE NOTICE 'Created UPDATE policy for deliveries table';
    END IF;
END $$;

-- 7. Verify current delivery providers
SELECT 
    'delivery_providers' as source,
    id,
    user_id
FROM delivery_providers;

-- ============================================================
-- Migration Complete
-- All registered delivery providers can now see all pending requests
-- ============================================================
