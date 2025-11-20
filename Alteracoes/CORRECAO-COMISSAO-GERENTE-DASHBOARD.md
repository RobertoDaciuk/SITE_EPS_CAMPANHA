# 🔥 CORREÇÃO CRÍTICA: Comissão do Gerente Não Aparece no Dashboard

**Data:** 20 de Novembro de 2025  
**Sprint:** 20.5  
**Severidade:** 🔴 CRÍTICA  
**Status:** Identificado - Aguardando Implementação

---

## 📋 RESUMO EXECUTIVO

O dashboard do gerente mostra **0 pts de comissão** mesmo quando há valores disponíveis. O problema ocorre porque:

1. ✅ **O sistema CALCULA e ADICIONA a comissão** ao campo `saldoPontos` do gerente
2. ❌ **O dashboard BUSCA de `RelatorioFinanceiro`** (que não é criado automaticamente)
3. 🔥 **Resultado:** Dinheiro existe mas fica "invisível" até geração manual de lote

---

## 🔍 ANÁLISE TÉCNICA

### **Fluxo Atual (BUGADO):**

```
1. Vendedor completa cartela
   ↓
2. RecompensaService.processarGatilhos()
   ↓
3. Calcula comissão do gerente (percentualGerente * valorOriginal)
   ↓
4. Incrementa saldoPontos do gerente ✅
   ↓
5. NÃO cria RelatorioFinanceiro ❌
   ↓
6. Dashboard busca RelatorioFinanceiro (vazio)
   ↓
7. Mostra 0 pts ❌
```

### **Código Problemático:**

**Arquivo:** `backend/src/modulos/dashboard/dashboard.service.ts` (linha 758-761)

```typescript
// ❌ PROBLEMA: Busca APENAS de RelatorioFinanceiro
const comissaoPendente = await this.prisma.relatorioFinanceiro.aggregate({
  _sum: { valor: true },
  where: { usuarioId: usuarioId, tipo: 'GERENTE', status: 'PENDENTE' },
});
```

**Arquivo:** `backend/src/modulos/recompensa/recompensa.service.ts` (linha 544-546)

```typescript
// ✅ Incrementa saldoPontos
await tx.usuario.update({
  where: { id: vendedor.gerente.id },
  data: {
    saldoPontos: { increment: valorComissaoGerente }, // ✅ Adiciona ao saldo
  },
});

// ❌ MAS NÃO CRIA RelatorioFinanceiro
// Resultado: Saldo existe mas dashboard não enxerga
```

---

## 🎯 SOLUÇÕES POSSÍVEIS

### **SOLUÇÃO 1: Usar `saldoPontos` Diretamente (RECOMENDADA) ⭐**

**Vantagem:**
- ✅ Simples e direto
- ✅ Reflete a realidade imediata do saldo
- ✅ Não requer mudanças no fluxo de recompensas
- ✅ Mantém `RelatorioFinanceiro` apenas para histórico de pagamentos

**Implementação:**

```typescript
// backend/src/modulos/dashboard/dashboard.service.ts

// ANTES (linha 758-761):
const comissaoPendente = await this.prisma.relatorioFinanceiro.aggregate({
  _sum: { valor: true },
  where: { usuarioId: usuarioId, tipo: 'GERENTE', status: 'PENDENTE' },
});

// DEPOIS:
// Buscar saldoPontos diretamente do usuário
const gerenteSaldo = await this.prisma.usuario.findUnique({
  where: { id: usuarioId },
  select: { saldoPontos: true },
});

const comissaoPendente = {
  _sum: {
    valor: gerenteSaldo?.saldoPontos || 0
  }
};
```

**Impacto:**
- Dashboard passa a refletir o saldo real imediatamente
- `RelatorioFinanceiro` continua sendo usado apenas para controle de pagamentos (quando admin gera lote)

---

### **SOLUÇÃO 2: Criar `RelatorioFinanceiro` Automaticamente**

**Vantagem:**
- ✅ Mantém arquitetura atual do dashboard
- ✅ Histórico completo em `RelatorioFinanceiro`

**Desvantagem:**
- ❌ Mais complexo
- ❌ Pode gerar duplicação se admin gerar lote antes
- ❌ Requer lógica de deduplicação

**Implementação:**

```typescript
// backend/src/modulos/recompensa/recompensa.service.ts (após linha 546)

// Criar RelatorioFinanceiro para rastreabilidade
await tx.relatorioFinanceiro.create({
  data: {
    valor: valorComissaoGerente,
    tipo: 'GERENTE',
    status: 'PENDENTE',
    usuarioId: vendedor.gerente.id,
    campanhaId: campanha.id,
    observacoes: `Comissão automática - Cartela ${numeroCartela} do vendedor ${vendedor.nome}`,
  },
});
```

**Problema:**
- Se admin gerar lote depois, pode criar relatório duplicado
- Necessita verificação de deduplicação no `gerarLote()`

---

### **SOLUÇÃO 3: Dashboard Híbrido (Saldo + Relatórios)**

Combinar ambas as fontes:

```typescript
// Saldo disponível (ainda não em relatório)
const saldoDisponivel = gerente.saldoPontos;

// Relatórios em processamento
const relatoriosPendentes = await this.prisma.relatorioFinanceiro.aggregate({
  _sum: { valor: true },
  where: { usuarioId: usuarioId, tipo: 'GERENTE', status: 'PENDENTE' },
});

// Total = saldo livre + relatórios pendentes
const totalPendente = saldoDisponivel + (relatoriosPendentes._sum.valor || 0);
```

---

## ✅ RECOMENDAÇÃO FINAL

**Implementar SOLUÇÃO 1** por ser:
- Mais simples
- Mais direta
- Sem risco de duplicação
- Reflete a realidade imediata

O `RelatorioFinanceiro` deve ser usado apenas como **registro de pagamento processado**, não como fonte primária de saldo disponível.

---

## 📊 SCRIPT DE DIAGNÓSTICO

Execute o arquivo `diagnostico-comissao-gerente.sql` para:
1. Ver gerentes com saldo > 0 mas sem relatórios
2. Calcular total de comissão "invisível"
3. Histórico de cartelas concluídas com comissão

```bash
psql -U seu_usuario -d nome_banco -f diagnostico-comissao-gerente.sql
```

---

## 🔄 PRÓXIMOS PASSOS

1. [ ] Executar script de diagnóstico para confirmar problema em produção
2. [ ] Implementar Solução 1 (usar saldoPontos diretamente)
3. [ ] Testar em ambiente de desenvolvimento
4. [ ] Validar com gerente real que o dashboard mostra valores corretos
5. [ ] Deploy em produção
6. [ ] Atualizar documentação do sistema

---

## 📝 NOTAS TÉCNICAS

### Arquivos Envolvidos:
- `backend/src/modulos/dashboard/dashboard.service.ts` (linha 758-761)
- `backend/src/modulos/recompensa/recompensa.service.ts` (linha 520-560)
- `frontend/src/components/dashboard/gerente/comissao-hero-card.tsx` (linha 91)

### Modelos do Banco:
- `Usuario.saldoPontos` - Saldo disponível atual
- `RelatorioFinanceiro` - Registro de pagamentos (criado manualmente via lote)
- `CartelaConcluida` - Registro de quando a comissão foi calculada

### Comportamento Esperado:
Quando um gerente loga, deve ver **imediatamente** toda a comissão acumulada das vendas validadas da sua equipe, sem precisar esperar que um admin gere um lote de pagamento.
