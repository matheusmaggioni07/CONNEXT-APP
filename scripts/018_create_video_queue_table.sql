-- Create video_queue table for matchmaking
CREATE TABLE IF NOT EXISTS public.video_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'active', 'ended'
  matched_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create signaling table for WebRTC offer/answer/ICE
CREATE TABLE IF NOT EXISTS public.signaling (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'offer', 'answer'
  sdp TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ice_candidates table for NAT traversal
CREATE TABLE IF NOT EXISTS public.ice_candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_video_queue_user_id ON public.video_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_video_queue_room_id ON public.video_queue(room_id);
CREATE INDEX IF NOT EXISTS idx_video_queue_status ON public.video_queue(status);
CREATE INDEX IF NOT EXISTS idx_signaling_room_id ON public.signaling(room_id);
CREATE INDEX IF NOT EXISTS idx_signaling_users ON public.signaling(from_user_id, to_user_id);
CREATE INDEX IF NOT EXISTS idx_ice_candidates_room_id ON public.ice_candidates(room_id);
CREATE INDEX IF NOT EXISTS idx_ice_candidates_users ON public.ice_candidates(from_user_id, to_user_id);

-- Enable RLS
ALTER TABLE public.video_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signaling ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ice_candidates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_queue
CREATE POLICY "Users can see their own queue entries" ON public.video_queue
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

CREATE POLICY "Users can create queue entries" ON public.video_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their queue entries" ON public.video_queue
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

CREATE POLICY "Users can delete their queue entries" ON public.video_queue
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

-- RLS Policies for signaling
CREATE POLICY "Users can see signaling messages for their calls" ON public.signaling
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send signaling messages" ON public.signaling
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- RLS Policies for ice_candidates
CREATE POLICY "Users can see ICE candidates for their calls" ON public.ice_candidates
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send ICE candidates" ON public.ice_candidates
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);
