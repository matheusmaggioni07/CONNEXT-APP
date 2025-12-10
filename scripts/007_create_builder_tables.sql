-- Create builder_projects table
CREATE TABLE IF NOT EXISTS builder_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create builder_files table
CREATE TABLE IF NOT EXISTS builder_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES builder_projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT,
  language TEXT DEFAULT 'typescript',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create builder_versions table for rollback
CREATE TABLE IF NOT EXISTS builder_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES builder_projects(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  files JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE builder_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_versions ENABLE ROW LEVEL SECURITY;

-- Policies for builder_projects
CREATE POLICY "Users can view own projects" ON builder_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON builder_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON builder_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON builder_projects
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for builder_files
CREATE POLICY "Users can view own project files" ON builder_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM builder_projects WHERE id = builder_files.project_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own project files" ON builder_files
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM builder_projects WHERE id = builder_files.project_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own project files" ON builder_files
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM builder_projects WHERE id = builder_files.project_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own project files" ON builder_files
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM builder_projects WHERE id = builder_files.project_id AND user_id = auth.uid())
  );

-- Policies for builder_versions
CREATE POLICY "Users can view own project versions" ON builder_versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM builder_projects WHERE id = builder_versions.project_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own project versions" ON builder_versions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM builder_projects WHERE id = builder_versions.project_id AND user_id = auth.uid())
  );
