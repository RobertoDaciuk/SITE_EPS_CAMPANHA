/**
 * ============================================================================
 * DTO: Rejeitar Manual (CORRIGIDO - Segurança/Sanitização)
 * ============================================================================
 * * DTO para o Admin informar o motivo de rejeição manual.
 * * CORREÇÃO (Princípio 5.4): Adicionado `MaxLength` e `@Transform` para
 * sanitização de XSS e controle de tamanho.
 * * @module EnvioVendaModule
 * ============================================================================
 */
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer'; // Importado para sanitização

export class RejeitarManualDto {
  /**
   * Motivo da rejeição.
   * * Limite de 500 caracteres e sanitização básica para prevenir XSS persistente.
   * * @example "Pedido não encontrado no ERP."
   */
  @Transform(({ value }) => {
    if (typeof value === 'string') {
        // Trim e Sanitização básica (remove <, > e & para prevenir injeção)
        return value.trim().replace(/<[^>]*>/g, '').replace(/&/g, '&amp;');
    }
    return value;
  })
  @IsString({ message: 'O motivo deve ser uma string.' })
  @IsNotEmpty({ message: 'O motivo não pode estar vazio.' })
  @MinLength(5, { message: 'O motivo deve ter pelo menos 5 caracteres.' })
  @MaxLength(500, { message: 'O motivo não pode exceder 500 caracteres.' })
  motivoRejeicao: string;
}