import { IsEnum, IsOptional, IsInt, Min, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { AcaoFinanceira } from '@prisma/client';

/**
 * ============================================================================
 * DTO: LISTAR AUDITORIA FINANCEIRA COM PAGINAÇÃO E FILTROS
 * ============================================================================
 *
 * DTO para consulta paginada de auditorias financeiras com filtros opcionais.
 * Permite filtrar por ação, admin, lote, período e paginar os resultados.
 *
 * Uso:
 * - Endpoint: GET /api/financeiro/auditoria
 * - Papel: ADMIN
 * - Query: ?pagina=1&porPagina=20&acao=GERAR_LOTE&dataInicio=2025-01-01
 *
 * @module FinanceiroModule
 * ============================================================================
 */
export class ListarAuditoriaDto {
    /**
     * Número da página para paginação (começa em 1)
     */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    pagina?: number = 1;

    /**
     * Quantidade de registros por página
     */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    porPagina?: number = 20;

    /**
     * Filtro por tipo de ação executada
     */
    @IsOptional()
    @IsEnum(AcaoFinanceira)
    acao?: AcaoFinanceira;

    /**
     * Filtro por ID do admin que executou a ação
     */
    @IsOptional()
    @IsString()
    adminId?: string;

    /**
     * Filtro por número do lote relacionado
     */
    @IsOptional()
    @IsString()
    numeroLote?: string;

    /**
     * Data de início do período de consulta (formato ISO 8601)
     */
    @IsOptional()
    @IsDateString()
    dataInicio?: string;

    /**
     * Data de fim do período de consulta (formato ISO 8601)
     */
    @IsOptional()
    @IsDateString()
    dataFim?: string;
}
