/**
 * ============================================================================
 * DTO: Criar Campanha
 * ============================================================================
 * 
 * Descrição:
 * Data Transfer Object mestre para criação de uma campanha completa.
 * Este é o DTO de mais alto nível que encapsula toda a hierarquia aninhada.
 * 
 * Recebe do Admin todos os dados necessários para criar:
 * - A campanha base (título, datas, pontuação)
 * - As cartelas (Cartela 1, 2, 3, etc.)
 * - Os requisitos de cada cartela (cards)
 * - As condições de validação de cada requisito (Rule Builder)
 * 
 * Hierarquia de Aninhamento:
 * CriarCampanhaDto ← (Este arquivo)
 *   └─ CriarRegraCartelaDto[]
 *       └─ CriarRequisitoCartelaDto[]
 *           └─ CriarCondicaoRequisitoDto[]
 * 
 * @module CampanhasModule
 * ============================================================================
 */

import {
  IsString,
  IsDateString,
  IsNumber,
  IsInt,
  ValidateNested,
  IsArray,
  Min,
  Max,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsUUID,
  ArrayNotEmpty,
  ValidateIf,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPedido } from '@prisma/client';
import { CriarRegraCartelaDto } from './criar-regra-cartela.dto';
import { CriarEventoEspecialDto } from './criar-evento-especial.dto';
import { ProdutoCampanhaDto } from './produto-campanha.dto';

