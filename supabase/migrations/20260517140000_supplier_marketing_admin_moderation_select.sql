-- Supplier marketing: authors can read own posts in any status (pending video review);
-- admins can update status for moderation (align with builder_posts + AdminVideoApproval).

DROP POLICY IF EXISTS "supplier_marketing_posts_select_public" ON public.supplier_marketing_posts;
CREATE POLICY "supplier_marketing_posts_select_public" ON public.supplier_marketing_posts
  FOR SELECT
  USING (
    COALESCE(NULLIF(trim(status), ''), 'active') = 'active'
    OR supplier_user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "supplier_marketing_posts_update_admin" ON public.supplier_marketing_posts;
CREATE POLICY "supplier_marketing_posts_update_admin" ON public.supplier_marketing_posts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.role::text IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (true);
