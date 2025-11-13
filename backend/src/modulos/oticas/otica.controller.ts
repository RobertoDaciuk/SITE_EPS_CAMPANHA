/**
 * ============================================================================
 * OTICA CONTROLLER - Rotas HTTP do Módulo de Óticas
 * ============================================================================
 * 
 * Descrição:
 * Controlador responsável por expor endpoints HTTP para gerenciamento de
 * óticas parceiras. Define rotas para CRUD (Admin) e verificação pública
 * de CNPJ (para fluxo de auto-registro de usuários).
 * 
 * Base URL: /api/oticas
 * 
 * Rotas Públicas (sem autenticação):
 * - GET /api/oticas/verificar-cnpj/:cnpj
 *   Verifica se um CNPJ pertence a uma ótica parceira
 *   Usado no fluxo de auto-registro ("Jornada de João")
 * 
 * Rotas Admin (requerem autenticação - a implementar):
 * - POST /api/oticas - Criar ótica
 * - GET /api/oticas - Listar todas as óticas
 * - GET /api/oticas/:id - Buscar ótica por ID
 * - PATCH /api/oticas/:id - Atualizar ótica
 * - DELETE /api/oticas/:id - Remover ótica
 * 
 * Próxima Etapa:
 * Quando implementarmos autenticação (JWT), adicionar guard @UseGuards(JwtAuthGuard)
 * e @Roles('ADMIN') nas rotas de CRUD.
 * 
 * @module OticasModule
 * ============================================================================
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { OticaService } from './otica.service';
import { JwtAuthGuard } from './../comum/guards/jwt-auth.guard';
import { PapeisGuard } from './../comum/guards/papeis.guard';
import { Papeis } from './../comum/decorators/papeis.decorator';
import { PapelUsuario } from '@prisma/client';
import { CriarOticaDto } from './dto/criar-otica.dto';
import { AtualizarOticaDto } from './dto/atualizar-otica.dto';
import { ListarOticasFiltroDto } from './dto/listar-oticas.filtro.dto';
import { ToggleRankingVendedoresDto } from './dto/toggle-ranking-vendedores.dto';
import { Public } from './../comum/decorators/public.decorator';

/**
 * Controlador de rotas para gerenciamento de óticas.
 * 
 * Prefixo de rota: /api/oticas
 */
@Controller('oticas')
export class OticaController {
  /**
   * Logger dedicado para rastrear requisições HTTP do módulo de óticas.
   */
  private readonly logger = new Logger(OticaController.name);

  /**
   * Construtor do controlador.
   * 
   * @param oticaService - Serviço de lógica de negócio de óticas
   */
  constructor(private readonly oticaService: OticaService) {}

  // ==========================================================================
  // ROTA PÚBLICA: Verificar CNPJ (Fluxo de Auto-Registro)
  // ==========================================================================

  /**
   * Verifica se um CNPJ pertence a uma ótica parceira.
   * 
   * Esta rota é PÚBLICA (não requer autenticação) e é usada no fluxo de
   * auto-registro de vendedores/gerentes ("Jornada de João").
   * 
   * Quando um usuário se registra, ele informa o CNPJ da ótica dele. O
   * frontend chama esta rota para validar se o CNPJ é de uma parceira.
   * 
   * Se válido, exibe o nome da ótica para confirmação visual.
   * Se inválido, exibe erro amigável.
   * 
   * Rota: GET /api/oticas/verificar-cnpj/:cnpj
   * 
   * @param cnpj - CNPJ com ou sem pontuação (path parameter)
   * @returns Dados da ótica se encontrada
   * 
   * @throws {BadRequestException} Se CNPJ inválido (não tem 14 dígitos)
   * @throws {NotFoundException} Se CNPJ não cadastrado ou ótica inativa
   * 
   * @example
   * ```
   * # Com pontuação
   * GET /api/oticas/verificar-cnpj/12.345.678/0001-90
   * 
   * # Sem pontuação
   * GET /api/oticas/verificar-cnpj/12345678000190
   * ```
   * 
   * Resposta de Sucesso (200):
   * ```
   * {
   *   "id": "uuid",
   *   "cnpj": "12345678000190",
   *   "nome": "Ótica Central LTDA",
   *   "cidade": "São Paulo",
   *   "estado": "SP",
   *   "ativa": true
   * }
   * ```
   * 
   * Resposta de Erro (404):
   * ```
   * {
   *   "statusCode": 404,
   *   "message": "Este CNPJ não pertence a uma ótica parceira.",
   *   "error": "Not Found"
   * }
   * ```
   */
  @Public()
  @Get('verificar-cnpj/:cnpj')
  @HttpCode(HttpStatus.OK)
  async verificarCnpj(@Param('cnpj') cnpj: string) {
    this.logger.log(`[PÚBLICO] Verificando CNPJ: ${cnpj}`);

    const optica = await this.oticaService.buscarPorCnpjPublico(cnpj);

    return optica;
  }

