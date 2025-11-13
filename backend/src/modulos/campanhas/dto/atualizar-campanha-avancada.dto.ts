/**
 * ============================================================================
 * DTO: Atualizar Campanha Avançada (Sprint 19.5)
 * ============================================================================
 *
 * Descrição:
 * Data Transfer Object para edição avançada de campanhas.
 * 
 * Permite ao Admin editar aspectos completos da campanha, EXCETO cartelas existentes.
 * 
 * Recursos de Edição Avançada:
 * ✅ Campos básicos (título, descrição, datas, valores, regras, imagens)
 * ✅ Adicionar novos produtos
 * ✅ Remover produtos (validação: apenas se sem pedidos validados)
 * ✅ Adicionar novas óticas alvo
 * ✅ Remover óticas (validação: apenas se sem envios ativos)
 * ✅ Adicionar novos eventos especiais
 * ✅ Editar eventos especiais existentes
 * ✅ Remover eventos especiais
 * ✅ Adicionar novas cartelas (opcional)
 * ❌ Editar cartelas existentes (BLOQUEADO - integridade de validações)
 *
 * @module CampanhasModule
 * ============================================================================
 */

import {
  IsString,
  IsDateString,
  IsNumber,
  ValidateNested,
  IsArray,
  Min,
  Max,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPedido } from '@prisma/client';
import { CriarEventoEspecialDto } from './criar-evento-especial.dto';
import { ProdutoCampanhaDto } from './produto-campanha.dto';
import { CriarRegraCartelaDto } from './criar-regra-cartela.dto';

/**
 * DTO para edição avançada de uma campanha.
 * 
 * Todos os campos são opcionais (envie apenas o que deseja alterar).
 * O backend valida integridade de dados antes de aplicar as mudanças.
 */
export class AtualizarCampanhaAvancadaDto {
  // ========================================================================
  // CAMPOS BÁSICOS
  // ========================================================================

  /**
   * Título da campanha.
   */
  @IsString({ message: 'O título deve ser uma string' })
  @IsOptional()
  titulo?: string;

  /**
   * Descrição detalhada da campanha.
   */
  @IsString({ message: 'A descrição deve ser uma string' })
  @IsOptional()
  descricao?: string;

  /**
   * Data de início da campanha (formato ISO 8601).
   */
  @IsDateString({}, { message: 'A data de início deve estar no formato válido (YYYY-MM-DD)' })
  @IsOptional()
  dataInicio?: string;

  /**
   * Data de término da campanha (formato ISO 8601).
   */
  @IsDateString({}, { message: 'A data de término deve estar no formato válido (YYYY-MM-DD)' })
  @IsOptional()
  dataFim?: string;

  /**
   * Valor máximo de pontos (R$) por cartela.
   */
  @IsNumber({}, { message: 'Os pontos reais máximos devem ser um número' })
  @Min(0, { message: 'Os pontos reais máximos não podem ser negativos' })
  @IsOptional()
  pontosReaisMaximo?: number;

  /**
   * Percentual de comissão do gerente (0.0 a 1.0).
   */
  @IsNumber({}, { message: 'O percentual do gerente deve ser um número' })
  @Min(0, { message: 'O percentual do gerente não pode ser negativo' })
  @Max(1, { message: 'O percentual do gerente não pode ser maior que 1 (100%)' })
  @IsOptional()
  percentualGerente?: number;

  /**
   * Tipo de coluna para busca do número de pedido.
   */
  @IsEnum(TipoPedido, {
    message: 'O tipo de pedido deve ser OS_OP_EPS, OPTICLICK, EPSWEB ou ENVELOPE_OTICA',
  })
  @IsOptional()
  tipoPedido?: TipoPedido;

  /**
   * Regras da campanha em formato Markdown.
   */
  @IsString({ message: 'As regras devem ser uma string' })
  @IsOptional()
  regras?: string;

