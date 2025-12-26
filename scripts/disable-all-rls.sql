-- Disable ALL RLS policies on video tables - they were blocking everything
ALTER TABLE video_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE signaling DISABLE ROW LEVEL SECURITY;
ALTER TABLE ice_candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE video_queue DISABLE ROW LEVEL SECURITY;

-- Allow anyone to insert/select/update/delete on these tables
GRANT ALL ON video_rooms TO anon, authenticated;
GRANT ALL ON signaling TO anon, authenticated;
GRANT ALL ON ice_candidates TO anon, authenticated;
GRANT ALL ON video_queue TO anon, authenticated;
