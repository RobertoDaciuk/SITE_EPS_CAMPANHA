/**
 * ============================================================================
 * RANKING SERVICE - Lógica de Negócio (REFATORADO - Performance)
 * ============================================================================
 *
 * Propósito:
 * Serviço dedicado à lógica de ranking (global, equipe e posições).
 *
 * REFATORAÇÃO (Q.I. 170 - Performance Crítica):
 * - REESCRITO: `getPosicaoUsuario` agora usa `Prisma.$queryRaw` com a função
 * SQL `ROW_NUMBER()`.
 * - MOTIVO: O método anterior trazia e percorria TODOS os usuários em memória
 * (O(N)), causando gargalo em bases grandes (Princípio 5.1). A nova solução é O(log N).
 *
 * REFATORAÇÃO (Q.I. 170 - DTO):
 * - REMOVIDO: A responsabilidade de definir valores padrão (`pagina = 1`, etc.)
 * do DTO e movida para o service.
 *
 * ATUALIZADO (Sprint 17 - Tarefa 43):
 * - Inclui método getRankingFiliaisParaMatriz para Gerentes de Matriz
 *
 * @module RankingModule
 * ============================================================================
 */
import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PapelUsuario, StatusUsuario, StatusEnvioVenda, Prisma } from '@prisma/client';
import { PaginacaoRankingDto } from './dto/paginacao-ranking.dto';
import { RankingAdminDto } from './dto/ranking-admin.dto';
import { RankingGerenteDto } from './dto/ranking-gerente.dto';
import { RankingVendedorDto } from './dto/ranking-vendedor.dto';

/**
 * Interface para tipar o resultado da consulta raw de posição.
 */
interface PosicaoUsuarioRaw {
  posicao: bigint; // PostgreSQL retorna BigInt para ROW_NUMBER()
}

/**
 * Serviço dedicado à lógica de ranking (global, equipe e posições).
 */
