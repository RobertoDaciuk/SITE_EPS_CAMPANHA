/**
 * ============================================================================
 * RANKING CONTROLLER (REFATORADO - RBAC Customizado)
 * ============================================================================
 *
 * Propósito:
 * Controlador com endpoint(s) seguro(s) para consulta do ranking global e por filial.
 *
 * REFATORAÇÃO (Q.I. 170 - RBAC Customizado):
 * - Rota `/por-filial` agora utiliza o `GerenteMatrizGuard` em vez do
 * `PapeisGuard` padrão com restrição apenas a 'GERENTE'.
 * - O novo Guard encapsula a regra de negócio "é GERENTE E é MATRIZ".
 *
 * @module RankingModule
 * ============================================================================
 */
import { Controller, Get, Query, UseGuards, Req, Logger } from '@nestjs/common';
import { JwtAuthGuard } from './../comum/guards/jwt-auth.guard';
import { PapeisGuard } from './../comum/guards/papeis.guard';
import { Papeis } from './../comum/decorators/papeis.decorator';
import { RankingService } from './ranking.service';
import { PaginacaoRankingDto } from './dto/paginacao-ranking.dto';
import { GerenteMatrizGuard } from './guards/gerente-matriz.guard';
import { RankingAdminDto } from './dto/ranking-admin.dto';
import { RankingGerenteDto } from './dto/ranking-gerente.dto';
import { RankingVendedorDto } from './dto/ranking-vendedor.dto';

/**
 * Aplica o Guard de autenticação JWT globalmente para este controller.
 */
@UseGuards(JwtAuthGuard) 
@Controller('ranking')
export class RankingController {
  private readonly logger = new Logger(RankingController.name);

  constructor(private readonly rankingService: RankingService) {}

  /**
   * Endpoint de ranking geral global com paginação e critério de desempate.
   * * Requer apenas JWT válido (JwtAuthGuard).
   */
  @Get('geral')
  async getRankingGeral(@Query() paginacaoDto: PaginacaoRankingDto) {
    // O service agora lida com os defaults do DTO
    return this.rankingService.getRankingGeralPaginado(paginacaoDto);
  }

  /**
   * Endpoint de ranking agrupado por filial para Gerentes de Matriz.
   *
   * @param req - Request com dados do usuário (injetado por JwtAuthGuard)
   * @returns Ranking agrupado (matriz + filiais)
   * @throws ForbiddenException - Se não for Gerente OU não for Matriz (tratado pelo GerenteMatrizGuard).
   */
  @UseGuards(GerenteMatrizGuard) // Novo Guard que valida (papel == GERENTE) E (ótica.ehMatriz == true)
  @Get('por-filial')
  async getRankingPorFilial(@Req() req) {
    const usuario = req.user;
    this.logger.log(
      `[GET /por-filial] [GERENTE MATRIZ] Solicitado por: ${usuario.id} (${usuario.email})`,
    );
    // O service ainda é responsável pela lógica de negócio e validação de fallback
    return this.rankingService.getRankingFiliaisParaMatriz(usuario.id);
  }

  /**
   * ====================================================================
   * ENDPOINT: Ranking para ADMIN
   * ====================================================================
   * 
   * Retorna ranking de vendedores por VALOR com filtros de ótica.
   * Permite visualizar ranking global ou filtrado por matriz/filial.
   *
   * @param dto - Filtros (oticaId opcional) e paginação
   * @returns Ranking ordenado por valor total de vendas aprovadas
   */
  @UseGuards(PapeisGuard)
  @Papeis('ADMIN')
  @Get('admin')
  async getRankingAdmin(@Query() dto: RankingAdminDto) {
    this.logger.log(`[GET /admin] Ranking admin solicitado (oticaId: ${dto.oticaId || 'todas'})`);
    return this.rankingService.getRankingAdmin(dto);
  }

  /**
   * ====================================================================
   * ENDPOINT: Ranking para GERENTE
   * ====================================================================
   * 
   * Retorna ranking de vendedores por VALOR.
   * Gerente de matriz pode filtrar por filial.
   * Gerente de filial vê apenas sua filial.
   *
   * @param req - Request com dados do usuário autenticado
   * @param dto - Filtros (filialId opcional) e paginação
   * @returns Ranking ordenado por valor total de vendas aprovadas
   */
  @UseGuards(PapeisGuard)
  @Papeis('GERENTE')
  @Get('gerente')
  async getRankingGerente(@Req() req, @Query() dto: RankingGerenteDto) {
    const gerenteId = req.user.id;
    this.logger.log(`[GET /gerente] Ranking gerente solicitado por: ${gerenteId}`);
    return this.rankingService.getRankingGerente(gerenteId, dto);
  }

  /**
   * ====================================================================
   * ENDPOINT: Ranking para VENDEDOR
   * ====================================================================
   * 
   * Retorna ranking de vendedores por pontos/valor acumulado.
   * Escopo limitado à ótica do vendedor.
   * Não exibe valores monetários.
   *
   * @param req - Request com dados do usuário autenticado
   * @param dto - Paginação
   * @returns Ranking ordenado por pontos acumulados
   */
  @UseGuards(PapeisGuard)
  @Papeis('VENDEDOR')
  @Get('vendedor')
  async getRankingVendedor(@Req() req, @Query() dto: RankingVendedorDto) {
    const vendedorId = req.user.id;
    this.logger.log(`[GET /vendedor] Ranking vendedor solicitado por: ${vendedorId}`);
    return this.rankingService.getRankingVendedor(vendedorId, dto);
  }

  /**
   * Endpoint de ranking de óticas (agregado).
   *
   * REFATORAÇÃO (Fase 2 - 100% Absoluto):
   * - NOVO: Endpoint para ranking de ÓTICAS (não vendedores)
   * - CORREÇÃO: Frontend chamava este endpoint que não existia
   *
   * Retorna ranking de óticas baseado na soma dos pontos (valor real) de todos vendedores.
   * Apenas óticas com `visivelNoRanking = true` são exibidas.
   *
   * Requer apenas JWT válido (qualquer papel autenticado).
   *
   * @param paginacaoDto - DTO com pagina e limite
   * @returns Ranking de óticas ordenado por total de pontos (valor)
   */
  @Get('oticas')
  async getRankingOticas(@Query() paginacaoDto: PaginacaoRankingDto) {
    this.logger.log('[GET /oticas] Ranking de óticas solicitado');
    return this.rankingService.getRankingOticas(paginacaoDto);
  }
}