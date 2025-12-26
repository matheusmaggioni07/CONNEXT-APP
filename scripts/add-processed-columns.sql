-- Add processed column to signaling table if it doesn't exist
ALTER TABLE signaling ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- Add processed column to ice_candidates table if it doesn't exist  
ALTER TABLE ice_candidates ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_signaling_processed ON signaling(room_id, to_user_id, processed);
CREATE INDEX IF NOT EXISTS idx_ice_candidates_processed ON ice_candidates(room_id, to_user_id, processed);

SELECT 'Processed columns added successfully' as status;
