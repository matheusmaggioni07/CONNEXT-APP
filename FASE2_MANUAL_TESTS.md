# FASE 2: Teste Manual do Sistema de Matches

## O que testar

### TESTE 1: Curtir um usuário
1. Faça login com User A
2. Vá para "Discover"
3. Encontre um perfil (User B)
4. Clique no coração para curtir
5. **Esperado**: Botão fica preenchido, contador aumenta

### TESTE 2: Curtir mutualmente
1. User B faz login
2. Vai para "Discover"
3. Encontra User A
4. Clica no coração
5. **Esperado**: Match é criado automaticamente
6. Ambos devem ver o match em "Matches"

### TESTE 3: Acessar match
1. User A vai em "Matches"
2. Clica no match com User B
3. **Esperado**: Vê perfil de User B com botão "Iniciar videochamada"

### TESTE 4: Enviar mensagem no match
1. No match, clica no ícone de chat
2. Digita uma mensagem
3. **Esperado**: Mensagem aparece para User B em tempo real

## Se algum teste falhar

Copie a mensagem de erro e avise para que eu corrija a lógica de matches.

---

Quando todos os 4 testes passarem com sucesso, você avança para FASE 3 (Videochamada).
