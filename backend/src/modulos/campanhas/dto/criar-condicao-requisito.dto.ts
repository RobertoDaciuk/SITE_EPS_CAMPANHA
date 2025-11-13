/**
 * ============================================================================
 * DTO: Criar Condição de Requisito (CORRIGIDO - Segurança/Sanitização)
 * ============================================================================
 * * Propósito: Define as regras de validação para uma condição individual do Rule Builder.
 * * CORREÇÃO (Princípio 5.4): Adicionado `@Trim()` para limpar espaços em branco.
 * * @module CampanhasModule
 * ============================================================================
 */

import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer'; // Importado para sanitização
import { CampoVerificacao, OperadorCondicao } from '@prisma/client';

/**
 * DTO para criação de uma condição de requisito.
 */
export class CriarCondicaoRequisitoDto {
  /**
   * Campo do pedido que será verificado.
   */
  @IsEnum(CampoVerificacao, {
    message: 'O campo deve ser um dos valores válidos: NOME_PRODUTO, CODIGO_PRODUTO, VALOR_VENDA, CODIGO_DA_REFERENCIA',
  })
  campo: CampoVerificacao;

  /**
   * Operador lógico da comparação.
   */
  @IsEnum(OperadorCondicao, {
    message: 'O operador deve ser um dos valores válidos: CONTEM, NAO_CONTEM, IGUAL_A, NAO_IGUAL_A, MAIOR_QUE, MENOR_QUE',
  })
  operador: OperadorCondicao;

  /**
   * Valor de referência para a comparação.
   *
   * CORREÇÃO DE SEGURANÇA:
   * - Trim: Remove espaços em branco nas extremidades.
   * - Sanitização Básica: Remove tags HTML/Script (XSS Persistente).
   */
  @Transform(({ value }) => {
    if (typeof value === 'string') {
        // Remove espaços em branco
        const trimmed = value.trim();
        // Sanitização básica (remove <, > e & para prevenir injeção)
        return trimmed.replace(/<|>/g, '').replace(/&/g, '&amp;');
    }
    return value;
  })
  @IsString({ message: 'O valor deve ser uma string' })
  @IsNotEmpty({ message: 'O valor não pode estar vazio' })
  valor: string;
}