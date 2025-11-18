/**
 * DTO: Produto do Requisito
 * Sprint 21 - Refatoração: Produtos por Requisito
 */

import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ProdutoRequisitoDto {
  /**
   * Código da referência do produto.
   * @example "LENTE-001"
   */
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  })
  @IsString({ message: 'O código de referência deve ser uma string' })
  @IsNotEmpty({ message: 'O código de referência não pode estar vazio' })
  codigoRef: string;

  /**
   * Valor em Pontos Reais (R$) que este produto paga ao vendedor.
   * @example 150.00
   */
  @IsNumber({}, { message: 'Os pontos reais devem ser um número' })
  @Min(0, { message: 'Os pontos reais não podem ser negativos' })
  pontosReais: number;
}
