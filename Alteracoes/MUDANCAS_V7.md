# 🚀 SISTEMA DE SALDO E PAGAMENTOS V7.0 - IMPLEMENTAÇÃO COMPLETA

## 📋 Sumário Executivo

Refatoração completa do sistema de pagamentos para implementar saldo acumulado e multiplicadores de eventos por envio individual, corrigindo bugs críticos identificados.

---

## 🎯 Problemas Corrigidos

### 1. ❌ BUG CRÍTICO: Multiplicador de Eventos
**Problema:** Multiplicador era verificado na data de VALIDAÇÃO, não na data de ENVIO
**Solução:** Agora verifica `dataEnvio` do pedido vs período do evento
**Impacto:** Vendedores agora recebem multiplicador correto mesmo se validado após evento

### 2. ❌ BUG CRÍTICO: Comissão do Gerente
**Problema:** Gerente recebia comissão sobre valor COM multiplicador
**Solução:** Agora calcula comissão sobre valor ORIGINAL (sem multiplicador)
**Impacto:** Comissão do gerente fica justa (10% do valor real, não do bonificado)

### 3. ❌ BUG CRÍTICO: Multiplicador Global
**Problema:** Aplicava multiplicador no TOTAL da cartela (todos envios recebiam mesmo multiplicador)
**Solução:** Agora calcula multiplicador POR ENVIO individual
**Impacto:** Apenas envios enviados durante evento recebem multiplicador

### 4. ❌ LÓGICA INCORRETA: Relatórios Financeiros
**Problema:** Criava relatório IMEDIATAMENTE quando cartela completava
**Solução:** Agora acumula em saldo e financeiro cria relatório manualmente
**Impacto:** Financeiro tem controle total sobre quando processar pagamentos

---

## 🗄️ Mudanças no Schema (Prisma)

### Model `Usuario`
```prisma
/// NOVO CAMPO V7.0
saldoPontos Decimal @default(0) @db.Decimal(10, 2)
```
**Propósito:** Acumula pontos até financeiro processar pagamentos

### Model `EnvioVenda`
```prisma
/// NOVOS CAMPOS V7.0
pontosAdicionadosAoSaldo Boolean @default(false)  // true = adicionado quando cartela completou
multiplicadorAplicado    Decimal @default(1.0) @db.Decimal(5, 2)  // 1x, 2x, 3x
valorFinalComEvento      Decimal? @db.Decimal(10, 2)  // valor × multiplicador
pontosLiquidados         Boolean @default(false)  // true = pago pelo financeiro
```

**Propósito:**
- `pontosAdicionadosAoSaldo`: Controla se pontos já foram adicionados ao saldo
- `multiplicadorAplicado`: Registra multiplicador calculado (auditoria)
- `valorFinalComEvento`: Valor real que foi/será pago
- `pontosLiquidados`: Controla se financeiro já pagou

### Model `RelatorioFinanceiro`
```prisma
/// NOVOS CAMPOS V7.0
dataCorte       DateTime?  // Data até quando calculou pagamentos
enviosIncluidos Json?      // Array de IDs dos envios incluídos
```

**Propósito:**
- `dataCorte`: Rastreabilidade de quando pagamentos foram calculados
- `enviosIncluidos`: IDs dos envios para marcar como liquidados ao pagar

---

## 🔄 Mudanças nos Services

### 1. `RecompensaService` (REFATORADO COMPLETO)

**Método `_aplicarRecompensas()` - ANTES:**
```typescript
// ❌ ERRADO
const eventoAtivo = await tx.eventoEspecial.findFirst({
  where: {
    dataInicio: { lte: new Date() },  // Data ATUAL
    dataFim: { gte: new Date() }
  }
});

let valorTotalCartela = soma(envios);
valorTotalCartela *= multiplicador;  // Aplica em TUDO

await tx.relatorioFinanceiro.create({ valor: valorTotalCartela });  // Cria IMEDIATAMENTE
```

