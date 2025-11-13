import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from './../comum/guards/jwt-auth.guard';
import { PapeisGuard } from './../comum/guards/papeis.guard';
import { Papeis } from './../comum/decorators/papeis.decorator';
import { PapelUsuario } from '@prisma/client';
import { RelatorioFinanceiroService } from './relatorio-financeiro.service';
import { ListarRelatoriosFiltroDto } from './dto/listar-relatorios.filtro.dto';
import { CalcularPagamentosDto } from './dto/calcular-pagamentos.dto';

/**
 * ============================================================================
 * CONTROLADOR DE RELATÓRIOS FINANCEIROS (REFATORADO - V7.0)
 * ============================================================================
 *
 * Controlador seguro para relatórios financeiros, exclusivo para Admin.
 *
 * VERSÃO 7.0 - Sistema de Saldo e Pagamentos:
 * - NOVO: POST /calcular-pagamentos - Cria relatórios baseados em saldo
 * - Mantém endpoints existentes
 *
 * ============================================================================
 */
@UseGuards(JwtAuthGuard, PapeisGuard)
@Papeis(PapelUsuario.ADMIN)
@Controller('relatorios-financeiros')
export class RelatorioFinanceiroController {
  constructor(private readonly relatorioService: RelatorioFinanceiroService) {}

  /**
   * ============================================================================
   * LISTAR RELATÓRIOS FINANCEIROS
   * ============================================================================
   *
   * Listagem robusta: filtra por status, campanha, usuário, tipo e datas.
   *
   * @param filtros - Filtros de query string
   * @returns Lista de relatórios financeiros
   *
   * @example GET /relatorios-financeiros?status=PENDENTE&tipo=VENDEDOR
   */
  @Get()
  async listar(@Query() filtros: ListarRelatoriosFiltroDto) {
    return this.relatorioService.listar(filtros);
  }

  /**
   * ============================================================================
   * BUSCAR RELATÓRIO POR ID
   * ============================================================================
   *
   * Busca por ID (detalhamento).
   *
   * @param id - ID do relatório
   * @returns Relatório financeiro com detalhes
   *
   * @example GET /relatorios-financeiros/abc-123
   */
  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return this.relatorioService.buscarPorId(id);
  }

  /**
   * ============================================================================
   * CALCULAR PAGAMENTOS ATÉ DATA (NOVO - V7.0)
   * ============================================================================
   *
   * Cria relatórios financeiros para todos os usuários com saldo > 0.
   * Baseado em cartelas completadas até a data de corte fornecida.
   *
   * IMPORTANTE:
   * - Apenas cria relatórios (não efetua pagamento)
   * - Usuários com relatórios PENDENTES são pulados
   * - Retorna estatísticas dos relatórios criados
   *
   * @param dto - DTO com dataCorte (ISO 8601)
   * @param req - Request object (para pegar ID do admin autenticado)
   * @returns Estatísticas dos relatórios criados
   *
   * @example
   * POST /relatorios-financeiros/calcular-pagamentos
   * Body: { "dataCorte": "2025-01-31T23:59:59.999Z" }
   */
  @Post('calcular-pagamentos')
  async calcularPagamentos(
    @Body() dto: CalcularPagamentosDto,
    @Request() req: any
  ) {
    const adminId = req.user.sub; // ID do admin autenticado
    const dataCorte = new Date(dto.dataCorte);

    return this.relatorioService.calcularPagamentosAteData(dataCorte, adminId);
  }

  /**
   * ============================================================================
   * MARCAR COMO PAGO (ATUALIZADO - V7.0)
   * ============================================================================
   *
   * Marca como pago de forma transacional:
   * 1. Subtrai do saldo do usuário
   * 2. Marca envios como liquidados
   * 3. Atualiza status para PAGO
   * 4. Dispara notificação
   *
   * @param id - ID do relatório a ser pago
   * @returns Relatório financeiro atualizado
   *
   * @example PATCH /relatorios-financeiros/abc-123/marcar-como-pago
   */
  @Patch(':id/marcar-como-pago')
  async marcarComoPago(@Param('id') id: string) {
    return this.relatorioService.marcarComoPago(id);
  }
}
