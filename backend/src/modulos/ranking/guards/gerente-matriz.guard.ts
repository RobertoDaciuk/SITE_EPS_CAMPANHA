/**
 * ============================================================================
 * GERENTE MATRIZ GUARD - Guard de Autorização Customizado (NOVO)
 * ============================================================================
 *
 * Propósito:
 * Implementa uma regra de acesso de alto nível: Garante que o usuário
 * autenticado seja um Gerente (PapelUsuario.GERENTE) E que sua ótica
 * vinculada (Optica) tenha o campo `ehMatriz` como `true`.
 *
 * Utilização:
 * - Aplicado na rota GET /ranking/por-filial.
 *
 * Funcionamento:
 * 1. Assume que `JwtAuthGuard` já injetou `request.user`.
 * 2. Consulta o banco de dados via `PrismaService` para verificar a
 * propriedade `ehMatriz` da ótica do usuário.
 * 3. Lança 403 Forbidden se as condições não forem atendidas.
 *
 * @module RankingModule
 * @see ranking.service.ts para a validação de fallback.
 * ============================================================================
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service'; // Importado para acesso ao banco

/**
 * Interface simplificada do usuário injetado pelo JWT.
 */
interface UsuarioJwt {
  id: string;
  papel: PapelUsuario;
}

@Injectable()
export class GerenteMatrizGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Método canActivate - Verifica se o usuário é um Gerente de Matriz.
   *
   * @param context - Contexto de execução do NestJS.
   * @returns Promise<boolean> - true se acesso permitido.
   * @throws ForbiddenException - Se não for Gerente de Matriz.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: UsuarioJwt = request.user;

    // Se o usuário não foi injetado (JwtAuthGuard falhou ou foi bypassado),
    // o PapeisGuard ou JwtAuthGuard já deve ter lançado 401. Se chegou aqui, user existe.

    // 1. Condição básica: O usuário deve ser um GERENTE.
    if (user.papel !== PapelUsuario.GERENTE) {
      throw new ForbiddenException(
        'Acesso negado. A rota é exclusiva para Gerentes.',
      );
    }

    // 2. Condição de negócio: O gerente deve estar associado a uma Ótica Matriz.
    const gerenteMatriz = await this.prisma.usuario.findUnique({
      where: { id: user.id },
      select: {
        optica: {
          select: {
            ehMatriz: true,
          },
        },
      },
    });

    /**
     * Rejeita se:
     * a) Não tiver ótica vinculada (gerenteMatriz.optica é null)
     * b) A ótica não for Matriz (gerenteMatriz.optica.ehMatriz é false)
     */
    if (
      !gerenteMatriz ||
      !gerenteMatriz.optica ||
      !gerenteMatriz.optica.ehMatriz
    ) {
      throw new ForbiddenException(
        'Acesso negado. Você não está associado a uma Ótica Matriz.',
      );
    }

    // Se passou, permite acesso.
    return true;
  }
}