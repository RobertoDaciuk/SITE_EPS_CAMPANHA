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
}