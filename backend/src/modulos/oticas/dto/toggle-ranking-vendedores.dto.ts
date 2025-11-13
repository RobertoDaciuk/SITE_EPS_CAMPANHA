/**
 * ============================================================================
 * DTO: Toggle Ranking Vendedores
 * ============================================================================
 *
 * Propósito:
 * DTO para gerente habilitar/desabilitar visibilidade do ranking para vendedores.
 *
 * @module OticaModule
 * ============================================================================
 */
import { IsBoolean } from 'class-validator';

export class ToggleRankingVendedoresDto {
  /**
   * Define se o ranking deve ser visível para vendedores.
   */
  @IsBoolean()
  rankingVisivelParaVendedores: boolean;
}
