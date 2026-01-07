-- ============================================================
-- MradiPro Job Positions Management
-- Created: December 27, 2025
-- 
-- This migration creates tables for managing career positions
-- that can be edited from the admin dashboard
-- ============================================================

-- ============================================================
-- JOB POSITIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS job_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    job_type VARCHAR(50) NOT NULL DEFAULT 'Full-time' CHECK (job_type IN ('Full-time', 'Part-time', 'Contract', 'Remote', 'Internship')),
    experience_level VARCHAR(100),
    salary_range VARCHAR(100),
    description TEXT NOT NULL,
    requirements TEXT[], -- Array of requirement strings
    benefits TEXT[], -- Array of benefit strings
    responsibilities TEXT[], -- Array of responsibility strings
    icon_name VARCHAR(50) DEFAULT 'Briefcase', -- Lucide icon name
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    application_deadline DATE,
    positions_available INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- JOB APPLICATIONS TABLE (Enhanced)
-- ============================================================
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES job_positions(id) ON DELETE SET NULL,
    job_title VARCHAR(255),
    applicant_name VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(255) NOT NULL,
    applicant_phone VARCHAR(50),
    linkedin_url TEXT,
    portfolio_url TEXT,
    resume_url TEXT,
    cover_letter TEXT,
    years_experience INTEGER,
    current_company VARCHAR(255),
    current_position VARCHAR(255),
    expected_salary VARCHAR(100),
    available_start_date DATE,
    referral_source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected')),
    notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_job_positions_active ON job_positions(is_active);
CREATE INDEX IF NOT EXISTS idx_job_positions_department ON job_positions(department);
CREATE INDEX IF NOT EXISTS idx_job_positions_created_at ON job_positions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at DESC);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_job_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_job_positions_updated_at ON job_positions;
CREATE TRIGGER trigger_job_positions_updated_at
    BEFORE UPDATE ON job_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_job_positions_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Job positions policies
DROP POLICY IF EXISTS "Anyone can view active job positions" ON job_positions;
CREATE POLICY "Anyone can view active job positions" ON job_positions
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage job positions" ON job_positions;
CREATE POLICY "Admins can manage job positions" ON job_positions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Job applications policies
DROP POLICY IF EXISTS "Anyone can submit applications" ON job_applications;
CREATE POLICY "Anyone can submit applications" ON job_applications
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all applications" ON job_applications;
CREATE POLICY "Admins can view all applications" ON job_applications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can update applications" ON job_applications;
CREATE POLICY "Admins can update applications" ON job_applications
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- GRANTS
-- ============================================================
GRANT SELECT ON job_positions TO anon;
GRANT ALL ON job_positions TO authenticated;
GRANT ALL ON job_applications TO anon;
GRANT ALL ON job_applications TO authenticated;

-- ============================================================
-- SEED DATA - Initial job positions
-- ============================================================
INSERT INTO job_positions (title, department, location, job_type, experience_level, salary_range, description, requirements, benefits, responsibilities, icon_name, is_active, is_featured)
VALUES 
(
    'Senior Software Engineer',
    'Engineering',
    'Nairobi, Kenya',
    'Full-time',
    '5+ years',
    'KES 250,000 - 400,000',
    'Join our core engineering team to build the next generation of construction technology. You''ll work on our React/TypeScript frontend and Node.js backend, creating features that help thousands of builders and suppliers across Kenya.',
    ARRAY['Strong experience with React, TypeScript, and modern JavaScript', 'Experience with PostgreSQL and Supabase', 'Understanding of RESTful APIs and real-time systems', 'Experience with mobile-first responsive design', 'Excellent problem-solving skills'],
    ARRAY['Competitive salary with equity options', 'Health insurance for you and family', 'Flexible work hours', 'Learning & development budget', 'Modern equipment provided'],
    ARRAY['Design and implement new features for our marketplace platform', 'Write clean, maintainable, and well-tested code', 'Collaborate with product and design teams', 'Mentor junior developers', 'Participate in code reviews and architectural decisions'],
    'Code',
    true,
    true
),
(
    'Product Manager',
    'Product',
    'Nairobi, Kenya',
    'Full-time',
    '3+ years',
    'KES 200,000 - 350,000',
    'Lead product strategy for our marketplace platform. You''ll work closely with builders, suppliers, and delivery providers to understand their needs and translate them into product features that drive growth.',
    ARRAY['Experience in product management at a tech company', 'Strong analytical and data-driven mindset', 'Excellent communication and stakeholder management', 'Understanding of marketplace dynamics', 'Experience with Agile methodologies'],
    ARRAY['Competitive salary with equity options', 'Health insurance for you and family', 'Flexible work hours', 'Direct impact on product direction', 'Work with diverse teams'],
    ARRAY['Define product roadmap and priorities', 'Conduct user research and gather feedback', 'Write product requirements and specifications', 'Work with engineering to deliver features', 'Analyze metrics and optimize for growth'],
    'BarChart3',
    true,
    true
),
(
    'Operations Manager - Delivery',
    'Operations',
    'Nairobi, Kenya',
    'Full-time',
    '4+ years',
    'KES 180,000 - 280,000',
    'Manage and optimize our delivery network across Kenya''s 47 counties. You''ll build relationships with delivery providers, ensure quality service, and scale our logistics operations.',
    ARRAY['Experience in logistics or operations management', 'Strong network in the Kenyan transport industry', 'Data-driven decision making', 'Excellent negotiation skills', 'Willingness to travel within Kenya'],
    ARRAY['Competitive salary with performance bonuses', 'Health insurance', 'Company vehicle allowance', 'Phone and data allowance', 'Career growth opportunities'],
    ARRAY['Manage delivery provider relationships', 'Optimize delivery routes and costs', 'Ensure service quality standards', 'Scale operations to new counties', 'Handle escalations and resolve issues'],
    'Truck',
    true,
    false
),
(
    'Customer Success Lead',
    'Customer Success',
    'Remote (Kenya)',
    'Remote',
    '2+ years',
    'KES 120,000 - 180,000',
    'Be the voice of MradiPro for our customers. You''ll help builders and suppliers get the most out of our platform, resolve issues, and gather feedback to improve our product.',
    ARRAY['Experience in customer support or success', 'Excellent communication in English and Swahili', 'Problem-solving mindset', 'Familiarity with CRM tools', 'Passion for helping customers succeed'],
    ARRAY['Competitive salary', 'Health insurance', 'Work from home flexibility', 'Training and certification support', 'Team bonding activities'],
    ARRAY['Onboard new customers and ensure success', 'Respond to support tickets and calls', 'Gather customer feedback for product team', 'Create help documentation and guides', 'Identify upsell opportunities'],
    'Headphones',
    true,
    false
),
(
    'Business Development Representative',
    'Sales',
    'Mombasa, Kenya',
    'Full-time',
    '1+ years',
    'KES 80,000 - 150,000 + Commission',
    'Expand MradiPro''s presence in the Coast region. You''ll onboard new suppliers, build relationships with construction companies, and grow our market share in Mombasa and surrounding counties.',
    ARRAY['Sales or business development experience', 'Knowledge of the construction industry is a plus', 'Strong networking and relationship-building skills', 'Self-motivated and target-driven', 'Valid driver''s license'],
    ARRAY['Base salary + uncapped commission', 'Health insurance', 'Transport allowance', 'Phone and data allowance', 'Fast-track career growth'],
    ARRAY['Identify and reach out to potential suppliers', 'Conduct product demos and presentations', 'Negotiate contracts and close deals', 'Build long-term customer relationships', 'Report on sales metrics and pipeline'],
    'Users',
    true,
    false
);