  // ==========================================================================
  // ROTAS ADMIN: CRUD de Óticas
  // ==========================================================================
  // IMPORTANTE: Adicionar @UseGuards(JwtAuthGuard) e @Roles('ADMIN')
  // quando implementarmos autenticação JWT.
  // ==========================================================================

  /**
   * Cria uma nova ótica parceira.
   * 
   * Rota: POST /api/oticas
   * Acesso: Admin apenas (guard a implementar)
   * 
   * @param dados - Dados da ótica (validados pelo DTO)
   * @returns Ótica criada
   * 
   * @throws {BadRequestException} Se CNPJ inválido
   * @throws {ConflictException} Se CNPJ já cadastrado
   * 
   * @example
   * ```
   * POST /api/oticas
   * Content-Type: application/json
   * 
   * {
   *   "cnpj": "12.345.678/0001-90",
   *   "nome": "Ótica Central LTDA",
   *   "endereco": "Rua das Flores, 123",
   *   "cidade": "São Paulo",
   *   "estado": "SP",
   *   "telefone": "(11) 98765-4321",
   *   "email": "contato@oticacentral.com"
   * }
   * ```
   */

  // ==========================================================================
  // ROTAS ADMIN PROTEGIDAS (JWT + RBAC)
  // ==========================================================================