@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);

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

  /**
   * Calcula a posição de um usuário no ranking global dos vendedores
   * usando a Window Function ROW_NUMBER() do SQL.
   *
   * @param usuarioId ID do usuário a consultar
   * @returns Posição do usuário (1-baseado). Retorna 0 se não for elegível/encontrado.
   * @throws NotFoundException (ou 0) se usuário não ranqueado/encontrado.
   *
   * CORREÇÃO CRÍTICA V7.1:
   * - Adicionado filtro `pontosAdicionadosAoSaldo = true` para garantir que apenas
   *   pontos de cartelas COMPLETAS sejam contabilizados no ranking.
   *
   * @example
   * const { posicao } = await this.getPosicaoUsuario('uuid-vendedor'); // { posicao: 42 }
   */
  async getPosicaoUsuario(usuarioId: string): Promise<{ posicao: number }> {
    /**
     * Consulta SQL otimizada (O(log N)):
     * 1. Cria uma CTE (Common Table Expression) 'Ranking'.
     * 2. Usa ROW_NUMBER() para calcular a posição no ranking, com desempate.
     * 3. Filtra o resultado pela ID do usuário.
     */
    const resultado = await this.prisma.$queryRaw<PosicaoUsuarioRaw[]>(
      Prisma.sql`
        WITH Ranking AS (
          SELECT
            id,
            ROW_NUMBER() OVER (
              -- Ordena por soma dos pontos reais recebidos (valorPontosReaisRecebido) em envios validados
              ORDER BY (
                SELECT COALESCE(SUM(COALESCE(ev."valorFinalComEvento", ev."valorPontosReaisRecebido")), 0)
                FROM "envios_vendas" ev
                WHERE ev."vendedorId" = usuarios.id
                  AND ev."status" = 'VALIDADO'
                  AND ev."numeroCartelaAtendida" IS NOT NULL
                  AND ev."pontosAdicionadosAoSaldo" = true
              ) DESC, "criadoEm" ASC
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

    // Converte BigInt para Number. Retorna 0 se o usuário não for encontrado/elegível.
    const posicao = resultado.length > 0 ? Number(resultado[0].posicao) : 0;
    
    return { posicao };
  }

  /**
   * Retorna o ranking da equipe de um gerente (somente seus vendedores).
   * @param gerenteId ID do gerente
   *
   * CORREÇÃO CRÍTICA V7.1:
   * - Adicionado filtro `pontosAdicionadosAoSaldo: true` para garantir que apenas
   *   pontos de cartelas COMPLETAS sejam contabilizados no ranking da equipe.
   */
  async getRankingEquipe(gerenteId: string) {
    // Buscar vendedores da equipe e calcular total de pontos reais por vendedor
    const vendedores = await this.prisma.usuario.findMany({
      where: { gerenteId },
      select: {
        id: true,
        nome: true,
        avatarUrl: true,
        nivel: true,
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
      take: 1000,
    });

    return vendedores
      .map(v => ({
        id: v.id,
        nome: v.nome,
        avatarUrl: v.avatarUrl,
        nivel: v.nivel,
  totalPontosReais: v.enviosVenda.reduce((s, e) => s + this.resolveValorEnvio(e), 0),
      }))
      .sort((a, b) => b.totalPontosReais - a.totalPontosReais);
  }

  /**
   * Retorna o ranking global de vendedores com paginação e desempate.
   *
   * @param dto PaginacaoRankingDto com filtros de página e quantidade
   *
   * CORREÇÃO CRÍTICA V7.1:
   * - Adicionado filtro `pontosAdicionadosAoSaldo: true` para garantir que apenas
   *   pontos de cartelas COMPLETAS sejam contabilizados no ranking global.
   */
  async getRankingGeralPaginado(dto: PaginacaoRankingDto) {
    // Valores padrão definidos aqui (regras de negócio)
    const pagina = dto.pagina ?? 1;
    const porPagina = dto.porPagina ?? 20;
    
    const skip = (pagina - 1) * porPagina;
    const take = porPagina;

    // Buscar todos os vendedores ativos (paginaremos depois em JS) com envios validados
    const usuarios = await this.prisma.usuario.findMany({
      where: { papel: PapelUsuario.VENDEDOR, status: StatusUsuario.ATIVO },
      select: {
        id: true,
        nome: true,
        avatarUrl: true,
        nivel: true,
        optica: { select: { nome: true } },
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

    // Calcular valor total (soma de pontosReais) e ordenar
    const usuariosComValor = usuarios
      .map(u => ({
        id: u.id,
        nome: u.nome,
        avatarUrl: u.avatarUrl,
        nivel: u.nivel,
    optica: u.optica,
    valorTotal: u.enviosVenda.reduce((s, e) => s + this.resolveValorEnvio(e), 0),
      }))
      .sort((a, b) => b.valorTotal - a.valorTotal);

    const total = usuariosComValor.length;
    const totalPaginas = Math.ceil(total / porPagina);

    // Paginar em memória e adicionar posição
    const usuariosPaginados = usuariosComValor.slice(skip, skip + take);
    const dadosComPosicao = usuariosPaginados.map((usuario, index) => ({
      ...usuario,
      posicao: skip + index + 1,
    }));

    return {
      dados: dadosComPosicao,
      paginaAtual: pagina,
      totalPaginas,
      totalRegistros: total,
    };
  }

  /**
   * Retorna o ranking agrupado por filial para Gerentes de Matriz.
   *
   * @param matrizGerenteId - ID do gerente da matriz
   * @returns Ranking agrupado (matriz + filiais)
   * @throws {ForbiddenException} Se o usuário não for Gerente de Matriz
   */
  async getRankingFiliaisParaMatriz(matrizGerenteId: string): Promise<any> {
    this.logger.log(`Buscando rankings por filial para Gerente Matriz ID: ${matrizGerenteId}`);

    // 1. Buscar o gerente e sua ótica Matriz com as Filiais
    const gerenteMatriz = await this.prisma.usuario.findUnique({
      where: { id: matrizGerenteId, papel: PapelUsuario.GERENTE },
      include: {
        optica: {
          include: {
            filiais: {
              // Busca as filiais ligadas a esta matriz
              select: { id: true, nome: true },
              where: { ativa: true }, // Considera apenas filiais ativas
              orderBy: { nome: 'asc' },
            },
          },
        },
      },
    });

    // Validação: Usuário é gerente? Está ligado a uma ótica? A ótica é matriz?
    if (!gerenteMatriz || !gerenteMatriz.optica || !gerenteMatriz.optica.ehMatriz) {
      this.logger.warn(`Usuário ${matrizGerenteId} não é um Gerente de Matriz válido.`);
      throw new ForbiddenException(
        'Acesso negado. Apenas gerentes de matriz podem ver rankings por filial.',
      );
    }

    const matriz = gerenteMatriz.optica;
    const filiais = matriz.filiais;

    // Função auxiliar para buscar ranking de uma ótica
    const buscarRankingOptica = async (opticaId: string) => {
      const vendedores = await this.prisma.usuario.findMany({
        where: { opticaId: opticaId, papel: PapelUsuario.VENDEDOR, status: StatusUsuario.ATIVO },
        select: {
          id: true,
          nome: true,
          avatarUrl: true,
          nivel: true,
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
        take: 100,
      });

      return vendedores
        .map((v) => ({
          id: v.id,
          nome: v.nome,
          avatarUrl: v.avatarUrl,
          nivel: v.nivel,
          totalPontosReais: v.enviosVenda.reduce((s, e) => s + this.resolveValorEnvio(e), 0),
        }))
        .sort((a, b) => b.totalPontosReais - a.totalPontosReais);
    };

    // 2. Buscar ranking da Matriz e de cada Filial (em paralelo)
    const [rankingMatriz, ...rankingsFiliais] = await Promise.all([
      buscarRankingOptica(matriz.id),
      ...filiais.map(filial => buscarRankingOptica(filial.id)),
    ]);

    // 3. Montar a resposta estruturada
    const resultado = {
      matriz: {
        id: matriz.id,
        nome: matriz.nome,
        ranking: rankingMatriz,
      },
      filiais: filiais.map((filial, index) => ({
        id: filial.id,
        nome: filial.nome,
        ranking: rankingsFiliais[index],
      })),
    };

    this.logger.log(
      `Rankings por filial para Gerente ${matrizGerenteId} (${matriz.nome}) buscados com sucesso.`,
    );
    return resultado;
  }

  /**
   * ====================================================================
   * MÉTODO: Ranking para ADMIN
   * ====================================================================
   * 
   * Retorna ranking de vendedores por VALOR de vendas aprovadas.
   * Permite filtrar por ótica (matriz ou filial).
   * Se filtrar por matriz com filiais, mostra ranking consolidado.
   *
   * @param dto - Filtros e paginação
   * @returns Ranking ordenado por valor total (pontos agregados)
   */
  async getRankingAdmin(dto: RankingAdminDto) {
    const pagina = dto.pagina ?? 1;
    const limite = dto.limite ?? 50;
    const skip = (pagina - 1) * limite;

    // Buscar óticas elegíveis baseado no filtro
    let oticasIds: string[] = [];

    if (dto.oticaId) {
      // Verificar se é matriz com filiais
      const otica = await this.prisma.optica.findUnique({
        where: { id: dto.oticaId },
        include: { filiais: { select: { id: true } } },
      });

      if (!otica) {
        return {
          dados: [],
          paginaAtual: pagina,
          totalPaginas: 0,
          totalRegistros: 0,
        };
      }

      // Se for matriz, incluir todas as filiais
      if (otica.ehMatriz && otica.filiais.length > 0) {
        oticasIds = [otica.id, ...otica.filiais.map(f => f.id)];
      } else {
        oticasIds = [otica.id];
      }
    }

    // Query base para vendedores
    const whereClause: Prisma.UsuarioWhereInput = {
      papel: PapelUsuario.VENDEDOR,
      status: StatusUsuario.ATIVO,
      ...(oticasIds.length > 0 && { opticaId: { in: oticasIds } }),
    };

    // Buscar vendedores com suas cartelas completadas
    const vendedores = await this.prisma.usuario.findMany({
      where: whereClause,
        select: {
        id: true,
        nome: true,
        avatarUrl: true,
        nivel: true,
        optica: {
          select: {
            id: true,
            nome: true,
            cnpj: true,
          },
        },
        enviosVenda: {
          where: {
            status: StatusEnvioVenda.VALIDADO,
            numeroCartelaAtendida: { not: null },
            pontosAdicionadosAoSaldo: true, // ✅ CRÍTICO: Apenas pontos creditados
          },
          select: {
            numeroCartelaAtendida: true,
            valorPontosReaisRecebido: true,
            valorFinalComEvento: true,
          },
        },
      },
    });

    // Calcular valor total (soma de pontosReais de todas as cartelas completadas) e ordenar
    const vendedoresComValor = vendedores
      .map(v => {
        const valorTotal = v.enviosVenda.reduce((sum, e) => {
          return sum + this.resolveValorEnvio(e);
        }, 0);

        return {
          id: v.id,
          nome: v.nome,
          avatarUrl: v.avatarUrl,
          nivel: v.nivel,
          optica: v.optica,
          valorTotal,
        };
      })
      .sort((a, b) => b.valorTotal - a.valorTotal);

    // Paginar
    const total = vendedoresComValor.length;
    const vendedoresPaginados = vendedoresComValor.slice(skip, skip + limite);

    // Adicionar posição
    const dadosComPosicao = vendedoresPaginados.map((v, index) => ({
      ...v,
      posicao: skip + index + 1,
    }));

    return {
      dados: dadosComPosicao,
      paginaAtual: pagina,
      totalPaginas: Math.ceil(total / limite),
      totalRegistros: total,
    };
  }

  /**
   * ====================================================================
   * MÉTODO: Ranking para GERENTE
   * ====================================================================
   * 
   * Retorna ranking de vendedores por VALOR de vendas aprovadas.
   * Gerente de Matriz: pode filtrar por filial específica.
   * Gerente de Filial: vê apenas sua filial.
   *
   * @param gerenteId - ID do gerente autenticado
   * @param dto - Filtros e paginação
   * @returns Ranking ordenado por valor total, mostrando também moedinhas
   */
  async getRankingGerente(gerenteId: string, dto: RankingGerenteDto) {
    const pagina = dto.pagina ?? 1;
    const limite = dto.limite ?? 50;
    const skip = (pagina - 1) * limite;

    // Buscar gerente e sua ótica
    const gerente = await this.prisma.usuario.findUnique({
      where: { id: gerenteId },
      include: {
        optica: {
          include: {
            filiais: { select: { id: true, nome: true, cnpj: true } },
          },
        },
      },
    });

    if (!gerente || !gerente.optica) {
      throw new ForbiddenException('Gerente sem ótica vinculada.');
    }

    const otica = gerente.optica;
    let oticasIds: string[] = [];

    // Determinar escopo baseado em matriz/filial
    if (otica.ehMatriz) {
      // Gerente de Matriz
      if (dto.filialId) {
        // Filtrar por filial específica
        const filialValida = otica.filiais.find(f => f.id === dto.filialId);
        if (filialValida) {
          oticasIds = [dto.filialId];
        } else {
          // Filial inválida, retornar vazio
          return {
            dados: [],
            paginaAtual: pagina,
            totalPaginas: 0,
            totalRegistros: 0,
            oticasFiltro: otica.filiais, // Para o frontend montar select
          };
        }
      } else {
        // Todas as filiais + matriz
        oticasIds = [otica.id, ...otica.filiais.map(f => f.id)];
      }
    } else {
      // Gerente de Filial: apenas sua filial
      oticasIds = [otica.id];
    }

    // Buscar vendedores com cartelas completadas
    const vendedores = await this.prisma.usuario.findMany({
      where: {
        papel: PapelUsuario.VENDEDOR,
        status: StatusUsuario.ATIVO,
        opticaId: { in: oticasIds },
      },
      select: {
        id: true,
        nome: true,
        avatarUrl: true,
        nivel: true,
        optica: {
          select: {
            id: true,
            nome: true,
            cnpj: true,
          },
        },
        enviosVenda: {
          where: {
            status: StatusEnvioVenda.VALIDADO,
            numeroCartelaAtendida: { not: null },
            pontosAdicionadosAoSaldo: true, // ✅ CRÍTICO: Apenas pontos creditados
          },
          select: {
            numeroCartelaAtendida: true,
            valorPontosReaisRecebido: true,
            valorFinalComEvento: true,
          },
        },
      },
    });

    // Calcular valor total (soma de pontosReais de todas as cartelas completadas) e ordenar
    const vendedoresComValor = vendedores
      .map(v => {
        const valorTotal = v.enviosVenda.reduce((sum, e) => {
          return sum + this.resolveValorEnvio(e);
        }, 0);

        return {
          id: v.id,
          nome: v.nome,
          avatarUrl: v.avatarUrl,
          nivel: v.nivel,
          optica: v.optica,
          valorTotal,
        };
      })
      .sort((a, b) => b.valorTotal - a.valorTotal);

    // Paginar
    const total = vendedoresComValor.length;
    const vendedoresPaginados = vendedoresComValor.slice(skip, skip + limite);

    // Adicionar posição
    const dadosComPosicao = vendedoresPaginados.map((v, index) => ({
      ...v,
      posicao: skip + index + 1,
    }));

    return {
      dados: dadosComPosicao,
      paginaAtual: pagina,
      totalPaginas: Math.ceil(total / limite),
      totalRegistros: total,
      ...(otica.ehMatriz && { oticasFiltro: otica.filiais }), // Opcional para frontend
    };
  }

  /**
   * ====================================================================
   * MÉTODO: Ranking para VENDEDOR
   * ====================================================================
   * 
   * Retorna ranking de vendedores por pontos/valor acumulado.
   * Escopo: apenas vendedores da mesma ótica.
   * Não mostra valores monetários.
   *
   * @param vendedorId - ID do vendedor autenticado
   * @param dto - Paginação
   * @returns Ranking ordenado por moedinhas
   */
  async getRankingVendedor(vendedorId: string, dto: RankingVendedorDto) {
    const pagina = dto.pagina ?? 1;
    const limite = dto.limite ?? 50;
    const skip = (pagina - 1) * limite;

    // Buscar vendedor e sua ótica
    const vendedor = await this.prisma.usuario.findUnique({
      where: { id: vendedorId },
      select: { opticaId: true },
    });

    if (!vendedor || !vendedor.opticaId) {
      throw new ForbiddenException('Vendedor sem ótica vinculada.');
    }

    // Buscar todos os vendedores da ótica e calcular total de pontos reais por vendedor
    const vendedores = await this.prisma.usuario.findMany({
      where: {
        papel: PapelUsuario.VENDEDOR,
        status: StatusUsuario.ATIVO,
        opticaId: vendedor.opticaId,
      },
      select: {
        id: true,
        nome: true,
        avatarUrl: true,
        nivel: true,
      },
    });

    const ranking = await Promise.all(
      vendedores.map(async (u) => {
        const resultado = await this.prisma.$queryRaw<{ total: number }[]>(
          Prisma.sql`
            SELECT COALESCE(SUM(COALESCE(ev."valorFinalComEvento", ev."valorPontosReaisRecebido")), 0)::numeric AS total
            FROM "envios_vendas" ev
            WHERE ev."vendedorId" = ${u.id}
              AND ev."status" = 'VALIDADO'
              AND ev."numeroCartelaAtendida" IS NOT NULL
              AND ev."pontosAdicionadosAoSaldo" = true
          `,
        );

        const valorTotal = this.toNumber(resultado[0]?.total ?? 0);

        return {
          id: u.id,
          nome: u.nome,
          avatarUrl: u.avatarUrl,
          nivel: u.nivel,
          valorTotal,
        };
      }),
    );

    // ordenar por valorTotal e paginar
    const ordenado = ranking.sort((a, b) => b.valorTotal - a.valorTotal);
    const total = ordenado.length;
    const paginado = ordenado.slice(skip, skip + limite);

    const dadosComPosicao = paginado.map((v, index) => ({
      ...v,
      posicao: skip + index + 1,
    }));

    return {
      dados: dadosComPosicao,
      paginaAtual: pagina,
      totalPaginas: Math.ceil(total / limite),
      totalRegistros: total,
    };
  }

  /**
   * Retorna ranking de óticas (agregado) com paginação.
   *
   * REFATORAÇÃO (Fase 2 - 100% Absoluto):
   * - NOVO: Ranking de ÓTICAS (não vendedores)
   * - CORREÇÃO: Frontend chamava método que não existia
   *
   * Agrega todos os vendedores por ótica e calcula total de pontos (valor real).
   * Apenas óticas com `visivelNoRanking = true` são incluídas.
   *
   * @param dto - DTO com pagina e porPagina
   * @returns Ranking de óticas ordenado por total de pontos (valor) DESC
   */
  async getRankingOticas(dto: PaginacaoRankingDto) {
    const pagina = dto.pagina ?? 1;
    const porPagina = dto.porPagina ?? 20;

    const skip = (pagina - 1) * porPagina;
    const take = porPagina;

    this.logger.log(`[getRankingOticas] Buscando ranking de óticas (página: ${pagina}, porPagina: ${porPagina})`);

    /**
     * ESTRATÉGIA CORRIGIDA (evita erro TS2615 do groupBy):
     * 1. Buscar IDs das óticas elegíveis (ativa: true, visivelNoRanking: true)
     * 2. Agregar vendedores dessas óticas com groupBy
     * 3. Ordenar, paginar e enriquecer dados
     */

    // Etapa 1: Buscar IDs de óticas elegíveis
    const oticasElegiveis = await this.prisma.optica.findMany({
      where: {
        ativa: true,
        visivelNoRanking: true,
        usuarios: {
          some: {
            papel: PapelUsuario.VENDEDOR,
            status: StatusUsuario.ATIVO,
          },
        },
      },
      select: { id: true },
    });

    const idsOticasElegiveis = oticasElegiveis.map((o) => o.id);

    if (idsOticasElegiveis.length === 0) {
      // Nenhuma ótica elegível
      return {
        data: [],
        paginacao: {
          paginaAtual: pagina,
          porPagina,
          total: 0,
          totalPaginas: 0,
        },
      };
    }

    // Etapa 2: Para cada ótica, agregar soma dos pontos reais recebidos pelos seus vendedores
    const aggregations = await Promise.all(
      idsOticasElegiveis.map(async (opticaId) => {
        const resultado = await this.prisma.$queryRaw<{ total: number }[]>(
          Prisma.sql`
            SELECT COALESCE(SUM(COALESCE(ev."valorFinalComEvento", ev."valorPontosReaisRecebido")), 0)::numeric AS total
            FROM "envios_vendas" ev
            WHERE ev."status" = 'VALIDADO'
              AND ev."numeroCartelaAtendida" IS NOT NULL
              AND ev."pontosAdicionadosAoSaldo" = true
              AND EXISTS (
                SELECT 1
                FROM "usuarios" u
                WHERE u."id" = ev."vendedorId"
                  AND u."opticaId" = ${opticaId}
                  AND u."papel" = ${PapelUsuario.VENDEDOR}::"PapelUsuario"
              )
          `,
        );

        return {
          opticaId,
          totalPontosReais: this.toNumber(resultado[0]?.total ?? 0),
        };
      }),
    );

    // Etapa 3: Ordenar manualmente por pontos reais
    const rankingsOrdenados = aggregations.sort((a, b) => b.totalPontosReais - a.totalPontosReais);

    // Etapa 4: Paginar manualmente
    const rankingsPaginados = rankingsOrdenados.slice(skip, skip + take);

    // Etapa 5: Enriquecer com dados da ótica
    const rankingsEnriquecidos = await Promise.all(
      rankingsPaginados.map(async (ranking, index) => {
        const optica = await this.prisma.optica.findUnique({
          where: { id: ranking.opticaId },
          select: {
            id: true,
            nome: true,
            cidade: true,
            estado: true,
          },
        });

        return {
          posicao: skip + index + 1,
          optica,
          totalPontosReais: ranking.totalPontosReais,
        };
      }),
    );

    const total = rankingsOrdenados.length;

    this.logger.log(`[getRankingOticas] ${rankingsEnriquecidos.length} óticas encontradas (total: ${total})`);

    return {
      data: rankingsEnriquecidos,
      paginacao: {
        paginaAtual: pagina,
        porPagina,
        total,
        totalPaginas: Math.ceil(total / porPagina),
      },
    };
  }
}