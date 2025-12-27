import { type NextRequest, NextResponse } from "next/server"

interface TestPhaseResult {
  phase: string
  timestamp: string
  summary: {
    passed: number
    failed: number
    total: number
    statusOverall: string
  }
  systemReady?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")
    if (token !== `Bearer ${process.env.ADMIN_TEST_TOKEN}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    const results: TestPhaseResult[] = []

    // Run Phase 2: Matches
    try {
      const res = await fetch(`${baseUrl}/api/admin/test-phase2-matches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.ADMIN_TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
      })

      if (res.ok) {
        const data = await res.json()
        results.push(data)
      }
    } catch (error) {
      console.error("Phase 2 test error:", error)
    }

    // Run Phase 3: Videocall
    try {
      const res = await fetch(`${baseUrl}/api/admin/test-phase3-videocall`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.ADMIN_TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
      })

      if (res.ok) {
        const data = await res.json()
        results.push(data)
      }
    } catch (error) {
      console.error("Phase 3 test error:", error)
    }

    // Run Phase 4: Builder
    try {
      const res = await fetch(`${baseUrl}/api/admin/test-phase4-builder`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.ADMIN_TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
      })

      if (res.ok) {
        const data = await res.json()
        results.push(data)
      }
    } catch (error) {
      console.error("Phase 4 test error:", error)
    }

    // Run Phase 5: Integration
    try {
      const res = await fetch(`${baseUrl}/api/admin/test-phase5-integration`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.ADMIN_TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
      })

      if (res.ok) {
        const data = await res.json()
        results.push(data)
      }
    } catch (error) {
      console.error("Phase 5 test error:", error)
    }

    // Calculate overall stats
    const totalPassed = results.reduce((sum, r) => sum + (r.summary?.passed || 0), 0)
    const totalFailed = results.reduce((sum, r) => sum + (r.summary?.failed || 0), 0)
    const allPhasesPass = results.every((r) => r.summary?.statusOverall === "pass")

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      results,
      overall: {
        totalPassed,
        totalFailed,
        allPhasesPass,
        systemReady: allPhasesPass,
        message: allPhasesPass
          ? "✅ All phases passed! System is ready for production."
          : "❌ Some phases failed. Review above for details.",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Test orchestration failed",
        systemReady: false,
      },
      { status: 500 },
    )
  }
}
