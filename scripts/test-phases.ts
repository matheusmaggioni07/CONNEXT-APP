import fetch from "node-fetch"

const API_BASE = "http://localhost:3000"
const SQL_TOKEN = process.env.ADMIN_SQL_TOKEN || "your-sql-token"
const TEST_TOKEN = process.env.ADMIN_TEST_TOKEN || "your-test-token"

const phases = ["phase1_enable_rls", "phase2_basic_policies", "phase3_write_policies", "phase4_indexes"]

async function executePhase(phase: string) {
  console.log(`\n🔄 Executing ${phase}...`)

  try {
    const response = await fetch(`${API_BASE}/api/admin/sql-executor`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SQL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phase }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      console.log(`✅ ${phase} completed`)
      return true
    } else {
      console.error(`❌ ${phase} failed:`, result.error)
      return false
    }
  } catch (error) {
    console.error(`❌ Error executing ${phase}:`, error)
    return false
  }
}

async function testSystems() {
  console.log("\n🧪 Testing systems...")

  try {
    const response = await fetch(`${API_BASE}/api/admin/test-systems`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
    })

    const results = await response.json()

    console.log("\n📊 Test Results:")
    results.results.forEach((r: any) => {
      const status = r.status === "pass" ? "✅" : "❌"
      console.log(`  ${status} ${r.system}: ${r.error || "OK"}`)
    })

    console.log(`\n📈 Summary: ${results.passed} passed, ${results.failed} failed`)

    return results.failed === 0
  } catch (error) {
    console.error("❌ Error testing systems:", error)
    return false
  }
}

async function runPhases() {
  console.log("🚀 Starting phased SQL execution...\n")

  for (const phase of phases) {
    const success = await executePhase(phase)

    if (!success) {
      console.error(`\n⚠️  Phase ${phase} failed. Stopping execution.`)
      console.error("⚠️  You may need to check the database manually.")
      return
    }

    // Aguardar 2 segundos entre fases
    await new Promise((r) => setTimeout(r, 2000))
  }

  // Depois de todas as fases, testar
  const allSystemsOk = await testSystems()

  if (allSystemsOk) {
    console.log("\n🎉 All phases completed successfully and all tests passed!")
  } else {
    console.log("\n⚠️  Phases completed but some tests failed. Please review.")
  }
}

// Executar
runPhases().catch(console.error)
