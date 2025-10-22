-- First, let's check if we can make user_id nullable temporarily for sample data
-- Or we can create sample suppliers with a placeholder user approach

-- Create a sample user profile first (admin user for demo suppliers)
DO $$
DECLARE
    sample_user_id UUID;
BEGIN
    -- Insert a sample profile for demo suppliers
    INSERT INTO public.profiles (
        user_id,
        role,
        user_type,
        is_professional,
        email,
        full_name,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        'supplier',
        'company', 
        true,
        'demo@ujenzi.pro',
        'Demo Supplier Account',
        now(),
        now()
    ) RETURNING id INTO sample_user_id;
    
    -- Now insert sample suppliers using this profile
    INSERT INTO public.suppliers (
        company_name,
        contact_person,
        email,
        phone,
        address,
        specialties,
        materials_offered,
        rating,
        is_verified,
        user_id
    ) VALUES 
    (
        'Simba Cement Limited',
        'John Kariuki', 
        'john.kariuki@simbacem.com',
        '+254-701-234567',
        'Industrial Area, Nairobi',
        ARRAY['Cement', 'Lime', 'Concrete Products'],
        ARRAY['Portland Cement', 'Pozzolan Cement', 'Lime Putty', 'Ready Mix Concrete'],
        4.7,
        true,
        sample_user_id
    ),
    (
        'Athi River Steel Plant',
        'Mary Wanjiku',
        'mary.w@athiriversteel.ke', 
        '+254-722-345678',
        'Athi River, Machakos County',
        ARRAY['Steel', 'Iron Bars', 'Construction Steel'],
        ARRAY['Reinforcement Bars', 'Mild Steel', 'Structural Steel', 'Wire Mesh'],
        4.4,
        true,
        sample_user_id
    ),
    (
        'Kenblest Steel Fabricators',
        'Peter Mwangi',
        'peter.mwangi@kenblest.co.ke',
        '+254-733-456789', 
        'Embakasi, Nairobi',
        ARRAY['Steel Fabrication', 'Structural Steel', 'Metalwork'],
        ARRAY['Steel Frames', 'Roofing Trusses', 'Gates', 'Window Grills'],
        4.6,
        false,
        sample_user_id
    ),
    (
        'Kaluworks Company Limited',
        'Sarah Njeri',
        'sarah.njeri@kaluworks.com',
        '+254-744-567890',
        'Nyeri County', 
        ARRAY['Aluminum', 'Roofing', 'Windows & Doors'],
        ARRAY['Aluminum Sheets', 'Window Frames', 'Door Frames', 'Gutters'],
        4.5,
        true,
        sample_user_id
    ),
    (
        'Nakuru Building Supplies', 
        'James Kimani',
        'james@nakurubuilding.com',
        '+254-755-678901',
        'Nakuru Town',
        ARRAY['Hardware', 'Timber', 'General Building'],
        ARRAY['Nails', 'Screws', 'Timber', 'Paint', 'Cement'],
        4.3,
        false,
        sample_user_id
    );
END $$;