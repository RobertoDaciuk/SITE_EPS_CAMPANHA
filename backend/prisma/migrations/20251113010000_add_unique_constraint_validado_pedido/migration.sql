-- ============================================================================
-- MIGRATION: Adicionar Constraint para Prevenir Race Condition em Conflitos
-- ============================================================================
--
-- PROBLEMA:
-- Dois processos concorrentes podem validar o mesmo pedido para vendedores
-- diferentes, causando conflito de validação não detectado.
--
-- SOLUÇÃO:
-- Criar índice único parcial que garante apenas 1 envio VALIDADO por
-- numeroPedido+campanhaId.
--
-- ÍNDICE PARCIAL:
-- - Aplica-se apenas quando status = 'VALIDADO'
-- - Permite múltiplos REJEITADO, EM_ANALISE, CONFLITO_MANUAL
-- - Bloqueia duplicação de VALIDADO mesmo em condições de race
--
-- BENEFÍCIOS:
-- 1. Proteção em nível de banco de dados (não depende do código)
-- 2. Performance otimizada (índice apenas em VALIDADO)
-- 3. Atomicidade garantida pelo PostgreSQL
--
-- ============================================================================

-- Criar índice único parcial para evitar pedidos duplicados validados
-- Este índice só se aplica a registros com status='VALIDADO'
-- Permite múltiplos registros com outros status para o mesmo pedido
CREATE UNIQUE INDEX "unique_validado_pedido_campanha"
ON "EnvioVenda" ("numeroPedido", "campanhaId")
WHERE status = 'VALIDADO';

-- NOTA: Se houver tentativa de inserir/atualizar um segundo envio VALIDADO
-- para o mesmo numeroPedido+campanhaId, o PostgreSQL lançará erro:
-- ERROR: duplicate key value violates unique constraint "unique_validado_pedido_campanha"
