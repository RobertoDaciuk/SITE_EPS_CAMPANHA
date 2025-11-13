/**
 * ============================================================================
 * DTO: GERAR LOTE DE PAGAMENTO (Command - Cria relatórios PENDENTES)
 * ============================================================================
 * Usado para criar um lote de pagamento com múltiplos relatórios financeiros
 * em status PENDENTE, permitindo revisão antes do processamento.
 */

import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GerarLoteDto {
  /**
   * Data de corte até quando considerar cartelas completadas
   * Obrigatório para definir o período do lote
   */
  @IsDateString()
  dataCorte: string;

  /**
   * Observações opcionais sobre o lote
   * Ex: "Pagamento mensal de Outubro 2025"
   */
  @IsOptional()
  @IsString()
  observacoes?: string;
}
