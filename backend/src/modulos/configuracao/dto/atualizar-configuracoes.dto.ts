import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ============================================================================
 * DTO: CONFIGURAÇÃO ITEM (REFATORADO - TSDoc Completo)
 * ============================================================================
 *
 * DTO para item individual de configuração global do sistema.
 *
 * REFATORAÇÃO (Fase 2 - Princípio 3):
 * - MELHORADO: Documentação TSDoc completa de todas as propriedades
 * - MELHORADO: Exemplos de uso adicionados
 *
 * @module ConfiguracaoModule
 * ============================================================================
 */
export class ConfiguracaoItemDto {
  /**
   * Chave única da configuração.
   *
   * Exemplos de chaves válidas:
   * - PONTOS_NIVEL_PRATA
   * - PONTOS_NIVEL_OURO
   * - TAXA_CONVERSAO_REAL
   *
   * @type {string}
   * @required
   * @example 'PONTOS_NIVEL_PRATA'
   */
  @IsString()
  @IsNotEmpty()
  chave: string;

  /**
   * Valor da configuração (armazenado como string, parse conforme necessário).
   *
   * @type {string}
   * @required
   * @example '5000'
   * @example '0.10'
   */
  @IsString()
  valor: string;

  /**
   * Descrição legível da configuração para documentação.
   *
   * @type {string}
   * @optional
   * @example 'Quantidade de pontos necessária para atingir nível Prata'
   */
  @IsString()
  @IsOptional()
  descricao?: string;
}

/**
 * ============================================================================
 * DTO: ATUALIZAR CONFIGURAÇÕES (REFATORADO - TSDoc Completo)
 * ============================================================================
 *
 * DTO principal para atualização em lote de configurações globais.
 *
 * REFATORAÇÃO (Fase 2 - Princípio 3):
 * - MELHORADO: Documentação TSDoc completa
 * - MELHORADO: Exemplos de uso adicionados
 *
 * Uso:
 * - Endpoint: PATCH /api/configuracoes
 * - Papel: ADMIN
 * - Body: { "configuracoes": [ { "chave": "...", "valor": "..." }, ... ] }
 *
 * @module ConfiguracaoModule
 * ============================================================================
 */
export class AtualizarConfiguracoesDto {
  /**
   * Array de configurações a serem atualizadas ou criadas.
   *
   * Cada item é validado individualmente com ConfiguracaoItemDto.
   *
   * @type {ConfiguracaoItemDto[]}
   * @required
   * @example [
   *   { "chave": "PONTOS_NIVEL_PRATA", "valor": "5000", "descricao": "..." },
   *   { "chave": "PONTOS_NIVEL_OURO", "valor": "15000", "descricao": "..." }
   * ]
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfiguracaoItemDto)
  configuracoes: ConfiguracaoItemDto[];
}
