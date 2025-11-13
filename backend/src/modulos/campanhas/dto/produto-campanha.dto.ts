/**
 * ============================================================================
 * DTO: Produto da Campanha
 * ============================================================================
 * 
 * Descrição:
 * Data Transfer Object para representar um produto que participa da campanha.
 * Extraído da planilha de produtos enviada pelo admin.
 * 
 * @module CampanhasModule
 * ============================================================================
 */

import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';

/**
 * DTO para um produto individual da campanha.
 * 
 * Usado ao criar campanha com planilha de produtos.
 */
export class ProdutoCampanhaDto {
  /**
   * Código de referência do produto.
   * 
   * @example "LENTE-PREMIUM-001"
   */
  @IsString({ message: 'O código de referência deve ser uma string' })
  @IsNotEmpty({ message: 'O código de referência não pode estar vazio' })
  codigoRef: string;

  /**
   * Valor em Pontos Reais (R$) que este produto paga.
   * 
   * @example 150.50
   */
  @IsNumber({}, { message: 'Os pontos reais devem ser um número' })
  @Min(0, { message: 'Os pontos reais não podem ser negativos' })
  pontosReais: number;
}
