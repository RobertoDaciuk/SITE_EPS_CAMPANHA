/**
 * ============================================================================
 * DTO: Criar Evento Especial
 * ============================================================================
 * 
 * Descrição:
 * Data Transfer Object para criação de um evento especial com multiplicador
 * de pontos (ex: Semana 2x, Black Friday 3x).
 * 
 * Eventos especiais multiplicam os prêmios (moedinhas e pontos reais) durante
 * um período específico da campanha.
 * 
 * @module CampanhasModule
 * ============================================================================
 */

import {
  IsString,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO para criação de um evento especial em uma campanha.
 * 
 * @example
 * ```
 * {
 *   nome: "Super Semana 2x",
 *   descricao: "Semana especial com prêmios dobrados!",
 *   multiplicador: 2.0,
 *   dataInicio: "2025-01-15",
 *   dataFim: "2025-01-21",
 *   ativo: true,
 *   corDestaque: "#FF5733"
 * }
 * ```
 */
export class CriarEventoEspecialDto {
  /**
   * Nome do evento especial.
   * 
   * @example "Super Semana 2x"
   * @example "Black Friday 3x"
   */
  @IsString({ message: 'O nome do evento deve ser uma string' })
  @IsNotEmpty({ message: 'O nome do evento não pode estar vazio' })
  nome: string;

  /**
   * Descrição do evento (motivação, detalhes).
   * 
   * @example "Semana especial com prêmios dobrados!"
   */
  @IsString({ message: 'A descrição do evento deve ser uma string' })
  @IsOptional()
  descricao?: string;

  /**
   * Multiplicador de pontos (1.0 a 10.0).
   * 
   * Durante o evento, todos os prêmios são multiplicados por este valor.
   * 
   * @example 2.0 (prêmios dobrados)
   * @example 3.0 (prêmios triplicados)
   */
  @IsNumber({}, { message: 'O multiplicador deve ser um número' })
  @Min(1.0, { message: 'O multiplicador deve ser no mínimo 1.0' })
  @Max(10.0, { message: 'O multiplicador não pode ser maior que 10.0' })
  multiplicador: number;

  /**
   * Data de início do evento (formato ISO 8601).
   * 
   * @example "2025-01-15"
   */
  @IsDateString({}, { message: 'A data de início deve estar no formato válido (YYYY-MM-DD)' })
  dataInicio: string;

  /**
   * Data de término do evento (formato ISO 8601).
   * 
   * @example "2025-01-21"
   */
  @IsDateString({}, { message: 'A data de término deve estar no formato válido (YYYY-MM-DD)' })
  dataFim: string;

  /**
   * Se o evento está ativo (vendedores veem apenas eventos ativos).
   * 
   * @example true
   */
  @IsBoolean({ message: 'O campo ativo deve ser booleano' })
  @IsOptional()
  ativo?: boolean;

  /**
   * Cor de destaque para exibição no frontend (hex).
   * 
   * @example "#FF5733"
   * @example "#00FF00"
   */
  @IsString({ message: 'A cor de destaque deve ser uma string' })
  @IsOptional()
  corDestaque?: string;
}
