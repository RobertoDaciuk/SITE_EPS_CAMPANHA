/**
 * ============================================================================
 * PUBLIC DECORATOR - Decorator para Rotas Públicas
 * ============================================================================
 *
 * Descrição:
 * Decorator customizado que marca rotas como PÚBLICAS, permitindo acesso
 * sem autenticação JWT. Essencial para rotas como /login, /registrar e
 * /resetar-senha após implementação de Guards globais.
 *
 * Uso:
 * ```
 * @Public()
 * @Post('login')
 * async login(@Body() dados: LoginDto) {
 *   return this.autenticacaoService.login(dados);
 * }
 * ```
 *
 * Funcionamento:
 * - Anexa metadata 'isPublic' = true à rota usando SetMetadata do NestJS
 * - JwtAuthGuard lê essa metadata antes de validar o token
 * - Se isPublic = true, o Guard permite acesso sem verificar JWT
 * - Se isPublic = false (padrão), o Guard exige JWT válido
 *
 * Segurança:
 * - Use este decorator APENAS em rotas que realmente não requerem autenticação
 * - Rotas públicas DEVEM ter validação de Rate Limiting para prevenir abuso
 * - Nunca use @Public() em rotas que manipulam dados sensíveis
 *
 * Integração com Guards Globais:
 * - Este decorator foi criado para trabalhar com APP_GUARD configurado
 *   no app.module.ts, garantindo "Secure by Default"
 * - Sem este decorator, TODAS as rotas exigiriam JWT após Guards globais
 *
 * @module ComumModule
 * @see JwtAuthGuard Para implementação da lógica de verificação
 * @see app.module.ts Para configuração de Guards globais
 * ============================================================================
 */

import { SetMetadata } from '@nestjs/common';

/**
 * Chave de metadata para identificar rotas públicas.
 * 
 * Esta constante é usada pelo JwtAuthGuard para verificar se a rota
 * atual possui o decorator @Public() aplicado.
 * 
 * IMPORTANTE: Esta chave deve ser única no sistema para evitar conflitos
 * com outros decorators customizados.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator @Public() para marcar rotas como públicas.
 * 
 * Internamente, este decorator usa SetMetadata do NestJS para anexar
 * a metadata { isPublic: true } à rota decorada.
 * 
 * @returns Decorator function que anexa metadata à rota
 * 
 * @example
 * // Rota pública de login (não requer autenticação)
 * @Public()
 * @Post('login')
 * async login(@Body() dados: LoginDto) {
 *   return this.autenticacaoService.login(dados);
 * }
 * 
 * @example
 * // Rota pública de auto-registro de vendedor
 * @Public()
 * @Post('registrar')
 * async registrar(@Body() dados: RegistrarUsuarioDto) {
 *   return this.autenticacaoService.registrar(dados);
 * }
 * 
 * @example
 * // Rota pública de reset de senha
 * @Public()
 * @Post('resetar-senha')
 * async resetarSenha(@Body() dados: ResetarSenhaDto) {
 *   return this.autenticacaoService.resetarSenha(dados);
 * }
 * 
 * @example
 * // Rota PROTEGIDA (NÃO usar @Public())
 * @UseGuards(PapeisGuard)
 * @Papeis('ADMIN')
 * @Get('usuarios')
 * async listarUsuarios() {
 *   // Esta rota requer JWT válido + papel ADMIN
 *   return this.usuarioService.listarTodos();
 * }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
