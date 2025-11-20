import { IsOptional, IsDateString, IsString } from 'class-validator';

/**
 * ============================================================================
 * DTO: RELATÓRIOS FINANCEIROS - FILTROS DE PERÍODO
 * ============================================================================
 *
 * DTO para filtros de período em relatórios financeiros gerenciais.
 * Permite filtrar métricas, rankings e performance por data e campanha.
 *
 * Uso:
 * - Endpoints: GET /api/financeiro/relatorios/*
 * - Papel: ADMIN
 * - Query: ?dataInicio=2025-01-01&dataFim=2025-11-19&campanhaId=uuid
 *
 * @module FinanceiroModule
 * ============================================================================
 */
export class RelatoriosMetricasDto {
    /**
     * Data de início do período de consulta (formato ISO 8601)
     * Se omitido, considera desde o primeiro registro
     */
    @IsOptional()
    @IsDateString()
    dataInicio?: string;

    /**
     * Data de fim do período de consulta (formato ISO 8601)
     * Se omitido, considera até a data atual
     */
    @IsOptional()
    @IsDateString()
    dataFim?: string;

    /**
     * Filtro opcional por campanha específica
     * Se omitido, considera todas as campanhas
     */
    @IsOptional()
    @IsString()
    campanhaId?: string;
}
