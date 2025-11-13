# Refatoração: Lógica Granular N+1 para Geração em Cascata de Cartelas

**Data:** 2025-11-08  
**Severidade:** CRITICAL  
**Escopo:** Frontend - Renderização de Cartelas em Campanhas

---

## 🎯 Objetivo

Implementar a **Regra de Ouro** para renderização de cartelas:
- **SE** `Cartela[N]` existe E tem QUALQUER requisito ativo/completo → **RENDERIZAR** `Cartela[N+1]` (toda bloqueada)
- **SE** `Requisito[X]` em `Cartela[N]` é COMPLETADO → **DESBLOQUEAR** `Requisito[X]` em `Cartela[N+1]` E **GERAR** `Cartela[N+2]`

---

## ❌ Problema Anterior

### Comportamento Defeituoso
```typescript
// ❌ Sistema aguardava cartela inteira estar completa
if (Cartela[N].isFullyComplete === true) {
  renderCartela(N + 1);
}
```

### Consequências
- **Deadlock de Progressão:** Vendedores não viam a próxima cartela até completar 100% da atual
- **UX Ruim:** Sem feedback visual de que há mais cartelas pela frente
- **Spillover Invisível:** Requisitos completados não desbloqueavam os correspondentes na próxima cartela

---

## ✅ Solução Implementada

### 1. Geração Automática de Cartela Virtual N+1

**Arquivo:** `frontend/src/app/(dashboard)/campanhas/[id]/page.tsx`

```typescript
// ✅ NOVO: useMemo para gerar cartela futura
const cartelasExpandidas = useMemo(() => {
  if (!campanha || campanha.cartelas.length === 0) {
    return [];
  }

  // ✅ GUARD: Não cria cartela virtual para campanhas encerradas
  if (campanha.status === 'ENCERRADA') {
    return campanha.cartelas;
  }

  // Passo 1: Obter a cartela com maior número
  const maxNumeroCartela = Math.max(...campanha.cartelas.map(c => c.numeroCartela));
  
  // Passo 2: Pegar requisitos base da primeira cartela para clonar
  const primeiraCartela = campanha.cartelas.find(c => c.numeroCartela === 1);
  if (!primeiraCartela || primeiraCartela.requisitos.length === 0) {
    return campanha.cartelas;
  }

  // Passo 3: Criar cartela virtual N+1
  const proximoNumero = maxNumeroCartela + 1;
  const cartelaVirtual: Cartela = {
    id: `virtual-cartela-${proximoNumero}`,
    numeroCartela: proximoNumero,
    descricao: `Cartela ${proximoNumero} (Bloqueada até completar requisitos anteriores)`,
    requisitos: primeiraCartela.requisitos.map(req => ({
      ...req,
      id: `virtual-req-${req.ordem}-cartela-${proximoNumero}`,
      regraCartela: {
        numeroCartela: proximoNumero
      }
    }))
  };

  // Passo 4: Retornar cartelas originais + cartela virtual
  return [...campanha.cartelas, cartelaVirtual];
}, [campanha]);
```

**Características:**
- ✅ **Não persiste no banco:** Cartela é gerada apenas no frontend
- ✅ **Clona estrutura da Cartela 1:** Mantém a mesma ordem de requisitos
- ✅ **IDs únicos:** Usa prefixo `virtual-` para evitar conflitos
- ✅ **Sempre N+1:** Só mostra UMA cartela além da última existente

---

### 2. Atualização da Lógica de Status

