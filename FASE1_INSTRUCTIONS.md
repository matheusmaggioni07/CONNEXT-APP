# FASE 1: Execução Segura de SQL com Testes

## Pré-requisitos
- Você precisa ter 2 tokens de segurança configurados:
  - `ADMIN_SQL_TOKEN` - para executar SQL
  - `ADMIN_TEST_TOKEN` - para testar sistemas

## Passos de Execução

### PASSO 1: Configure os tokens de segurança
```bash
# Adicione no seu .env.local:
ADMIN_SQL_TOKEN=seu-token-random-aqui
ADMIN_TEST_TOKEN=seu-outro-token-random-aqui
```

### PASSO 2: Execute cada fase sequencialmente

**Via curl (Linux/Mac):**

```bash
# FASE 1: Habilitar RLS
curl -X POST http://localhost:3000/api/admin/sql-executor \
  -H "Authorization: Bearer SEU_ADMIN_SQL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phase":"phase1_enable_rls"}'

# Aguarde resposta "success": true

# FASE 2: Criar policies básicas
curl -X POST http://localhost:3000/api/admin/sql-executor \
  -H "Authorization: Bearer SEU_ADMIN_SQL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phase":"phase2_basic_policies"}'

# FASE 3: Adicionar policies de escrita
curl -X POST http://localhost:3000/api/admin/sql-executor \
  -H "Authorization: Bearer SEU_ADMIN_SQL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phase":"phase3_write_policies"}'

# FASE 4: Criar indexes
curl -X POST http://localhost:3000/api/admin/sql-executor \
  -H "Authorization: Bearer SEU_ADMIN_SQL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phase":"phase4_indexes"}'
```

### PASSO 3: Após cada fase, execute os testes

```bash
# Teste Matches
curl -X POST http://localhost:3000/api/admin/verify-matches \
  -H "Authorization: Bearer SEU_ADMIN_TEST_TOKEN" \
  -H "Content-Type: application/json"

# Teste Videocall
curl -X POST http://localhost:3000/api/admin/verify-videocall \
  -H "Authorization: Bearer SEU_ADMIN_TEST_TOKEN" \
  -H "Content-Type: application/json"

# Teste Builder
curl -X POST http://localhost:3000/api/admin/verify-builder \
  -H "Authorization: Bearer SEU_ADMIN_TEST_TOKEN" \
  -H "Content-Type: application/json"
```

### PASSO 4: Se algum teste falhar

**Se algum teste retorna "fail":**
1. PARE imediatamente
2. NÃO execute a próxima fase
3. Revise o erro retornado
4. Você pode fazer rollback manual ou contatar suporte

### PASSO 5: Quando todos os testes passam

Se todas as 4 fases completarem com sucesso e todos os testes passarem:
- ✅ FASE 1 está completa
- ✅ Passe para FASE 2 (teste manual do sistema de matches)

## Respostas esperadas

### ✅ Sucesso
```json
{
  "phase": "phase1_enable_rls",
  "success": true,
  "message": "Phase phase1_enable_rls completed successfully"
}
```

### ❌ Erro
```json
{
  "phase": "phase1_enable_rls",
  "success": false,
  "error": "Error message here"
}
```

---

## Notas importantes

1. **Não executar tudo de uma vez** - execute fase por fase
2. **Testar após cada fase** - garante que nada quebrou
3. **Se quebrar algo** - o erro será retornado com a solução
4. **Backup mental** - você sabe exatamente qual fase causou o problema