/**
 * DTO para criação de uma campanha completa.
 * 
 * Encapsula toda a estrutura hierárquica da campanha:
 * Campanha → Cartelas → Requisitos → Condições
 * 
 * @example
 * ```
 * {
 *   titulo: "Campanha Lentes Q1 2025",
 *   descricao: "Campanha focada em lentes premium...",
 *   dataInicio: "2025-01-01",
 *   dataFim: "2025-03-31",
 *   pontosReaisPorCartela: 500.00,
 *   percentualGerente: 0.10,
 *   cartelas: [
 *     {
 *       numeroCartela: 1,
 *       descricao: "Cartela Bronze",
 *       requisitos: [
 *         {
 *           descricao: "Lentes BlueProtect Max",
 *           quantidade: 5,
 *           tipoUnidade: "PAR",
 *           condicoes: [
 *             {
 *               campo: "NOME_PRODUTO",
 *               operador: "CONTEM",
 *               valor: "BlueProtect"
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export class CriarCampanhaDto {
  /**
   * Título da campanha.
   * 
   * Deve ser descritivo e único para fácil identificação.
   * 
   * @example "Campanha Lentes Q1 2025"
   */
  @IsString({ message: 'O título deve ser uma string' })
  @IsNotEmpty({ message: 'O título não pode estar vazio' })
  titulo: string;

  /**
   * Descrição detalhada da campanha.
   * 
   * Explica objetivos, regras e benefícios da campanha.
   * 
   * @example "Campanha focada em lentes premium com bonificação especial..."
   */
  @IsString({ message: 'A descrição deve ser uma string' })
  @IsNotEmpty({ message: 'A descrição não pode estar vazia' })
  descricao: string;

  /**
   * Data de início da campanha (formato ISO 8601).
   * 
   * Vendas só são válidas a partir desta data.
   * 
   * @example "2025-01-01"
   */
  @IsDateString({}, { message: 'A data de início deve estar no formato válido (YYYY-MM-DD)' })
  dataInicio: string;

  /**
   * Data de término da campanha (formato ISO 8601).
   * 
   * Vendas só são válidas até esta data.
   * 
   * @example "2025-03-31"
   */
  @IsDateString({}, { message: 'A data de término deve estar no formato válido (YYYY-MM-DD)' })
  dataFim: string;

  /**
   * VALOR MÁXIMO de Pontos (R$) que o vendedor pode receber por cartela completada.
   * O valor REAL pago depende do código de referência da venda validada.
   * Exibido como "Ganhe até X pontos" no frontend.
   *
   * @example 500.00
   */
  @IsNumber({}, { message: 'Os pontos reais máximos devem ser um número' })
  @Min(0, { message: 'Os pontos reais máximos não podem ser negativos' })
  pontosReaisMaximo: number;

  /**
   * Percentual de comissão que o gerente recebe.
   * 
   * Valor entre 0.0 e 1.0 (ex: 0.10 = 10%).
   * Gerente recebe este percentual do valorPorCartela de seus vendedores.
   * 
   * @example 0.10 (10%)
   */
  @IsNumber({}, { message: 'O percentual do gerente deve ser um número' })
  @Min(0, { message: 'O percentual do gerente não pode ser negativo' })
  @Max(1, { message: 'O percentual do gerente não pode ser maior que 1 (100%)' })
  percentualGerente: number;

  /**
   * Lista de cartelas (regras) desta campanha.
   *
   * Cada cartela representa um nível de objetivos que o vendedor deve cumprir.
   *
   * Mínimo: 1 cartela (campanha precisa ter pelo menos uma cartela)
   * Ordem: Cartelas devem ser numeradas sequencialmente (1, 2, 3, etc.)
   *
   * @example
   * ```
   * [
   *   {
   *     numeroCartela: 1,
   *     descricao: "Cartela Bronze",
   *     requisitos: [...]
   *   },
   *   {
   *     numeroCartela: 2,
   *     descricao: "Cartela Prata",
   *     requisitos: [...]
   *   }
   * ]
   * ```
   */
  @IsArray({ message: 'As cartelas devem ser um array' })
  @ValidateNested({ each: true })
  @Type(() => CriarRegraCartelaDto)
  @IsNotEmpty({ message: 'A campanha deve ter pelo menos uma cartela' })
  cartelas: CriarRegraCartelaDto[];

  // ========================================================================
  // NOVOS CAMPOS (Sprint 17 - Tarefa 41): Targeting de Campanhas
  // ========================================================================

  /**
   * Indica se a campanha é válida para todas as óticas.
   * Se true, o campo oticasAlvoIds é ignorado.
   * Se false (ou omitido), oticasAlvoIds é obrigatório.
   * (Adicionado no Sprint 17)
   *
   * @example true (campanha para todas as óticas)
   * @example false (campanha apenas para óticas selecionadas)
   */
  @IsBoolean({ message: 'O campo paraTodasOticas deve ser booleano.' })
  @IsOptional()
  paraTodasOticas?: boolean;

  // ========================================================================
  // NOVOS CAMPOS (Sprint 18 - Valores de Referência)
  // ========================================================================

  /**
   * Tipo de coluna onde o número de pedido será buscado na validação.
   * Define qual sistema/coluna da planilha contém o número de pedido que o vendedor deve informar.
   * (Adicionado no Sprint 18)
   *
   * @example "OS_OP_EPS"
   */
  @IsEnum(TipoPedido, {
    message: 'O tipo de pedido deve ser OS_OP_EPS, OPTICLICK, EPSWEB ou ENVELOPE_OTICA',
  })
  @IsOptional()
  tipoPedido?: TipoPedido;

  /**
   * Regras da campanha em formato Markdown.
   * Exibidas na aba "Regras" quando o vendedor acessar a campanha.
   * Opcional.
   * (Adicionado no Sprint 18)
   *
   * @example "## Regras da Campanha\n\n- Válido apenas para lentes premium\n- Prazo até 31/12/2025"
   */
  @IsString({ message: 'As regras devem ser uma string' })
  @IsOptional()
  regras?: string;

  /**
   * Lista de IDs (UUIDs) das Óticas (Matrizes e/ou Filiais) que são alvo desta campanha.
   * Obrigatório se paraTodasOticas for false ou omitido.
   * Ignorado se paraTodasOticas for true.
   * (Adicionado no Sprint 17)
   *
   * @example ["uuid-matriz-1", "uuid-filial-2", "uuid-filial-3"]
   */
  @ValidateIf(o => o.paraTodasOticas === false || o.paraTodasOticas === undefined)
  @IsArray({ message: 'oticasAlvoIds deve ser um array.' })
  @ArrayNotEmpty({ message: 'Se a campanha não for para todas as óticas, ao menos uma ótica alvo deve ser especificada.' })
  @IsUUID('4', { each: true, message: 'Cada ID de ótica alvo deve ser um UUID válido.' })
  oticasAlvoIds?: string[];

  /**
   * Lista de eventos especiais (multiplicadores de pontos) desta campanha.
   * Opcional. Eventos especiais multiplicam os prêmios durante períodos específicos.
   *
   * @example
   * ```
   * [
   *   {
   *     nome: "Super Semana 2x",
   *     descricao: "Semana especial com prêmios dobrados!",
   *     multiplicador: 2.0,
   *     dataInicio: "2025-01-15",
   *     dataFim: "2025-01-21",
   *     ativo: true,
   *     corDestaque: "#FF5733"
   *   }
   * ]
   * ```
   */
  @IsArray({ message: 'eventosEspeciais deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => CriarEventoEspecialDto)
  @IsOptional()
  eventosEspeciais?: CriarEventoEspecialDto[];

  // ========================================================================
  // NOVOS CAMPOS (Sprint 18 - Produtos da Campanha)
  // ========================================================================

  /**
   * Lista de produtos que participam desta campanha.
   * Cada produto tem um código de referência e valor em R$.
   * Extraído da planilha de produtos enviada pelo admin.
   * Obrigatório SOMENTE se importSessionId não for fornecido.
   * 
   * @example
   * ```
   * [
   *   { codigoRef: "LENTE-PREMIUM-001", pontosReais: 150.00 },
   *   { codigoRef: "ARMACAO-BASICA-002", pontosReais: 80.00 }
   * ]
   * ```
   */
  @ValidateIf(o => !o.importSessionId)
  @IsArray({ message: 'produtosCampanha deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => ProdutoCampanhaDto)
  @ArrayNotEmpty({ message: 'A campanha deve ter pelo menos um produto (ou forneça importSessionId)' })
  produtosCampanha?: ProdutoCampanhaDto[];

  /**
   * ID da sessão de importação de produtos no staging (Sprint 20).
   * Se fornecido, os produtos serão importados diretamente da tabela de staging
   * ao invés de usar o campo produtosCampanha.
   * 
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @IsString({ message: 'O ID da sessão deve ser uma string' })
  @IsOptional()
  importSessionId?: string;

  /**
   * URL/caminho da planilha original de produtos (opcional, para referência).
   * 
   * @example "/uploads/campanhas/produtos_campanha_xyz.xlsx"
   */
  @IsString({ message: 'A URL da planilha deve ser uma string' })
  @IsOptional()
  planilhaProdutosUrl?: string;

  /**
   * URL da imagem da campanha em formato 16:9 (para cartelas e lista).
   * 
   * @example "/uploads/campanhas/imagem_16x9_xyz.jpg"
   */
  @IsString({ message: 'A URL da imagem 16:9 deve ser uma string' })
  @IsOptional()
  imagemCampanha16x9Url?: string;

  /**
   * URL da imagem da campanha em formato 1:1 (para aba de regras).
   * 
   * @example "/uploads/campanhas/imagem_1x1_xyz.jpg"
   */
  @IsString({ message: 'A URL da imagem 1:1 deve ser uma string' })
  @IsOptional()
  imagemCampanha1x1Url?: string;

  /**
   * Tags/etiquetas da campanha para categorização e busca.
   * Array de strings opcionais que ajudam a organizar e filtrar campanhas.
   * 
   * @example ["Lentes", "Promoção", "Q1 2025"]
   */
  @IsOptional()
  @IsArray({ message: 'Tags devem ser um array' })
  @IsString({ each: true, message: 'Cada tag deve ser uma string' })
  tags?: string[];
}
