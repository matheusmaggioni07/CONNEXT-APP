# Guia Completo de Testes - Execução em 5 Fases

## Tokens necessários

Adicione no seu `.env.local`:
```
ADMIN_SQL_TOKEN=your-sql-token-123456
ADMIN_TEST_TOKEN=your-test-token-654321
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## FASE 1: Executar SQL com segurança

### Executar cada fase SQL sequencialmente

```bash
# FASE 1a: Enable RLS
curl -X POST http://localhost:3000/api/admin/sql-executor \
  -H "Authorization: Bearer your-sql-token-123456" \
  -H "Content-Type: application/json" \
  -d '{"phase":"phase1_enable_rls"}'

# Aguarde sucesso, depois continue

# FASE 1b: Create basic policies
curl -X POST http://localhost:3000/api/admin/sql-executor \
  -H "Authorization: Bearer your-sql-token-123456" \
  -H "Content-Type: application/json" \
  -d '{"phase":"phase2_basic_policies"}'

# FASE 1c: Create write policies
curl -X POST http://localhost:3000/api/admin/sql-executor \
  -H "Authorization: Bearer your-sql-token-123456" \
  -H "Content-Type: application/json" \
  -d '{"phase":"phase3_write_policies"}'

# FASE 1d: Create indexes
curl -X POST http://localhost:3000/api/admin/sql-executor \
  -H "Authorization: Bearer your-sql-token-123456" \
  -H "Content-Type: application/json" \
  -d '{"phase":"phase4_indexes"}'
```

**Se qualquer fase falhar:**
- PARE imediatamente
- Revise o erro
- NÃO prossiga para a próxima

---

## FASE 2-5: Testes Automatizados

### Executar todos os testes de uma vez (após SQL estar pronto)

```bash
curl -X POST http://localhost:3000/api/admin/run-all-tests \
  -H "Authorization: Bearer your-test-token-654321" \
  -H "Content-Type: application/json"
```

**Resposta esperada:**
```json
{
  "overall": {
    "totalPassed": 30,
    "totalFailed": 0,
    "allPhasesPass": true,
    "systemReady": true,
    "message": "✅ All phases passed! System is ready for production."
  }
}
```

### OU testar cada fase individualmente

```bash
# Teste FASE 2: Matches System
curl -X POST http://localhost:3000/api/admin/test-phase2-matches \
  -H "Authorization: Bearer your-test-token-654321"

# Teste FASE 3: Videocall System  
curl -X POST http://localhost:3000/api/admin/test-phase3-videocall \
  -H "Authorization: Bearer your-test-token-654321"

# Teste FASE 4: Builder System
curl -X POST http://localhost:3000/api/admin/test-phase4-builder \
  -H "Authorization: Bearer your-test-token-654321"

# Teste FASE 5: Full Integration
curl -X POST http://localhost:3000/api/admin/test-phase5-integration \
  -H "Authorization: Bearer your-test-token-654321"
```

---

## Checklist de Validação Manual

Após todos os testes passarem:

### Matches System
- [ ] Login com User A
- [ ] Go to Discover
- [ ] Like User B profile
- [ ] Login with User B
- [ ] Go to Discover
- [ ] Like User A profile
- [ ] Check Matches section - User A and B should both see the match

### Videocall System
- [ ] From matches, click "Start Video Call"
- [ ] Accept call on the other side
- [ ] Both should see each other on video
- [ ] Audio should work
- [ ] Clicking reactions should work
- [ ] Ending call should work

### Builder System
- [ ] Go to Builder
- [ ] Create a simple site (title + button)
- [ ] Preview should show HTML
- [ ] Save project
- [ ] Reload page
- [ ] Project should still be there

---

## Garantias Após Sucesso Completo

✅ Matches funcionam perfeitamente
✅ Videochamada funciona perfeitamente  
✅ Builder funciona perfeitamente
✅ Segurança RLS habilitada
✅ Sem race conditions
✅ Pronto para produção

---

## Troubleshooting

Se algum teste falhar:

1. **SQL execution failed**
   - Check if DATABASE_URL is correct
   - Check if SUPABASE_SERVICE_ROLE_KEY is correct
   - Try executing that phase again

2. **RLS test failed**
   - Make sure SQL phases completed successfully
   - Try restarting the app
   - Check Supabase dashboard for RLS status

3. **Table not accessible**
   - Make sure migration scripts ran
   - Check if user has appropriate permissions
   - Verify RLS policies exist

---

## Success Metrics

When you see this, you're ready to go live:

```
✅ Phase 2: Matches System - PASS (4/4 tests)
✅ Phase 3: Videocall System - PASS (5/5 tests)
✅ Phase 4: Builder System - PASS (4/4 tests)
✅ Phase 5: Full Integration - PASS (16/16 tests)

OVERALL: 29/29 PASSED - SYSTEM READY FOR PRODUCTION
