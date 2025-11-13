import { IsDateString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para calcular pagamentos até uma data específica.
 *
 * VERSÃO 7.0 - Sistema de Saldo e Pagamentos
 */
export class CalcularPagamentosDto {
  /**
   * Data de corte para calcular pagamentos (ISO 8601 format).
   * Exemplo: "2025-01-31T23:59:59.999Z"
   *
   * Apenas cartelas completadas ATÉ esta data serão consideradas.
   */
  @IsNotEmpty({ message: 'Data de corte é obrigatória' })
  @IsDateString({}, { message: 'Data de corte inválida. Use formato ISO 8601.' })
  @Transform(({ value }) => value?.trim())
  dataCorte: string;
}
