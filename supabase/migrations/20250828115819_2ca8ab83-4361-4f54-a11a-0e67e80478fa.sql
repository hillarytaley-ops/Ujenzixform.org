-- Create test profiles with valid roles only
INSERT INTO public.profiles (id, user_id, role, user_type, is_professional, full_name, created_at, updated_at)
VALUES 
  (gen_random_uuid(), gen_random_uuid(), 'builder', 'individual', false, 'Test Builder Individual', now(), now()),
  (gen_random_uuid(), gen_random_uuid(), 'builder', 'company', true, 'Test Builder Company', now(), now()),
  (gen_random_uuid(), gen_random_uuid(), 'supplier', 'company', true, 'Test Supplier Company', now(), now()),
  (gen_random_uuid(), gen_random_uuid(), 'admin', 'individual', true, 'Test Admin', now(), now());