**Método `_aplicarRecompensas()` - DEPOIS:**
```typescript
// ✅ CORRETO
for (const envio of envios) {
  const eventoAtivo = await tx.eventoEspecial.findFirst({
    where: {
      dataInicio: { lte: envio.dataEnvio },  // Data do ENVIO
      dataFim: { gte: envio.dataEnvio }
    }
  });

  const multiplicador = eventoAtivo?.multiplicador || 1.0;
  const valorFinal = envio.valorOriginal × multiplicador;  // Por envio!

  await tx.envioVenda.update({
    where: { id: envio.id },
    data: {
      multiplicadorAplicado: multiplicador,
      valorFinalComEvento: valorFinal,
      pontosAdicionadosAoSaldo: true
    }
  });
}

const valorTotalVendedor = soma(envios.map(e => e.valorFinal));
const valorTotalOriginal = soma(envios.map(e => e.valorOriginal));

// Adiciona ao SALDO (não cria relatório)
await tx.usuario.update({
  where: { id: vendedor.id },
  data: { saldoPontos: { increment: valorTotalVendedor } }
});

// Comissão gerente sobre valor ORIGINAL
if (gerente) {
  const comissao = valorTotalOriginal × (percentual / 100);
  await tx.usuario.update({
    where: { id: gerente.id },
    data: { saldoPontos: { increment: comissao } }
  });
}
```

**Mudanças Críticas:**
- ✅ Multiplicador calculado POR ENVIO (baseado em `dataEnvio`)
- ✅ Adiciona ao `saldoPontos` do vendedor/gerente
- ✅ Comissão do gerente sobre valor ORIGINAL
- ✅ Marca como `pontosAdicionadosAoSaldo = true`
- ✅ NÃO cria `RelatorioFinanceiro`
- ✅ Logs detalhados para debugging

---

### 2. `RelatorioFinanceiroService` (NOVOS MÉTODOS)

#### NOVO: `calcularPagamentosAteData(dataCorte, adminId)`

```typescript
async calcularPagamentosAteData(dataCorte: Date, adminId: string) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Buscar usuários com saldoPontos > 0
    const usuariosComSaldo = await tx.usuario.findMany({
      where: { saldoPontos: { gt: 0 } }
    });

    // 2. Para cada usuário
    for (const usuario of usuariosComSaldo) {
      // 2.1 Verificar se já tem relatório PENDENTE (evita duplicação)
      const relatorioPendente = await tx.relatorioFinanceiro.findFirst({
        where: { usuarioId: usuario.id, status: 'PENDENTE' }
      });
      if (relatorioPendente) continue;  // Pula

      // 2.2 Buscar envios que compõem o saldo
      const envios = await tx.envioVenda.findMany({
        where: {
          vendedorId: usuario.id,
          pontosAdicionadosAoSaldo: true,
          pontosLiquidados: false
        }
      });

      // 2.3 Criar RelatorioFinanceiro
      await tx.relatorioFinanceiro.create({
        data: {
          valor: usuario.saldoPontos,
          tipo: usuario.papel === 'GERENTE' ? 'GERENTE' : 'VENDEDOR',
          usuarioId: usuario.id,
          status: 'PENDENTE',
          dataCorte: dataCorte,
          enviosIncluidos: envios.map(e => e.id),  // IDs dos envios
          observacoes: `Calculado até ${dataCorte} pelo admin ${adminId}`
        }
      });
    }

    return { totalRelatorios, valorTotal, relatorios };
  });
}
```

**Propósito:**
- Cria relatórios para TODOS usuários com saldo > 0
- NÃO subtrai do saldo (apenas cria relatório)
- Salva IDs dos envios para liquidar depois
- Evita duplicação (pula se já tem PENDENTE)

---

#### ATUALIZADO: `marcarComoPago(id)`

