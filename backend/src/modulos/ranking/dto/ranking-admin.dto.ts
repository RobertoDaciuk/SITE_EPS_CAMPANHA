/**
 * ============================================================================
 * DTO: Ranking Admin - Filtros e Paginação
 * ============================================================================
 *
 * Propósito:
 * DTO para consulta de ranking pelo perfil ADMIN com filtros de ótica.
 *
 * Funcionalidades:
 * - Filtro por ótica específica (matriz ou filial)
 * - Se matriz: inclui todas as filiais no ranking
 * - Paginação padrão
 * - Ordenação por valor total de vendas aprovadas
 *
 * @module RankingModule
 * ============================================================================
 */
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RankingAdminDto {
  /**
   * ID da ótica para filtrar o ranking.
   * Se omitido, mostra ranking global de todas as óticas.
   * Se for uma matriz, inclui todas as filiais vinculadas.
   */
  @IsOptional()
  @IsString()
  oticaId?: string;

  /**
   * Número da página (começa em 1).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  /**
   * Quantidade de registros por página.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limite?: number = 50;
}
