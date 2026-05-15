-- KRA eTIMS: supplier legal/tax identity, buyer billing fields, product tax metadata,
-- purchase_order credit-note sidecar + validated timestamp for tax receipt lifecycle.

-- ---------------------------------------------------------------------------
-- 1) Buyer / company (profiles)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kra_pin TEXT,
  ADD COLUMN IF NOT EXISTS billing_company_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS procurement_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS procurement_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS procurement_contact_email TEXT;

COMMENT ON COLUMN public.profiles.kra_pin IS 'Buyer KRA PIN for eTIMS customerPin on tax invoices.';
COMMENT ON COLUMN public.profiles.billing_company_name IS 'Legal / billing name on tax invoices (defaults to company_name when empty).';
COMMENT ON COLUMN public.profiles.billing_address IS 'Billing address shown on tax invoices.';
COMMENT ON COLUMN public.profiles.procurement_contact_name IS 'Procurement contact for tax invoice footer / correspondence.';
COMMENT ON COLUMN public.profiles.procurement_contact_phone IS 'Procurement phone for tax invoices.';
COMMENT ON COLUMN public.profiles.procurement_contact_email IS 'Procurement email for tax invoices.';

-- ---------------------------------------------------------------------------
-- 2) Supplier (legal seller / taxpayer)
-- ---------------------------------------------------------------------------
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS legal_business_name TEXT,
  ADD COLUMN IF NOT EXISTS kra_pin TEXT,
  ADD COLUMN IF NOT EXISTS vat_registration_status TEXT,
  ADD COLUMN IF NOT EXISTS physical_business_address TEXT,
  ADD COLUMN IF NOT EXISTS invoice_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS invoice_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS etims_branch_code TEXT,
  ADD COLUMN IF NOT EXISTS etims_business_place_code TEXT,
  ADD COLUMN IF NOT EXISTS etims_device_serial TEXT,
  ADD COLUMN IF NOT EXISTS etims_integrator_account_ref TEXT,
  ADD COLUMN IF NOT EXISTS etims_connection_notes TEXT,
  ADD COLUMN IF NOT EXISTS etims_default_payment_type TEXT DEFAULT '01',
  ADD COLUMN IF NOT EXISTS etims_invoice_notes TEXT,
  ADD COLUMN IF NOT EXISTS etims_last_connection_test_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS etims_last_connection_test_result JSONB;

COMMENT ON COLUMN public.suppliers.legal_business_name IS 'Registered legal name for KRA documents; falls back to company_name when null.';
COMMENT ON COLUMN public.suppliers.kra_pin IS 'Supplier KRA PIN (taxpayer issuing the invoice).';
COMMENT ON COLUMN public.suppliers.vat_registration_status IS 'e.g. registered, exempt, not_registered — for UI and compliance checks.';
COMMENT ON COLUMN public.suppliers.physical_business_address IS 'Principal place of business / branch address for invoices.';
COMMENT ON COLUMN public.suppliers.invoice_contact_phone IS 'Phone printed on tax invoices.';
COMMENT ON COLUMN public.suppliers.invoice_contact_email IS 'Email printed on tax invoices.';
COMMENT ON COLUMN public.suppliers.etims_branch_code IS 'KRA / OSCU branch or location code required by integrator.';
COMMENT ON COLUMN public.suppliers.etims_business_place_code IS 'Business place / outlet code where required.';
COMMENT ON COLUMN public.suppliers.etims_device_serial IS 'OSCU / device serial when required for submissions.';
COMMENT ON COLUMN public.suppliers.etims_integrator_account_ref IS 'Non-secret reference (sub-account, tenant id). API passwords belong in Edge secrets, not this column.';
COMMENT ON COLUMN public.suppliers.etims_connection_notes IS 'Internal notes for integrator setup (no secrets).';
COMMENT ON COLUMN public.suppliers.etims_default_payment_type IS 'Default paymentType code (01–07) for generated invoices.';
COMMENT ON COLUMN public.suppliers.etims_invoice_notes IS 'Optional default footer / remarks on invoices.';
COMMENT ON COLUMN public.suppliers.etims_last_connection_test_at IS 'Last supplier-initiated integrator connectivity test.';
COMMENT ON COLUMN public.suppliers.etims_last_connection_test_result IS 'JSON snapshot of last connectivity test response.';

-- ---------------------------------------------------------------------------
-- 3) Products / catalog lines (materials + supplier_product_prices)
-- ---------------------------------------------------------------------------
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS etims_tax_code TEXT,
  ADD COLUMN IF NOT EXISTS etims_item_class_code TEXT,
  ADD COLUMN IF NOT EXISTS etims_qty_unit_code TEXT,
  ADD COLUMN IF NOT EXISTS etims_pkg_unit_code TEXT;

COMMENT ON COLUMN public.materials.etims_tax_code IS 'KRA tax type A–E (SalesItem.taxCode).';
COMMENT ON COLUMN public.materials.etims_item_class_code IS 'KRA / UNSPSC-style item classification when registering items.';
COMMENT ON COLUMN public.materials.etims_qty_unit_code IS 'Quantity unit code from integrator qty unit master.';
COMMENT ON COLUMN public.materials.etims_pkg_unit_code IS 'Package unit code from integrator pkg unit master.';

ALTER TABLE public.supplier_product_prices
  ADD COLUMN IF NOT EXISTS etims_tax_code TEXT,
  ADD COLUMN IF NOT EXISTS etims_item_class_code TEXT,
  ADD COLUMN IF NOT EXISTS etims_qty_unit_code TEXT,
  ADD COLUMN IF NOT EXISTS etims_pkg_unit_code TEXT;

COMMENT ON COLUMN public.supplier_product_prices.etims_tax_code IS 'Per-supplier override of tax code for this catalog line.';
COMMENT ON COLUMN public.supplier_product_prices.etims_item_class_code IS 'Classification override for supplier product.';
COMMENT ON COLUMN public.supplier_product_prices.etims_qty_unit_code IS 'Quantity unit override for this supplier product.';
COMMENT ON COLUMN public.supplier_product_prices.etims_pkg_unit_code IS 'Package unit override for this supplier product.';

-- ---------------------------------------------------------------------------
-- 4) Purchase order: validated sale receipt + credit note audit fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS etims_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS etims_credit_trader_invoice_no TEXT,
  ADD COLUMN IF NOT EXISTS etims_credit_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS etims_credit_response JSONB,
  ADD COLUMN IF NOT EXISTS etims_credit_verification_url TEXT,
  ADD COLUMN IF NOT EXISTS etims_credit_error TEXT;

COMMENT ON COLUMN public.purchase_orders.etims_validated_at IS 'Set when integrator accepted a sale (S) invoice and response was stored successfully.';
COMMENT ON COLUMN public.purchase_orders.etims_credit_trader_invoice_no IS 'Trader invoice number used for the credit note (R).';
COMMENT ON COLUMN public.purchase_orders.etims_credit_response IS 'Last integrator JSON for credit note submission.';
COMMENT ON COLUMN public.purchase_orders.etims_credit_verification_url IS 'Verification URL returned for credit note, if any.';

CREATE INDEX IF NOT EXISTS idx_purchase_orders_etims_validated
  ON public.purchase_orders (supplier_id, etims_validated_at DESC)
  WHERE etims_validated_at IS NOT NULL;