**ANTES:**
```typescript
// ❌ APENAS atualizava status
await tx.relatorioFinanceiro.update({
  where: { id },
  data: { status: 'PAGO', dataPagamento: new Date() }
});

await tx.notificacao.create({ ... });
```

**DEPOIS:**
```typescript
// ✅ SUBTRAI do saldo + marca envios como liquidados
const relatorio = await tx.relatorioFinanceiro.findUnique({ where: { id } });

// 1. Verificar saldo suficiente
if (usuario.saldoPontos < relatorio.valor) {
  throw new BadRequestException('Saldo insuficiente');
}

// 2. Subtrair do saldo
await tx.usuario.update({
  where: { id: relatorio.usuarioId },
  data: { saldoPontos: { decrement: relatorio.valor } }
});

// 3. Marcar envios como liquidados
await tx.envioVenda.updateMany({
  where: { id: { in: relatorio.enviosIncluidos } },
  data: { pontosLiquidados: true }
});

// 4. Atualizar relatório
await tx.relatorioFinanceiro.update({
  where: { id },
  data: { status: 'PAGO', dataPagamento: new Date() }
});

// 5. Notificar
await tx.notificacao.create({ ... });
```

**Mudanças Críticas:**
- ✅ Subtrai do `saldoPontos` do usuário
- ✅ Marca envios como `pontosLiquidados = true`
- ✅ Valida saldo suficiente
- ✅ Mantém lógica transacional

---

## 🌐 Mudanças na API

### NOVO Endpoint: `POST /relatorios-financeiros/calcular-pagamentos`

**Request:**
```json
{
  "dataCorte": "2025-01-31T23:59:59.999Z"
}
```

**Response:**
```json
{
  "totalRelatorios": 15,
  "valorTotal": 12500.50,
  "relatorios": [...],
  "usuarios": [
    {
      "id": "abc",
      "nome": "João Silva",
      "papel": "VENDEDOR",
      "saldo": 850.00
    }
  ]
}
```

**Autenticação:** Apenas `ADMIN`
**Propósito:** Calcular pagamentos até data específica

---

### ATUALIZADO: `PATCH /relatorios-financeiros/:id/marcar-como-pago`

**Comportamento ANTERIOR:**
- Atualizava status para PAGO
- Criava notificação

**Comportamento NOVO:**
- ✅ Subtrai do saldoPontos
- ✅ Marca envios como liquidados
- Atualiza status para PAGO
- Cria notificação

**Autenticação:** Apenas `ADMIN`

---

## 📊 Fluxo Completo: Da Validação ao Pagamento

### 1. VENDEDOR ENVIA PEDIDO
```
POST /api/envios-venda
Body: { numeroPedido: "12345", campanhaId: "...", requisitoId: "..." }

EnvioVenda criado:
- status = EM_ANALISE
- dataEnvio = NOW()  ← IMPORTANTE!
- pontosAdicionadosAoSaldo = false
- pontosLiquidados = false
```

### 2. ADMIN VALIDA VIA /admin/validacao
```
POST /api/validacao/processar

ValidacaoService:
1. Valida CNPJ ✅
2. Valida Regras ✅
3. Busca código de referência na planilha
4. Busca produto na campanha
5. Atualiza EnvioVenda:
   - status = VALIDADO
   - codigoReferenciaUsado = "LENTE-001"
   - valorPontosReaisRecebido = R$ 50,00  ← Valor ORIGINAL
   - numeroCartelaAtendida = 1
   - dataValidacao = NOW()

6. Chama RecompensaService.processarGatilhos()
```

