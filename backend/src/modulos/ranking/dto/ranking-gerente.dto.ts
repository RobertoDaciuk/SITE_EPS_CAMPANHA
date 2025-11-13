/**
 * ============================================================================
 * DTO: Ranking Gerente - Filtros e Paginação
 * ============================================================================
 *
 * Propósito:
 * DTO para consulta de ranking pelo perfil GERENTE com filtros condicionais.
 *
 * Funcionalidades:
 * - Gerente de Matriz: pode filtrar por filial específica
 * - Gerente de Filial: sempre vê apenas sua filial (filtro ignorado)
 * - Paginação padrão
 * - Ordenação por valor total de vendas aprovadas
 *
 * @module RankingModule
 * ============================================================================
 */
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RankingGerenteDto {
  /**
   * ID da filial para filtrar o ranking.
   * Apenas válido para gerentes de matriz.
   * Gerentes de filial têm esse filtro ignorado.
   */
  @IsOptional()
  @IsString()
  filialId?: string;

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
