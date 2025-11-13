/**
 * ============================================================================
 * DTO: Criar Envio de Venda (CORRIGIDO - Robustez do numeroPedido)
 * ============================================================================
 * * Descrição:
 * Data Transfer Object para validação de submissão de venda pelo vendedor.
 * * CORREÇÃO (Princípio 5.2):
 * - Adicionado `@Transform` para `trim` e sanitização básica de XSS no
 * `numeroPedido`.
 * - O `trim` garante que `@IsNotEmpty` falhe se o campo for apenas espaços.
 * * @module EnvioVendaModule
 * ============================================================================
 */

import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer'; // Importado para trim/sanitização

/**
 * DTO para criação de um envio de venda.
 */
export class CriarEnvioVendaDto {
  /**
   * Número do pedido (vindo do sistema externo ou planilha).
   * * CORREÇÃO: Aplica trim e sanitização para evitar injeção de HTML/scripts
   * e garantir que a string não seja apenas espaços em branco.
   * * @example "#12345"
   */
  @Transform(({ value }) => {
    if (typeof value === 'string') {
        // Trim e Sanitização básica (remove <, > e & para prevenir injeção)
        return value.trim().replace(/<|>/g, '').replace(/&/g, '&amp;');
    }
    return value;
  })
  @IsString({ message: 'O número do pedido deve ser uma string' })
  // @IsNotEmpty agora é eficiente, pois o trim transforma "  " em ""
  @IsNotEmpty({ message: 'O número do pedido não pode estar vazio' }) 
  numeroPedido: string;

  /**
   * ID da campanha à qual esta venda pertence.
   * * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @IsUUID('4', { message: 'O ID da campanha deve ser um UUID válido' })
  campanhaId: string;

  /**
   * ID do requisito (card) contra o qual esta venda está sendo submetida.
   * * @example "550e8400-e29b-41d4-a716-446655440001"
   */
  @IsUUID('4', { message: 'O ID do requisito deve ser um UUID válido' })
  requisitoId: string;
}