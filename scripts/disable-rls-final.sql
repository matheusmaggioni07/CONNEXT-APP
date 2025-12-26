-- DISABLE ALL RLS POLICIES ON VIDEO TABLES
-- This was blocking all database queries!
ALTER TABLE video_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE signaling DISABLE ROW LEVEL SECURITY;
ALTER TABLE ice_candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE video_queue DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to authenticated and anon users
GRANT ALL PRIVILEGES ON video_rooms TO authenticated, anon;
GRANT ALL PRIVILEGES ON signaling TO authenticated, anon;
GRANT ALL PRIVILEGES ON ice_candidates TO authenticated, anon;
GRANT ALL PRIVILEGES ON video_queue TO authenticated, anon;

-- Ensure sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