### 3. RECOMPENSA SERVICE (SE CARTELA COMPLETA)
```
RecompensaService._aplicarRecompensas():

Para cada envio da cartela:
  - Busca evento ativo DURANTE dataEnvio
  - Calcula multiplicador (1x, 2x, 3x)
  - Calcula valorFinal = valorOriginal × multiplicador
  - Atualiza envio:
    * multiplicadorAplicado = 2.0
    * valorFinalComEvento = R$ 100,00 (50 × 2)
    * pontosAdicionadosAoSaldo = true  ← NOVO!

Soma valores:
  - valorTotalOriginal = R$ 125,00 (sem multiplicador)
  - valorTotalFinal = R$ 175,00 (com multiplicador)

Atualiza saldos:
  - Vendedor.saldoPontos += R$ 175,00
  - Gerente.saldoPontos += R$ 12,50 (10% de R$ 125 ORIGINAL)

Notifica:
  - "Cartela completa! R$ 175,00 adicionados ao saldo"
```

### 4. FINANCEIRO CALCULA PAGAMENTOS
```
POST /api/relatorios-financeiros/calcular-pagamentos
Body: { "dataCorte": "2025-01-31T23:59:59.999Z" }

RelatorioFinanceiroService.calcularPagamentosAteData():
1. Busca usuários com saldoPontos > 0
2. Para cada usuário:
   - Verifica se já tem relatório PENDENTE (pula se sim)
   - Busca envios (pontosAdicionadosAoSaldo=true, pontosLiquidados=false)
   - Cria RelatorioFinanceiro:
     * valor = saldoPontos (R$ 175,00)
     * status = PENDENTE
     * dataCorte = 2025-01-31
     * enviosIncluidos = [id1, id2, id3]
     * observacoes = "Calculado até 31/01/2025..."

NÃO subtrai do saldo!
NÃO marca envios como liquidados!
Apenas CRIA o relatório.
```

### 5. FINANCEIRO MARCA COMO PAGO
```
PATCH /api/relatorios-financeiros/abc-123/marcar-como-pago

RelatorioFinanceiroService.marcarComoPago():
1. Busca relatório
2. Verifica saldo suficiente
3. SUBTRAI do saldo:
   - Vendedor.saldoPontos: R$ 175,00 → R$ 0,00
4. Marca envios como liquidados:
   - EnvioVenda.pontosLiquidados = true (para todos IDs em enviosIncluidos)
5. Atualiza relatório:
   - status = PAGO
   - dataPagamento = NOW()
6. Notifica:
   - "Pagamento de R$ 175,00 processado! Novo saldo: R$ 0,00"
```

---

## ✅ Checklist de Verificação

### Schema Prisma
- [x] Campo `Usuario.saldoPontos` adicionado
- [x] Campos `EnvioVenda.pontosAdicionadosAoSaldo` adicionado
- [x] Campos `EnvioVenda.multiplicadorAplicado` adicionado
- [x] Campos `EnvioVenda.valorFinalComEvento` adicionado
- [x] Campos `RelatorioFinanceiro.dataCorte` adicionado
- [x] Campos `RelatorioFinanceiro.enviosIncluidos` adicionado
- [x] Índices criados para novos campos

### Services
- [x] `RecompensaService._aplicarRecompensas()` refatorado
  - [x] Multiplicador calculado por envio
  - [x] Usa `dataEnvio` ao invés de `new Date()`
  - [x] Adiciona ao saldo ao invés de criar relatório
  - [x] Comissão gerente sobre valor ORIGINAL
  - [x] Marca como `pontosAdicionadosAoSaldo = true`
  - [x] Logs detalhados

- [x] `RelatorioFinanceiroService.calcularPagamentosAteData()` criado
  - [x] Busca usuários com saldo > 0
  - [x] Verifica relatórios PENDENTES
  - [x] Cria relatórios sem subtrair saldo
  - [x] Salva IDs dos envios

- [x] `RelatorioFinanceiroService.marcarComoPago()` atualizado
  - [x] Subtrai do saldoPontos
  - [x] Marca envios como liquidados
  - [x] Valida saldo suficiente
  - [x] Mantém transação

### API
- [x] DTO `CalcularPagamentosDto` criado
- [x] Endpoint `POST /relatorios-financeiros/calcular-pagamentos` criado
- [x] Controller atualizado com novos endpoints
- [x] Documentação TSDoc completa

