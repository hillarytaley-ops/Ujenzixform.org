-- Restore necessary table permissions

-- Core business tables
GRANT SELECT, INSERT, UPDATE ON public.purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quotation_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.deliveries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.delivery_requests TO authenticated;
GRANT SELECT ON public.delivery_providers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT SELECT, INSERT ON public.purchase_receipts TO authenticated;

-- Profile management
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profile_contact_consent TO authenticated;

-- Supplier directory (only through secure view)
GRANT SELECT ON public.suppliers_public_directory TO authenticated;

-- Audit tables (INSERT only)
GRANT INSERT ON public.contact_access_audit TO authenticated;
GRANT INSERT ON public.delivery_access_log TO authenticated;
GRANT INSERT ON public.camera_access_log TO authenticated;

-- Payment (restricted by RLS)
GRANT SELECT, INSERT ON public.payments TO authenticated;

-- Sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;