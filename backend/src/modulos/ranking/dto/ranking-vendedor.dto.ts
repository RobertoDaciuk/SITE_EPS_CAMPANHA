/**
 * ============================================================================
 * DTO: Ranking Vendedor - Paginação Simples
 * ============================================================================
 *
 * Propósito:
 * DTO para consulta de ranking pelo perfil VENDEDOR.
 *
 * Funcionalidades:
 * - Sempre mostra apenas vendedores da mesma ótica
 * - Ordenação por pontos acumulados / valor total (ranking)
 * - Não exibe valores monetários
 * - Paginação padrão
 *
 * @module RankingModule
 * ============================================================================
 */
import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RankingVendedorDto {
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
