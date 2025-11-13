import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

/**
 * ====================================================================
 * DTO: AtualizarSenhaDto (HARMONIZADO)
 * ====================================================================
 * * Propósito: Troca de senha pelo próprio usuário (PATCH /perfil/minha-senha).
 * * HARMONIZAÇÃO: A RegEx foi ajustada para ser idêntica à usada no frontend (Zod),
 * garantindo consistência na regra de negócio (Princípio 5.2).
 */
export class AtualizarSenhaDto {
  /**
   * Senha atual do usuário.
   * * @example "Senha@123"
   */
  @IsString({ message: 'A senha atual deve ser uma string.' })
  @IsNotEmpty({ message: 'A senha atual é obrigatória.' })
  senhaAtual: string;

  /**
   * Nova senha.
   * * Requisitos de segurança:
   * - Mínimo 8 caracteres
   * - Pelo menos 1 letra maiúscula
   * - Pelo menos 1 letra minúscula
   * - Pelo menos 1 número
   * - Pelo menos 1 caractere especial (@$!%*?&# - ou outros)
   * * @example "NovaSenha@456"
   */
  @IsString({ message: 'A nova senha deve ser uma string.' })
  @MinLength(8, { message: 'A nova senha deve ter no mínimo 8 caracteres.' })
  // RegEx unificada e mais abrangente para sincronizar com o frontend
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
    {
      message:
        'A nova senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial (@$!%*?&#).',
    },
  )
  novaSenha: string;
}