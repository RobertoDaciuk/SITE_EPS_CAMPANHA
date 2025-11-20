-- ============================================================================
-- DIAGNÓSTICO: COMISSÃO DO GERENTE NÃO APARECE NO DASHBOARD
-- ============================================================================
-- Este script identifica gerentes com saldoPontos > 0 mas sem RelatorioFinanceiro

-- 1. GERENTES COM SALDO MAS SEM RELATÓRIO FINANCEIRO PENDENTE
SELECT 
    u.id,
    u.nome,
    u.email,
    u.papel,
    u."saldoPontos" as saldo_atual,
    u."saldoReservado" as saldo_reservado,
    (SELECT COUNT(*) FROM "RelatorioFinanceiro" rf 
     WHERE rf."usuarioId" = u.id 
     AND rf.tipo = 'GERENTE' 
     AND rf.status = 'PENDENTE'
     AND rf."deletedAt" IS NULL) as relatorios_pendentes,
    (SELECT SUM(rf.valor) FROM "RelatorioFinanceiro" rf 
     WHERE rf."usuarioId" = u.id 
     AND rf.tipo = 'GERENTE' 
     AND rf.status = 'PENDENTE'
     AND rf."deletedAt" IS NULL) as valor_total_pendente
FROM "Usuario" u
WHERE u.papel = 'GERENTE'
AND u."saldoPontos" > 0
ORDER BY u."saldoPontos" DESC;

-- 2. TOTAL DE COMISSÃO "INVISÍVEL" (saldo sem relatório)
SELECT 
    COUNT(*) as total_gerentes_afetados,
    SUM(u."saldoPontos") as total_saldo_invisivel,
    SUM(COALESCE(rf_sum.valor_pendente, 0)) as total_em_relatorios,
    SUM(u."saldoPontos") - SUM(COALESCE(rf_sum.valor_pendente, 0)) as diferenca_invisivel
FROM "Usuario" u
LEFT JOIN (
    SELECT 
        "usuarioId",
        SUM(valor) as valor_pendente
    FROM "RelatorioFinanceiro"
    WHERE tipo = 'GERENTE'
    AND status = 'PENDENTE'
    AND "deletedAt" IS NULL
    GROUP BY "usuarioId"
) rf_sum ON rf_sum."usuarioId" = u.id
WHERE u.papel = 'GERENTE'
AND u."saldoPontos" > 0;

-- 3. HISTÓRICO DE INCREMENTOS DE SALDO (últimas cartelas concluídas)
SELECT 
    cc."vendedorId",
    v.nome as vendedor_nome,
    v."gerenteId",
    g.nome as gerente_nome,
    cc."numeroCartela",
    cc."criadoEm" as data_conclusao,
    cc."valorPago" as valor_pago_vendedor,
    c."percentualGerente",
    (cc."valorPago" * c."percentualGerente") as comissao_gerente_calculada
FROM "CartelaConcluida" cc
JOIN "Usuario" v ON v.id = cc."vendedorId"
LEFT JOIN "Usuario" g ON g.id = v."gerenteId"
JOIN "Campanha" c ON c.id = cc."campanhaId"
WHERE v."gerenteId" IS NOT NULL
AND c."percentualGerente" > 0
ORDER BY cc."criadoEm" DESC
LIMIT 20;

-- 4. VERIFICAR SE EXISTE DISCREPÂNCIA (PROBLEMA CONFIRMADO)
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '🔥 PROBLEMA CONFIRMADO: Existem gerentes com saldo > 0 mas sem RelatorioFinanceiro'
        ELSE '✅ Tudo OK: Todos os saldos possuem relatórios correspondentes'
    END as diagnostico,
    COUNT(*) as gerentes_afetados
FROM "Usuario" u
LEFT JOIN (
    SELECT "usuarioId", SUM(valor) as total
    FROM "RelatorioFinanceiro"
    WHERE tipo = 'GERENTE' AND status = 'PENDENTE' AND "deletedAt" IS NULL
    GROUP BY "usuarioId"
) rf ON rf."usuarioId" = u.id
WHERE u.papel = 'GERENTE'
AND u."saldoPontos" > 0
AND (rf.total IS NULL OR rf.total < u."saldoPontos");
