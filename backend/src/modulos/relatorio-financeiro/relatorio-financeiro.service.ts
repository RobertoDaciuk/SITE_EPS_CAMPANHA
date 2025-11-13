/**
 * ============================================================================
 * SERVIÇO DE RELATÓRIOS FINANCEIROS (REFATORADO - V7.0)
 * ============================================================================
 *
 * VERSÃO 7.0 - Sistema de Saldo e Pagamentos:
 * - NOVO: calcularPagamentosAteData() - Cria relatórios baseados em saldo acumulado
 * - ATUALIZADO: marcarComoPago() - Subtrai do saldo e marca envios como liquidados
 * - Mantém métodos existentes: listar(), buscarPorId()
 *
 * ============================================================================
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListarRelatoriosFiltroDto } from './dto/listar-relatorios.filtro.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RelatorioFinanceiroService {
  private readonly logger = new Logger(RelatorioFinanceiroService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * ============================================================================
   * LISTAR RELATÓRIOS FINANCEIROS
   * ============================================================================
   *
   * Lista relatórios financeiros conforme filtros do Admin.
   * Mantido sem alterações da versão anterior.
   */
  async listar(filtros: ListarRelatoriosFiltroDto) {
    const where: Prisma.RelatorioFinanceiroWhereInput = {};

    if (filtros.status) where.status = filtros.status;
    if (filtros.campanhaId) where.campanhaId = filtros.campanhaId;
    if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros.tipo) where.tipo = filtros.tipo;

    if (filtros.dataInicio || filtros.dataFim) {
      where.dataGerado = {};
      if (filtros.dataInicio) {
        where.dataGerado.gte = new Date(filtros.dataInicio);
      }
      if (filtros.dataFim) {
        where.dataGerado.lte = new Date(filtros.dataFim);
      }
    }

    return this.prisma.relatorioFinanceiro.findMany({
      where,
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
        campanha: { select: { id: true, titulo: true } },
      },
      orderBy: { dataGerado: 'desc' },
    });
  }

  /**
   * ============================================================================
   * BUSCAR RELATÓRIO POR ID
   * ============================================================================
   *
   * Busca relatório financeiro único por ID.
   * Mantido sem alterações da versão anterior.
   */
  async buscarPorId(id: string) {
    return this.prisma.relatorioFinanceiro.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
        campanha: { select: { id: true, titulo: true } },
      },
    });
  }

  /**
   * ============================================================================
   * CALCULAR PAGAMENTOS ATÉ DATA (NOVO - V7.0)
   * ============================================================================
   *
   * Cria relatórios financeiros para todos os usuários (vendedores + gerentes)
   * que possuem saldo > 0, baseado em cartelas completadas até a data de corte.
   *
   * FLUXO:
   * 1. Buscar todos os usuários com saldoPontos > 0
   * 2. Para cada usuário, buscar envios que compõem este saldo
   * 3. Verificar se usuário já tem relatório PENDENTE (evita duplicação)
   * 4. Criar RelatorioFinanceiro com valor do saldo
   * 5. Retornar estatísticas dos relatórios criados
   *
   * IMPORTANTE:
   * - NÃO subtrai do saldo (apenas cria relatório)
   * - NÃO marca envios como liquidados (apenas quando pagar)
   * - Salva IDs dos envios em enviosIncluidos (JSON)
   * - Salva dataCorte para rastreabilidade
   *
   * @param dataCorte - Data limite para considerar cartelas completadas
   * @param adminId - ID do admin que está executando a operação
   * @returns Estatísticas dos relatórios criados
   *
   * @throws BadRequestException se usuário já tem relatório PENDENTE
   */
  async calcularPagamentosAteData(dataCorte: Date, adminId: string) {
    this.logger.log(
      `\n========== CALCULANDO PAGAMENTOS ATÉ ${dataCorte.toISOString()} ==========`
    );
    this.logger.log(`Executado por Admin ID: ${adminId}`);

    return this.prisma.$transaction(async (tx) => {
      // ====================================================================
      // PASSO 1: Buscar usuários com saldo > 0
      // ====================================================================
      const usuariosComSaldo = await tx.usuario.findMany({
        where: {
          saldoPontos: { gt: 0 }
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
        `\nEncontrados ${usuariosComSaldo.length} usuários com saldo > 0`
      );

      if (usuariosComSaldo.length === 0) {
        this.logger.warn('Nenhum usuário com saldo disponível. Nenhum relatório criado.');
        return {
          totalRelatorios: 0,
          valorTotal: 0,
          relatorios: [],
          usuarios: [],
        };
      }

      const relatoriosCriados = [];
      let valorTotalGeral = 0;

      // ====================================================================
      // PASSO 2: Para cada usuário, criar relatório
      // ====================================================================
      for (const usuario of usuariosComSaldo) {
        const saldoNum = usuario.saldoPontos
          ? (typeof usuario.saldoPontos === 'object' && 'toNumber' in usuario.saldoPontos
              ? (usuario.saldoPontos as any).toNumber()
              : Number(usuario.saldoPontos))
          : 0;

        this.logger.log(
          `\n--- Processando: ${usuario.nome} (${usuario.papel}) ---`
        );
        this.logger.log(`  Saldo Atual: R$ ${saldoNum.toFixed(2)}`);

        // ----------------------------------------------------------------
        // Verificar se já tem relatório PENDENTE
        // ----------------------------------------------------------------
        const relatorioPendente = await tx.relatorioFinanceiro.findFirst({
          where: {
            usuarioId: usuario.id,
            status: 'PENDENTE',
          },
        });

        if (relatorioPendente) {
          this.logger.warn(
            `  ⚠️ PULADO: Usuário já possui relatório PENDENTE (ID: ${relatorioPendente.id})`
          );
          this.logger.warn(
            `  → Marque o relatório como PAGO antes de calcular novos pagamentos.`
          );
          continue; // Pula este usuário
        }

        // ----------------------------------------------------------------
        // Buscar envios que compõem este saldo
        // ----------------------------------------------------------------
        const enviosDoSaldo = await tx.envioVenda.findMany({
          where: {
            vendedorId: usuario.id,
            pontosAdicionadosAoSaldo: true,
            pontosLiquidados: false, // Ainda não foi pago
          },
          select: {
            id: true,
            numeroPedido: true,
            valorFinalComEvento: true,
            campanhaId: true,
          },
        });

        this.logger.log(`  Envios no saldo: ${enviosDoSaldo.length}`);

        if (enviosDoSaldo.length === 0) {
          this.logger.warn(
            `  ⚠️ INCONSISTÊNCIA: Saldo > 0 mas nenhum envio encontrado!`
          );
          this.logger.warn(
            `  → Possível erro de sincronização. Pulando usuário.`
          );
          continue;
        }

        // Pegar campanha do primeiro envio (para referência)
        const primeiroCampanhaId = enviosDoSaldo[0]?.campanhaId || null;

        // ----------------------------------------------------------------
        // Determinar tipo de relatório (VENDEDOR ou GERENTE)
        // ----------------------------------------------------------------
        let tipoRelatorio = 'VENDEDOR';
        if (usuario.papel === 'GERENTE') {
          // Verificar se os envios são de vendedores subordinados (comissão)
          // ou se o gerente vendeu diretamente
          const primeiroEnvio = await tx.envioVenda.findUnique({
            where: { id: enviosDoSaldo[0].id },
            select: { vendedorId: true },
          });

          if (primeiroEnvio && primeiroEnvio.vendedorId !== usuario.id) {
            tipoRelatorio = 'GERENTE'; // Comissão de vendedor subordinado
          }
        }

        // ----------------------------------------------------------------
        // Criar RelatorioFinanceiro
        // ----------------------------------------------------------------
        const relatorio = await tx.relatorioFinanceiro.create({
          data: {
            valor: saldoNum,
            tipo: tipoRelatorio,
            usuarioId: usuario.id,
            campanhaId: primeiroCampanhaId || 'MULTIPLAS', // Pode ter múltiplas campanhas
            status: 'PENDENTE',
            dataCorte: dataCorte,
            enviosIncluidos: enviosDoSaldo.map((e) => e.id), // Array de IDs
            observacoes: `Pagamento calculado até ${dataCorte.toLocaleDateString('pt-BR')} pelo admin (ID: ${adminId}). Total de ${enviosDoSaldo.length} envios incluídos.`,
          },
        });

        relatoriosCriados.push(relatorio);
        valorTotalGeral += saldoNum;

        this.logger.log(`  ✅ Relatório criado: ID ${relatorio.id}`);
        this.logger.log(`  ✅ Tipo: ${tipoRelatorio}`);
        this.logger.log(`  ✅ Valor: R$ ${saldoNum.toFixed(2)}`);
      }

      // ====================================================================
      // PASSO 3: Retornar estatísticas
      // ====================================================================
      this.logger.log(`\n========== RESUMO ==========`);
      this.logger.log(`Total de relatórios criados: ${relatoriosCriados.length}`);
      this.logger.log(`Valor total: R$ ${valorTotalGeral.toFixed(2)}`);
      this.logger.log(`========== FIM DO CÁLCULO ==========\n`);

      return {
        totalRelatorios: relatoriosCriados.length,
        valorTotal: valorTotalGeral,
        relatorios: relatoriosCriados,
        usuarios: usuariosComSaldo.map((u) => ({
          id: u.id,
          nome: u.nome,
          papel: u.papel,
          saldo: u.saldoPontos,
        })),
      };
    });
  }

  /**
   * ============================================================================
   * MARCAR COMO PAGO (ATUALIZADO - V7.0)
   * ============================================================================
   *
   * Marca relatório financeiro como pago e dispara gatilhos:
   * 1. Subtrai valor do saldo do usuário
   * 2. Marca envios incluídos como pontosLiquidados = true
   * 3. Atualiza status do relatório para PAGO
   * 4. Cria notificação para o usuário
   *
   * MUDANÇAS CRÍTICAS (V7.0):
   * - NOVO: Subtrai do saldoPontos do usuário
   * - NOVO: Marca envios como pontosLiquidados = true
   * - Mantém lógica transacional e notificação
   *
   * @param id - ID do relatório a ser marcado como pago
   * @returns RelatorioFinanceiro atualizado
   *
   * @throws NotFoundException se relatório não existir
   * @throws BadRequestException se relatório já estiver pago
   */
  async marcarComoPago(id: string) {
    this.logger.log(`\n========== MARCANDO RELATÓRIO COMO PAGO ==========`);
    this.logger.log(`Relatório ID: ${id}`);

    return this.prisma.$transaction(async (tx) => {
      // ================================================================
      // PASSO 1: Buscar relatório
      // ================================================================
      const relatorio = await tx.relatorioFinanceiro.findUnique({
        where: { id },
        include: {
          campanha: { select: { titulo: true } },
          usuario: { select: { id: true, nome: true, saldoPontos: true } },
        },
      });

      if (!relatorio) {
        throw new NotFoundException('Relatório não encontrado');
      }

      if (relatorio.status === 'PAGO') {
        throw new BadRequestException('Relatório já está pago');
      }

      const valorNum = relatorio.valor
        ? (typeof relatorio.valor === 'object' && 'toNumber' in relatorio.valor
            ? (relatorio.valor as any).toNumber()
            : Number(relatorio.valor))
        : 0;

      const saldoAtualNum = relatorio.usuario.saldoPontos
        ? (typeof relatorio.usuario.saldoPontos === 'object' && 'toNumber' in relatorio.usuario.saldoPontos
            ? (relatorio.usuario.saldoPontos as any).toNumber()
            : Number(relatorio.usuario.saldoPontos))
        : 0;

      this.logger.log(`Usuário: ${relatorio.usuario.nome}`);
      this.logger.log(`Saldo Atual: R$ ${saldoAtualNum.toFixed(2)}`);
      this.logger.log(`Valor a Pagar: R$ ${valorNum.toFixed(2)}`);

      // ================================================================
      // PASSO 2: Verificar se saldo é suficiente
      // ================================================================
      if (saldoAtualNum < valorNum) {
        const diferenca = valorNum - saldoAtualNum;
        this.logger.error(
          `❌ ERRO: Saldo insuficiente! Faltam R$ ${diferenca.toFixed(2)}`
        );
        throw new BadRequestException(
          `Saldo insuficiente. Saldo atual: R$ ${saldoAtualNum.toFixed(2)}, Valor a pagar: R$ ${valorNum.toFixed(2)}`
        );
      }

      // ================================================================
      // PASSO 3: Subtrair do saldo do usuário
      // ================================================================
      await tx.usuario.update({
        where: { id: relatorio.usuarioId },
        data: {
          saldoPontos: { decrement: valorNum },
        },
      });

      const novoSaldo = saldoAtualNum - valorNum;
      this.logger.log(`✅ Saldo atualizado: R$ ${novoSaldo.toFixed(2)}`);

      // ================================================================
      // PASSO 4: Marcar envios como liquidados
      // ================================================================
      if (relatorio.enviosIncluidos && Array.isArray(relatorio.enviosIncluidos)) {
        const enviosIds = relatorio.enviosIncluidos as string[];

        if (enviosIds.length > 0) {
          const result = await tx.envioVenda.updateMany({
            where: { id: { in: enviosIds } },
            data: { pontosLiquidados: true },
          });

          this.logger.log(
            `✅ ${result.count} envios marcados como liquidados (pontosLiquidados = true)`
          );
        }
      } else {
        this.logger.warn(
          `⚠️ Relatório não possui enviosIncluidos (campo vazio ou nulo)`
        );
      }

      // ================================================================
      // PASSO 5: Atualizar status do relatório
      // ================================================================
      const relatorioAtualizado = await tx.relatorioFinanceiro.update({
        where: { id },
        data: {
          status: 'PAGO',
          dataPagamento: new Date(),
        },
      });

      this.logger.log(`✅ Relatório marcado como PAGO`);

      // ================================================================
      // PASSO 6: Criar notificação
      // ================================================================
      const mensagem = `💰 Seu pagamento de R$ ${valorNum.toFixed(2)} referente à campanha '${relatorio.campanha.titulo}' foi processado! Novo saldo: R$ ${novoSaldo.toFixed(2)}`;

      await tx.notificacao.create({
        data: {
          usuarioId: relatorio.usuarioId,
          mensagem,
          linkUrl: '/meus-resgates',
        },
      });

      this.logger.log(`✅ Notificação enviada`);
      this.logger.log(`========== PAGAMENTO CONCLUÍDO ==========\n`);

      return relatorioAtualizado;
    });
  }
}