**Mudanças:**
```typescript
// ✅ Usa cartelasExpandidas ao invés de campanha.cartelas
// LOOP 1: Calcular Requisitos COMPLETOS (usa cartelasExpandidas)
for (const cartela of cartelasExpandidas) {
  for (const requisito of cartela.requisitos) {
    const countValidadosCartela = getEnviosValidadosNaCartela(
      requisito,
      cartela.numeroCartela
    );
    const isCompleto = countValidadosCartela >= requisito.quantidade;

    if (isCompleto) {
      mapaStatus.set(
        `${requisito.id}-${cartela.numeroCartela}`,
        "COMPLETO"
      );
    }
  }
}

// LOOP 2: Calcular Requisitos BLOQUEADOS (Spillover)
for (const cartela of cartelasExpandidas) {
  if (cartela.numeroCartela <= 1) continue;

  const cartelaAnterior = cartelasExpandidas.find(
    (c) => c.numeroCartela === cartela.numeroCartela - 1
  );

  if (!cartelaAnterior) continue;

  for (const requisito of cartela.requisitos) {
    // Se já está COMPLETO, não precisa verificar bloqueio
    const chaveAtual = `${requisito.id}-${cartela.numeroCartela}`;
    if (mapaStatus.get(chaveAtual) === "COMPLETO") continue;

    // Encontrar requisito equivalente na cartela anterior pela ORDEM
    const requisitoAnterior = cartelaAnterior.requisitos.find(
      (r) => r.ordem === requisito.ordem
    );

    if (!requisitoAnterior) continue;

    // Verificar se o requisito anterior está COMPLETO
    const chaveAnterior = `${requisitoAnterior.id}-${cartelaAnterior.numeroCartela}`;
    const isAnteriorCompleto = mapaStatus.get(chaveAnterior) === "COMPLETO";

    // Se não estiver completo, marca BLOQUEADO
    if (!isAnteriorCompleto) {
      mapaStatus.set(chaveAtual, "BLOQUEADO");
    }
  }
}
```

**Impactos:**
- ✅ **Cartela Virtual é Processada:** Status calculados para requisitos virtuais
- ✅ **Bloqueio Automático:** Cartela N+1 nasce com todos os requisitos bloqueados
- ✅ **Desbloqueio Granular:** Ao completar Requisito[X] em Cartela[N], desbloqueia Requisito[X] em Cartela[N+1]

---

### 3. Renderização com Cartelas Expandidas

**Mudanças:**
```typescript
// ✅ Usa cartelasExpandidas para renderizar
<TabsCampanhaComRegras 
  cartelas={cartelasExpandidas}
  incluirAbaRegras={!!(campanha.regras && campanha.regras.trim().length > 0 && campanha.regras !== '<p></p>')}
>
  {({ tipo, id }) => {
    // Busca na lista expandida
    const cartelaAtual = cartelasExpandidas.find((c) => c.id === id);
    
    // ... renderização dos requisitos
  }}
</TabsCampanhaComRegras>
```

---

## 🔐 Garantias de Integridade

### 1. Dados Históricos Não São Afetados
```typescript
// ✅ Cartela virtual NÃO persiste no banco
// ✅ IDs virtuais começam com "virtual-" (fácil identificação)
// ✅ Envios continuam sendo salvos apenas contra cartelas reais
```

### 2. Status CONFLITO_MANUAL Não Dispara Completude
```typescript
// ✅ Lógica existente já filtra apenas VALIDADO
const countValidadosCartela = meusEnvios.filter((envio) => {
  if (envio.status !== "VALIDADO") {
    return false; // ✅ CONFLITO_MANUAL é ignorado
  }
  // ... resto da lógica
}).length;
```

### 3. Estados Visuais Mantidos
```typescript
// ✅ RequisitoCard já implementa:
// - Carimbo 🔒 BLOQUEADO (status === "BLOQUEADO")
// - Carimbo ✓ COMPLETO (status === "COMPLETO")
// - Formulário desabilitado se status !== "ATIVO"
```

---

## 📊 Fluxo de Exemplo

### Cenário: Campanha com 3 cartelas no banco, vendedor completa requisitos

**Estado Inicial:**
```
DB: [Cartela 1, Cartela 2, Cartela 3]
Renderização: [Cartela 1 (ativa), Cartela 2 (bloqueada), Cartela 3 (bloqueada), Cartela 4 (virtual, bloqueada)]
```

**Vendedor completa Requisito A na Cartela 1:**
```
✅ Requisito A - Cartela 1: COMPLETO
🔓 Requisito A - Cartela 2: ATIVO (desbloqueado!)
🔒 Requisito B - Cartela 2: BLOQUEADO (ainda aguardando Requisito B - Cartela 1)
🔒 Requisito A - Cartela 3: BLOQUEADO
🔒 Requisito A - Cartela 4 (virtual): BLOQUEADO
```

**Vendedor completa TODOS os requisitos da Cartela 1:**
```
✅ Cartela 1: Todos os requisitos COMPLETOS
🔓 Cartela 2: Todos os requisitos ATIVOS
🔒 Cartela 3: Bloqueada (aguarda Cartela 2)
🔒 Cartela 4 (virtual): Bloqueada (aguarda Cartela 3)
```

