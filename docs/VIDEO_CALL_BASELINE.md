# CONNEXT VIDEO CALL - BASELINE ESTÁVEL DE PRODUÇÃO

**Data de Criação:** 14/12/2025
**Status:** FUNCIONANDO 100% - NÃO MODIFICAR SEM NECESSIDADE

---

## ARQUITETURA ATUAL (ESTÁVEL)

### Arquivos Críticos - NÃO MODIFICAR

| Arquivo | Função | Prioridade |
|---------|--------|------------|
| `components/dashboard/video-page.tsx` | Componente principal de videochamada | CRÍTICO |
| `lib/webrtc-config.ts` | Configuração de STUN/TURN servers | CRÍTICO |
| `app/api/turn-credentials/route.ts` | API para credenciais TURN dinâmicas | CRÍTICO |
| `app/actions/video.ts` | Server Actions para gerenciamento de salas | CRÍTICO |

### Tabelas do Banco de Dados

| Tabela | Função |
|--------|--------|
| `video_rooms` | Gerenciamento de salas (user1_id, user2_id, status) |
| `signaling` | Troca de SDP (offer/answer) via polling |
| `ice_candidates` | Troca de ICE candidates via polling |

---

## FLUXO DE CONEXÃO WEBRTC

### 1. Iniciando Busca
```
User1 clica "Começar" → joinVideoQueue() → Cria sala com status "waiting"
```

### 2. Match de Usuários
```
User2 clica "Começar" → joinVideoQueue() → Encontra sala de User1 → Atualiza para "active"
```

### 3. Troca de Signaling
```
User1 (initiator=true)  → Cria OFFER → Salva em `signaling` table
User2 (initiator=false) → Poll `signaling` → Recebe OFFER → Cria ANSWER → Salva em `signaling`
User1 → Poll `signaling` → Recebe ANSWER → Conexão estabelecida
```

### 4. ICE Candidates
```
Ambos usuários trocam ICE candidates via tabela `ice_candidates`
Polling a cada 500ms para baixa latência
```

---

## SERVIDORES STUN/TURN

### STUN (Gratuitos - Google)
- stun:stun.l.google.com:19302
- stun:stun1.l.google.com:19302
- stun:stun2.l.google.com:19302
- stun:stun3.l.google.com:19302
- stun:stun4.l.google.com:19302
- stun:global.stun.twilio.com:3478

### TURN (Para NAT Traversal)
- Metered.ca (via METERED_API_KEY)
- OpenRelay gratuito como fallback

---

## CONFIGURAÇÕES DE MÍDIA

### Vídeo
```javascript
{
  width: { ideal: 1280, max: 1920 },    // Mobile: 640
  height: { ideal: 720, max: 1080 },    // Mobile: 480
  frameRate: { ideal: 30, max: 30 },
  facingMode: "user"
}
```

### Áudio
```javascript
{
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
}
```

---

## PONTOS CRÍTICOS DE ESTABILIDADE

### 1. Ordem de Operações
- Adicionar tracks locais ANTES de criar offer
- Setar remote description ANTES de adicionar ICE candidates
- Processar fila de ICE candidates após setar remote description

### 2. Polling vs Realtime
- Atualmente usando POLLING (500ms) para signaling
- Mais estável que Supabase Realtime em produção
- Não mudar para realtime sem testes extensivos

### 3. Cleanup
- Sempre limpar signaling/ice_candidates ao sair
- Fechar PeerConnection ao desconectar
- Parar todos os tracks de mídia

### 4. Determinação de Initiator
- User1 (criou a sala) = initiator = envia OFFER
- User2 (entrou na sala) = não-initiator = responde com ANSWER
- NUNCA mudar essa lógica

---

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `METERED_API_KEY` | Não | API key para servidores TURN premium |
| `SUPABASE_URL` | Sim | URL do Supabase |
| `SUPABASE_ANON_KEY` | Sim | Chave anônima do Supabase |

---

## REGRAS DE MANUTENÇÃO

1. **NÃO MODIFICAR** os arquivos críticos sem necessidade absoluta
2. **TESTAR** qualquer mudança em ambiente separado primeiro
3. **MANTER** o padrão de polling para signaling
4. **PRESERVAR** a lógica de initiator/non-initiator
5. **DOCUMENTAR** qualquer alteração neste arquivo

---

## COMPATIBILIDADE

| Plataforma | Status | Notas |
|------------|--------|-------|
| Desktop Chrome | OK | Testado |
| Desktop Firefox | OK | Testado |
| Desktop Safari | OK | Testado |
| Mobile Chrome | OK | Câmera frontal default |
| Mobile Safari | OK | Requer interação do usuário |

---

## LIMITES DE USO

| Plano | Chamadas/dia | Likes/dia |
|-------|--------------|-----------|
| Free | 5 | 5 |
| Pro | Ilimitado | Ilimitado |
| Admin | Ilimitado | Ilimitado |

---

## TROUBLESHOOTING

### "Conexão falhou"
- Verificar se TURN servers estão acessíveis
- Verificar se usuário permitiu câmera/microfone
- Verificar logs do console para erros de ICE

### "Vídeo remoto não aparece"
- Verificar se `pc.ontrack` está sendo chamado
- Verificar se remote description foi setada
- Verificar se tracks foram adicionados antes do offer

### "Sem áudio"
- Verificar permissão de microfone
- Verificar se `autoGainControl` está ativo
- Testar em ambiente silencioso

---

## HISTÓRICO DE CORREÇÕES

| Data | Problema | Solução |
|------|----------|---------|
| 14/12/2025 | Answer duplicado causava "Called in wrong state: stable" | Adicionado check `hasRemoteDescriptionRef.current` em `processAnswer()` |

---

## ASSINATURA DE ESTABILIDADE

Esta implementação foi testada e aprovada em 14/12/2025.
Qualquer modificação deve ser feita com extrema cautela e documentada.

**Arquitetura aprovada por:** Sistema Connext
**Versão:** 1.0.0-stable
