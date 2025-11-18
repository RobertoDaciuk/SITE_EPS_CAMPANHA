/**
 * ============================================================================
 * DTO: Criar Requisito de Cartela (CORRIGIDO - Segurança/Sanitização)
 * ============================================================================
 * * Descrição:
 * Data Transfer Object para validação de um requisito (card) de cartela.
 * * CORREÇÃO (Princípio 5.4 - Segurança/Sanitização):
 * - Adicionado `@Transform` na `descricao` para trim e remoção de tags HTML/Script
 * (prevenção de XSS persistente).
 * * @module CampanhasModule
 * ============================================================================
 */

import {
  IsString,
  IsInt,
  IsEnum,
  ValidateNested,
  IsArray,
  Min,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { Type, Transform } from 'class-transformer'; // Importado Transform
import { TipoUnidade } from '@prisma/client';
import { CriarCondicaoRequisitoDto } from './criar-condicao-requisito.dto';
import { ProdutoRequisitoDto } from './produto-requisito.dto';

/**
 * DTO para criação de um requisito de cartela.
 */
export class CriarRequisitoCartelaDto {
  /**
   * Título/descrição do card mostrado ao vendedor.
   *
   * CORREÇÃO DE SEGURANÇA:
   * - Trim e Sanitização básica para prevenir XSS persistente.
   *
   * @example "Lentes BlueProtect Max"
   */
  @Transform(({ value }) => {
    if (typeof value === 'string') {
        // Remove tags HTML/Script e espaços em branco
        return value.trim().replace(/<[^>]*>/g, '').replace(/&/g, '&amp;');
    }
    return value;
  })
  @IsString({ message: 'A descrição deve ser uma string' })
  @IsNotEmpty({ message: 'A descrição não pode estar vazia' })
  descricao: string;

  /**
   * Quantidade necessária para completar este requisito.
   *
   * @example 5
   */
  @IsInt({ message: 'A quantidade deve ser um número inteiro' })
  @Min(1, { message: 'A quantidade deve ser no mínimo 1' })
  quantidade: number;

  /**
   * Tipo de unidade para contabilização.
   *
   * @example "PAR"
   */
  @IsEnum(TipoUnidade, {
    message: 'O tipo de unidade deve ser PAR ou UNIDADE',
  })
  tipoUnidade: TipoUnidade;

  /**
   * Ordem do requisito dentro da cartela (1, 2, 3...).
   *
   * CRÍTICO PARA SPILLOVER:
   * - O service fará uma validação manual para garantir que este campo seja
   * ÚNICO dentro da mesma cartela (Princípio 1 - Lógica de Negócio).
   *
   * @example 1
   */
  @IsInt({ message: 'A ordem deve ser um número inteiro' })
  @Min(1, { message: 'A ordem deve ser no mínimo 1' })
  ordem: number;

  /**
   * Lista de condições de validação (Rule Builder).
   *
   * DEPRECADO (Sprint 21): Condições estão sendo removidas.
   * A validação agora é 100% baseada em produtos.
   * Mantido como opcional para compatibilidade durante transição.
   */
  @IsArray({ message: 'As condições devem ser um array' })
  @ValidateNested({ each: true })
  @Type(() => CriarCondicaoRequisitoDto)
  @IsOptional()
  condicoes?: CriarCondicaoRequisitoDto[];

  // ========================================================================
  // NOVOS CAMPOS (Sprint 21 - Produtos por Requisito)
  // ========================================================================

  /**
   * Lista de produtos específicos vinculados a este requisito.
   * Cada produto tem um código de referência e valor em R$.
   *
   * Obrigatório SOMENTE se importSessionId não for fornecido.
   */
  @IsArray({ message: 'Produtos deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => ProdutoRequisitoDto)
  @IsOptional()
  produtos?: ProdutoRequisitoDto[];

  /**
   * ID da sessão de importação de produtos no staging.
   * Se fornecido, os produtos serão importados diretamente da tabela de staging
   * ao invés de usar o campo produtos.
   */
  @IsString({ message: 'O ID da sessão deve ser uma string' })
  @IsOptional()
  importSessionId?: string;
}