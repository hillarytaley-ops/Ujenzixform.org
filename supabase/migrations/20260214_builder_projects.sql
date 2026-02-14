-- ============================================================
-- Builder Projects Table
-- For Professional Builders to manage their construction projects
-- Created: February 14, 2026
-- ============================================================

-- Create builder_projects table if not exists
CREATE TABLE IF NOT EXISTS builder_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    builder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    budget NUMERIC(15, 2),
    spent NUMERIC(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'on_hold', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_builder_projects_builder ON builder_projects(builder_id);
CREATE INDEX IF NOT EXISTS idx_builder_projects_status ON builder_projects(status);
CREATE INDEX IF NOT EXISTS idx_builder_projects_created ON builder_projects(created_at DESC);

-- Enable RLS
ALTER TABLE builder_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Builders can view their own projects
DROP POLICY IF EXISTS "Builders can view own projects" ON builder_projects;
CREATE POLICY "Builders can view own projects"
    ON builder_projects FOR SELECT
    USING (builder_id = auth.uid());

-- Builders can create their own projects
DROP POLICY IF EXISTS "Builders can create own projects" ON builder_projects;
CREATE POLICY "Builders can create own projects"
    ON builder_projects FOR INSERT
    WITH CHECK (builder_id = auth.uid());

-- Builders can update their own projects
DROP POLICY IF EXISTS "Builders can update own projects" ON builder_projects;
CREATE POLICY "Builders can update own projects"
    ON builder_projects FOR UPDATE
    USING (builder_id = auth.uid());

-- Builders can delete their own projects
DROP POLICY IF EXISTS "Builders can delete own projects" ON builder_projects;
CREATE POLICY "Builders can delete own projects"
    ON builder_projects FOR DELETE
    USING (builder_id = auth.uid());

-- Admin full access
DROP POLICY IF EXISTS "Admin full access to builder_projects" ON builder_projects;
CREATE POLICY "Admin full access to builder_projects"
    ON builder_projects FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Auto-update timestamps trigger
DROP TRIGGER IF EXISTS update_builder_projects_updated_at ON builder_projects;
CREATE TRIGGER update_builder_projects_updated_at
    BEFORE UPDATE ON builder_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON builder_projects TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
