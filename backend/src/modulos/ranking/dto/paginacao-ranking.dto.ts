import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ============================================================================
 * DTO: PaginacaoRankingDto (CORRIGIDO - Regra de Negócio)
 * ============================================================================
 * * Propósito: Define as regras de validação para paginação do ranking.
 * * CORREÇÃO: Removidos os valores padrão (`= 1`, `= 20`), que são
 * regras de negócio e devem ser definidos no RankingService.
 * * @module RankingModule
 * ============================================================================
 */
export class PaginacaoRankingDto {
  /**
   * Página atual (mínimo: 1).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'A página deve ser um número inteiro maior ou igual a 1.' })
  pagina?: number;

  /**
   * Quantidade de registros por página (mínimo: 1).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'A quantidade por página deve ser um número inteiro maior ou igual a 1.' })
  porPagina?: number;
}