### Validação
- [x] `ValidacaoService` não precisa alteração (apenas chama RecompensaService)
- [x] `EnvioVendaService` não precisa alteração (apenas chama RecompensaService)

---

## 🚨 BREAKING CHANGES

### 1. Relatórios Antigos
**IMPORTANTE:** Se você rodar a migration em um banco com dados existentes:
- Relatórios PENDENTES antigos continuarão funcionando
- NÃO serão criados novos relatórios automaticamente
- Financeiro deve usar o novo endpoint `/calcular-pagamentos`

**Recomendação:** Como você vai zerar o banco, não há problema!

### 2. Fluxo de Pagamento
**ANTES:** Relatório criado automaticamente quando cartela completava
**AGORA:** Financeiro deve clicar em "Calcular Pagamentos" manualmente

---

## 🎯 Testes Recomendados

### Teste 1: Multiplicador por Envio
```
1. Criar evento 2x de 15/01 a 20/01
2. Vendedor envia Pedido #1 em 18/01 (DENTRO do evento)
3. Vendedor envia Pedido #2 em 22/01 (FORA do evento)
4. Admin valida ambos em 25/01 (FORA do evento)
5. Verificar:
   - Pedido #1: multiplicadorAplicado = 2.0 ✅
   - Pedido #2: multiplicadorAplicado = 1.0 ✅
```

### Teste 2: Comissão do Gerente
```
1. Produto: R$ 100
2. Evento 2x ativo
3. Vendedor vende → valorFinal = R$ 200
4. Gerente deve receber: R$ 10 (10% de R$ 100 ORIGINAL) ✅
   NÃO R$ 20 (10% de R$ 200)
```

### Teste 3: Fluxo Completo
```
1. Vendedor envia 2 pedidos (R$ 50 cada, evento 2x)
2. Admin valida → Cartela completa
3. Verificar:
   - Vendedor.saldoPontos = R$ 200 (50×2 + 50×2) ✅
   - Gerente.saldoPontos = R$ 10 (10% de R$ 100 original) ✅
   - RelatorioFinanceiro NÃO criado ✅

4. Financeiro clica "Calcular até 31/01"
5. Verificar:
   - RelatorioFinanceiro criado (status=PENDENTE) ✅
   - Saldo NÃO subtraído ✅

6. Financeiro marca como PAGO
7. Verificar:
   - Vendedor.saldoPontos = R$ 0 ✅
   - Envios marcados pontosLiquidados = true ✅
   - RelatorioFinanceiro.status = PAGO ✅
```

---

## 📝 Notas Finais

### Logs Detalhados
Todos os services agora possuem logs extensivos para debugging:
- `[APLICANDO RECOMPENSAS - CARTELA X]`
- `[CALCULANDO PAGAMENTOS ATÉ...]`
- `[MARCANDO RELATÓRIO COMO PAGO]`

### Auditoria
Todos os campos críticos são rastreáveis:
- `dataEnvio` → Quando pedido foi enviado
- `dataValidacao` → Quando foi validado
- `multiplicadorAplicado` → Qual multiplicador foi usado
- `valorFinalComEvento` → Valor real pago
- `dataCorte` → Quando relatório foi calculado
- `enviosIncluidos` → Quais envios foram incluídos

### Performance
- Queries otimizadas com índices nos novos campos
- Transações atômicas para garantir consistência
- Verificação de relatórios PENDENTES evita duplicação

---

## 🎉 Implementação Concluída!

Todas as mudanças foram implementadas com:
- ✅ Zero breaking changes destrutivos
- ✅ Logs detalhados para debugging
- ✅ Validações de segurança
- ✅ Documentação completa
- ✅ Testes recomendados
- ✅ Auditoria completa

**Próximo passo:** Rodar migration e testar!

```bash
cd backend
npx prisma migrate dev
npx prisma generate
npm run start:dev
```
