import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    // Validate admin token
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (token !== process.env.ADMIN_SQL_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Starting PHASE 1 SQL execution...")

    // Read the SQL script
    const sqlScript = `
-- PHASE 1: Enable RLS on critical tables and remove duplicate policies
ALTER TABLE video_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ice_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE signaling ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop duplicate policies from likes
DROP POLICY IF EXISTS "likes_insert_own" ON likes;
DROP POLICY IF EXISTS "likes_delete_own" ON likes;
DROP POLICY IF EXISTS "likes_select_own" ON likes;
DROP POLICY IF EXISTS "likes_select" ON likes;
DROP POLICY IF EXISTS "likes_insert" ON likes;

-- Drop duplicate policies from matches
DROP POLICY IF EXISTS "matches_select" ON matches;
DROP POLICY IF EXISTS "matches_select_own" ON matches;
DROP POLICY IF EXISTS "matches_insert_system" ON matches;
DROP POLICY IF EXISTS "matches_delete_own" ON matches;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_rooms_users ON video_rooms(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_video_queue_user ON video_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_ice_candidates_room ON ice_candidates(room_id);
CREATE INDEX IF NOT EXISTS idx_signaling_room ON signaling(room_id);
    `

    // Execute SQL statements one by one
    const statements = sqlScript.split(";").filter((s) => s.trim())

    for (const statement of statements) {
      if (statement.trim()) {
        await sql(statement)
        console.log("[v0] Executed:", statement.substring(0, 50) + "...")
      }
    }

    console.log("[v0] PHASE 1 completed successfully!")

    return NextResponse.json({
      success: true,
      message: "Phase 1 completed - RLS enabled and policies cleaned",
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[v0] PHASE 1 failed:", error)
    return NextResponse.json(
      {
        error: "Phase 1 failed",
        details: error.message,
        code: error.code,
      },
      { status: 500 },
    )
  }
}
