-- ============================================================
-- Add Custom Tabs Column to Admin Staff
-- Allows Super Admin to assign custom tab permissions to staff
-- Created: February 18, 2026
-- ============================================================

-- Add custom_tabs column to admin_staff table
ALTER TABLE public.admin_staff 
ADD COLUMN IF NOT EXISTS custom_tabs TEXT[] DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.admin_staff.custom_tabs IS 'Custom tab permissions that override role defaults. NULL means use role default permissions.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_staff_custom_tabs ON public.admin_staff USING GIN (custom_tabs);
