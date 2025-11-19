# 🔧 CORREÇÕES COMPLETAS - CRIAÇÃO DE CAMPANHAS

## 📋 ANÁLISE COMPLETA DO SISTEMA

### ✅ O QUE ESTÁ FUNCIONANDO:
1. Upload de produtos via GerenciarProdutosModal ✅
2. Busca de produtos com debounce ✅
3. Mapeamento de colunas ✅
4. Preview de produtos ✅
5. Estrutura do payload enviado ao backend ✅

### ❌ O QUE ESTÁ QUEBRADO:

#### 1. **ERRO 400 ao Criar Campanha** (CRÍTICO)
**Sintoma:** `POST /campanhas 400 (Bad Request)`
**Causa Raiz:** Backend rejeitando payload
**Ação:** Verificar logs do backend para ver erro específico

#### 2. **Mensagem de Produtos Globais** (Step3Cartelas)
**Sintoma:** Mostra "Produtos da Campanha - Produtos importados na etapa anterior"
**Causa Raiz:** Código legado do modelo antigo ainda presente
**Localização:** `Step3Cartelas.tsx` linhas 302-360
**Ação:** REMOVER COMPLETAMENTE esta seção

#### 3. **Cópia entre Requisitos Não Funciona**
**Sintoma:** "Nenhum requisito disponível para cópia"
**Causa Raiz:** Filtro executando antes do state atualizar
**Localização:** `Step3Cartelas.tsx` linha 960-975
**Ação:** Revisar lógica de filtragem

#### 4. **Erro de Imagem Blob**
**Sintoma:** `GET blob:http://localhost:3001/xxx net::ERR_FILE_NOT_FOUND`
**Causa Raiz:** Preview de imagens usando blob URL inválida
**Ação:** Verificar upload e preview de imagens

#### 5. **Warning AnimatePresence**
**Sintoma:** "You're attempting to animate multiple children within AnimatePresence"
**Causa Raiz:** PreviewCampanha.tsx mode="wait" com múltiplos children
**Localização:** `PreviewCampanha.tsx` linha 456
**Ação:** Remover mode="wait" ou envolver cada child em fragment único

---

## 🔍 INVESTIGAÇÃO DETALHADA

### PAYLOAD ENVIADO (do console):
```json
{
  "titulo": "Verão Transitions",
  "descricao": "Venda lentes transitions",
  "dataInicio": "2025-11-19T03:00:00.000Z",
  "dataFim": "2025-11-22T02:59:59.000Z",
  "pontosReaisMaximo": 500,
  "percentualGerente": 0.1,
  "paraTodasOticas": true,
  "tipoPedido": "OS_OP_EPS",
  "cartelas": [
    {
      "numeroCartela": 1,
      "descricao": "Cartela Inicial",
      "requisitos": [
        {
          "descricao": "Transition Gray ou Verde ou Safira",
          "quantidade": 6,
          "tipoUnidade": "Caixa",
          "ordem": 1,
          "produtos": [...], // VERIFICAR SE ESTÁ POPULADO
          "condicoes": []
        }
      ]
    }
  ]
}
```

### DTO ESPERADO PELO BACKEND:
```typescript
// backend/src/modulos/campanhas/dto/criar-campanha.dto.ts
{
  titulo: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  pontosReaisMaximo: number;
  percentualGerente: number;
  paraTodasOticas: boolean;
  tipoPedido?: 'OS_OP_EPS' | 'OS_OP';
  cartelas: Array<{
    numeroCartela: number;
    descricao: string;
    requisitos: Array<{
      descricao: string;
      quantidade: number;
      tipoUnidade: 'Caixa' | 'Unidade';
      ordem: number;
      produtos?: Array<{ codigoRef: string; pontosReais: number }>;
      importSessionId?: string;
      condicoes?: Array<...>;
    }>;
  }>;
}
```

---

## 🛠️ PLANO DE CORREÇÃO

### FASE 1: Remover Código Legado (IMEDIATO)

#### 1.1 Step3Cartelas.tsx - Remover Seção de Produtos Globais
**Linhas 302-360** - DELETAR COMPLETAMENTE
```tsx
// REMOVER TUDO:
{/* ============== SEÇÃO 1: PRODUTOS IMPORTADOS ============== */}
<div className="bg-white dark:bg-gray-800 rounded-2xl p-5...">
  <h4>Produtos da Campanha</h4>
  <p>Produtos importados na etapa anterior</p>
  ...
</div>
```

#### 1.2 Step3Cartelas.tsx - Remover Alertas de Produtos Globais
**Linhas 492-510** - VERIFICAR e REMOVER se for sobre produtos globais

