/**
 * ============================================================================
 * SERVIÇO: FINANCEIRO (Sistema de Lotes de Pagamento)
 * ============================================================================
 *
 * ARQUITETURA: 3 FASES (Preview → Lote → Processamento)
 *
 * FASE 1 (Query): visualizarSaldos()
 * - Lista vendedores/gerentes com saldo > 0
 * - NÃO modifica nenhum dado
 * - Permite exportação Excel da prévia
 *
 * FASE 2 (Command): gerarLote()
 * - Cria RelatorioFinanceiro para cada usuário (status: PENDENTE)
 * - Gera numeroLote único
 * - Salva enviosIncluidos e dataCorte
 * - NÃO subtrai saldo ainda
 *
 * FASE 3 (Command): processarLote()
 * - Transaction atômica: subtrai saldos, marca envios como liquidados
 * - Atualiza status para PAGO
 * - Notifica todos os usuários
 * - Garante tudo ou nada (rollback automático se falhar)
 *
 * GARANTIAS FORMAIS:
 * - Atomicidade: Transaction Prisma garante rollback em caso de erro
 * - Idempotência: Lote PAGO não pode ser reprocessado
 * - Auditabilidade: numeroLote rastreia todos os relatórios do lote
 * - Reversibilidade: Pode cancelar lote PENDENTE
 *
 * ============================================================================
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VisualizarSaldosDto } from './dto/visualizar-saldos.dto';
import { GerarLoteDto } from './dto/gerar-lote.dto';
import { ProcessarLoteDto } from './dto/processar-lote.dto';
import { Prisma, PapelUsuario } from '@prisma/client';

@Injectable()
export class FinanceiroService {
  private readonly logger = new Logger(FinanceiroService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * ============================================================================
   * FASE 1: VISUALIZAR SALDOS (Query - Não modifica dados)
   * ============================================================================
   *
   * Lista vendedores e gerentes com saldo > 0, incluindo dados pessoais e da ótica.
   * Esta operação NÃO modifica nenhum dado no banco.
   *
   * GARANTIAS:
   * - Read-only: Nenhuma modificação no banco
   * - Performance: Busca otimizada com select específico
   * - Filtros: Permite filtrar por papel, ótica e data
   *
   * @param filtros - Filtros opcionais para a visualização
   * @param adminId - ID do admin que está consultando (para auditoria)
   * @returns Lista de usuários com saldo > 0 e seus dados completos
   */
  async visualizarSaldos(filtros: VisualizarSaldosDto, adminId: string) {
    this.logger.log(`\n========== VISUALIZANDO SALDOS ==========`);
    this.logger.log(`Admin ID: ${adminId}`);
    this.logger.log(`Filtros: ${JSON.stringify(filtros)}`);

    const where: Prisma.UsuarioWhereInput = {
      saldoPontos: { gt: 0 },
      papel: { in: [PapelUsuario.VENDEDOR, PapelUsuario.GERENTE] },
    };

    // Aplicar filtros opcionais
    if (filtros.papel) where.papel = filtros.papel;
    if (filtros.opticaId) where.opticaId = filtros.opticaId;

    const usuarios = await this.prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        whatsapp: true,
        papel: true,
        saldoPontos: true,
        optica: {
          select: {
            id: true,
            nome: true,
            cnpj: true,
            cidade: true,
            estado: true,
          },
        },
        gerente: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: [{ papel: 'asc' }, { nome: 'asc' }],
    });

    this.logger.log(`✅ Total de usuários com saldo: ${usuarios.length}`);

    // Calcular valor total
    const valorTotal = usuarios.reduce((acc, u) => {
      const saldo =
        typeof u.saldoPontos === 'object' && 'toNumber' in u.saldoPontos
          ? (u.saldoPontos as any).toNumber()
          : Number(u.saldoPontos);
      return acc + saldo;
    }, 0);

    this.logger.log(`💰 Valor total de saldos: R$ ${valorTotal.toFixed(2)}`);

    return {
      usuarios,
      valorTotal,
      totalUsuarios: usuarios.length,
      dataConsulta: new Date(),
    };
  }

  /**
   * ============================================================================
   * FASE 2: GERAR LOTE DE PAGAMENTO (Command - Cria relatórios PENDENTES)
   * ============================================================================
   *
   * Cria um lote de pagamento com múltiplos RelatorioFinanceiro em status PENDENTE.
   * Cada usuário com saldo > 0 recebe um relatório individual.
   * O lote pode ser revisado, cancelado ou processado posteriormente.
   *
   * FLUXO:
   * 1. Gera numeroLote único (formato: LOTE-YYYY-MM-NNN)
   * 2. Busca usuários com saldo > 0
   * 3. Para cada usuário:
   *    - Verifica se já tem relatório PENDENTE (evita duplicação)
   *    - Busca envios que compõem o saldo
   *    - Cria RelatorioFinanceiro com status PENDENTE
   * 4. Salva observações opcionais
   * 5. Retorna estatísticas do lote criado
   *
   * GARANTIAS:
   * - Idempotência: Usuário com relatório PENDENTE é pulado
   * - Auditoria: Salva processadoPorId, numeroLote, dataCorte
   * - Transacional: Tudo ou nada
   * - Não modifica saldos: Apenas cria relatórios PENDENTES
   *
   * @param dto - Data de corte e observações
   * @param adminId - ID do admin que está gerando o lote
   * @returns Dados do lote criado com todos os relatórios
   */
  async gerarLote(dto: GerarLoteDto, adminId: string) {
    this.logger.log(`\n========== GERANDO LOTE DE PAGAMENTO ==========`);
    this.logger.log(`Admin ID: ${adminId}`);
    this.logger.log(`Data de Corte: ${dto.dataCorte}`);

    const dataCorte = new Date(dto.dataCorte);

    return this.prisma.$transaction(async (tx) => {
      // ================================================================
      // PASSO 1: Gerar número único do lote
      // ================================================================
      const numeroLote = await this._gerarNumeroLote(tx);
      this.logger.log(`📦 Número do Lote: ${numeroLote}`);

      // ================================================================
      // PASSO 2: Buscar usuários com saldo > 0
      // ================================================================
      const usuariosComSaldo = await tx.usuario.findMany({
        where: {
          saldoPontos: { gt: 0 },
          papel: { in: [PapelUsuario.VENDEDOR, PapelUsuario.GERENTE] },
        },
        select: {
          id: true,
          nome: true,
          papel: true,
          saldoPontos: true,
        },
        orderBy: { nome: 'asc' },
      });

      this.logger.log(
        `👥 Usuários com saldo: ${usuariosComSaldo.length}`
      );

      // ================================================================
      // PASSO 3: Criar relatórios para cada usuário
      // ================================================================
      const relatoriosCriados = [];
      let totalRelatorios = 0;
      let valorTotal = 0;

      for (const usuario of usuariosComSaldo) {
        // ============================================================
        // 3.1: Verificar se já tem relatório PENDENTE
        // ============================================================
        const relatorioPendente = await tx.relatorioFinanceiro.findFirst({
          where: { usuarioId: usuario.id, status: 'PENDENTE' },
        });

        if (relatorioPendente) {
          this.logger.warn(
            `⚠️  Usuário ${usuario.nome} já possui relatório PENDENTE. Pulando...`
          );
          continue;
        }

        // ============================================================
        // 3.2: Buscar envios que compõem o saldo (pode ser vazio para gerentes)
        // ============================================================
        const envios = await tx.envioVenda.findMany({
          where: {
            vendedorId: usuario.id,
            pontosAdicionadosAoSaldo: true,
            pontosLiquidados: false,
          },
          select: { id: true, campanhaId: true },
        });

        // Note: Não pulamos o usuário quando não houver envios.
        // Usuários (ex: GERENTE) podem ter saldo oriundo de comissões sem envios diretos.
        const enviosIds = envios.map((e) => e.id);
        let campanhaId = envios.length > 0 ? envios[0].campanhaId : null;

        // Se não houver envios (ex: gerente com comissões), buscar campanha ativa mais recente
        if (!campanhaId) {
          const campanhaFallback = await tx.campanha.findFirst({
            where: { status: 'ATIVA' },
            orderBy: { dataInicio: 'desc' },
            select: { id: true },
          });

          if (campanhaFallback) {
            campanhaId = campanhaFallback.id;
          } else {
            // Se não houver campanha ativa, buscar a mais recente
            const ultimaCampanha = await tx.campanha.findFirst({
              orderBy: { criadoEm: 'desc' },
              select: { id: true },
            });
            
            if (!ultimaCampanha) {
              throw new BadRequestException(
                `Não foi possível gerar relatório para ${usuario.nome}: nenhuma campanha encontrada no sistema.`
              );
            }
            
            campanhaId = ultimaCampanha.id;
          }
        }

        const saldoNum =
          typeof usuario.saldoPontos === 'object' &&
          'toNumber' in usuario.saldoPontos
            ? (usuario.saldoPontos as any).toNumber()
            : Number(usuario.saldoPontos);

        // ============================================================
        // 3.3: Criar RelatorioFinanceiro (status: PENDENTE)
        // ============================================================
        const relatorio = await tx.relatorioFinanceiro.create({
          data: {
            valor: saldoNum,
            status: 'PENDENTE',
            tipo: usuario.papel === 'VENDEDOR' ? 'VENDEDOR' : 'GERENTE',
            usuarioId: usuario.id,
            campanhaId: campanhaId,
            dataCorte,
            enviosIncluidos: enviosIds,
            numeroLote,
            processadoPorId: adminId,
            observacoes: dto.observacoes,
          },
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
                cpf: true,
                papel: true,
                optica: {
                  select: {
                    id: true,
                    nome: true,
                    cnpj: true,
                  },
                },
              },
            },
            campanha: {
              select: { id: true, titulo: true },
            },
          },
        });

        relatoriosCriados.push(relatorio);
        totalRelatorios++;
        valorTotal += saldoNum;

        this.logger.log(
          `  ✅ ${usuario.nome} (${usuario.papel}): R$ ${saldoNum.toFixed(2)}`
        );
      }

      this.logger.log(`\n========== LOTE CRIADO COM SUCESSO ==========`);
      this.logger.log(`📦 Número do Lote: ${numeroLote}`);
      this.logger.log(`📄 Total de Relatórios: ${totalRelatorios}`);
      this.logger.log(`💰 Valor Total: R$ ${valorTotal.toFixed(2)}`);

      return {
        numeroLote,
        dataCorte,
        status: 'PENDENTE',
        totalRelatorios,
        valorTotal,
        relatorios: relatoriosCriados,
        criadoPor: adminId,
        criadoEm: new Date(),
      };
    });
  }

  /**
   * ============================================================================
   * FASE 3: PROCESSAR LOTE (Command - Executa pagamentos atomicamente)
   * ============================================================================
   *
   * Processa um lote de pagamento em transação atômica:
   * 1. Valida que lote existe e está PENDENTE
   * 2. Para cada relatório do lote:
   *    - Valida saldo suficiente
   *    - Subtrai de Usuario.saldoPontos
   *    - Marca EnvioVenda.pontosLiquidados = true
   *    - Atualiza RelatorioFinanceiro.status = PAGO
   * 3. Notifica todos os usuários
   *
   * GARANTIAS:
   * - Atomicidade: Transaction Prisma (tudo ou nada)
   * - Idempotência: Lote já PAGO não pode ser reprocessado
   * - Validação: Verifica saldo antes de subtrair
   * - Auditoria: Salva dataPagamento e observações
   *
   * @param numeroLote - Número do lote a ser processado
   * @param dto - Observações opcionais sobre o processamento
   * @param adminId - ID do admin que está processando
   * @returns Dados do lote processado
   */
  async processarLote(
    numeroLote: string,
    dto: ProcessarLoteDto,
    adminId: string
  ) {
    this.logger.log(`\n========== PROCESSANDO LOTE ${numeroLote} ==========`);
    this.logger.log(`Admin ID: ${adminId}`);

    return this.prisma.$transaction(async (tx) => {
      // ================================================================
      // PASSO 1: Buscar relatórios do lote
      // ================================================================
      const relatorios = await tx.relatorioFinanceiro.findMany({
        where: { numeroLote },
        include: {
          usuario: {
            select: {
              id: true,
              nome: true,
              saldoPontos: true,
            },
          },
        },
      });

      if (relatorios.length === 0) {
        throw new NotFoundException(`Lote ${numeroLote} não encontrado`);
      }

      // ================================================================
      // PASSO 2: Validar que todos estão PENDENTES
      // ================================================================
      const jaProcessado = relatorios.find((r) => r.status === 'PAGO');
      if (jaProcessado) {
        throw new ConflictException(
          `Lote ${numeroLote} já foi processado anteriormente`
        );
      }

      this.logger.log(`📄 Total de relatórios no lote: ${relatorios.length}`);

      // ================================================================
      // PASSO 3: Processar cada relatório
      // ================================================================
      let totalProcessado = 0;
      let valorTotalProcessado = 0;

      for (const relatorio of relatorios) {
        const valorNum =
          typeof relatorio.valor === 'object' && 'toNumber' in relatorio.valor
            ? (relatorio.valor as any).toNumber()
            : Number(relatorio.valor);

        const saldoAtualNum =
          typeof relatorio.usuario.saldoPontos === 'object' &&
          'toNumber' in relatorio.usuario.saldoPontos
            ? (relatorio.usuario.saldoPontos as any).toNumber()
            : Number(relatorio.usuario.saldoPontos);

        this.logger.log(
          `\n  Processando: ${relatorio.usuario.nome} - R$ ${valorNum.toFixed(2)}`
        );

        // ============================================================
        // 3.1: Validar saldo suficiente
        // ============================================================
        if (saldoAtualNum < valorNum) {
          throw new BadRequestException(
            `Saldo insuficiente para ${relatorio.usuario.nome}. Saldo: R$ ${saldoAtualNum.toFixed(2)}, Valor a pagar: R$ ${valorNum.toFixed(2)}`
          );
        }

        // ============================================================
        // 3.2: Subtrair do saldo
        // ============================================================
        await tx.usuario.update({
          where: { id: relatorio.usuarioId },
          data: {
            saldoPontos: { decrement: valorNum },
          },
        });

        this.logger.log(
          `    ✅ Saldo subtraído: R$ ${saldoAtualNum.toFixed(2)} → R$ ${(saldoAtualNum - valorNum).toFixed(2)}`
        );

        // ============================================================
        // 3.3: Marcar envios como liquidados
        // ============================================================
        const enviosIds = (relatorio.enviosIncluidos as string[]) || [];
        if (enviosIds.length > 0) {
          await tx.envioVenda.updateMany({
            where: { id: { in: enviosIds } },
            data: { pontosLiquidados: true },
          });

          this.logger.log(
            `    ✅ ${enviosIds.length} envios marcados como liquidados`
          );
        }

        // ============================================================
        // 3.4: Atualizar relatório para PAGO
        // ============================================================
        await tx.relatorioFinanceiro.update({
          where: { id: relatorio.id },
          data: {
            status: 'PAGO',
            dataPagamento: new Date(),
            observacoes: dto.observacoes
              ? `${relatorio.observacoes || ''}\n${dto.observacoes}`.trim()
              : relatorio.observacoes,
          },
        });

        // ============================================================
        // 3.5: Notificar usuário
        // ============================================================
        await tx.notificacao.create({
          data: {
            usuarioId: relatorio.usuarioId,
            mensagem: `💰 Pagamento processado! R$ ${valorNum.toFixed(2)} foram debitados do seu saldo. Novo saldo: R$ ${(saldoAtualNum - valorNum).toFixed(2)}`,
            lida: false,
          },
        });

        totalProcessado++;
        valorTotalProcessado += valorNum;
      }

      this.logger.log(`\n========== LOTE PROCESSADO COM SUCESSO ==========`);
      this.logger.log(`📦 Número do Lote: ${numeroLote}`);
      this.logger.log(`📄 Relatórios Processados: ${totalProcessado}`);
      this.logger.log(
        `💰 Valor Total Processado: R$ ${valorTotalProcessado.toFixed(2)}`
      );

      return {
        numeroLote,
        status: 'PROCESSADO',
        totalProcessado,
        valorTotal: valorTotalProcessado,
        processadoEm: new Date(),
        processadoPor: adminId,
      };
    });
  }

  /**
   * ============================================================================
   * LISTAR LOTES
   * ============================================================================
   *
   * Lista todos os lotes criados, com possibilidade de filtrar por status.
   *
   * @param status - Filtrar por status (PENDENTE ou PAGO)
   * @returns Lista de lotes agrupados por numeroLote
   */
  async listarLotes(status?: 'PENDENTE' | 'PAGO') {
    this.logger.log(`\n========== LISTANDO LOTES ==========`);
    this.logger.log(`Status: ${status || 'TODOS'}`);

    const where: Prisma.RelatorioFinanceiroWhereInput = {
      numeroLote: { not: null },
    };

    if (status) where.status = status;

    const relatorios = await this.prisma.relatorioFinanceiro.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            papel: true,
          },
        },
        processadoPor: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });

    // Agrupar por numeroLote
    const lotesMap = new Map();
    for (const rel of relatorios) {
      if (!rel.numeroLote) continue;

      if (!lotesMap.has(rel.numeroLote)) {
        lotesMap.set(rel.numeroLote, {
          numeroLote: rel.numeroLote,
          dataCorte: rel.dataCorte,
          status: rel.status,
          relatorios: [],
          valorTotal: 0,
          criadoEm: rel.criadoEm,
          dataPagamento: rel.dataPagamento,
          processadoPor: rel.processadoPor,
        });
      }

      const lote = lotesMap.get(rel.numeroLote);
      lote.relatorios.push(rel);

      const valorNum =
        typeof rel.valor === 'object' && 'toNumber' in rel.valor
          ? (rel.valor as any).toNumber()
          : Number(rel.valor);
      lote.valorTotal += valorNum;
    }

    const lotes = Array.from(lotesMap.values());
    this.logger.log(`✅ Total de lotes: ${lotes.length}`);

    return lotes;
  }

  /**
   * ============================================================================
   * BUSCAR LOTE POR NÚMERO
   * ============================================================================
   *
   * Busca um lote específico com todos os seus relatórios.
   *
   * @param numeroLote - Número do lote a buscar
   * @returns Dados completos do lote
   */
  async buscarLote(numeroLote: string) {
    this.logger.log(`\n========== BUSCANDO LOTE ${numeroLote} ==========`);

    const relatorios = await this.prisma.relatorioFinanceiro.findMany({
      where: { numeroLote },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            cpf: true,
            whatsapp: true,
            papel: true,
            optica: {
              select: {
                id: true,
                nome: true,
                cnpj: true,
                cidade: true,
                estado: true,
              },
            },
          },
        },
        campanha: {
          select: { id: true, titulo: true },
        },
        processadoPor: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: { usuario: { nome: 'asc' } },
    });

    if (relatorios.length === 0) {
      throw new NotFoundException(`Lote ${numeroLote} não encontrado`);
    }

    const valorTotal = relatorios.reduce((acc, rel) => {
      const valorNum =
        typeof rel.valor === 'object' && 'toNumber' in rel.valor
          ? (rel.valor as any).toNumber()
          : Number(rel.valor);
      return acc + valorNum;
    }, 0);

    return {
      numeroLote,
      dataCorte: relatorios[0].dataCorte,
      status: relatorios[0].status,
      relatorios,
      totalRelatorios: relatorios.length,
      valorTotal,
      criadoEm: relatorios[0].criadoEm,
      dataPagamento: relatorios[0].dataPagamento,
      processadoPor: relatorios[0].processadoPor,
    };
  }

  /**
   * ============================================================================
   * CANCELAR LOTE (apenas se PENDENTE)
   * ============================================================================
   *
   * Cancela um lote removendo todos os relatórios em status PENDENTE.
   *
   * @param numeroLote - Número do lote a cancelar
   * @param adminId - ID do admin que está cancelando
   * @returns Confirmação do cancelamento
   */
  async cancelarLote(numeroLote: string, adminId: string) {
    this.logger.log(`\n========== CANCELANDO LOTE ${numeroLote} ==========`);
    this.logger.log(`Admin ID: ${adminId}`);

    return this.prisma.$transaction(async (tx) => {
      const relatorios = await tx.relatorioFinanceiro.findMany({
        where: { numeroLote },
      });

      if (relatorios.length === 0) {
        throw new NotFoundException(`Lote ${numeroLote} não encontrado`);
      }

      const jaProcessado = relatorios.find((r) => r.status === 'PAGO');
      if (jaProcessado) {
        throw new ConflictException(
          `Lote ${numeroLote} já foi processado e não pode ser cancelado`
        );
      }

      const deletados = await tx.relatorioFinanceiro.deleteMany({
        where: { numeroLote },
      });

      this.logger.log(`✅ ${deletados.count} relatórios removidos`);

      return {
        numeroLote,
        totalCancelados: deletados.count,
        canceladoPor: adminId,
        canceladoEm: new Date(),
      };
    });
  }

  /**
   * ============================================================================
   * GERAR NÚMERO DE LOTE ÚNICO
   * ============================================================================
   * Formato: LOTE-YYYY-MM-NNN
   * Exemplo: LOTE-2025-11-001
   */
  private async _gerarNumeroLote(
    tx: Prisma.TransactionClient
  ): Promise<string> {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const prefixo = `LOTE-${ano}-${mes}-`;

    // Buscar último lote do mês
    const ultimoLote = await tx.relatorioFinanceiro.findFirst({
      where: {
        numeroLote: { startsWith: prefixo },
      },
      orderBy: { criadoEm: 'desc' },
      select: { numeroLote: true },
    });

    let sequencia = 1;
    if (ultimoLote && ultimoLote.numeroLote) {
      const match = ultimoLote.numeroLote.match(/-(\d+)$/);
      if (match) {
        sequencia = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefixo}${String(sequencia).padStart(3, '0')}`;
  }
}
