/**
 * ============================================================================
 * PAPEIS DECORATOR - Decorator para Controle de Acesso Baseado em Papéis
 * ============================================================================
 * 
 * Descrição:
 * Decorator customizado que define quais papéis de usuário (roles) podem
 * acessar um endpoint específico. Funciona em conjunto com o PapeisGuard.
 * 
 * Uso:
 * ```
 * @UseGuards(JwtAuthGuard, PapeisGuard)
 * @Papeis('ADMIN', 'GERENTE')
 * @Get('relatorios')
 * obterRelatorios() {
 *   // Apenas ADMIN e GERENTE podem acessar
 * }
 * ```
 * 
 * Funcionamento:
 * - Usa SetMetadata do NestJS para anexar metadata à rota
 * - PapeisGuard lê essa metadata e compara com o papel do usuário autenticado
 * - Se o papel do usuário estiver na lista, permite acesso
 * - Se não estiver, bloqueia com 403 Forbidden
 * 
 * @module ComumModule
 * ============================================================================
 */

import { SetMetadata } from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';

/**
 * Chave usada para armazenar e recuperar a metadata de papéis.
 * 
 * Esta constante é usada tanto pelo decorator quanto pelo guard para
 * garantir que ambos usem a mesma chave de metadata.
 */
export const PAPEIS_CHAVE = 'papeis';

/**
 * Decorator que define quais papéis podem acessar uma rota.
 * 
 * @param papeis - Lista de papéis permitidos (ADMIN, GERENTE, VENDEDOR)
 * @returns Decorator de metadata
 * 
 * @example
 * ```
 * // Apenas Admin
 * @Papeis('ADMIN')
 * @Delete(':id')
 * remover(@Param('id') id: string) {}
 * 
 * // Admin ou Gerente
 * @Papeis('ADMIN', 'GERENTE')
 * @Get('dashboard')
 * obterDashboard() {}
 * 
 * // Qualquer papel autenticado (não use @Papeis)
 * @UseGuards(JwtAuthGuard)
 * @Get('perfil')
 * obterPerfil() {}
 * ```
 */
export const Papeis = (...papeis: PapelUsuario[]) =>
  SetMetadata(PAPEIS_CHAVE, papeis);
