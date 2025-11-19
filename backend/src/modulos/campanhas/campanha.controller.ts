/**
 * ============================================================================
 * CAMPANHA CONTROLLER - Rotas HTTP do Módulo de Campanhas (CORRIGIDO)
 * ============================================================================
 * * Descrição:
 * Controlador responsável por expor rotas HTTP seguras para gerenciamento
 * de campanhas.
 * * CORREÇÃO (Q.I. 170 - Erro TS2554):
 * - Adicionado `req` ao método `remover` e passado `req.user` para o service,
 * atendendo à nova assinatura do `campanhaService.remover(id, usuario)`.
 * * Segurança:
 * - Rotas de leitura (GET): Qualquer usuário autenticado
 * - Rotas de escrita (POST/PATCH/DELETE): Apenas Admin
 * * @module CampanhasModule
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
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import { CampanhaService } from './campanha.service';
import { CriarCampanhaDto } from './dto/criar-campanha.dto';
import { AtualizarCampanhaDto } from './dto/atualizar-campanha.dto';
import { AtualizarCampanhaAvancadaDto } from './dto/atualizar-campanha-avancada.dto';
import { JwtAuthGuard } from '../comum/guards/jwt-auth.guard';
import { PapeisGuard } from '../comum/guards/papeis.guard';
import { Papeis } from '../comum/decorators/papeis.decorator';

/**
 * Controlador de campanhas.
 * * Prefixo de rotas: /api/campanhas
 */
@Controller('campanhas')
export class CampanhaController {
  /**
   * Logger dedicado para rastrear requisições HTTP.
   */
  private readonly logger = new Logger(CampanhaController.name);

  /**
   * Construtor do controlador.
   * * @param campanhaService - Serviço de campanhas
   */
  constructor(private readonly campanhaService: CampanhaService) {}

