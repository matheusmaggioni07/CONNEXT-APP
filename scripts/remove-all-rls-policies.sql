-- DISABLE ALL RLS POLICIES - Remove all restrictions
ALTER TABLE video_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE signaling DISABLE ROW LEVEL SECURITY;
ALTER TABLE ice_candidates DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('video_rooms', 'signaling', 'ice_candidates');
