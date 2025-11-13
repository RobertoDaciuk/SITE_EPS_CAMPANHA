/**
 * ============================================================================
 * DTO: LISTAR ENVIOS FILTRO (REFATORADO - TSDoc Completo)
 * ============================================================================
 *
 * DTO para filtros de consulta de envios de venda com validação robusta.
 * Todos os campos são opcionais e podem ser combinados para queries específicas.
 *
 * REFATORAÇÃO (Fase 2 - Princípio 3):
 * - MELHORADO: Documentação TSDoc completa de todas as propriedades
 * - MELHORADO: Exemplos de uso adicionados
 *
 * Uso:
 * - Endpoint: GET /api/envios?status=VALIDADO&campanhaId=uuid&vendedorId=uuid
 * - Papel: ADMIN, GERENTE (com validação de subordinação), VENDEDOR
 *
 * Segurança:
 * - VENDEDOR: Sempre filtra pelo próprio ID (forçado no service)
 * - GERENTE: Valida se vendedorId é subordinado (Fase 2)
 * - ADMIN: Sem restrições
 *
 * @module EnvioVendaModule
 * ============================================================================
 */
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { StatusEnvioVenda } from '@prisma/client';

export class ListarEnviosFiltroDto {
  /**
   * Filtro por status do envio.
   *
   * @type {StatusEnvioVenda}
   * @optional
   * @example 'VALIDADO'
   * @example 'EM_ANALISE'
   * @example 'REJEITADO'
   */
  @IsEnum(StatusEnvioVenda, { message: 'Status inválido.' })
  @IsOptional()
  status?: StatusEnvioVenda;

  /**
   * Filtro por campanha específica.
   *
   * @type {string}
   * @optional
   * @example 'uuid-da-campanha'
   */
  @IsUUID('4', { message: 'campanhaId inválido.' })
  @IsOptional()
  campanhaId?: string;

  /**
   * Filtro por vendedor específico.
   *
   * SEGURANÇA (Fase 2):
   * - GERENTE: Valida se vendedor é subordinado antes de filtrar
   * - VENDEDOR: Ignorado (sempre filtra pelo próprio ID)
   * - ADMIN: Sem restrições
   *
   * @type {string}
   * @optional
   * @example 'uuid-do-vendedor'
   */
  @IsUUID('4', { message: 'vendedorId inválido.' })
  @IsOptional()
  vendedorId?: string;
}
