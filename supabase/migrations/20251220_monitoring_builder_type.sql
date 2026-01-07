-- =====================================================
-- Add builder_type column to monitoring_service_requests
-- Created: 2024-12-20
-- Purpose: Differentiate pricing for private clients vs professional builders
-- =====================================================

-- Add builder_type column
ALTER TABLE public.monitoring_service_requests
ADD COLUMN IF NOT EXISTS builder_type TEXT DEFAULT 'professional'
CHECK (builder_type IN ('private', 'professional'));

-- Add index for filtering by builder type
CREATE INDEX IF NOT EXISTS idx_monitoring_requests_builder_type
ON public.monitoring_service_requests(builder_type);

-- Add comment for documentation
COMMENT ON COLUMN public.monitoring_service_requests.builder_type IS 
'Type of builder: private (individual homeowners with smaller projects and lower pricing) or professional (contractors/companies with standard commercial pricing)';

-- Update existing records to have a builder type based on user role
-- This will set existing requests to the appropriate builder type
UPDATE public.monitoring_service_requests msr
SET builder_type = CASE 
    WHEN EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = msr.user_id 
        AND ur.role = 'private_client'
    ) THEN 'private'
    ELSE 'professional'
END
WHERE builder_type IS NULL OR builder_type = '';

-- =====================================================
-- PRICING REFERENCE (for documentation)
-- =====================================================
-- 
-- PROFESSIONAL BUILDERS (Companies/Contractors):
--   - AI Cameras: KES 15,000 per camera/month
--   - Drone Surveillance: KES 25,000 per flight hour
--   - Security Monitoring: KES 50,000 per site/month
--   - Analytics & Reporting: KES 20,000 per project/month
--
-- PRIVATE CLIENTS (Individual Homeowners) - 40% Lower:
--   - AI Cameras: KES 9,000 per camera/month
--   - Drone Surveillance: KES 15,000 per flight hour
--   - Security Monitoring: KES 30,000 per site/month
--   - Analytics & Reporting: KES 12,000 per project/month
--
-- =====================================================












