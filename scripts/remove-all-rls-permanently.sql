-- Disable RLS on ALL tables used by video system
ALTER TABLE video_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE signaling DISABLE ROW LEVEL SECURITY;
ALTER TABLE ice_candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view all rooms" ON video_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON video_rooms;
DROP POLICY IF EXISTS "Users can update own rooms" ON video_rooms;
DROP POLICY IF EXISTS "Users can read own rooms" ON video_rooms;
DROP POLICY IF EXISTS "Users can insert signaling" ON signaling;
DROP POLICY IF EXISTS "Users can read signaling" ON signaling;
DROP POLICY IF EXISTS "Users can insert candidates" ON ice_candidates;
DROP POLICY IF EXISTS "Users can read candidates" ON ice_candidates;
DROP POLICY IF EXISTS "Allow insert on video_rooms" ON video_rooms;
DROP POLICY IF EXISTS "Allow select on video_rooms" ON video_rooms;
DROP POLICY IF EXISTS "Allow update on video_rooms" ON video_rooms;
DROP POLICY IF EXISTS "allow_insert_signaling" ON signaling;
DROP POLICY IF EXISTS "allow_select_signaling" ON signaling;
DROP POLICY IF EXISTS "allow_insert_ice_candidates" ON ice_candidates;
DROP POLICY IF EXISTS "allow_select_ice_candidates" ON ice_candidates;

-- Confirm no policies exist
SELECT * FROM pg_policies WHERE tablename IN ('video_rooms', 'signaling', 'ice_candidates', 'profiles');