  /**
   * URL da planilha de produtos.
   */
  @IsString({ message: 'A URL da planilha deve ser uma string' })
  @IsOptional()
  planilhaProdutosUrl?: string;

  /**
   * URL da imagem 16:9.
   */
  @IsString({ message: 'A URL da imagem 16:9 deve ser uma string' })
  @IsOptional()
  imagemCampanha16x9Url?: string;

  /**
   * URL da imagem 1:1.
   */
  @IsString({ message: 'A URL da imagem 1:1 deve ser uma string' })
  @IsOptional()
  imagemCampanha1x1Url?: string;

  /**
   * Indica se a campanha é para todas as óticas.
   */
  @IsBoolean({ message: 'O campo paraTodasOticas deve ser booleano' })
  @IsOptional()
  paraTodasOticas?: boolean;

  // ========================================================================
  // PRODUTOS DA CAMPANHA
  // ========================================================================

  /**
   * IDs de produtos a serem adicionados.
   * O backend criará novos registros em ProdutoCampanha.
   */
  @IsArray({ message: 'produtosAdicionar deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => ProdutoCampanhaDto)
  @IsOptional()
  produtosAdicionar?: ProdutoCampanhaDto[];

  /**
   * Códigos de referência de produtos a serem removidos.
   * Validação: backend verifica se não existem pedidos validados com estes códigos.
   */
  @IsArray({ message: 'produtosRemover deve ser um array de strings' })
  @IsString({ each: true, message: 'Cada código de produto deve ser uma string' })
  @IsOptional()
  produtosRemover?: string[];

  // ========================================================================
  // ÓTICAS ALVO
  // ========================================================================

  /**
   * IDs de óticas a serem adicionadas como alvo.
   */
  @IsArray({ message: 'oticasAdicionar deve ser um array' })
  @IsUUID('4', { each: true, message: 'Cada ID de ótica deve ser um UUID válido' })
  @IsOptional()
  oticasAdicionar?: string[];

  /**
   * IDs de óticas a serem removidas do alvo.
   * Validação: backend verifica se não existem envios ativos destas óticas.
   */
  @IsArray({ message: 'oticasRemover deve ser um array' })
  @IsUUID('4', { each: true, message: 'Cada ID de ótica deve ser um UUID válido' })
  @IsOptional()
  oticasRemover?: string[];

  // ========================================================================
  // EVENTOS ESPECIAIS
  // ========================================================================

  /**
   * Novos eventos especiais a serem criados.
   */
  @IsArray({ message: 'eventosAdicionar deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => CriarEventoEspecialDto)
  @IsOptional()
  eventosAdicionar?: CriarEventoEspecialDto[];

  /**
   * IDs de eventos especiais a serem removidos.
   */
  @IsArray({ message: 'eventosRemover deve ser um array' })
  @IsUUID('4', { each: true, message: 'Cada ID de evento deve ser um UUID válido' })
  @IsOptional()
  eventosRemover?: string[];

  /**
   * Eventos existentes a serem atualizados.
   * Estrutura: { id: string, ...campos para atualizar }
   */
  @IsArray({ message: 'eventosAtualizar deve ser um array' })
  @IsOptional()
  eventosAtualizar?: Array<{
    id: string;
    nome?: string;
    descricao?: string;
    multiplicador?: number;
    dataInicio?: string;
    dataFim?: string;
    ativo?: boolean;
    corDestaque?: string;
  }>;

  // ========================================================================
  // CARTELAS (APENAS ADICIONAR NOVAS)
  // ========================================================================

  /**
   * Novas cartelas a serem adicionadas.
   * IMPORTANTE: Cartelas existentes NÃO podem ser editadas (integridade de validações).
   */
  @IsArray({ message: 'cartelasAdicionar deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => CriarRegraCartelaDto)
  @IsOptional()
  cartelasAdicionar?: CriarRegraCartelaDto[];
}
