import { IsEnum, IsOptional, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { StatusPagamento } from '@prisma/client';

/**
 * ============================================================================
 * DTO: LISTAR LOTES DE PAGAMENTO COM PAGINAÇÃO E FILTROS
 * ============================================================================
 *
 * M6: DTO para consulta paginada de lotes de pagamento com filtros opcionais.
 * Permite filtrar por status, período e paginar os resultados.
 *
 * Uso:
 * - Endpoint: GET /api/financeiro/lotes
 * - Papel: ADMIN
 * - Query: ?pagina=1&porPagina=10&status=PENDENTE&dataInicio=2025-01-01
 *
 * @module FinanceiroModule
 * ============================================================================
 */
export class ListarLotesDto {
  /**
   * Página atual (mínimo: 1).
   * Regra de negócio: default = 1 (aplicado no service).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'A página deve ser um número inteiro maior ou igual a 1.' })
  pagina?: number;

  /**
   * Quantidade de registros por página (mínimo: 1).
   * Regra de negócio: default = 20 (aplicado no service).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'A quantidade por página deve ser um número inteiro maior ou igual a 1.' })
  porPagina?: number;

  /**
   * Filtro por status do lote (PENDENTE ou PAGO).
   *
   * @type {StatusPagamento}
   * @optional
   * @example 'PENDENTE'
   * @example 'PAGO'
   */
  @IsOptional()
  @IsEnum(StatusPagamento)
  status?: StatusPagamento;

  /**
   * Data de início do período de consulta (formato ISO 8601).
   * Filtra lotes criados a partir desta data.
   *
   * @type {string}
   * @optional
   * @example '2025-01-01'
   */
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  /**
   * Data de fim do período de consulta (formato ISO 8601).
   * Filtra lotes criados até esta data.
   *
   * @type {string}
   * @optional
   * @example '2025-12-31'
   */
  @IsOptional()
  @IsDateString()
  dataFim?: string;
}
