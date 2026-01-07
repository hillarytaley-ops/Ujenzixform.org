-- ============================================================================
-- Add Approval Status to Materials Table
-- ============================================================================
-- Created: December 27, 2025
-- Purpose: Allow suppliers to submit products for admin approval before they
--          appear in the marketplace
-- ============================================================================

-- Add approval_status column to materials table
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';

-- Add rejection_reason column for admin feedback
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for faster filtering by approval status
CREATE INDEX IF NOT EXISTS idx_materials_approval_status 
  ON materials(approval_status);

-- Update existing materials to be approved by default (backward compatibility)
UPDATE materials 
SET approval_status = 'approved' 
WHERE approval_status IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN materials.approval_status IS 
  'Product approval status: pending, approved, rejected. New supplier products start as pending.';

COMMENT ON COLUMN materials.rejection_reason IS 
  'Admin feedback when rejecting a product submission.';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'materials' 
AND column_name IN ('approval_status', 'rejection_reason');