**Vendedor completa Requisito A na Cartela 2:**
```
✅ Cartela 1: COMPLETO
✅ Requisito A - Cartela 2: COMPLETO
🔓 Requisito A - Cartela 3: ATIVO (desbloqueado!)
🔒 Requisito B - Cartela 3: BLOQUEADO
🔒 Cartela 4 (virtual): Bloqueada
```

---

## 🧪 Casos de Teste

### Teste 1: Cartela Virtual Aparece
**Entrada:** Campanha com 2 cartelas no banco  
**Esperado:** UI mostra 3 tabs (Cartela 1, Cartela 2, Cartela 3 virtual)  
**Validação:** `cartelasExpandidas.length === 3`

### Teste 2: Desbloqueio Granular
**Entrada:** Completar Requisito "Lentes" na Cartela 1  
**Esperado:** Requisito "Lentes" na Cartela 2 fica ATIVO  
**Validação:** `mapaStatusRequisitos.get('req-lentes-cartela-2') === 'ATIVO'`

### Teste 3: Cartela Virtual Nasce Bloqueada
**Entrada:** Nenhum requisito completo  
**Esperado:** Todos os requisitos da Cartela 3 (virtual) estão BLOQUEADOS  
**Validação:** Todos os `status === 'BLOQUEADO'` para cartela virtual

### Teste 4: Não Duplica Cartelas
**Entrada:** Recarregar a página  
**Esperado:** Ainda mostra apenas N+1 cartelas (não N+2, N+3...)  
**Validação:** `cartelasExpandidas.length === campanha.cartelas.length + 1`

---

## 📝 Arquivos Modificados

### 1. `frontend/src/app/(dashboard)/campanhas/[id]/page.tsx`
**Mudanças:**
- ✅ **NOVO:** `useMemo` para `cartelasExpandidas`
- ✅ **ATUALIZADO:** Loops de status usam `cartelasExpandidas`
- ✅ **ATUALIZADO:** Renderização usa `cartelasExpandidas`
- ✅ **ATUALIZADO:** Dependências de `useMemo` incluem `cartelasExpandidas`

**Linhas afetadas:**
- Linhas 282-315: Novo `useMemo` para `cartelasExpandidas`
- Linhas 350-410: Loops de status atualizados
- Linhas 530-545: Renderização com `cartelasExpandidas`

---

## ✨ Benefícios

### UX
- ✅ **Feedback Visual Antecipado:** Vendedor vê a próxima cartela imediatamente
- ✅ **Progressão Clara:** Entende que há mais recompensas pela frente
- ✅ **Sem Surpresas:** Não precisa completar 100% para ver o que vem depois

### Técnicos
- ✅ **Escalável:** Funciona com qualquer número de cartelas
- ✅ **Performático:** `useMemo` evita recálculos desnecessários
- ✅ **Seguro:** Dados históricos não são afetados
- ✅ **Manutenível:** Lógica clara e bem documentada

### Gamificação
- ✅ **Motivação:** Vendedor vê o "próximo nível" sempre
- ✅ **Senso de Progressão:** Desbloquear requisitos individuais dá feedback imediato
- ✅ **Spillover Transparente:** Fica claro que envios "transbordam" para a próxima cartela

---

## 🚀 Deploy

### Checklist de Validação
- [ ] Compilação sem erros: `npm run build`
- [ ] Testes manuais:
  - [ ] Campanha com 1 cartela → Mostra Cartela 2 virtual
  - [ ] Completar Requisito A → Desbloqueia Requisito A na próxima
  - [ ] Completar todos requisitos → Nova cartela aparece automaticamente
- [ ] Performance: Verificar `useMemo` não está causando re-renders excessivos
- [ ] Mobile: Tabs são scrolláveis (já implementado)

### Rollback
**Se necessário reverter:**
```bash
git revert <commit-hash>
```

**Impacto:** Sistema volta ao comportamento anterior (aguardar cartela completa)

---

## 📚 Referências

- **Sprint 16.5:** Implementação de status ATIVO/COMPLETO/BLOQUEADO
- **Sprint 19.5:** Correção de lógica de spillover
- **Design System:** Princípios de "Design Magnífico" (glassmorphism)

---

## ✍️ Autor

**GitHub Copilot**  
Data: 2025-11-08  
Revisão: v1.0
