-- Fix Security Issues: Add Missing RLS Policies for Tables with RLS Enabled

-- 1. delivery_acknowledgements
ALTER TABLE public.delivery_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delivery acknowledgements they're involved in"
ON public.delivery_acknowledgements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = delivery_acknowledgements.acknowledger_id OR
      EXISTS (
        SELECT 1 FROM delivery_notes dn
        WHERE dn.id = delivery_acknowledgements.delivery_note_id
        AND dn.supplier_id = p.id
      )
    )
  )
);

CREATE POLICY "Users can create acknowledgements for deliveries to them"
ON public.delivery_acknowledgements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_acknowledgements.acknowledger_id
  )
);

-- 2. delivery_note_signatures
ALTER TABLE public.delivery_note_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures they created or are involved in"
ON public.delivery_note_signatures FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = delivery_note_signatures.signer_id OR
      EXISTS (
        SELECT 1 FROM delivery_notes dn
        WHERE dn.id = delivery_note_signatures.delivery_note_id
        AND dn.supplier_id = p.id
      )
    )
  )
);

CREATE POLICY "Users can create their own signatures"
ON public.delivery_note_signatures FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_note_signatures.signer_id
  )
);

-- 3. delivery_notes
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can manage their delivery notes"
ON public.delivery_notes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = delivery_notes.supplier_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = delivery_notes.supplier_id)
  )
);

CREATE POLICY "Builders can view delivery notes for their orders"
ON public.delivery_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN purchase_orders po ON po.buyer_id = p.id
    WHERE p.user_id = auth.uid() 
    AND po.id = delivery_notes.purchase_order_id
    AND p.role = 'builder'
  )
);

-- 4. delivery_notifications
ALTER TABLE public.delivery_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own delivery notifications"
ON public.delivery_notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = delivery_notifications.builder_id OR
      p.id = delivery_notifications.supplier_id
    )
  )
);

CREATE POLICY "Builders can create delivery notifications"
ON public.delivery_notifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_notifications.builder_id
    AND p.role = 'builder'
  )
);

-- 5. delivery_orders
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own delivery orders"
ON public.delivery_orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      p.id = delivery_orders.builder_id OR
      p.id = delivery_orders.supplier_id
    )
  )
);

CREATE POLICY "Builders can create delivery orders"
ON public.delivery_orders FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = delivery_orders.builder_id
    AND p.role = 'builder'
  )
);

-- 6. delivery_provider_listings
ALTER TABLE public.delivery_provider_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage their own listings"
ON public.delivery_provider_listings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM delivery_providers dp
    JOIN profiles p ON p.id = dp.user_id
    WHERE p.user_id = auth.uid() 
    AND dp.id = delivery_provider_listings.provider_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM delivery_providers dp
    JOIN profiles p ON p.id = dp.user_id
    WHERE p.user_id = auth.uid() 
    AND dp.id = delivery_provider_listings.provider_id
  )
);

CREATE POLICY "Authenticated users can view active listings"
ON public.delivery_provider_listings FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND delivery_provider_listings.is_active = true
  AND delivery_provider_listings.is_verified = true
);

-- 7. delivery_provider_queue
ALTER TABLE public.delivery_provider_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and involved parties can view queue"
ON public.delivery_provider_queue FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      EXISTS (
        SELECT 1 FROM delivery_providers dp
        WHERE dp.id = delivery_provider_queue.provider_id
        AND dp.user_id = p.id
      ) OR
      EXISTS (
        SELECT 1 FROM delivery_requests dr
        WHERE dr.id = delivery_provider_queue.request_id
        AND dr.builder_id = p.id
      )
    )
  )
);

-- 8. delivery_provider_responses
ALTER TABLE public.delivery_provider_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage their responses"
ON public.delivery_provider_responses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM delivery_providers dp
    JOIN profiles p ON p.id = dp.user_id
    Where p.user_id = auth.uid() 
    AND dp.id = delivery_provider_responses.provider_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM delivery_providers dp
    JOIN profiles p ON p.id = dp.user_id
    WHERE p.user_id = auth.uid() 
    AND dp.id = delivery_provider_responses.provider_id
  )
);

CREATE POLICY "Builders can view responses to their requests"
ON public.delivery_provider_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN delivery_notifications dn ON dn.builder_id = p.id
    WHERE p.user_id = auth.uid() 
    AND dn.id = delivery_provider_responses.notification_id
    AND p.role = 'builder'
  )
);

-- 9. delivery_status_updates
ALTER TABLE public.delivery_status_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and involved parties can view status updates"
ON public.delivery_status_updates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      EXISTS (
        SELECT 1 FROM delivery_requests dr
        WHERE dr.id = delivery_status_updates.delivery_request_id
        AND (dr.builder_id = p.id OR dr.provider_id IN (
          SELECT dp.id FROM delivery_providers dp WHERE dp.user_id = p.id
        ))
      )
    )
  )
);

-- 10. delivery_updates
ALTER TABLE public.delivery_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and involved parties can view delivery updates"
ON public.delivery_updates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'admin' OR
      EXISTS (
        SELECT 1 FROM deliveries d
        WHERE d.id = delivery_updates.delivery_id
        AND (d.builder_id = p.id OR d.supplier_id = p.id)
      )
    )
  )
);

-- 11. goods_received_notes
ALTER TABLE public.goods_received_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Builders can manage GRNs for their projects"
ON public.goods_received_notes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.role = 'admin' OR p.id = goods_received_notes.builder_id)
    AND p.role = 'builder'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.id = goods_received_notes.builder_id
    AND p.role = 'builder'
  )
);

-- 12. order_materials
CREATE POLICY "Users can manage order materials they're involved in"
ON public.order_materials FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM delivery_orders do
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE do.id = order_materials.order_id
    AND (p.role = 'admin' OR p.id = do.builder_id OR p.id = do.supplier_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM delivery_orders do
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE do.id = order_materials.order_id
    AND (p.role = 'admin' OR p.id = do.builder_id OR p.id = do.supplier_id)
  )
);

-- Log security improvement
INSERT INTO emergency_security_log (
  event_type, 
  event_data, 
  user_id
) VALUES (
  'SECURITY_IMPROVEMENT_APPLIED',
  'Added missing RLS policies to 12 tables to prevent unauthorized data access',
  auth.uid()
);