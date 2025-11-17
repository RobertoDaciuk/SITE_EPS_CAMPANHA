/**
 * ============================================================================
 * CONTROLLER: FINANCEIRO (Sistema de Lotes de Pagamento)
 * ============================================================================
 *
 * Endpoints para gestão de pagamentos em lote:
 *
 * GET /api/financeiro/saldos - Visualizar saldos (Preview)
 * POST /api/financeiro/lotes - Gerar lote de pagamento
 * GET /api/financeiro/lotes - Listar todos os lotes
 * GET /api/financeiro/lotes/:numeroLote - Buscar lote específico
 * PATCH /api/financeiro/lotes/:numeroLote/processar - Processar lote
 * DELETE /api/financeiro/lotes/:numeroLote - Cancelar lote
 * GET /api/financeiro/lotes/:numeroLote/exportar-excel - Exportar Excel
 *
 * AUTORIZAÇÃO: Apenas ADMIN
 *
 * ============================================================================
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { FinanceiroService } from './financeiro.service';
import { VisualizarSaldosDto } from './dto/visualizar-saldos.dto';
import { GerarLoteDto } from './dto/gerar-lote.dto';
import { ProcessarLoteDto } from './dto/processar-lote.dto';
import { ListarLotesDto } from './dto/listar-lotes.dto'; // ✅ M6
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { JwtAuthGuard } from '../comum/guards/jwt-auth.guard';
import { PapeisGuard } from '../comum/guards/papeis.guard';
import { Papeis } from '../comum/decorators/papeis.decorator';
import { PapelUsuario } from '@prisma/client';

@Controller('financeiro')
@UseGuards(JwtAuthGuard, PapeisGuard)
@Papeis(PapelUsuario.ADMIN)
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  /**
   * ========================================================================
   * GET /api/financeiro/saldos - FASE 1: PREVIEW/VISUALIZAÇÃO
   * ========================================================================
   * Lista vendedores/gerentes com saldo > 0 sem modificar nenhum dado.
   * Permite exportação Excel da prévia.
   */
  @Get('saldos')
  async visualizarSaldos(
    @Query() filtros: VisualizarSaldosDto,
    @Req() req: any
  ) {
    return this.financeiroService.visualizarSaldos(filtros, req.user.userId);
  }

  /**
   * ========================================================================
   * POST /api/financeiro/lotes - FASE 2: GERAR LOTE DE PAGAMENTO
   * ========================================================================
   * Cria RelatorioFinanceiro para cada usuário em status PENDENTE.
   * NÃO subtrai saldo ainda.
   */
  @Post('lotes')
  async gerarLote(@Body() dto: GerarLoteDto, @Req() req: any) {
    return this.financeiroService.gerarLote(dto, req.user.userId);
  }

  /**
   * ========================================================================
   * GET /api/financeiro/lotes - LISTAR LOTES (M6: COM PAGINAÇÃO)
   * ========================================================================
   * Lista lotes criados com paginação e filtros opcionais.
   * Query params: ?pagina=1&porPagina=10&status=PENDENTE&dataInicio=2025-01-01
   */
  @Get('lotes')
  async listarLotes(@Query() dto: ListarLotesDto) {
    return this.financeiroService.listarLotes(dto);
  }

  /**
   * ========================================================================
   * GET /api/financeiro/lotes/:numeroLote - BUSCAR LOTE ESPECÍFICO
   * ========================================================================
   * Retorna dados completos de um lote específico.
   */
  @Get('lotes/:numeroLote')
  async buscarLote(@Param('numeroLote') numeroLote: string) {
    return this.financeiroService.buscarLote(numeroLote);
  }

  /**
   * ========================================================================
   * PATCH /api/financeiro/lotes/:numeroLote/processar - FASE 3: PROCESSAR
   * ========================================================================
   * Processa o lote em transação atômica:
   * - Subtrai saldos
   * - Marca envios como liquidados
   * - Atualiza status para PAGO
   * - Notifica usuários
   */
  @Patch('lotes/:numeroLote/processar')
  async processarLote(
    @Param('numeroLote') numeroLote: string,
    @Body() dto: ProcessarLoteDto,
    @Req() req: any
  ) {
    return this.financeiroService.processarLote(
      numeroLote,
      dto,
      req.user.userId
    );
  }

  /**
   * ========================================================================
   * DELETE /api/financeiro/lotes/:numeroLote - CANCELAR LOTE
   * ========================================================================
   * Remove todos os relatórios do lote (apenas se PENDENTE).
   */
  @Delete('lotes/:numeroLote')
  async cancelarLote(
    @Param('numeroLote') numeroLote: string,
    @Req() req: any
  ) {
    return this.financeiroService.cancelarLote(numeroLote, req.user.userId);
  }

  /**
   * ========================================================================
   * GET /api/financeiro/lotes/:numeroLote/exportar-excel - EXPORTAR EXCEL
   * ========================================================================
   * Gera arquivo Excel com dados completos do lote para comprovante.
   */
  @Get('lotes/:numeroLote/exportar-excel')
  async exportarExcel(
    @Param('numeroLote') numeroLote: string,
    @Res() res: Response
  ) {
    const lote = await this.financeiroService.buscarLote(numeroLote);

    // ====================================================================
    // Criar workbook Excel
    // ====================================================================
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pagamentos');

    // Cabeçalhos
    worksheet.columns = [
      { header: 'Nome', key: 'nome', width: 30 },
      { header: 'CPF', key: 'cpf', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'WhatsApp', key: 'whatsapp', width: 15 },
      { header: 'Papel', key: 'papel', width: 10 },
      { header: 'Ótica', key: 'optica', width: 30 },
      { header: 'CNPJ Ótica', key: 'cnpjOptica', width: 18 },
      { header: 'Cidade', key: 'cidade', width: 20 },
      { header: 'Estado', key: 'estado', width: 5 },
      { header: 'Valor (R$)', key: 'valor', width: 15 },
    ];

    // Estilizar cabeçalhos
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9EAD3' },
    };

    // Adicionar dados
    for (const rel of lote.relatorios) {
      const valorNum =
        typeof rel.valor === 'object' && 'toNumber' in rel.valor
          ? (rel.valor as any).toNumber()
          : Number(rel.valor);
      const usuario = (rel as any).usuario || {};
      const optica = usuario.optica || {};

      worksheet.addRow({
        nome: usuario.nome || 'N/A',
        cpf: usuario.cpf || 'N/A',
        email: usuario.email || 'N/A',
        whatsapp: usuario.whatsapp || 'N/A',
        papel: usuario.papel || 'N/A',
        optica: optica.nome || '',
        cnpjOptica: optica.cnpj || '',
        cidade: optica.cidade || '',
        estado: optica.estado || '',
        valor: valorNum,
      });
    }

    // Adicionar linha de total
    const totalRow = worksheet.addRow({
      nome: 'TOTAL',
      cpf: '',
      email: '',
      whatsapp: '',
      papel: '',
      optica: '',
      cnpjOptica: '',
      cidade: '',
      estado: '',
      valor: lote.valorTotal,
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB3B' },
    };

    // ====================================================================
    // Enviar arquivo
    // ====================================================================
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=lote-${numeroLote}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}
