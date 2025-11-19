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

  /**
   * ========================================================================
   * GET /api/financeiro/lotes/:numeroLote/exportar-excel-detalhado
   * ========================================================================
   * Gera arquivo Excel com TODOS os detalhes dos envios para auditoria completa.
   * Inclui: número do pedido, data de validação, campanha, evento, multiplicador, etc.
   */
  @Get('lotes/:numeroLote/exportar-excel-detalhado')
  async exportarExcelDetalhado(
    @Param('numeroLote') numeroLote: string,
    @Res() res: Response
  ) {
    const loteDetalhado = await this.financeiroService.buscarLoteDetalhado(numeroLote);
    const toNumber = (valor: any): number => {
      if (valor === null || valor === undefined) return 0;
      if (typeof valor === 'number') return valor;
      if (typeof valor === 'string') return Number(valor) || 0;
      if (typeof valor === 'object' && 'toNumber' in valor && typeof valor.toNumber === 'function') {
        try {
          return valor.toNumber();
        } catch (_) {
          return Number(valor) || 0;
        }
      }
      return Number(valor) || 0;
    };

    const loteValorTotal = toNumber(loteDetalhado.valorTotal);

    // ====================================================================
    // Criar workbook Excel com múltiplas abas
    // ====================================================================
    const workbook = new ExcelJS.Workbook();

    // ====================================================================
    // ABA 1: RESUMO POR USUÁRIO (mesma da exportação simples)
    // ====================================================================
    const wsResumo = workbook.addWorksheet('Resumo Pagamentos');

    wsResumo.columns = [
      { header: 'Nome do Usuário', key: 'nome', width: 32 },
      { header: 'CPF', key: 'cpf', width: 16 },
      { header: 'Email', key: 'email', width: 36 },
      { header: 'Papel', key: 'papel', width: 14 },
      { header: 'Ótica - Nome', key: 'opticaNome', width: 32 },
      { header: 'Ótica - CNPJ', key: 'opticaCnpj', width: 20 },
      { header: 'Ótica - Cidade', key: 'opticaCidade', width: 22 },
      { header: 'Ótica - Estado', key: 'opticaEstado', width: 12 },
      { header: 'Quantidade de Envios', key: 'qtdEnvios', width: 22 },
      { header: 'Valor Total a Pagar (R$)', key: 'valor', width: 24 },
    ];

    wsResumo.getRow(1).font = { bold: true };
    wsResumo.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9EAD3' },
    };

    wsResumo.getColumn('valor').numFmt = 'R$ #,##0.00';

    let totalEnviosResumo = 0;

    for (const rel of loteDetalhado.relatorios) {
      const valorNum = toNumber(rel.valor);
      const usuario = (rel as any).usuario || {};
      const optica = usuario.optica || {};
      const enviosDetalhados = Array.isArray((rel as any).enviosDetalhados)
        ? (rel as any).enviosDetalhados
        : [];
      const qtdEnviosRelatorio = enviosDetalhados.length > 0
        ? enviosDetalhados.length
        : Array.isArray(rel.enviosIncluidos)
          ? rel.enviosIncluidos.length
          : 0;

      totalEnviosResumo += qtdEnviosRelatorio;

      wsResumo.addRow({
        nome: usuario.nome || 'N/A',
        cpf: usuario.cpf || 'N/A',
        email: usuario.email || 'N/A',
        papel: usuario.papel || 'N/A',
        opticaNome: optica.nome || '-',
        opticaCnpj: optica.cnpj || '-',
        opticaCidade: optica.cidade || '-',
        opticaEstado: optica.estado || '-',
        qtdEnvios: qtdEnviosRelatorio,
        valor: valorNum,
      });
    }

    const totalRowResumo = wsResumo.addRow({
      nome: 'TOTAL',
      qtdEnvios: totalEnviosResumo,
      valor: loteValorTotal,
    });
    totalRowResumo.font = { bold: true };
    totalRowResumo.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB3B' },
    };

    // ====================================================================
    // ABA 2: DETALHAMENTO COMPLETO DE TODOS OS ENVIOS (AUDITORIA)
    // ====================================================================
    const wsDetalhes = workbook.addWorksheet('Detalhamento Pedidos');

    wsDetalhes.columns = [
      { header: 'Vendedor (Nome)', key: 'vendedorNome', width: 34 },
      { header: 'Vendedor (CPF)', key: 'vendedorCpf', width: 18 },
      { header: 'Ótica', key: 'opticaNome', width: 32 },
      { header: 'Gerente Responsável', key: 'gerenteNome', width: 32 },
      { header: 'Campanha', key: 'campanha', width: 38 },
      { header: 'Nº Pedido', key: 'numeroPedido', width: 20 },
      { header: 'Data Envio', key: 'dataEnvio', width: 24 },
      { header: 'Data Validação', key: 'dataValidacao', width: 24 },
      { header: 'Valor Original (R$)', key: 'valorOriginal', width: 22 },
      { header: 'Teve Evento?', key: 'teveEvento', width: 16 },
      { header: 'Nome Evento', key: 'nomeEvento', width: 32 },
      { header: 'Multiplicador', key: 'multiplicador', width: 16 },
      { header: 'Valor Final (R$)', key: 'valorFinal', width: 20 },
      { header: 'Nº Cartela', key: 'numeroCartela', width: 16 },
      { header: 'Requisito Atendido', key: 'requisito', width: 42 },
      { header: 'Tipo Pagamento', key: 'tipoPagamento', width: 18 },
    ];

    wsDetalhes.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsDetalhes.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1976D2' },
    };

    wsDetalhes.getColumn('valorOriginal').numFmt = '#,##0.00';
    wsDetalhes.getColumn('valorFinal').numFmt = '#,##0.00';
    wsDetalhes.getColumn('dataEnvio').numFmt = 'dd/mm/yyyy hh:mm';
    wsDetalhes.getColumn('dataValidacao').numFmt = 'dd/mm/yyyy hh:mm';

    let totalEnviosDetalhado = 0;
    let totalValorOriginal = 0;
    let totalValorFinal = 0;

    // Adicionar todos os envios de todos os relatórios
    for (const rel of loteDetalhado.relatorios) {
      const usuario = (rel as any).usuario || {};
      const optica = usuario.optica || {};
      const gerente = usuario.gerente || {};
      const envios = (rel as any).enviosDetalhados || [];

      for (const envio of envios) {
        const valorOriginal = toNumber(envio.valorPontosReaisRecebido || 0);
        const valorFinal = toNumber(envio.valorFinalComEvento || valorOriginal);
        const multiplicador = envio.multiplicadorNumerico || toNumber(envio.multiplicadorAplicado || 1);
        const teveEvento = multiplicador > 1;
        const vendedor = envio.vendedor || {};
        const vendedorOptica = vendedor.optica || optica;
        const gerenteResponsavel = vendedor.gerente || gerente;
        const multiplicadorLabel = `${
          multiplicador % 1 === 0
            ? multiplicador.toFixed(0)
            : multiplicador.toFixed(2)
        }x`;

        wsDetalhes.addRow({
          vendedorNome: vendedor.nome || usuario.nome || 'N/A',
          vendedorCpf: vendedor.cpf || usuario.cpf || 'N/A',
          opticaNome: vendedorOptica?.nome || '-',
          gerenteNome: gerenteResponsavel?.nome || (rel.tipo === 'GERENTE' ? usuario.nome : 'Sem gerente'),
          campanha: envio.campanha?.titulo || 'N/A',
          numeroPedido: envio.numeroPedido || 'N/A',
          dataEnvio: envio.dataEnvio ? new Date(envio.dataEnvio) : null,
          dataValidacao: envio.dataValidacao ? new Date(envio.dataValidacao) : null,
          valorOriginal,
          teveEvento: teveEvento ? 'SIM' : 'NÃO',
          nomeEvento: teveEvento ? envio.eventoEspecial?.nome || 'Evento não encontrado' : '-',
          multiplicador: multiplicadorLabel,
          valorFinal,
          numeroCartela: envio.numeroCartelaAtendida ?? '-',
          requisito: envio.requisito?.descricao || '-',
          tipoPagamento: rel.tipo || 'N/A',
        });

        totalEnviosDetalhado += 1;
        totalValorOriginal += valorOriginal;
        totalValorFinal += valorFinal;
      }
    }

    // Adicionar linha de total
    const totalValorOriginalRounded = Math.round(totalValorOriginal * 100) / 100;
    const totalValorFinalRounded = Math.round(totalValorFinal * 100) / 100;

    const totalRowDetalhes = wsDetalhes.addRow({
      vendedorNome: `TOTAL (${totalEnviosDetalhado} pedidos)`,
      valorOriginal: totalValorOriginalRounded,
      valorFinal: totalValorFinalRounded,
    });
    totalRowDetalhes.font = { bold: true };
    totalRowDetalhes.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB3B' },
    };

    // ====================================================================
    // ABA 3: INFORMAÇÕES DO LOTE
    // ====================================================================
    const wsInfo = workbook.addWorksheet('Informações do Lote');
    wsInfo.columns = [
      { header: 'Campo', key: 'campo', width: 25 },
      { header: 'Valor', key: 'valor', width: 50 },
    ];

    wsInfo.getRow(1).font = { bold: true };
    wsInfo.addRow({ campo: 'Número do Lote', valor: loteDetalhado.numeroLote });
    wsInfo.addRow({ campo: 'Status', valor: loteDetalhado.status });
    wsInfo.addRow({ campo: 'Data de Corte', valor: new Date(loteDetalhado.dataCorte).toLocaleDateString('pt-BR') });
    wsInfo.addRow({ campo: 'Data de Criação', valor: new Date(loteDetalhado.criadoEm).toLocaleString('pt-BR') });
    wsInfo.addRow({ campo: 'Data de Processamento', valor: loteDetalhado.processadoEm ? new Date(loteDetalhado.processadoEm).toLocaleString('pt-BR') : 'Não processado' });
  wsInfo.addRow({ campo: 'Valor Total', valor: `R$ ${loteValorTotal.toFixed(2)}` });
    wsInfo.addRow({ campo: 'Quantidade de Usuários', valor: loteDetalhado.relatorios.length });
    wsInfo.addRow({ campo: 'Quantidade Total de Pedidos', valor: totalEnviosDetalhado });

    const diferencaTotais = Math.round((totalValorFinalRounded - loteValorTotal) * 100) / 100;
    if (Math.abs(diferencaTotais) > 0.01) {
      wsInfo.addRow({
        campo: '⚠ Divergência Soma Envios vs Lote',
        valor: `R$ ${diferencaTotais.toFixed(2)}`,
      });
    }

    wsInfo.addRow({ campo: 'Observações', valor: loteDetalhado.observacoes || 'Nenhuma' });

    // ====================================================================
    // Enviar arquivo
    // ====================================================================
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=lote-${numeroLote}-DETALHADO.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}

