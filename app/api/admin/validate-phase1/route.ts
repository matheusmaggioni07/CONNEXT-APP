import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (token !== process.env.ADMIN_TEST_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Validating PHASE 1 changes...")

    const validations = {
      video_rooms_rls: false,
      ice_candidates_rls: false,
      signaling_rls: false,
      video_queue_rls: false,
      profiles_rls: false,
      indexes_created: false,
      likes_policies_clean: false,
      matches_policies_clean: false,
    }

    // Check if RLS is enabled
    const tables = ["video_rooms", "ice_candidates", "signaling", "video_queue", "profiles"]

    for (const table of tables) {
      const result = await sql(`
        SELECT relrowsecurity FROM pg_class 
        WHERE relname = '${table}'
      `)

      if (result[0]?.relrowsecurity) {
        validations[`${table}_rls` as keyof typeof validations] = true
        console.log(`[v0] ✅ ${table} - RLS enabled`)
      }
    }

    // Validate indexes exist
    const indexes = await sql(`
      SELECT COUNT(*) as count FROM pg_indexes 
      WHERE indexname LIKE 'idx_%'
    `)

    if (indexes[0]?.count > 0) {
      validations.indexes_created = true
      console.log(`[v0] ✅ Indexes created: ${indexes[0].count}`)
    }

    // Check likes policies
    const likesPolicies = await sql(`
      SELECT COUNT(*) as count FROM pg_policies 
      WHERE tablename = 'likes'
    `)

    if (likesPolicies[0]?.count === 3) {
      validations.likes_policies_clean = true
      console.log("[v0] ✅ Likes policies cleaned (3 policies)")
    }

    // Check matches policies
    const matchesPolicies = await sql(`
      SELECT COUNT(*) as count FROM pg_policies 
      WHERE tablename = 'matches'
    `)

    if (matchesPolicies[0]?.count === 3) {
      validations.matches_policies_clean = true
      console.log("[v0] ✅ Matches policies cleaned (3 policies)")
    }

    const allValid = Object.values(validations).every((v) => v === true)

    return NextResponse.json({
      success: allValid,
      validations,
      message: allValid ? "PHASE 1 validated successfully!" : "Some validations failed",
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[v0] Validation failed:", error)
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
