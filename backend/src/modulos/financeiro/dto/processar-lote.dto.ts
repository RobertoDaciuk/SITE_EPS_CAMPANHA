/**
 * ============================================================================
 * DTO: PROCESSAR LOTE (Command - Executa pagamentos atomicamente)
 * ============================================================================
 * Usado para processar um lote de pagamento, subtraindo saldos e marcando
 * como pago em uma transação atômica.
 */

import { IsOptional, IsString } from 'class-validator';

export class ProcessarLoteDto {
  /**
   * Observações adicionais sobre o processamento
   * Ex: "Pagamento via PIX realizado em 07/11/2025"
   */
  @IsOptional()
  @IsString()
  observacoes?: string;
}
