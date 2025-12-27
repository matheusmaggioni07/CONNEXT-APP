import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"

// Etapas SQL em ordem segura - cada uma é testada independentemente
const SQL_PHASES = {
  phase1_enable_rls: `
    -- FASE 1: Habilitar RLS nas 5 tabelas críticas
    ALTER TABLE video_rooms ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ice_candidates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE signaling ENABLE ROW LEVEL SECURITY;
    ALTER TABLE video_queue ENABLE ROW LEVEL SECURITY;
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  `,
  phase2_basic_policies: `
    -- FASE 2: Criar policies básicas de segurança
    
    -- video_rooms: usuários só veem seus próprios rooms
    CREATE POLICY "Users see own video rooms" ON video_rooms
      FOR SELECT USING (
        user1_id = auth.uid() OR user2_id = auth.uid()
      );
    
    -- ice_candidates: users só veem de suas conexões
    CREATE POLICY "Users see own ice candidates" ON ice_candidates
      FOR SELECT USING (
        room_id IN (
          SELECT id FROM video_rooms 
          WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
      );
    
    -- signaling: users só veem mensagens de suas rooms
    CREATE POLICY "Users see own signaling messages" ON signaling
      FOR SELECT USING (
        room_id IN (
          SELECT id FROM video_rooms 
          WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
      );
    
    -- video_queue: users só veem sua fila
    CREATE POLICY "Users see own queue entry" ON video_queue
      FOR SELECT USING (user_id = auth.uid());
    
    -- profiles: users leem qualquer perfil mas modificam só seu próprio
    CREATE POLICY "Users can read all profiles" ON profiles
      FOR SELECT USING (true);
    
    CREATE POLICY "Users update own profile" ON profiles
      FOR UPDATE USING (id = auth.uid());
  `,
  phase3_write_policies: `
    -- FASE 3: Adicionar policies de escrita segura
    
    CREATE POLICY "Users insert own video queue entry" ON video_queue
      FOR INSERT WITH CHECK (user_id = auth.uid());
    
    CREATE POLICY "Users insert ice candidates" ON ice_candidates
      FOR INSERT WITH CHECK (
        room_id IN (
          SELECT id FROM video_rooms 
          WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
      );
    
    CREATE POLICY "Users insert signaling messages" ON signaling
      FOR INSERT WITH CHECK (
        room_id IN (
          SELECT id FROM video_rooms 
          WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
      );
  `,
  phase4_indexes: `
    -- FASE 4: Criar indexes para performance
    
    CREATE INDEX IF NOT EXISTS idx_video_rooms_user1 ON video_rooms(user1_id);
    CREATE INDEX IF NOT EXISTS idx_video_rooms_user2 ON video_rooms(user2_id);
    CREATE INDEX IF NOT EXISTS idx_video_queue_user ON video_queue(user_id);
    CREATE INDEX IF NOT EXISTS idx_ice_room ON ice_candidates(room_id);
    CREATE INDEX IF NOT EXISTS idx_signaling_room ON signaling(room_id);
  `,
}

interface ExecutionResult {
  phase: string
  success: boolean
  error?: string
  message?: string
}

export async function POST(req: NextRequest) {
  let body
  try {
    // Verificar token de admin
    const token = req.headers.get("authorization")
    if (token !== `Bearer ${process.env.ADMIN_SQL_TOKEN}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    body = await req.json()
    const { phase } = body

    if (!phase || !SQL_PHASES[phase as keyof typeof SQL_PHASES]) {
      return NextResponse.json({ error: "Invalid phase" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL || "")

    // Executar fase específica
    const sqlStatement = SQL_PHASES[phase as keyof typeof SQL_PHASES]

    console.log(`[v0] Executing phase: ${phase}`)

    await sql(sqlStatement)

    const result: ExecutionResult = {
      phase,
      success: true,
      message: `Phase ${phase} completed successfully`,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] SQL execution error:", error)

    return NextResponse.json(
      {
        phase: body?.phase,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// GET para listar phases disponíveis
export async function GET() {
  return NextResponse.json({
    phases: Object.keys(SQL_PHASES),
    instructions: 'POST with {"phase": "phase1_enable_rls"} | Must include Authorization header',
  })
}