  /**
   * Rota admin: Listar óticas com filtros.
   *
   * REFATORAÇÃO (Fase 2 - Correção Crítica):
   * - REMOVIDO: Definições duplicadas de rotas sem guards (linhas 187-268)
   * - MANTIDO: Apenas rotas protegidas com JwtAuthGuard + PapeisGuard
   * - CORREÇÃO: Resolve conflito de rotas @Get() e @Get(':id')
   */
  @Get()
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.ADMIN)
  @HttpCode(HttpStatus.OK)
  async listarAdmin(@Query() filtros: ListarOticasFiltroDto) {
    this.logger.log(`ADMIN: Listando óticas (filtros: ${JSON.stringify(filtros)})`);
    return await this.oticaService.listarAdmin(filtros);
  }

  /**
   * Rota admin: Criar nova ótica.
   */
  @Post()
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async criar(@Body() dto: CriarOticaDto) {
    this.logger.log(`ADMIN: Criando ótica: ${dto.nome}`);
    return await this.oticaService.criar(dto);
  }

  /**
   * Rota admin: Buscar ótica por ID.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.ADMIN)
  @HttpCode(HttpStatus.OK)
  async buscarPorIdAdmin(@Param('id') id: string) {
    this.logger.log(`ADMIN: Buscando ótica por ID: ${id}`);
    return await this.oticaService.buscarPorIdAdmin(id);
  }

  /**
   * Rota admin: Atualizar dados de uma ótica.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.ADMIN)
  @HttpCode(HttpStatus.OK)
  async atualizar(@Param('id') id: string, @Body() dto: AtualizarOticaDto) {
    this.logger.log(`ADMIN: Atualizando ótica (ID: ${id})`);
    return await this.oticaService.atualizar(id, dto);
  }

  /**
   * Rota admin: Desativar ótica (soft delete).
   */
  @Patch(':id/desativar')
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.ADMIN)
  @HttpCode(HttpStatus.OK)
  async desativar(@Param('id') id: string) {
    this.logger.log(`ADMIN: Desativando ótica (ID: ${id})`);
    return await this.oticaService.desativar(id);
  }

  /**
   * Rota admin: Reativar ótica.
   */
  @Patch(':id/reativar')
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.ADMIN)
  @HttpCode(HttpStatus.OK)
  async reativar(@Param('id') id: string) {
    this.logger.log(`ADMIN: Reativando ótica (ID: ${id})`);
    return await this.oticaService.reativar(id);
  }

  // ==========================================================================
  // ROTAS GERENTE: Gestão da Própria Ótica
  // ==========================================================================

  /**
   * Rota gerente: Buscar dados da minha ótica.
   *
   * REFATORAÇÃO (Fase 2 - 100% Absoluto):
   * - NOVO: Endpoint para gerente visualizar sua própria ótica
   * - CORREÇÃO: Frontend chamava este endpoint que não existia
   *
   * Permite que gerente visualize dados da ótica onde trabalha.
   * Usado no frontend para exibir informações da ótica no ranking.
   *
   * @param req - Request com usuário autenticado (opticaId extraído do JWT)
   * @returns Dados completos da ótica
   * @throws NotFoundException - Se ótica não encontrada
   * @throws UnauthorizedException - Se usuário não tem opticaId (não é gerente/vendedor)
   */
  @Get('minha-otica')
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.GERENTE, PapelUsuario.VENDEDOR)
  @HttpCode(HttpStatus.OK)
  async minhaOtica(@Request() req: any) {
    const { opticaId } = req.user;

    if (!opticaId) {
      throw new UnauthorizedException('Usuário não está vinculado a uma ótica.');
    }

    this.logger.log(`GERENTE: Buscando minha ótica (ID: ${opticaId})`);
    return await this.oticaService.buscarPorIdAdmin(opticaId);
  }

  /**
   * Rota gerente: Alterar visibilidade da ótica no ranking.
   *
   * REFATORAÇÃO (Fase 2 - 100% Absoluto):
   * - NOVO: Endpoint para gerente ocultar/exibir sua ótica no ranking
   * - CORREÇÃO: Frontend chamava este endpoint que não existia
   *
   * Permite que gerente de ótica controle se sua ótica aparece no ranking público.
   * Campo: `visivelNoRanking` (boolean)
   *
   * @param req - Request com usuário autenticado (opticaId extraído do JWT)
   * @param dados - Objeto com campo visivel (boolean)
   * @returns Ótica atualizada
   * @throws NotFoundException - Se ótica não encontrada
   * @throws UnauthorizedException - Se usuário não tem opticaId
   */
  @Patch('minha-otica/ranking-visibilidade')
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.GERENTE)
  @HttpCode(HttpStatus.OK)
  async alterarVisibilidadeRanking(
    @Request() req: any,
    @Body() dados: { visivel: boolean },
  ) {
    const { opticaId } = req.user;

    if (!opticaId) {
      throw new UnauthorizedException('Usuário não está vinculado a uma ótica.');
    }

    this.logger.log(
      `GERENTE: Alterando visibilidade ranking (ID: ${opticaId}, visivel: ${dados.visivel})`,
    );
    return await this.oticaService.alterarVisibilidadeRanking(opticaId, dados.visivel);
  }

  /**
   * ====================================================================
   * ENDPOINT: Toggle Ranking para Vendedores (GERENTE)
   * ====================================================================
   * 
   * Permite que gerente habilite ou desabilite a visualização do ranking
   * no menu dos vendedores da sua ótica.
   *
   * Regra: Apenas gerentes podem modificar esta configuração da sua ótica.
   *
   * @param req - Request com usuário autenticado (opticaId extraído do JWT)
   * @param dados - Objeto com campo rankingVisivelParaVendedores (boolean)
   * @returns Ótica atualizada
   * @throws NotFoundException - Se ótica não encontrada
   * @throws UnauthorizedException - Se usuário não tem opticaId
   */
  @Patch('minha-otica/toggle-ranking-vendedores')
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.GERENTE)
  @HttpCode(HttpStatus.OK)
  async toggleRankingVendedores(
    @Request() req: any,
    @Body() dados: ToggleRankingVendedoresDto,
  ) {
    const { opticaId } = req.user;

    if (!opticaId) {
      throw new UnauthorizedException('Usuário não está vinculado a uma ótica.');
    }

    this.logger.log(
      `GERENTE: Toggle ranking vendedores (ID: ${opticaId}, visivel: ${dados.rankingVisivelParaVendedores})`,
    );
    return await this.oticaService.toggleRankingVendedores(
      opticaId,
      dados.rankingVisivelParaVendedores,
    );
  }
}
