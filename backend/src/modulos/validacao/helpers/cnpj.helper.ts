/**
 * ============================================================================
 * CNPJ HELPER - Validação Completa de CNPJ Brasileiro
 * ============================================================================
 *
 * Responsável por:
 * - Limpeza de CNPJ (remoção de caracteres especiais)
 * - Validação de formato (14 dígitos)
 * - Validação de dígitos verificadores (algoritmo oficial da Receita Federal)
 * - Rejeição de CNPJs conhecidos como inválidos (ex: 00000000000000, 11111111111111)
 *
 * FORMATO CNPJ: XX.XXX.XXX/XXXX-XX (14 dígitos)
 * - 8 primeiros dígitos: número base
 * - 4 dígitos seguintes: filial (0001 = matriz)
 * - 2 últimos dígitos: dígitos verificadores
 *
 * ALGORITMO DOS DÍGITOS VERIFICADORES:
 * - Primeiro dígito: calculado com pesos 5,4,3,2,9,8,7,6,5,4,3,2
 * - Segundo dígito: calculado com pesos 6,5,4,3,2,9,8,7,6,5,4,3,2
 * - Resto da divisão por 11: se < 2, dígito = 0, senão dígito = 11 - resto
 *
 * @module ValidacaoModule
 * ============================================================================
 */

import { Logger } from '@nestjs/common';

const logger = new Logger('CnpjHelper');

/**
 * ============================================================================
 * HELPER: limparCnpj
 * ============================================================================
 *
 * Remove todos os caracteres não-numéricos do CNPJ.
 *
 * @param cnpj - CNPJ com ou sem formatação
 * @returns CNPJ limpo (apenas números) ou null se inválido
 *
 * @example
 * limparCnpj("12.345.678/0001-90") // "12345678000190"
 * limparCnpj("12345678000190")     // "12345678000190"
 * limparCnpj(null)                 // null
 */
export function limparCnpj(cnpj: string | null | undefined): string | null {
  if (!cnpj) {
    return null;
  }

  const cnpjLimpo = String(cnpj).replace(/\D/g, '');
  return cnpjLimpo.length > 0 ? cnpjLimpo : null;
}

/**
 * ============================================================================
 * HELPER: validarCnpj
 * ============================================================================
 *
 * Valida um CNPJ brasileiro completo, incluindo:
 * - Formato (14 dígitos)
 * - Rejeição de CNPJs conhecidos como inválidos (todos zeros, todos iguais)
 * - Validação dos dígitos verificadores usando o algoritmo oficial
 *
 * @param cnpj - CNPJ a ser validado (com ou sem formatação)
 * @returns true se o CNPJ é válido, false caso contrário
 *
 * @example
 * validarCnpj("11.222.333/0001-81") // true (CNPJ válido)
 * validarCnpj("00.000.000/0000-00") // false (todos zeros)
 * validarCnpj("11.222.333/0001-99") // false (dígitos verificadores incorretos)
 * validarCnpj("123456")              // false (formato inválido)
 */
export function validarCnpj(cnpj: string | null | undefined): boolean {
  // Limpar o CNPJ
  const cnpjLimpo = limparCnpj(cnpj);

  if (!cnpjLimpo) {
    logger.debug('CNPJ vazio ou nulo');
    return false;
  }

  // Validar formato: deve ter exatamente 14 dígitos
  if (cnpjLimpo.length !== 14) {
    logger.warn(`CNPJ com formato inválido: ${cnpjLimpo} (${cnpjLimpo.length} dígitos)`);
    return false;
  }

  // Rejeitar CNPJs conhecidos como inválidos (todos os dígitos iguais)
  const cnpjsInvalidos = [
    '00000000000000',
    '11111111111111',
    '22222222222222',
    '33333333333333',
    '44444444444444',
    '55555555555555',
    '66666666666666',
    '77777777777777',
    '88888888888888',
    '99999999999999',
  ];

  if (cnpjsInvalidos.includes(cnpjLimpo)) {
    logger.warn(`CNPJ conhecido como inválido (todos dígitos iguais): ${cnpjLimpo}`);
    return false;
  }

  // Validar os dígitos verificadores
  try {
    // Calcular primeiro dígito verificador
    const primeiroDigitoCalculado = calcularDigitoVerificador(cnpjLimpo, 12);
    const primeiroDigitoInformado = parseInt(cnpjLimpo.charAt(12), 10);

    if (primeiroDigitoCalculado !== primeiroDigitoInformado) {
      logger.warn(
        `CNPJ com primeiro dígito verificador inválido: ${cnpjLimpo} ` +
        `(esperado: ${primeiroDigitoCalculado}, informado: ${primeiroDigitoInformado})`
      );
      return false;
    }

    // Calcular segundo dígito verificador
    const segundoDigitoCalculado = calcularDigitoVerificador(cnpjLimpo, 13);
    const segundoDigitoInformado = parseInt(cnpjLimpo.charAt(13), 10);

    if (segundoDigitoCalculado !== segundoDigitoInformado) {
      logger.warn(
        `CNPJ com segundo dígito verificador inválido: ${cnpjLimpo} ` +
        `(esperado: ${segundoDigitoCalculado}, informado: ${segundoDigitoInformado})`
      );
      return false;
    }

    logger.debug(`CNPJ válido: ${cnpjLimpo}`);
    return true;
  } catch (error) {
    logger.error(`Erro ao validar CNPJ: ${cnpjLimpo}`, error);
    return false;
  }
}

