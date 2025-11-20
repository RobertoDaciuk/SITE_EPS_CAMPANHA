/**
 * ============================================================================
 * DASHBOARD CONTROLLER - Rotas (REFATORADO - RBAC Declarativo)
 * ============================================================================
 *
 * Propósito:
 * Expõe um endpoint unificado e protegido para buscar os KPIs
 * relevantes para o usuário autenticado.
 *
 * REFATORAÇÃO (Princípio 5.4 - RBAC Declarativo):
 * - ADICIONADO: @UseGuards(PapeisGuard) e @Papeis('ADMIN', 'GERENTE', 'VENDEDOR')
 * para controle de acesso explícito e padronizado.
 * - REMOVIDO: Lógica redundante de validação `if (!usuario)` (já tratada por Guards).
 * - SIMPLIFICADO: O `switch` agora foca apenas no roteamento do serviço,
 * pois o `PapeisGuard` garante que o papel é um dos permitidos.
 *
 * Endpoint:
 * - GET /api/dashboard/kpis (Protegido por JWT e Papeis)
 *
 * @module DashboardModule
 * ============================================================================
 */

import {
  Controller,
  Get,
  Request,
  UseGuards,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../comum/guards/jwt-auth.guard';
import { PapeisGuard } from '../comum/guards/papeis.guard'; // Importado
import { Papeis } from '../comum/decorators/papeis.decorator'; // Importado
import { PapelUsuario } from '@prisma/client';

/**
 * Interface para o payload do usuário autenticado injetado pelo JwtAuthGuard.
 */
interface UsuarioAutenticado {
  id: string;
  email: string;
  papel: PapelUsuario;
}

@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/kpis
   *
   * Endpoint unificado que busca os KPIs corretos com base no
   * papel (RBAC) do usuário autenticado.
   *
   * @param req - Objeto Request injetado, contendo `req.user` do JwtAuthGuard.
   * @returns Objeto contendo os KPIs específicos do perfil do usuário.
   * @throws UnauthorizedException - Se o usuário não estiver autenticado (tratado por Guards).
   * @throws ForbiddenException - Se o papel for inválido (tratado por PapeisGuard).
   */
  @UseGuards(JwtAuthGuard, PapeisGuard) // Aplica Autenticação e Autorização em ordem
  @Papeis(PapelUsuario.ADMIN, PapelUsuario.GERENTE, PapelUsuario.VENDEDOR) // Permite apenas os 3 papéis principais
  @Get('kpis')
  async getKpis(@Request() req: { user: UsuarioAutenticado }) {
    const usuario = req.user;

    // A validação `if (!usuario)` é agora feita pelo PapeisGuard.

    // Log de desenvolvimento (Princípio 5.3)
    // REFATORAÇÃO (Fase 2 - 100% Absoluto): Substituído console.log por Logger
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(
        `Buscando KPIs para: ${usuario.email} (Papel: ${usuario.papel})`,
      );
    }

    // Direciona a chamada com base no Papel (Princípio 5.4 e 5.5)
    switch (usuario.papel) {
      case PapelUsuario.ADMIN:
        return this.dashboardService.getKpisAdmin();
      case PapelUsuario.GERENTE:
        return this.dashboardService.getKpisGerente(usuario.id);
      case PapelUsuario.VENDEDOR:
        return this.dashboardService.getKpisVendedor(usuario.id);
      // O case default não é mais necessário, pois PapeisGuard já bloqueia papéis não listados.
      // Se um papel não listado (ex: futuro 'AUDITOR') tentar acessar,
      // ele receberá 403 Forbidden do PapeisGuard.
    }
  }

  /**
   * GET /dashboard/vendedor/completo
   *
   * Endpoint enriquecido para o dashboard do vendedor.
   * Retorna dados completos para uma experiência premium:
   * - Saldo detalhado (disponível, reservado, histórico)
   * - Campanhas ativas com progresso de cartelas
   * - Histórico recente de vendas
   * - Notificações não lidas
   * - Mini-ranking (Top 5 + posição do usuário)
   * - Metas e objetivos atuais
   * - Eventos especiais ativos
   * - Estatísticas do mês
   *
   * @param req - Objeto Request com usuário autenticado
   * @returns Objeto completo com todos os dados do dashboard
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.VENDEDOR)
  @Get('vendedor/completo')
  async getDashboardVendedorCompleto(@Request() req: { user: UsuarioAutenticado }) {
    const usuario = req.user;

    if (process.env.NODE_ENV === 'development') {
      this.logger.log(
        `Buscando dashboard completo para vendedor: ${usuario.email}`,
      );
    }

    return this.dashboardService.getDashboardVendedorCompleto(usuario.id);
  }

  /**
   * GET /dashboard/gerente/completo
   *
   * Endpoint enriquecido para o dashboard do gerente.
   * Retorna dados completos para gestão estratégica da equipe:
   * - Comissão detalhada (pendente, próximo pagamento, histórico, projeção)
   * - Performance da equipe (pontos, crescimento, evolução temporal)
   * - Alertas inteligentes (críticos, atenção, oportunidades)
   * - Top performers (top 5 vendedores com badges)
   * - Pipeline de vendas (em análise, validadas, rejeitadas)
   * - Mapa de atividade (heatmap vendedor x dia)
   * - Campanhas com engajamento da equipe
   * - Overview geral (total, ativos, pendentes, bloqueados)
   *
   * @param req - Objeto Request com usuário autenticado
   * @returns Objeto completo com todos os dados do dashboard gerente
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.GERENTE)
  @Get('gerente/completo')
  async getDashboardGerenteCompleto(@Request() req: { user: UsuarioAutenticado }) {
    const usuario = req.user;

    if (process.env.NODE_ENV === 'development') {
      this.logger.log(
        `Buscando dashboard completo para gerente: ${usuario.email}`,
      );
    }

    return this.dashboardService.getDashboardGerenteCompleto(usuario.id);
  }
}