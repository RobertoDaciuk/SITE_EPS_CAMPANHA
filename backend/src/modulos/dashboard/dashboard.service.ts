/**
 * ============================================================================
 * DASHBOARD SERVICE - Lógica de Negócio (Corrigido)
 * ============================================================================
 *
 * Propósito:
 * Serviço responsável por agregar e calcular os Key Performance Indicators (KPIs)
 * para os dashboards de cada perfil de usuário (Admin, Gerente, VENDEDOR).
 *
 * CORREÇÃO (Q.I. 170 - Consistência de Tipagem):
 * - Adicionada conversão explícita para Number em `totalPontosReaisTime`
 * no `getKpisGerente` para garantir que o resultado da agregação (que pode
 * ser BigInt no PostgreSQL) seja serializado corretamente no JSON de saída.
 *
 * CORREÇÃO (Anterior):
 * - Reforçada a sanitização de saída no `getKpisGerente`. A agregação
 * `_sum` pode retornar `null`. Garantimos que `totalPontosReaisTime`
 * seja `0` se a agregação falhar ou for nula.
 * - Corrigida a tipagem de `posicaoRankingResult` no `getKpisVendedor`.
 * O resultado de `$queryRaw` é tratado como BigInt e convertido para Number.
 *
 * @module DashboardModule
 * ============================================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PapelUsuario, Prisma, StatusUsuario, StatusEnvioVenda } from '@prisma/client';

/**
 * Interface para a resposta do KPI de Posição no Ranking.
 * Prisma $queryRaw retorna BigInt para COUNT/ROW_NUMBER no PostgreSQL.
 */
