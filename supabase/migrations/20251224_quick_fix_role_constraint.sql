-- =====================================================================
-- QUICK FIX: Update admin_staff role constraint
-- Run this FIRST before the main security fix migration
-- =====================================================================

-- Drop the old constraint
ALTER TABLE public.admin_staff DROP CONSTRAINT IF EXISTS admin_staff_role_check;

-- Add new constraint with all roles
ALTER TABLE public.admin_staff ADD CONSTRAINT admin_staff_role_check 
  CHECK (role IN (
    'super_admin',
    'admin', 
    'administrator',
    'manager', 
    'moderator', 
    'support',
    'customer_support',
    'it_helpdesk',
    'logistics_officer',
    'registrations_officer',
    'finance_officer',
    'monitoring_officer',
    'content_moderator',
    'viewer'
  ));

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.admin_staff'::regclass 
AND contype = 'c';









