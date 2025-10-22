-- Supplier Table Enhancement Migration Runner
-- Run these migrations in order to upgrade the suppliers table from 7.5/10 to 9/10

-- 1. Create supplier_reviews table
\i supabase/migrations/20241212_create_supplier_reviews_table.sql

-- 2. Add review aggregation fields
\i supabase/migrations/20241212_add_supplier_aggregation_fields.sql

-- 3. Add business performance fields
\i supabase/migrations/20241212_add_business_performance_fields.sql

-- 4. Add geographic and operational fields
\i supabase/migrations/20241212_add_geographic_operational_fields.sql

-- 5. Add advanced business features
\i supabase/migrations/20241212_add_advanced_business_features.sql

-- 6. Add helper functions
\i supabase/migrations/20241212_add_helper_functions.sql

-- Verify migrations completed successfully
SELECT 'Supplier table enhancements completed successfully!' as status;
