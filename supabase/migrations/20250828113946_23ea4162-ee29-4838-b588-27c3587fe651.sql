-- Insert sample registered suppliers (these will appear when "Registered Suppliers" is selected)
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
  NULL
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
  NULL
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
  NULL
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
  NULL
),
(
  'Eldoret Building Supplies',
  'James Kimani',
  'james@eldoretbuilding.com',
  '+254-755-678901',
  'Eldoret Town',
  ARRAY['Hardware', 'Timber', 'General Building'],
  ARRAY['Nails', 'Screws', 'Timber', 'Paint', 'Cement'],
  4.3,
  false,
  NULL
),
(
  'Mombasa Timber Merchants',
  'Grace Achieng',
  'grace@mombasatimber.co.ke',
  '+254-766-789012',
  'Mombasa County',
  ARRAY['Timber', 'Plywood', 'Wood Products'],
  ARRAY['Mahogany', 'Pine Timber', 'Plywood Sheets', 'Wood Preservatives'],
  4.6,
  true,
  NULL
);