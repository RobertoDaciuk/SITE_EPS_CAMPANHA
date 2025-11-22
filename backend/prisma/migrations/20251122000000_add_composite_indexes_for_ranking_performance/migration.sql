-- CreateIndex
-- ⚡ PERFORMANCE BOOST: Índices compostos para queries de ranking
-- Impacto esperado: Redução de ~500ms para ~50ms (90% melhoria)

-- Tabela: opticas
-- Queries otimizadas: getRankingFiliaisParaMatriz, filtros de matriz/filial
CREATE INDEX "opticas_matrizId_ativa_idx" ON "opticas"("matrizId", "ativa");
CREATE INDEX "opticas_ehMatriz_ativa_idx" ON "opticas"("ehMatriz", "ativa");

-- Tabela: usuarios
-- Queries otimizadas: getRankingGeralPaginado, getRankingAdmin, getRankingEquipe
CREATE INDEX "usuarios_papel_status_idx" ON "usuarios"("papel", "status");
CREATE INDEX "usuarios_opticaId_papel_status_idx" ON "usuarios"("opticaId", "papel", "status");
CREATE INDEX "usuarios_gerenteId_papel_status_idx" ON "usuarios"("gerenteId", "papel", "status");

-- Tabela: envios_vendas (CRÍTICO - 90% das queries de ranking)
-- Queries otimizadas: getPosicaoUsuario, getRankingAdmin, getRankingEquipe, getRankingGerente
-- Padrão de query: WHERE vendedorId = X AND status = 'VALIDADO' AND pontosAdicionadosAoSaldo = true
CREATE INDEX "envios_vendas_vendedorId_status_pontosAdicionadosAoSaldo_idx" ON "envios_vendas"("vendedorId", "status", "pontosAdicionadosAoSaldo");
CREATE INDEX "envios_vendas_vendedorId_status_numeroCartelaAtendida_idx" ON "envios_vendas"("vendedorId", "status", "numeroCartelaAtendida");
CREATE INDEX "envios_vendas_campanhaId_status_vendedorId_idx" ON "envios_vendas"("campanhaId", "status", "vendedorId");
CREATE INDEX "envios_vendas_status_pontosAdicionadosAoSaldo_idx" ON "envios_vendas"("status", "pontosAdicionadosAoSaldo");