interface PosicaoRanking {
  posicao: bigint;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value === 'object' && value !== null && 'toNumber' in value && typeof (value as any).toNumber === 'function') {
      return (value as any).toNumber();
    }
    const coerced = Number(value);
    return Number.isNaN(coerced) ? 0 : coerced;
  }

  private resolveValorEnvio(envio: { valorFinalComEvento: unknown; valorPontosReaisRecebido: unknown }): number {
    if (envio.valorFinalComEvento !== null && envio.valorFinalComEvento !== undefined) {
      return this.toNumber(envio.valorFinalComEvento);
    }
    return this.toNumber(envio.valorPontosReaisRecebido);
  }

  private async sumValorProcessado(where: Prisma.EnvioVendaWhereInput): Promise<number> {
    const envios = await this.prisma.envioVenda.findMany({
      where,
      select: {
        id: true,
        valorFinalComEvento: true,
        valorPontosReaisRecebido: true,
        numeroPedido: true,
      },
    });

    const total = envios.reduce((acc, envio) => acc + this.resolveValorEnvio(envio), 0);

    // 🐛 DEBUG: Log detalhado para pontos pendentes
    if (process.env.NODE_ENV === 'development' && where.pontosAdicionadosAoSaldo === false) {
      this.logger.debug(`🔍 [PONTOS PENDENTES] Encontrados ${envios.length} envios:`);
      envios.forEach((e) => {
        this.logger.debug(`  - Pedido ${e.numeroPedido}: R$ ${this.resolveValorEnvio(e).toFixed(2)}`);
      });
      this.logger.debug(`  💰 Total: R$ ${total.toFixed(2)}`);
    }

    return total;
  }

  /**
   * Obtém os KPIs agregados para o dashboard do ADMIN.
   * * Usa $transaction para garantir atomicidade (Princípio 5.1).
   */
  async getKpisAdmin() {
    // Executa de forma simples para evitar tipos PrismaPromise mistos
    const usuariosPendentes = await this.prisma.usuario.count({ where: { status: 'PENDENTE' } });
    const vendasEmAnalise = await this.prisma.envioVenda.count({ where: { status: 'EM_ANALISE' } });
    // Resgates/prêmios descontinuados
    const resgatesSolicitados = 0;
    const oticasAtivas = await this.prisma.optica.count({ where: { ativa: true } });

    return { usuariosPendentes, vendasEmAnalise, resgatesSolicitados, oticasAtivas };
  }

  /**
   * Obtém os KPIs agregados para o dashboard do GERENTE.
   * * Usa $transaction para garantir atomicidade (Princípio 5.1).
   * @param usuarioId - O ID do gerente autenticado (Princípio 5.5).
   *
   * CORREÇÃO CRÍTICA V7.1:
   * - Adicionado filtro `pontosAdicionadosAoSaldo: true` para garantir que apenas
   *   pontos de cartelas COMPLETAS sejam contabilizados no dashboard da equipe.
   * - INVARIANTE: totalPontosReaisTime deve refletir apenas valores JÁ CREDITADOS.
   */
  async getKpisGerente(usuarioId: string) {
    // KPI 1: total de vendedores
    const totalVendedores = await this.prisma.usuario.count({ where: { gerenteId: usuarioId } });
    // KPI 2: vendas da equipe em análise
    const vendasTimeAnalise = await this.prisma.envioVenda.count({ where: { vendedor: { gerenteId: usuarioId } as any, status: 'EM_ANALISE' } });
    // KPI 3: comissão pendente
    const comissaoPendente = await this.prisma.relatorioFinanceiro.aggregate({
      _sum: { valor: true },
      where: { usuarioId: usuarioId, tipo: 'GERENTE', status: 'PENDENTE' },
    });

    // Calcular total de pontos reais da equipe somando envios validados de todos os vendedores do gerente
    const vendedores = await this.prisma.usuario.findMany({
      where: { gerenteId: usuarioId },
      select: {
        enviosVenda: {
          where: {
            status: StatusEnvioVenda.VALIDADO,
            numeroCartelaAtendida: { not: null },
            pontosAdicionadosAoSaldo: true, // ✅ CRÍTICO: Apenas pontos creditados
          },
          select: {
            valorPontosReaisRecebido: true,
            valorFinalComEvento: true,
          },
        },
      },
    });

    const totalPontosReaisTime = vendedores.reduce((acc, v) => {
      const soma = v.enviosVenda.reduce((s, e) => s + this.resolveValorEnvio(e), 0);
      return acc + soma;
    }, 0);

    return {
      totalVendedores: totalVendedores ?? 0,
      vendasTimeAnalise: vendasTimeAnalise ?? 0,
      comissaoPendente: comissaoPendente._sum.valor?.toNumber() ?? 0,
      totalPontosReaisTime,
    };
  }

  /**
   * Obtém os KPIs agregados para o dashboard do VENDEDOR.
   * * Usa $transaction para garantir atomicidade (Princípio 5.1).
   * @param usuarioId - O ID do vendedor autenticado (Princípio 5.5).
   *
   * CORREÇÃO CRÍTICA V7.1:
   * - Adicionado filtro `pontosAdicionadosAoSaldo: true` para garantir que apenas
   *   pontos de cartelas COMPLETAS sejam contabilizados no dashboard.
   * - INVARIANTE: totalPontos deve refletir apenas valores JÁ CREDITADOS ao saldoPontos.
   */
  async getKpisVendedor(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId }, select: { nivel: true } });
    const vendasAprovadas = await this.prisma.envioVenda.count({ where: { vendedorId: usuarioId, status: 'VALIDADO' } });
    const cartelasCompletas = await this.prisma.cartelaConcluida.count({ where: { vendedorId: usuarioId } });

    const posicaoRankingResult = await this.prisma.$queryRaw<PosicaoRanking[]>(
      Prisma.sql`
        WITH Ranking AS (
          SELECT
            id,
            ROW_NUMBER() OVER (
              ORDER BY (
                SELECT COALESCE(SUM(COALESCE(ev."valorFinalComEvento", ev."valorPontosReaisRecebido")), 0)
                FROM "envios_vendas" ev
                WHERE ev."vendedorId" = usuarios.id
                  AND ev."status" = 'VALIDADO'
                  AND ev."numeroCartelaAtendida" IS NOT NULL
                  AND ev."pontosAdicionadosAoSaldo" = true
              ) DESC,
              "criadoEm" ASC
            ) as posicao
          FROM
            "usuarios"
          WHERE
            papel = ${PapelUsuario.VENDEDOR}::"PapelUsuario"
            AND status = ${StatusUsuario.ATIVO}::"StatusUsuario"
        )
        SELECT
          posicao
        FROM
          Ranking
        WHERE
          id = ${usuarioId}
      `,
    );

    const posicaoRanking = posicaoRankingResult.length > 0 ? Number(posicaoRankingResult[0].posicao) : 0;

    const totalPontos = await this.sumValorProcessado({
      vendedorId: usuarioId,
      status: StatusEnvioVenda.VALIDADO,
      numeroCartelaAtendida: { not: null },
      pontosAdicionadosAoSaldo: true, // ✅ CRÍTICO: Apenas pontos creditados
    });

    return {
      totalPontosReais: totalPontos,
      nivel: usuario?.nivel ?? 'BRONZE',
      vendasAprovadas: vendasAprovadas ?? 0,
      cartelasCompletas: cartelasCompletas ?? 0,
      posicaoRanking,
    };
  }

  /**
   * Obtém o dashboard completo e enriquecido para o vendedor.
   * Consolida dados de múltiplas fontes para uma experiência premium.
   *
   * @param usuarioId - ID do vendedor autenticado
   * @returns Objeto completo com todos os dados do dashboard
   */
  async getDashboardVendedorCompleto(usuarioId: string) {
    // Buscar usuário com dados completos
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        nivel: true,
        avatarUrl: true,
        saldoPontos: true,
        saldoReservado: true,
        criadoEm: true,
      },
    });

    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    // 1. SALDO DETALHADO
    const saldoDisponivel = this.toNumber(usuario.saldoPontos);
    
    // Pontos pendentes: vendas validadas aguardando conclusão de cartela
    // Critérios: status = VALIDADO E pontosAdicionadosAoSaldo = false
    // Estas vendas estão "presas" em cartelas incompletas aguardando liberação
    const pontosPendentes = await this.sumValorProcessado({
      vendedorId: usuarioId,
      status: StatusEnvioVenda.VALIDADO,
      pontosAdicionadosAoSaldo: false,
    });

    // 🐛 DEBUG: Log detalhado para diagnosticar pontos pendentes
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`🔍 [SALDO] Pontos pendentes calculados para ${usuarioId}: ${pontosPendentes}`);
      
      // Verificar todas as vendas validadas e seus estados
      const todasVendasValidadas = await this.prisma.envioVenda.findMany({
        where: {
          vendedorId: usuarioId,
          status: StatusEnvioVenda.VALIDADO,
        },
        select: {
          id: true,
          numeroPedido: true,
          valorFinalComEvento: true,
          valorPontosReaisRecebido: true,
          numeroCartelaAtendida: true,
          pontosAdicionadosAoSaldo: true,
        },
      });
      
      this.logger.debug(`📊 [VENDAS VALIDADAS] Total: ${todasVendasValidadas.length}`);
      todasVendasValidadas.forEach((venda) => {
        const valor = this.resolveValorEnvio(venda);
        const status = venda.pontosAdicionadosAoSaldo ? '✅ Liberado' : '⏳ Pendente';
        const cartela = venda.numeroCartelaAtendida || 'Nenhuma';
        this.logger.debug(`  ${status} | Pedido ${venda.numeroPedido} | R$ ${valor.toFixed(2)} | Cartela: ${cartela}`);
      });
    }
    
    // Total de pontos pagos: soma de todos os relatórios financeiros PAGOS
    const relatoriosPagos = await this.prisma.relatorioFinanceiro.aggregate({
      where: {
        usuarioId: usuarioId,
        status: 'PAGO',
      },
      _sum: {
        valor: true,
      },
    });
    
    const totalPontosPagos = this.toNumber(relatoriosPagos._sum.valor || 0);

    // Calcular pontos ganhos no mês atual (que já foram adicionados ao saldo)
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const pontosGanhosMes = await this.sumValorProcessado({
      vendedorId: usuarioId,
      status: StatusEnvioVenda.VALIDADO,
      numeroCartelaAtendida: { not: null },
      pontosAdicionadosAoSaldo: true,
      dataValidacao: { gte: inicioMes },
    });

    // 2. CAMPANHAS ATIVAS COM PROGRESSO
    const agora = new Date();
    const campanhasAtivas = await this.prisma.campanha.findMany({
      where: {
        dataInicio: { lte: agora },
        dataFim: { gte: agora },
        OR: [
          { paraTodasOticas: true },
          {
            oticasAlvo: {
              some: {
                usuarios: {
                  some: { id: usuarioId },
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        titulo: true,
        descricao: true,
        dataInicio: true,
        dataFim: true,
        imagemCampanha16x9Url: true,
        pontosReaisMaximo: true,
        tags: true,
        cartelas: {
          select: {
            id: true,
            numeroCartela: true,
            descricao: true,
            requisitos: {
              select: {
                id: true,
                descricao: true,
                quantidade: true,
                tipoUnidade: true,
                ordem: true,
              },
              orderBy: { ordem: 'asc' },
            },
          },
          orderBy: { numeroCartela: 'asc' },
        },
        eventosEspeciais: {
          where: {
            ativo: true,
            dataInicio: { lte: agora },
            dataFim: { gte: agora },
          },
          select: {
            id: true,
            nome: true,
            multiplicador: true,
            corDestaque: true,
            dataInicio: true,
            dataFim: true,
          },
        },
      },
      orderBy: { dataFim: 'asc' },
      take: 10,
    });

    // Para cada campanha, calcular progresso das cartelas
    const campanhasComProgresso = await Promise.all(
      campanhasAtivas.map(async (campanha) => {
        // Buscar cartelas concluídas pelo vendedor nesta campanha
        const cartelasConcluidas = await this.prisma.cartelaConcluida.findMany({
          where: {
            vendedorId: usuarioId,
            campanhaId: campanha.id,
          },
          select: { numeroCartela: true },
        });

        const numerosCompletos = cartelasConcluidas.map((c) => c.numeroCartela);

        // Para cada cartela, calcular progresso dos requisitos
        const cartelasComProgresso = await Promise.all(
          campanha.cartelas.map(async (cartela) => {
            const completa = numerosCompletos.includes(cartela.numeroCartela);

            // Se já está completa, retornar 100%
            if (completa) {
              return {
                ...cartela,
                completa: true,
                progresso: 100,
                requisitosProgresso: cartela.requisitos.map((req) => ({
                  ...req,
                  quantidadeAtual: req.quantidade,
                  completo: true,
                })),
              };
            }

            // Calcular progresso de cada requisito
            const requisitosProgresso = await Promise.all(
              cartela.requisitos.map(async (requisito) => {
                const vendasValidadas = await this.prisma.envioVenda.count({
                  where: {
                    vendedorId: usuarioId,
                    campanhaId: campanha.id,
                    requisitoId: requisito.id,
                    status: StatusEnvioVenda.VALIDADO,
                  },
                });

                const quantidadeAtual = Math.min(vendasValidadas, requisito.quantidade);
                const completo = quantidadeAtual >= requisito.quantidade;

                return {
                  ...requisito,
                  quantidadeAtual,
                  completo,
                };
              }),
            );

            // Calcular progresso total da cartela
            const totalRequisitos = requisitosProgresso.length;
            const requisitosCompletos = requisitosProgresso.filter((r) => r.completo).length;
            const progresso = totalRequisitos > 0 ? Math.round((requisitosCompletos / totalRequisitos) * 100) : 0;

            return {
              ...cartela,
              completa: false,
              progresso,
              requisitosProgresso,
            };
          }),
        );

        return {
          ...campanha,
          cartelas: cartelasComProgresso,
        };
      }),
    );

    // 3. HISTÓRICO RECENTE DE VENDAS (últimas 10)
    const historicoVendas = await this.prisma.envioVenda.findMany({
      where: { vendedorId: usuarioId },
      select: {
        id: true,
        numeroPedido: true,
        status: true,
        dataEnvio: true,
        dataValidacao: true,
        valorPontosReaisRecebido: true,
        valorFinalComEvento: true,
        multiplicadorAplicado: true,
        numeroCartelaAtendida: true,
        motivoRejeicaoVendedor: true,
        campanha: {
          select: {
            titulo: true,
            imagemCampanha16x9Url: true,
          },
        },
        requisito: {
          select: {
            descricao: true,
          },
        },
      },
      orderBy: { dataEnvio: 'desc' },
      take: 10,
    });

    const historicoFormatado = historicoVendas.map((venda) => ({
      ...venda,
      valorFinal: this.resolveValorEnvio(venda),
    }));

    // 4. NOTIFICAÇÕES NÃO LIDAS (últimas 5)
    const notificacoesNaoLidas = await this.prisma.notificacao.findMany({
      where: {
        usuarioId: usuarioId,
        lida: false,
      },
      select: {
        id: true,
        mensagem: true,
        dataCriacao: true,
        linkUrl: true,
      },
      orderBy: { dataCriacao: 'desc' },
      take: 5,
    });

    const totalNotificacoesNaoLidas = await this.prisma.notificacao.count({
      where: {
        usuarioId: usuarioId,
        lida: false,
      },
    });

    // 5. MINI-RANKING (Top 5 + Posição do Usuário)
    const topVendedores = await this.prisma.$queryRaw<any[]>(
      Prisma.sql`
        WITH RankingCompleto AS (
          SELECT
            u.id,
            u.nome,
            u."avatarUrl",
            u.nivel,
            COALESCE(SUM(COALESCE(ev."valorFinalComEvento", ev."valorPontosReaisRecebido")), 0) as "totalPontos",
            ROW_NUMBER() OVER (
              ORDER BY COALESCE(SUM(COALESCE(ev."valorFinalComEvento", ev."valorPontosReaisRecebido")), 0) DESC,
              u."criadoEm" ASC
            ) as posicao
          FROM "usuarios" u
          LEFT JOIN "envios_vendas" ev ON ev."vendedorId" = u.id
            AND ev."status" = 'VALIDADO'
            AND ev."numeroCartelaAtendida" IS NOT NULL
            AND ev."pontosAdicionadosAoSaldo" = true
          WHERE u.papel = 'VENDEDOR' AND u.status = 'ATIVO'
          GROUP BY u.id
        )
        SELECT * FROM RankingCompleto
        WHERE posicao <= 5 OR id = ${usuarioId}
        ORDER BY posicao ASC
      `,
    );

    const miniRanking = topVendedores.map((v) => ({
      id: v.id,
      nome: v.nome,
      avatarUrl: v.avatarUrl,
      nivel: v.nivel,
      totalPontos: this.toNumber(v.totalPontos),
      posicao: Number(v.posicao),
      ehUsuarioAtual: v.id === usuarioId,
    }));

    // 6. METAS E OBJETIVOS
    // Encontrar a cartela mais próxima de ser completada
    let proximaMeta = null;

    for (const campanha of campanhasComProgresso) {
      for (const cartela of campanha.cartelas) {
        if (!cartela.completa && cartela.progresso > 0) {
          const requisitosIncompletos = cartela.requisitosProgresso.filter((r: any) => !r.completo);
          const vendasNecessarias = requisitosIncompletos.reduce(
            (total: number, req: any) => total + (req.quantidade - req.quantidadeAtual),
            0,
          );

          if (!proximaMeta || cartela.progresso > proximaMeta.progresso) {
            proximaMeta = {
              campanhaTitulo: campanha.titulo,
              campanhaId: campanha.id,
              numeroCartela: cartela.numeroCartela,
              descricaoCartela: cartela.descricao,
              progresso: cartela.progresso,
              vendasNecessarias,
              requisitosIncompletos: requisitosIncompletos.map((r: any) => ({
                descricao: r.descricao,
                quantidadeAtual: r.quantidadeAtual,
                quantidadeTotal: r.quantidade,
                faltam: r.quantidade - r.quantidadeAtual,
              })),
            };
          }
        }
      }
    }

    // Eventos especiais ativos globais
    const eventosAtivos = campanhasComProgresso
      .flatMap((c) => c.eventosEspeciais)
      .filter((e, index, self) => self.findIndex((evento) => evento.id === e.id) === index);

    // 7. ESTATÍSTICAS DO MÊS
    const vendasAprovadasMes = await this.prisma.envioVenda.count({
      where: {
        vendedorId: usuarioId,
        status: StatusEnvioVenda.VALIDADO,
        dataValidacao: { gte: inicioMes },
      },
    });

    const cartelasCompletasMes = await this.prisma.cartelaConcluida.count({
      where: {
        vendedorId: usuarioId,
        dataConclusao: { gte: inicioMes },
      },
    });

    // Posição atual no ranking
    const posicaoRankingResult = await this.prisma.$queryRaw<PosicaoRanking[]>(
      Prisma.sql`
        WITH Ranking AS (
          SELECT
            id,
            ROW_NUMBER() OVER (
              ORDER BY (
                SELECT COALESCE(SUM(COALESCE(ev."valorFinalComEvento", ev."valorPontosReaisRecebido")), 0)
                FROM "envios_vendas" ev
                WHERE ev."vendedorId" = usuarios.id
                  AND ev."status" = 'VALIDADO'
                  AND ev."numeroCartelaAtendida" IS NOT NULL
                  AND ev."pontosAdicionadosAoSaldo" = true
              ) DESC,
              "criadoEm" ASC
            ) as posicao
          FROM
            "usuarios"
          WHERE
            papel = ${PapelUsuario.VENDEDOR}::"PapelUsuario"
            AND status = ${StatusUsuario.ATIVO}::"StatusUsuario"
        )
        SELECT
          posicao
        FROM
          Ranking
        WHERE
          id = ${usuarioId}
      `,
    );

    const posicaoRanking = posicaoRankingResult.length > 0 ? Number(posicaoRankingResult[0].posicao) : 0;

    // RETORNO CONSOLIDADO
    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        nivel: usuario.nivel,
        avatarUrl: usuario.avatarUrl,
        membroDesde: usuario.criadoEm,
      },
      saldo: {
        disponivel: saldoDisponivel,
        reservado: pontosPendentes,
        total: totalPontosPagos,
        ganhosMes: pontosGanhosMes,
      },
      campanhas: campanhasComProgresso,
      historico: historicoFormatado,
      notificacoes: {
        itens: notificacoesNaoLidas,
        totalNaoLidas: totalNotificacoesNaoLidas,
      },
      ranking: {
        topVendedores: miniRanking,
        posicaoAtual: posicaoRanking,
      },
      metas: {
        proximaCartela: proximaMeta,
        eventosAtivos,
      },
      estatisticas: {
        mes: {
          vendasAprovadas: vendasAprovadasMes,
          cartelasCompletas: cartelasCompletasMes,
          pontosGanhos: pontosGanhosMes,
        },
      },
    };
  }

  /**
   * Obtém o dashboard completo e enriquecido para o gerente.
   * Consolida dados de múltiplas fontes para gestão estratégica da equipe.
   *
   * @param usuarioId - ID do gerente autenticado
   * @returns Objeto completo com todos os dados do dashboard gerente
   */
  async getDashboardGerenteCompleto(usuarioId: string) {
    // Buscar gerente com dados completos
    const gerente = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        avatarUrl: true,
        saldoPontos: true,
        criadoEm: true,
        optica: {
          select: {
            id: true,
            nome: true,
            cidade: true,
            estado: true,
          },
        },
      },
    });

    if (!gerente) {
      throw new Error('Gerente não encontrado');
    }

    // Buscar vendedores da equipe
    const vendedores = await this.prisma.usuario.findMany({
      where: {
        gerenteId: usuarioId,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        avatarUrl: true,
        status: true,
        nivel: true,
        saldoPontos: true,
        criadoEm: true,
        enviosVenda: {
          select: {
            id: true,
            status: true,
            dataEnvio: true,
            dataValidacao: true,
            valorPontosReaisRecebido: true,
            valorFinalComEvento: true,
            numeroCartelaAtendida: true,
            pontosAdicionadosAoSaldo: true,
            campanhaId: true,
          },
        },
      },
    });

    const vendedoresIds = vendedores.map((v) => v.id);
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicioSemana = new Date(agora);
    inicioSemana.setDate(agora.getDate() - 7);
    const inicioSemanaAnterior = new Date(agora);
    inicioSemanaAnterior.setDate(agora.getDate() - 14);

    // 1. COMISSÃO DETALHADA
    const comissaoPendente = await this.prisma.relatorioFinanceiro.aggregate({
      _sum: { valor: true },
      where: { usuarioId: usuarioId, tipo: 'GERENTE', status: 'PENDENTE' },
    });

    const proximoPagamento = await this.prisma.relatorioFinanceiro.findFirst({
      where: { usuarioId: usuarioId, tipo: 'GERENTE', status: 'PENDENTE' },
      orderBy: { criadoEm: 'asc' },
      select: { valor: true, criadoEm: true },
    });

    const historico30Dias = await this.prisma.relatorioFinanceiro.aggregate({
      _sum: { valor: true },
      where: {
        usuarioId: usuarioId,
        tipo: 'GERENTE',
        status: 'PAGO',
        dataPagamento: { gte: new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    // Calcular pontos pendentes (vendas validadas aguardando conclusão de cartela)
    const pontosPendentesEquipe = vendedores.reduce((acc, v) => {
      const pontosPendentes = v.enviosVenda
        .filter((e) => e.status === 'VALIDADO' && !e.pontosAdicionadosAoSaldo)
        .reduce((s, e) => s + this.resolveValorEnvio(e), 0);
      return acc + pontosPendentes;
    }, 0);

    // 2. PERFORMANCE DA EQUIPE
    const totalPontosEquipe = vendedores.reduce((acc, v) => {
      const pontos = v.enviosVenda
        .filter((e) => e.status === 'VALIDADO' && e.numeroCartelaAtendida && e.pontosAdicionadosAoSaldo)
        .reduce((s, e) => s + this.resolveValorEnvio(e), 0);
      return acc + pontos;
    }, 0);

    const pontosSemanaAtual = vendedores.reduce((acc, v) => {
      const pontos = v.enviosVenda
        .filter((e) => e.status === 'VALIDADO' && e.dataValidacao && e.dataValidacao >= inicioSemana && e.pontosAdicionadosAoSaldo)
        .reduce((s, e) => s + this.resolveValorEnvio(e), 0);
      return acc + pontos;
    }, 0);

    const pontosSemanaAnterior = vendedores.reduce((acc, v) => {
      const pontos = v.enviosVenda
        .filter(
          (e) =>
            e.status === 'VALIDADO' &&
            e.dataValidacao &&
            e.dataValidacao >= inicioSemanaAnterior &&
            e.dataValidacao < inicioSemana &&
            e.pontosAdicionadosAoSaldo,
        )
        .reduce((s, e) => s + this.resolveValorEnvio(e), 0);
      return acc + pontos;
    }, 0);

    const crescimentoSemana =
      pontosSemanaAnterior > 0 ? ((pontosSemanaAtual - pontosSemanaAnterior) / pontosSemanaAnterior) * 100 : 0;

    const vendedoresAtivos = vendedores.filter((v) => v.status === 'ATIVO').length;
    const mediaVendedorAtivo = vendedoresAtivos > 0 ? totalPontosEquipe / vendedoresAtivos : 0;

    const cartelasCompletas = await this.prisma.cartelaConcluida.count({
      where: { vendedorId: { in: vendedoresIds } },
    });

    // Evolução temporal (últimos 30 dias)
    const evolucaoTemporal: { data: Date; pontos: number; vendas: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dia = new Date(agora);
      dia.setDate(agora.getDate() - i);
      dia.setHours(0, 0, 0, 0);
      const diaFim = new Date(dia);
      diaFim.setHours(23, 59, 59, 999);

      const vendasDia = await this.prisma.envioVenda.findMany({
        where: {
          vendedorId: { in: vendedoresIds },
          status: StatusEnvioVenda.VALIDADO,
          dataValidacao: { gte: dia, lte: diaFim },
        },
        select: {
          valorPontosReaisRecebido: true,
          valorFinalComEvento: true,
        },
      });

      const pontosDia = vendasDia.reduce((acc, v) => acc + this.resolveValorEnvio(v), 0);

      evolucaoTemporal.push({
        data: dia,
        pontos: pontosDia,
        vendas: vendasDia.length,
      });
    }

    // 3. ALERTAS INTELIGENTES
    const alertas: {
      tipo: 'CRITICO' | 'ATENCAO' | 'OPORTUNIDADE';
      vendedor?: string;
      descricao: string;
      acao: string;
    }[] = [];

    for (const vendedor of vendedores) {
      const ultimaVenda = vendedor.enviosVenda
        .filter((e) => e.status === 'VALIDADO' && e.dataValidacao)
        .sort((a, b) => (b.dataValidacao?.getTime() || 0) - (a.dataValidacao?.getTime() || 0))[0];

      const diasInativo = ultimaVenda?.dataValidacao
        ? Math.floor((agora.getTime() - ultimaVenda.dataValidacao.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((agora.getTime() - vendedor.criadoEm.getTime()) / (1000 * 60 * 60 * 24));

      if (diasInativo > 7) {
        alertas.push({
          tipo: 'CRITICO',
          vendedor: vendedor.nome,
          descricao: `${vendedor.nome} está inativo há ${diasInativo} dias`,
          acao: 'Enviar mensagem motivacional',
        });
      } else if (diasInativo >= 4) {
        alertas.push({
          tipo: 'ATENCAO',
          vendedor: vendedor.nome,
          descricao: `${vendedor.nome} com baixa atividade (${diasInativo} dias sem vendas)`,
          acao: 'Acompanhar performance',
        });
      }

      // Verificar queda de performance
      const vendasUltimos7Dias = vendedor.enviosVenda.filter(
        (e) => e.status === 'VALIDADO' && e.dataValidacao && e.dataValidacao >= inicioSemana,
      ).length;

      const vendasSemanaAnterior = vendedor.enviosVenda.filter(
        (e) =>
          e.status === 'VALIDADO' &&
          e.dataValidacao &&
          e.dataValidacao >= inicioSemanaAnterior &&
          e.dataValidacao < inicioSemana,
      ).length;

      if (vendasSemanaAnterior > 0 && vendasUltimos7Dias < vendasSemanaAnterior * 0.7) {
        const quedaPercentual = Math.round(((vendasSemanaAnterior - vendasUltimos7Dias) / vendasSemanaAnterior) * 100);
        alertas.push({
          tipo: quedaPercentual > 30 ? 'CRITICO' : 'ATENCAO',
          vendedor: vendedor.nome,
          descricao: `${vendedor.nome} com queda de ${quedaPercentual}% em vendas`,
          acao: 'Agendar reunião 1:1',
        });
      }
    }

    // 4. TOP PERFORMERS (Top 5)
    const topPerformers = vendedores
      .map((v) => {
        const pontosTotal = v.enviosVenda
          .filter((e) => e.status === 'VALIDADO' && e.numeroCartelaAtendida && e.pontosAdicionadosAoSaldo)
          .reduce((acc, e) => acc + this.resolveValorEnvio(e), 0);

        const pontosSemana = v.enviosVenda
          .filter((e) => e.status === 'VALIDADO' && e.dataValidacao && e.dataValidacao >= inicioSemana && e.pontosAdicionadosAoSaldo)
          .reduce((acc, e) => acc + this.resolveValorEnvio(e), 0);

        const pontosSemanaAnterior = v.enviosVenda
          .filter(
            (e) =>
              e.status === 'VALIDADO' &&
              e.dataValidacao &&
              e.dataValidacao >= inicioSemanaAnterior &&
              e.dataValidacao < inicioSemana &&
              e.pontosAdicionadosAoSaldo,
          )
          .reduce((acc, e) => acc + this.resolveValorEnvio(e), 0);

        const crescimento = pontosSemanaAnterior > 0 ? ((pontosSemana - pontosSemanaAnterior) / pontosSemanaAnterior) * 100 : 0;

        return {
          vendedor: {
            id: v.id,
            nome: v.nome,
            avatarUrl: v.avatarUrl,
          },
          pontos: pontosTotal,
          crescimento,
        };
      })
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, 5)
      .map((v, index) => ({
        ...v,
        badge: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '',
      }));

    // 5. PIPELINE DE VENDAS
    const pipeline = {
      emAnalise: await this.prisma.envioVenda.count({
        where: { vendedorId: { in: vendedoresIds }, status: 'EM_ANALISE' },
      }),
      validadasHoje: await this.prisma.envioVenda.count({
        where: {
          vendedorId: { in: vendedoresIds },
          status: 'VALIDADO',
          dataValidacao: {
            gte: new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()),
          },
        },
      }),
      rejeitadas7Dias: await this.prisma.envioVenda.count({
        where: {
          vendedorId: { in: vendedoresIds },
          status: 'REJEITADO',
          dataValidacao: { gte: inicioSemana },
        },
      }),
      aguardandoVendedor: await this.prisma.envioVenda.count({
        where: { vendedorId: { in: vendedoresIds }, status: StatusEnvioVenda.REJEITADO },
      }),
    };

    // 6. MAPA DE ATIVIDADE (últimos 7 dias por vendedor)
    const mapaAtividade = await Promise.all(
      vendedores.map(async (v) => {
        const ultimaVenda = v.enviosVenda
          .filter((e) => e.status === 'VALIDADO' && e.dataValidacao)
          .sort((a, b) => (b.dataValidacao?.getTime() || 0) - (a.dataValidacao?.getTime() || 0))[0];

        const diasInativo = ultimaVenda?.dataValidacao
          ? Math.floor((agora.getTime() - ultimaVenda.dataValidacao.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Atividade por dia da semana (últimos 7 dias)
        const atividadeSemanal = [0, 0, 0, 0, 0, 0, 0]; // [dom, seg, ter, qua, qui, sex, sab]
        
        for (let i = 0; i < 7; i++) {
          const dia = new Date(agora);
          dia.setDate(agora.getDate() - (6 - i));
          dia.setHours(0, 0, 0, 0);
          const diaFim = new Date(dia);
          diaFim.setHours(23, 59, 59, 999);

          const vendasDia = v.enviosVenda.filter(
            (e) =>
              e.status === 'VALIDADO' &&
              e.dataValidacao &&
              e.dataValidacao >= dia &&
              e.dataValidacao <= diaFim,
          ).length;

          atividadeSemanal[dia.getDay()] += vendasDia;
        }

        return {
          vendedorId: v.id,
          vendedorNome: v.nome,
          ultimaVenda: ultimaVenda?.dataValidacao || null,
          diasInativo,
          atividadeSemanal,
        };
      }),
    );

    // 7. CAMPANHAS COM ENGAJAMENTO
    const campanhasAtivas = await this.prisma.campanha.findMany({
      where: {
        dataInicio: { lte: agora },
        dataFim: { gte: agora },
      },
      select: {
        id: true,
        titulo: true,
        imagemCampanha16x9Url: true,
      },
    });

    const campanhasEngajamento = await Promise.all(
      campanhasAtivas.map(async (campanha) => {
        // Contar vendedores únicos manualmente
        const vendasCampanha = await this.prisma.envioVenda.findMany({
          where: {
            vendedorId: { in: vendedoresIds },
            campanhaId: campanha.id,
            status: StatusEnvioVenda.VALIDADO,
          },
          select: { vendedorId: true },
        });
        
        const vendedoresParticipando = new Set(vendasCampanha.map((v) => v.vendedorId)).size;

        const totalVendas = await this.prisma.envioVenda.count({
          where: {
            vendedorId: { in: vendedoresIds },
            campanhaId: campanha.id,
            status: StatusEnvioVenda.VALIDADO,
          },
        });

        const cartelasConcluidas = await this.prisma.cartelaConcluida.count({
          where: {
            vendedorId: { in: vendedoresIds },
            campanhaId: campanha.id,
          },
        });

        const participacao = vendedoresAtivos > 0 ? (vendedoresParticipando / vendedoresAtivos) * 100 : 0;
        const mediaCartelas = vendedoresParticipando > 0 ? cartelasConcluidas / vendedoresParticipando : 0;

        // Encontrar melhor vendedor nesta campanha
        const melhorVendedor = vendedores
          .map((v) => {
            const pontosCampanha = v.enviosVenda
              .filter((e) => e.campanhaId === campanha.id && e.status === 'VALIDADO' && e.pontosAdicionadosAoSaldo)
              .reduce((acc, e) => acc + this.resolveValorEnvio(e), 0);
            return { nome: v.nome, pontos: pontosCampanha };
          })
          .sort((a, b) => b.pontos - a.pontos)[0];

        return {
          campanhaId: campanha.id,
          campanhaNome: campanha.titulo,
          campanhaImagem: campanha.imagemCampanha16x9Url,
          participacao,
          totalVendas,
          mediaCartelas,
          melhorVendedor: melhorVendedor?.pontos > 0 ? melhorVendedor.nome : null,
        };
      }),
    );

    // RETORNO CONSOLIDADO
    return {
      gerente: {
        id: gerente.id,
        nome: gerente.nome,
        email: gerente.email,
        avatarUrl: gerente.avatarUrl,
        saldoPontos: this.toNumber(gerente.saldoPontos),
        optica: gerente.optica,
      },
      comissao: {
        pendente: this.toNumber(comissaoPendente._sum.valor || 0),
        proximoPagamento: proximoPagamento
          ? {
              valor: this.toNumber(proximoPagamento.valor),
              data: proximoPagamento.criadoEm,
            }
          : null,
        historico30Dias: this.toNumber(historico30Dias._sum.valor || 0),
        pontosPendentesEquipe: pontosPendentesEquipe,
      },
      performance: {
        totalPontosEquipe,
        crescimentoSemana,
        mediaVendedorAtivo,
        cartelasCompletas,
        evolucaoTemporal,
      },
      alertas: {
        criticos: alertas.filter((a) => a.tipo === 'CRITICO'),
        atencao: alertas.filter((a) => a.tipo === 'ATENCAO'),
        oportunidades: alertas.filter((a) => a.tipo === 'OPORTUNIDADE'),
      },
      topPerformers,
      pipeline,
      mapaAtividade,
      campanhasEngajamento,
      overview: {
        totalVendedores: vendedores.length,
        ativos: vendedores.filter((v) => v.status === 'ATIVO').length,
        pendentes: vendedores.filter((v) => v.status === 'PENDENTE').length,
        bloqueados: vendedores.filter((v) => v.status === 'BLOQUEADO').length,
      },
    };
  }
}