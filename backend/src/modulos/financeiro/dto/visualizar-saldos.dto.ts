/**
 * ============================================================================
 * DTO: VISUALIZAR SALDOS (Query - Não modifica dados)
 * ============================================================================
 * Usado para filtrar a visualização de saldos de vendedores/gerentes
 * sem modificar nenhum dado no banco.
 */

import { IsOptional, IsDateString, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PapelUsuario } from '@prisma/client';

export class VisualizarSaldosDto {
  /**
   * Data limite até quando considerar cartelas completadas
   * Se não fornecido, usa a data atual
   */
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  /**
   * Filtrar por papel do usuário (VENDEDOR ou GERENTE)
   * Se não fornecido, retorna ambos
   */
  @IsOptional()
  @IsEnum(PapelUsuario)
  papel?: PapelUsuario;

  /**
   * Filtrar por ID de ótica específica
   * Se não fornecido, retorna todas as óticas
   */
  @IsOptional()
  @IsString()
  opticaId?: string;
}