  /**
   * Lista campanhas visíveis para o usuário logado.
   *
   * Rota: GET /api/campanhas
   * Acesso: Qualquer usuário autenticado
   *
   * @param req - Request com dados do usuário (injetado por JwtAuthGuard)
   * @returns Array de campanhas
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async listar(@Req() req) {
    const usuario = req.user;
    this.logger.log(`[GET] Listando campanhas para usuário: ${usuario.id} (${usuario.email})`);
    return this.campanhaService.listar(usuario);
  }

  /**
   * Cria uma nova campanha completa.
   * * Rota: POST /api/campanhas
   * Acesso: Admin apenas
   * * @param dto - Dados completos da campanha (aninhados)
   * @param req - Request com dados do usuário (para histórico)
   * @returns Campanha criada
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async criar(@Body() dto: CriarCampanhaDto, @Req() req) {
    this.logger.log(`[POST] [ADMIN] Criando campanha: ${dto.titulo} (Admin: ${req.user.email})`);
    return this.campanhaService.criar(dto, req.user);
  }

  /**
   * Rota específica para vendedores visualizarem campanhas.
   * ⚠️ DEVE VIR ANTES DE GET :id PARA NÃO SER CAPTURADA COMO PARÂMETRO
   *
   * CORREÇÃO (Sprint 20.5 - Erro 404):
   * - Adicionado @UseGuards(JwtAuthGuard) para garantir req.user
   * - Movida ANTES de GET :id (rotas específicas primeiro em NestJS)
   * - Adiciona campo calculado `eventosAtivos` para UX frontend
   *
   * Rota: GET /api/campanhas/:id/vendedor-view
   * Acesso: Qualquer usuário autenticado (filtragem por permissão no service)
   *
   * @param id - UUID da campanha
   * @param req - Request com dados do usuário (injetado por JwtAuthGuard)
   * @returns Campanha com cartelas visíveis + eventosAtivos calculados
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/vendedor-view')
  async buscarPorIdVendedorView(@Param('id') id: string, @Req() req) {
    const usuario = req.user;
    this.logger.log(`[GET] Vendedor-view da campanha: ${id} (usuário: ${usuario.email})`);
    
    // Busca campanha com lógica de cartelas visíveis (service faz RBAC)
    const campanha = await this.campanhaService.buscarPorIdParaVendedorView(id, usuario);
    
    // Calcula eventos ativos no momento da requisição (campo derivado)
    const agoraUtc = new Date();
    const eventosAtivos = (campanha as any).eventosEspeciais?.filter(
      (e: any) => e.ativo && new Date(e.dataInicio) <= agoraUtc && new Date(e.dataFim) >= agoraUtc,
    ) || [];

    return {
      ...campanha,
      eventosAtivos,
    };
  }

  /**
   * Rota específica para analytics de campanhas.
   * ⚠️ DEVE VIR ANTES DE GET :id PARA NÃO SER CAPTURADA COMO PARÂMETRO
   *
   * REFATORAÇÃO (Fase 2 - 100% Absoluto):
   * - NOVO: Endpoint dedicado para analytics
   * - Movida ANTES de GET :id (rotas específicas primeiro em NestJS)
   *
   * Rota: GET /api/campanhas/:id/analytics
   * Acesso: Admin apenas (validação no service)
   *
   * @param id - UUID da campanha
   * @param req - Request com dados do usuário
   * @returns Dados analíticos da campanha
   *
   * NOTA: Se analytics precisar de lógica diferente no futuro,
   * implementar método separado no service.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/analytics')
  async buscarAnalytics(@Param('id') id: string, @Req() req) {
    const usuario = req.user;
    this.logger.log(`[GET] Analytics da campanha: ${id} (usuário: ${usuario.email})`);
    return this.campanhaService.analytics(id, usuario);
  }

  /**
   * Busca uma campanha específica por ID com dados aninhados completos.
   * ⚠️ ROTA GENÉRICA - DEVE VIR DEPOIS DAS ROTAS ESPECÍFICAS
   *
   * Rota: GET /api/campanhas/:id
   * Acesso: Qualquer usuário autenticado
   *
   * @param id - UUID da campanha
   * @param req - Request com dados do usuário (injetado por JwtAuthGuard)
   * @returns Campanha com dados aninhados
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async buscarPorId(@Param('id') id: string, @Req() req) {
    const usuario = req.user;
    this.logger.log(`[GET] Buscando campanha por ID: ${id} (usuário: ${usuario.email})`);
    return this.campanhaService.buscarPorId(id, usuario);
  }

  /**
   * Atualiza dados básicos de uma campanha existente.
   * * Rota: PATCH /api/campanhas/:id
   * Acesso: Admin apenas
   * * @param id - UUID da campanha
   * @param dto - Dados a serem atualizados
   * @returns Campanha atualizada
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('ADMIN')
  @Patch(':id')
  async atualizar(@Param('id') id: string, @Body() dto: AtualizarCampanhaDto) {
    this.logger.log(`[PATCH] [ADMIN] Atualizando campanha: ${id}`);
    return this.campanhaService.atualizar(id, dto);
  }

  /**
   * Edição avançada de campanha (Sprint 19.5).
   * Permite editar produtos, óticas, eventos e campos complexos.
   * 
   * Rota: PATCH /api/campanhas/:id/edicao-avancada
   * Acesso: Admin apenas
   * 
   * @param id - UUID da campanha
   * @param dto - Dados avançados a serem atualizados
   * @param req - Request com dados do usuário (para histórico)
   * @returns Campanha atualizada
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('ADMIN')
  @Patch(':id/edicao-avancada')
  async atualizarAvancado(
    @Param('id') id: string,
    @Body() dto: AtualizarCampanhaAvancadaDto,
    @Req() req,
  ) {
    this.logger.log(`[PATCH] [ADMIN] Edição avançada da campanha: ${id} (Admin: ${req.user.email})`);
    return this.campanhaService.atualizarAvancado(id, dto, req.user);
  }

  /**
   * Busca histórico de alterações de uma campanha.
   * 
   * Rota: GET /api/campanhas/:id/historico
   * Acesso: Admin apenas
   * 
   * @param id - UUID da campanha
   * @returns Array de registros de histórico
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('ADMIN')
  @Get(':id/historico')
  async buscarHistorico(@Param('id') id: string) {
    this.logger.log(`[GET] [ADMIN] Buscando histórico da campanha: ${id}`);
    return this.campanhaService.buscarHistorico(id);
  }

  /**
   * Verifica se um produto pode ser editado (não usado em pedidos validados).
   * Rota: GET /api/campanhas/:id/produtos/:codigoRef/pode-editar
   * Acesso: Admin apenas
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('ADMIN')
  @Get(':id/produtos/:codigoRef/pode-editar')
  async verificarProdutoPodeSerEditado(
    @Param('id') id: string,
    @Param('codigoRef') codigoRef: string,
  ) {
    this.logger.log(`[GET] [ADMIN] Verificando se produto "${codigoRef}" pode ser editado na campanha: ${id}`);
    return this.campanhaService.verificarProdutoPodeSerEditado(id, codigoRef);
  }

  /**
   * Atualiza produtos de um requisito específico (Sprint 21).
   *
   * Rota: PATCH /api/campanhas/requisitos/:requisitoId/produtos
   * Acesso: Admin apenas
   *
   * @param requisitoId - UUID do requisito
   * @param dto - Dados dos produtos (importSessionId ou produtos[])
   * @param req - Request com dados do usuário
   * @returns Requisito atualizado com novos produtos
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('ADMIN')
  @Patch('requisitos/:requisitoId/produtos')
  async atualizarProdutosRequisito(
    @Param('requisitoId') requisitoId: string,
    @Body() dto: { importSessionId?: string; produtos?: Array<{ codigoRef: string; pontosReais: number }> },
    @Req() req,
  ) {
    this.logger.log(`[PATCH] [ADMIN] Atualizando produtos do requisito: ${requisitoId} (Admin: ${req.user.email})`);
    return this.campanhaService.atualizarProdutosRequisito(requisitoId, dto, req.user);
  }

  /**
   * Remove uma campanha do sistema.
   * * Rota: DELETE /api/campanhas/:id
   * Acesso: Admin apenas
   * * @param id - UUID da campanha
   * @param req - Request com dados do usuário (injetado por JwtAuthGuard)
   * @returns Campanha removida
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('ADMIN')
  @Delete(':id')
  async remover(@Param('id') id: string, @Req() req) { // Adicionado @Req() req
    this.logger.log(`[DELETE] [ADMIN] Removendo campanha: ${id}`);
    // CORREÇÃO: Passando o req.user para o service para verificar acesso/existência
    return this.campanhaService.remover(id, req.user); 
  }
}