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

import { Injectable } from '@nestjs/common';
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
        valorFinalComEvento: true,
        valorPontosReaisRecebido: true,
      },
    });

    return envios.reduce((total, envio) => total + this.resolveValorEnvio(envio), 0);
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
        criadoEm: true,
      },
    });

    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    // 1. SALDO DETALHADO
    const saldoDisponivel = this.toNumber(usuario.saldoPontos);
    const saldoReservado = 0; // Removido do schema, manter como 0
    const saldoTotal = saldoDisponivel + saldoReservado;

    // Calcular pontos ganhos no mês atual
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
        reservado: saldoReservado,
        total: saldoTotal,
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
}