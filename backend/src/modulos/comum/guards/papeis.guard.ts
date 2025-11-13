/**
 * ============================================================================
 * PAPEIS GUARD - Guard de Controle de Acesso Baseado em Papéis (RBAC) (CORRIGIDO)
 * ============================================================================
 *
 * Descrição:
 * Guard que implementa Role-Based Access Control (RBAC). Verifica se o
 * usuário autenticado possui um dos papéis necessários para acessar a rota.
 *
 * CORREÇÃO (Princípio 5.4 - Segurança):
 * - A mensagem de erro 403 Forbidden AGORA é genérica em produção
 * para evitar o vazamento da estrutura de papéis do sistema.
 * - A mensagem detalhada é mantida APENAS em desenvolvimento.
 *
 * Funciona em conjunto com:
 * - JwtAuthGuard: Autentica o usuário e injeta dados em request.user
 * - @Papeis(): Decorator que define papéis permitidos na rota
 *
 * Cenários de Erro:
 * - 401 Unauthorized: Usuário não autenticado (request.user ausente)
 * - 403 Forbidden: Usuário autenticado mas sem papel necessário (Mensagem genérica em produção)
 *
 * @module ComumModule
 * @see JwtAuthGuard Para autenticação JWT
 * @see Papeis Para decorator de definição de papéis
 * ============================================================================
 */

import { 
  Injectable, 
  CanActivate, 
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config'; // Importação para verificar ambiente
import { PAPEIS_CHAVE } from '../decorators/papeis.decorator';
import { PapelUsuario } from '@prisma/client';

/**
 * PapeisGuard - Guard de autorização baseado em papéis.
 */
@Injectable()
export class PapeisGuard implements CanActivate {
  /**
   * Construtor do PapeisGuard.
   * * @param reflector - Serviço do NestJS para ler metadata de rotas.
   * @param configService - Serviço de configuração para ler variáveis de ambiente.
   */
  constructor(
    private reflector: Reflector,
    private configService: ConfigService, // Injeção de ConfigService
  ) {}

  /**
   * Método canActivate - Determina se a requisição pode acessar a rota.
   * * @param context - Contexto de execução do NestJS (contém dados da requisição)
   * @returns boolean - true se acesso permitido
   * @throws UnauthorizedException - Se usuário não autenticado (request.user ausente)
   * @throws ForbiddenException - Se usuário autenticado mas sem papel necessário
   */
  canActivate(context: ExecutionContext): boolean {
    const papeisNecessarios = this.reflector.getAllAndOverride<PapelUsuario[]>(
      PAPEIS_CHAVE,
      [context.getHandler(), context.getClass()],
    );

    /**
     * Se @Papeis() não foi definido, permite acesso.
     * Requer apenas que o usuário esteja autenticado (JwtAuthGuard).
     */
    if (!papeisNecessarios || papeisNecessarios.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    /**
     * Valida explicitamente se request.user existe.
     * Se não existir, a falha é na autenticação (401 Unauthorized).
     */
    if (!user) {
      throw new UnauthorizedException(
        'Usuário não autenticado. Token JWT ausente ou inválido.'
      );
    }

    /**
     * Compara papel do usuário com papéis permitidos.
     */
    const temPapelNecessario = papeisNecessarios.some(
      (papel) => user.papel === papel
    );

    /**
     * Se usuário NÃO possui papel necessário, bloqueia acesso (403 Forbidden).
     */
    if (!temPapelNecessario) {
      const ambienteDesenvolvimento = this.configService.get<string>('NODE_ENV') !== 'production';
      
      let mensagemErro: string;

      /**
       * MENSAGEM DE ERRO CONDICIONAL (CORREÇÃO DE SEGURANÇA - Princípio 5.4)
       * * Desenvolvimento: Mensagem detalhada com papéis necessários e papel atual.
       * Produção: Mensagem genérica para evitar vazamento de informações.
       */
      if (ambienteDesenvolvimento) {
        // Mensagem detalhada para debug em desenvolvimento
        mensagemErro = 
          `Acesso negado. Papel necessário: ${papeisNecessarios.join(' ou ')}. ` +
          `Você possui o papel: ${user.papel}.`;
      } else {
        // Mensagem genérica em produção (segurança)
        mensagemErro = 'Acesso negado por falta de permissão.';
      }

      throw new ForbiddenException(mensagemErro);
    }

    /**
     * Se usuário possui papel necessário, permite acesso.
     */
    return true;
  }
}