/**
 * ============================================================================
 * HELPER INTERNO: calcularDigitoVerificador
 * ============================================================================
 *
 * Calcula um dígito verificador do CNPJ usando o algoritmo oficial.
 *
 * ALGORITMO:
 * 1. Multiplicar cada dígito por seu peso correspondente
 * 2. Somar todos os resultados
 * 3. Calcular o resto da divisão por 11
 * 4. Se resto < 2, dígito = 0, senão dígito = 11 - resto
 *
 * @param cnpj - CNPJ limpo (apenas números)
 * @param posicao - Posição do dígito a calcular (12 para primeiro, 13 para segundo)
 * @returns Dígito verificador calculado (0-9)
 *
 * @private
 */
function calcularDigitoVerificador(cnpj: string, posicao: 12 | 13): number {
  // Pesos para o cálculo
  // Posição 12 (primeiro dígito): usa os primeiros 12 dígitos do CNPJ
  // Posição 13 (segundo dígito): usa os primeiros 13 dígitos do CNPJ
  const pesos = posicao === 12
    ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  // Calcular a soma dos produtos
  let soma = 0;
  for (let i = 0; i < posicao; i++) {
    const digito = parseInt(cnpj.charAt(i), 10);
    soma += digito * pesos[i];
  }

  // Calcular o resto da divisão por 11
  const resto = soma % 11;

  // Se resto < 2, dígito = 0, senão dígito = 11 - resto
  const digitoVerificador = resto < 2 ? 0 : 11 - resto;

  return digitoVerificador;
}

/**
 * ============================================================================
 * HELPER: formatarCnpj
 * ============================================================================
 *
 * Formata um CNPJ para exibição com máscara: XX.XXX.XXX/XXXX-XX
 *
 * @param cnpj - CNPJ limpo ou com formatação
 * @returns CNPJ formatado ou string vazia se inválido
 *
 * @example
 * formatarCnpj("12345678000190") // "12.345.678/0001-90"
 * formatarCnpj("12.345.678/0001-90") // "12.345.678/0001-90"
 * formatarCnpj("123") // ""
 */
export function formatarCnpj(cnpj: string | null | undefined): string {
  const cnpjLimpo = limparCnpj(cnpj);

  if (!cnpjLimpo || cnpjLimpo.length !== 14) {
    return '';
  }

  // Aplicar máscara: XX.XXX.XXX/XXXX-XX
  return cnpjLimpo.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * ============================================================================
 * HELPER: extrairRaizCnpj
 * ============================================================================
 *
 * Extrai a raiz do CNPJ (8 primeiros dígitos).
 * Útil para identificar a empresa independente da filial.
 *
 * @param cnpj - CNPJ limpo ou com formatação
 * @returns Raiz do CNPJ (8 dígitos) ou null se inválido
 *
 * @example
 * extrairRaizCnpj("12.345.678/0001-90") // "12345678"
 * extrairRaizCnpj("12.345.678/0002-71") // "12345678" (mesma empresa, filial diferente)
 */
export function extrairRaizCnpj(cnpj: string | null | undefined): string | null {
  const cnpjLimpo = limparCnpj(cnpj);

  if (!cnpjLimpo || cnpjLimpo.length !== 14) {
    return null;
  }

  return cnpjLimpo.substring(0, 8);
}

/**
 * ============================================================================
 * HELPER: extrairFilialCnpj
 * ============================================================================
 *
 * Extrai o número da filial do CNPJ (dígitos 9-12).
 * 0001 = matriz, demais = filiais.
 *
 * @param cnpj - CNPJ limpo ou com formatação
 * @returns Número da filial (4 dígitos) ou null se inválido
 *
 * @example
 * extrairFilialCnpj("12.345.678/0001-90") // "0001" (matriz)
 * extrairFilialCnpj("12.345.678/0002-71") // "0002" (filial)
 */
export function extrairFilialCnpj(cnpj: string | null | undefined): string | null {
  const cnpjLimpo = limparCnpj(cnpj);

  if (!cnpjLimpo || cnpjLimpo.length !== 14) {
    return null;
  }

  return cnpjLimpo.substring(8, 12);
}
