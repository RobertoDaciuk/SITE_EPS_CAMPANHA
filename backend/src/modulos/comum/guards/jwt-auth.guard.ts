/**
 * ============================================================================
 * JWT AUTH GUARD - Guard de Autenticação JWT (REFATORADO - Secure by Default)
 * ============================================================================
 *
 * Descrição:
 * Guard que verifica se a requisição possui um token JWT válido no header
 * Authorization. Este Guard foi REFATORADO para trabalhar como Guard GLOBAL,
 * garantindo "Secure by Default": TODAS as rotas requerem autenticação por
 * padrão, exceto aquelas marcadas com o decorator @Public().
 *
 * REFATORAÇÃO (Sprint 18.2 - Segurança Avançada):
 * - NOVO: Suporte ao decorator @Public() para rotas públicas
 * - NOVO: Lógica de verificação de metadata para bypass de autenticação
 * - NOVO: Documentação completa de integração com Guards globais
 * - CORRIGIDO: Vulnerabilidade #2 (ausência de Guards globais)
 * - CORRIGIDO: Vulnerabilidade #11 (falta de decorator @Public())
 *
 * Funcionamento:
 * 1. Verifica se a rota possui decorator @Public() via Reflector
 * 2. Se @Public() presente: PERMITE acesso sem validar JWT (bypass)
 * 3. Se @Public() ausente: Executa validação JWT padrão via Passport
 * 4. Extrai token do header Authorization: Bearer <token>
 * 5. Valida assinatura e expiração do token via JwtStrategy
 * 6. Decodifica payload e chama JwtStrategy.validate()
 * 7. Injeta dados do usuário em request.user
 * 8. Permite acesso à rota se válido, bloqueia com 401 se inválido
 *
 * Integração com Guards Globais:
 * Este Guard é configurado como APP_GUARD no app.module.ts, garantindo
 * que TODAS as rotas sejam protegidas por padrão:
 * 
 * ```
 * // app.module.ts
 * providers: [
 *   {
 *     provide: APP_GUARD,
 *     useClass: JwtAuthGuard,
 *   },
 * ]
 * ```
 *
 * Rotas Públicas (Sem Autenticação):
 * Para marcar rotas como públicas, use o decorator @Public():
 * 
 * ```
 * @Public()
 * @Post('login')
 * async login(@Body() dados: LoginDto) {
 *   return this.autenticacaoService.login(dados);
 * }
 * ```
 *
 * Rotas Protegidas (Com Autenticação):
 * Todas as rotas SEM @Public() requerem JWT válido automaticamente:
 * 
 * ```
 * @Get('perfil')
 * obterPerfil(@Request() req) {
 *   return req.user; // Usuário autenticado injetado pelo Guard
 * }
 * ```
 *
 * Segurança:
 * - Token JWT deve estar no header Authorization: Bearer <token>
 * - Token é validado usando JWT_SECRET configurado no .env
 * - Token expirado ou inválido retorna 401 Unauthorized
 * - Rotas públicas (@Public()) DEVEM ter Rate Limiting para prevenir abuso
 *
 * @module ComumModule
 * @see JwtStrategy Para lógica de validação do payload JWT
 * @see Public Para decorator de rotas públicas
 * @see app.module.ts Para configuração de Guards globais
 * ============================================================================
 */

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JwtAuthGuard - Guard de autenticação JWT com suporte a rotas públicas.
 * 
 * Herda de AuthGuard('jwt') do Passport, estendendo funcionalidade para
 * permitir bypass de autenticação em rotas marcadas com @Public().
 * 
 * IMPORTANTE: Este Guard é configurado como APP_GUARD no app.module.ts,
 * garantindo que TODAS as rotas sejam protegidas por padrão.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Construtor do JwtAuthGuard.
   * 
   * @param reflector - Serviço do NestJS para ler metadata de rotas.
   *                    Usado para verificar se a rota possui @Public().
   */
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Método canActivate - Determina se a requisição pode acessar a rota.
   * 
   * Lógica:
   * 1. Verifica se a rota possui decorator @Public() via Reflector
   * 2. Se @Public() presente: Retorna true (permite acesso sem JWT)
   * 3. Se @Public() ausente: Chama super.canActivate() (valida JWT)
   * 
   * O Reflector verifica metadata em dois níveis:
   * - context.getHandler(): Metadata no método do controller (@Get, @Post, etc.)
   * - context.getClass(): Metadata na classe do controller
   * 
   * getAllAndOverride: Se a metadata estiver presente em ambos os níveis,
   * o valor do método (handler) tem prioridade sobre o da classe.
   * 
   * @param context - Contexto de execução do NestJS (contém dados da requisição)
   * @returns Promise<boolean> - true se acesso permitido, false caso contrário
   * @throws UnauthorizedException - Se token JWT inválido ou expirado
   * 
   * @example
   * // Rota pública (isPublic = true, retorna true sem validar JWT)
   * @Public()
   * @Post('login')
   * async login() { ... }
   * 
   * @example
   * // Rota protegida (isPublic = false, valida JWT via super.canActivate())
   * @Get('perfil')
   * async obterPerfil() { ... }
   */
  canActivate(context: ExecutionContext) {
    /**
     * Verifica se a rota possui decorator @Public().
     * 
     * getAllAndOverride busca a metadata 'isPublic' em:
     * 1. Método do controller (context.getHandler())
     * 2. Classe do controller (context.getClass())
     * 
     * Se encontrada em ambos, o valor do método tem prioridade.
     */
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    /**
     * Se a rota for pública, permite acesso imediatamente sem validar JWT.
     * 
     * IMPORTANTE: Rotas públicas DEVEM ter Rate Limiting configurado
     * para prevenir abuso (brute force, DoS, etc.).
     */
    if (isPublic) {
      return true;
    }

    /**
     * Se a rota NÃO for pública, executa validação JWT padrão via Passport.
     * 
     * super.canActivate() executa:
     * 1. Extrai token do header Authorization: Bearer <token>
     * 2. Valida assinatura e expiração do token
     * 3. Decodifica payload e chama JwtStrategy.validate()
     * 4. Injeta dados do usuário em request.user
     * 5. Retorna true se válido, lança UnauthorizedException se inválido
     */
    return super.canActivate(context);
  }

  /**
   * Método handleRequest - Processa resultado da validação JWT.
   * 
   * Sobrescreve método padrão do AuthGuard para personalizar tratamento
   * de erros e garantir que request.user seja injetado corretamente.
   * 
   * @param err - Erro ocorrido durante validação (se houver)
   * @param user - Usuário autenticado retornado por JwtStrategy.validate()
   * @param info - Informações adicionais sobre a validação
   * @returns Usuário autenticado (será injetado em request.user)
   * @throws UnauthorizedException - Se validação falhar
   * 
   * @example
   * // Se token válido, retorna user (injetado em request.user)
   * @Get('perfil')
   * obterPerfil(@Request() req) {
   *   console.log(req.user); // { id: '...', email: '...', papel: 'VENDEDOR' }
   * }
   * 
   * @example
   * // Se token inválido, lança UnauthorizedException
   * // Resultado: HTTP 401 Unauthorized
   */
  handleRequest(err, user, info) {
    /**
     * Se houve erro durante validação OU usuário não foi retornado,
     * lança UnauthorizedException com mensagem genérica.
     * 
     * Mensagem genérica previne vazamento de informações sobre o tipo
     * de erro (token expirado vs token inválido vs token ausente).
     */
    if (err || !user) {
      throw err || new UnauthorizedException('Token de autenticação inválido ou expirado');
    }

    /**
     * Se validação bem-sucedida, retorna usuário.
     * 
     * O NestJS injeta automaticamente este objeto em request.user,
     * tornando-o acessível em todos os handlers da rota via @Request().
     */
    return user;
  }
}