#### 1.3 Step3Cartelas.tsx - Remover Referências a state.importSessionId
**Linhas 64, 67, 70, 76, 320, 332** - REMOVER código que busca produtos globais

### FASE 2: Corrigir Erro 400 (CRÍTICO)

#### 2.1 Adicionar Validação no Frontend
```typescript
// CriarCampanhaWizard.tsx - antes de enviar
const validarCartelas = () => {
  for (const cartela of state.cartelas) {
    for (const requisito of cartela.requisitos) {
      if (!requisito.produtos || requisito.produtos.length === 0) {
        if (!requisito.importSessionId) {
          toast.error(`Requisito "${requisito.descricao}" não tem produtos!`);
          return false;
        }
      }
    }
  }
  return true;
};

// Usar antes de handleSubmit
if (!validarCartelas()) return;
```

#### 2.2 Verificar Logs do Backend
```bash
# Ver erro específico no terminal do backend
npm run start:dev
# Tentar criar campanha e ver mensagem de erro
```

### FASE 3: Corrigir Cópia entre Requisitos

#### 3.1 Garantir que Produtos Sejam Salvos no State
```typescript
// GerenciarProdutosModal.tsx - já implementado ✅
onSave={(produtos, sessionId) => {
  // Atualiza state corretamente
  setState(prev => {
    const newCartelas = [...prev.cartelas];
    if (sessionId) {
      newCartelas[cartelaIndex].requisitos[requisitoIndex].importSessionId = sessionId;
      newCartelas[cartelaIndex].requisitos[requisitoIndex].produtos = [];
    } else {
      newCartelas[cartelaIndex].requisitos[requisitoIndex].produtos = produtos;
      newCartelas[cartelaIndex].requisitos[requisitoIndex].importSessionId = undefined;
    }
    return { ...prev, cartelas: newCartelas };
  });
}}
```

#### 3.2 Debugging - Adicionar Logs
```typescript
// Step3Cartelas.tsx - linha 960
outrosRequisitos={
  state.cartelas.flatMap((cartela, cIdx) => {
    const requisitos = cartela.requisitos.filter((req, rIdx) => {
      if (cIdx === requisitoModalAtivo.cartelaIndex && rIdx === requisitoModalAtivo.requisitoIndex) {
        return false;
      }
      const hasProdutos = req.produtos && req.produtos.length > 0;
      console.log(`[DEBUG] Requisito ${req.descricao}: ${hasProdutos ? req.produtos.length : 0} produtos`);
      return hasProdutos;
    });
    return requisitos.map(req => ({
      descricao: req.descricao,
      ordem: req.ordem,
      produtos: req.produtos || [],
    }));
  })
}
```

### FASE 4: Corrigir Preview de Imagens

#### 4.1 Verificar Upload
```typescript
// Verificar se imagens estão sendo salvas corretamente
// e se URLs estão sendo retornadas
```

### FASE 5: Corrigir AnimatePresence Warning

#### 5.1 PreviewCampanha.tsx - linha 456
```tsx
// OPÇÃO 1: Remover mode="wait"
<AnimatePresence>
  {children}
</AnimatePresence>

// OPÇÃO 2: Envolver em fragment único
<AnimatePresence mode="wait">
  <motion.div key={currentSection}>
    {children}
  </motion.div>
</AnimatePresence>
```

---

## 🎯 PRIORIDADE DE EXECUÇÃO

1. **URGENTE**: Verificar erro 400 no backend (ver logs)
2. **ALTA**: Remover seção de produtos globais (Step3Cartelas)
3. **ALTA**: Adicionar validação de produtos antes de submit
4. **MÉDIA**: Corrigir cópia entre requisitos
5. **BAIXA**: Corrigir preview de imagens
6. **BAIXA**: Corrigir warning AnimatePresence

---

## 📝 CHECKLIST FINAL

- [ ] Erro 400 identificado e corrigido
- [ ] Seção "Produtos da Campanha" removida
- [ ] Validação de produtos implementada
- [ ] Cópia entre requisitos funcionando
- [ ] Preview de imagens funcionando
- [ ] Warning AnimatePresence resolvido
- [ ] Teste completo: criar campanha do início ao fim
- [ ] Teste: copiar produtos entre requisitos
- [ ] Teste: criar campanha com múltiplas cartelas

---

## 🚀 PRÓXIMOS PASSOS

1. Executar backend e ver logs do erro 400
2. Implementar correções na ordem de prioridade
3. Testar cada correção individualmente
4. Teste de integração completo
