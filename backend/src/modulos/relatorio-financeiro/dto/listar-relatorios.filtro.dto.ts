import { IsEnum, IsOptional, IsUUID, IsDateString, IsString } from 'class-validator';
import { StatusPagamento } from '@prisma/client';

/**
 * ============================================================================
 * DTO: LISTAR RELATÓRIOS FINANCEIROS FILTRO (REFATORADO - TSDoc Completo)
 * ============================================================================
 *
 * DTO para filtros de consulta de relatórios financeiros com validação robusta.
 * Todos os campos são opcionais e podem ser combinados para queries específicas.
 *
 * REFATORAÇÃO (Fase 2 - Princípio 3):
 * - MELHORADO: Documentação TSDoc completa de todas as propriedades
 * - MELHORADO: Exemplos de uso adicionados
 *
 * Uso:
 * - Endpoint: GET /api/relatorios-financeiros
 * - Papel: ADMIN
 * - Query: ?status=PAGO&campanhaId=uuid&tipo=VENDEDOR&dataInicio=2025-01-01
 *
 * @module RelatorioFinanceiroModule
 * ============================================================================
 */
export class ListarRelatoriosFiltroDto {
  /**
   * Filtro por status do pagamento.
   *
   * @type {StatusPagamento}
   * @optional
   * @example 'PAGO'
   * @example 'PENDENTE'
   */
  @IsOptional()
  @IsEnum(StatusPagamento)
  status?: StatusPagamento;

  /**
   * Filtro por campanha específica.
   *
   * @type {string}
   * @optional
   * @example 'uuid-da-campanha'
   */
  @IsOptional()
  @IsUUID()
  campanhaId?: string;

  /**
   * Filtro por usuário específico (Vendedor ou Gerente).
   *
   * @type {string}
   * @optional
   * @example 'uuid-do-usuario'
   */
  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  /**
   * Filtro por tipo de relatório.
   *
   * @type {string}
   * @optional
   * @example 'VENDEDOR'
   * @example 'GERENTE'
   */
  @IsOptional()
  @IsString()
  tipo?: string;

  /**
   * Data de início do período de consulta (formato ISO 8601).
   *
   * @type {string}
   * @optional
   * @example '2025-01-01'
   * @example '2025-01-01T00:00:00.000Z'
   */
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  /**
   * Data de fim do período de consulta (formato ISO 8601).
   *
   * @type {string}
   * @optional
   * @example '2025-12-31'
   * @example '2025-12-31T23:59:59.999Z'
   */
  @IsOptional()
  @IsDateString()
  dataFim?: string;
}
