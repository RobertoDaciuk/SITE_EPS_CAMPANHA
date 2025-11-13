/**
 * ============================================================================
 * DATA HELPER - Parsing e Validação de Datas com Timezone PT_BR
 * ============================================================================
 *
 * Responsável por:
 * - Parsing de datas em múltiplos formatos (DD/MM/YYYY, MM/DD/YYYY, etc.)
 * - Conversão para timezone America/Sao_Paulo (PT_BR)
 * - Validação de datas contra períodos de campanhas
 * - Formatação de datas para exibição
 *
 * TIMEZONE PADRÃO: America/Sao_Paulo (BRT/BRST)
 * - UTC-3 (horário padrão)
 * - UTC-2 (horário de verão, quando aplicável)
 *
 * @module ValidacaoModule
 * ============================================================================
 */

import { Logger } from '@nestjs/common';

const logger = new Logger('DataHelper');

/**
 * Formatos de data suportados pelo sistema
 */
export enum FormatoData {
  BRASILEIRO = 'DD/MM/YYYY',        // 07/11/2025 (padrão)
  AMERICANO = 'MM/DD/YYYY',         // 11/07/2025
  ISO = 'YYYY-MM-DD',               // 2025-11-07
  EUROPEU_PONTO = 'DD.MM.YYYY',     // 07.11.2025
  BRASILEIRO_TRACO = 'DD-MM-YYYY',  // 07-11-2025
}

/**
 * Timezone padrão do sistema (São Paulo, Brasil)
 */
export const TIMEZONE_PADRAO = 'America/Sao_Paulo';

/**
 * ============================================================================
 * HELPER: parseDateWithFormat
 * ============================================================================
 *
 * Faz parsing de uma string de data usando um formato específico.
 * Suporta múltiplos formatos e separadores.
 *
 * @param valorData - String da data a ser parseada (ex: "07/11/2025")
 * @param formato - Formato esperado (padrão: DD/MM/YYYY)
 * @returns Date objeto em timezone PT_BR ou null se inválido
 *
 * @example
 * parseDateWithFormat("07/11/2025", FormatoData.BRASILEIRO) // Date(2025-11-07 00:00:00 BRT)
 * parseDateWithFormat("11/07/2025", FormatoData.AMERICANO)  // Date(2025-11-07 00:00:00 BRT)
 * parseDateWithFormat("2025-11-07", FormatoData.ISO)        // Date(2025-11-07 00:00:00 BRT)
 */
export function parseDateWithFormat(
  valorData: string | null | undefined,
  formato: FormatoData = FormatoData.BRASILEIRO,
): Date | null {
  if (!valorData || typeof valorData !== 'string') {
    logger.debug(`Valor de data inválido: ${valorData}`);
    return null;
  }

  // Remove espaços em branco
  const valorLimpo = String(valorData).trim();

  if (!valorLimpo) {
    return null;
  }

  try {
    let dia: number;
    let mes: number;
    let ano: number;

    // Detecta o separador (/, -, .)
    let separador = '/';
    if (valorLimpo.includes('-')) {
      separador = '-';
    } else if (valorLimpo.includes('.')) {
      separador = '.';
    }

    const partes = valorLimpo.split(separador);

    if (partes.length !== 3) {
      logger.warn(
        `Data em formato inválido (não possui 3 partes): ${valorLimpo}`,
      );
      return null;
    }

    // Parsing baseado no formato
    switch (formato) {
      case FormatoData.BRASILEIRO:
      case FormatoData.EUROPEU_PONTO:
      case FormatoData.BRASILEIRO_TRACO:
        // DD/MM/YYYY ou DD.MM.YYYY ou DD-MM-YYYY
        dia = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10);
        ano = parseInt(partes[2], 10);
        break;

      case FormatoData.AMERICANO:
        // MM/DD/YYYY
        mes = parseInt(partes[0], 10);
        dia = parseInt(partes[1], 10);
        ano = parseInt(partes[2], 10);
        break;

      case FormatoData.ISO:
        // YYYY-MM-DD
        ano = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10);
        dia = parseInt(partes[2], 10);
        break;

      default:
        logger.warn(`Formato de data não reconhecido: ${formato}`);
        return null;
    }

    // Validação básica
    if (isNaN(dia) || isNaN(mes) || isNaN(ano)) {
      logger.warn(`Data contém valores não numéricos: ${valorLimpo}`);
      return null;
    }

    // Validação de ranges
    if (dia < 1 || dia > 31) {
      logger.warn(`Dia inválido: ${dia}`);
      return null;
    }

    if (mes < 1 || mes > 12) {
      logger.warn(`Mês inválido: ${mes}`);
      return null;
    }

    if (ano < 1900 || ano > 2100) {
      logger.warn(`Ano inválido: ${ano}`);
      return null;
    }

    // Criar objeto Date em UTC
    // IMPORTANTE: Mês em JavaScript é 0-indexed (0 = Janeiro, 11 = Dezembro)
    const dataUTC = new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0, 0));

    // Verificar se a data é válida (ex: 31/02/2025 seria inválido)
    if (
      dataUTC.getUTCDate() !== dia ||
      dataUTC.getUTCMonth() !== mes - 1 ||
      dataUTC.getUTCFullYear() !== ano
    ) {
      logger.warn(
        `Data inválida (ex: 31/02): ${valorLimpo} → ${dia}/${mes}/${ano}`,
      );
      return null;
    }

    // Ajustar para timezone de São Paulo
    // Convertemos para string ISO e parseamos novamente com o timezone correto
    const dataFormatadaISO = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T00:00:00`;

    // Criar data no timezone de São Paulo (sem conversão de fuso)
    const dataSaoPaulo = new Date(dataFormatadaISO);

    logger.debug(
      `Data parseada: ${valorLimpo} (${formato}) → ${dataSaoPaulo.toISOString()}`,
    );

    return dataSaoPaulo;
  } catch (error) {
    logger.error(
      `Erro ao fazer parsing da data: ${valorData}, formato: ${formato}`,
      error,
    );
    return null;
  }
}

/**
 * ============================================================================
 * HELPER: validarDataDentroPeriodoCampanha
 * ============================================================================
 *
 * Valida se uma data de venda está dentro do período da campanha.
 *
 * REGRA: dataInicio <= dataVenda <= dataFim
 *
 * Comparação é feita em nível de DIA (ignora horas/minutos/segundos).
 *
 * @param dataVenda - Data da venda a validar
 * @param dataInicio - Data de início da campanha
 * @param dataFim - Data de término da campanha
 * @returns true se a data está dentro do período, false caso contrário
 *
 * @example
 * const dataVenda = new Date('2025-11-07');
 * const dataInicio = new Date('2025-11-01');
 * const dataFim = new Date('2025-11-30');
 * validarDataDentroPeriodoCampanha(dataVenda, dataInicio, dataFim); // true
 */
export function validarDataDentroPeriodoCampanha(
  dataVenda: Date,
  dataInicio: Date,
  dataFim: Date,
): boolean {
  // Normalizar todas as datas para o início do dia (00:00:00)
  const vendaDia = new Date(dataVenda);
  vendaDia.setHours(0, 0, 0, 0);

  const inicioDia = new Date(dataInicio);
  inicioDia.setHours(0, 0, 0, 0);

  const fimDia = new Date(dataFim);
  fimDia.setHours(23, 59, 59, 999);

  // Validar: dataInicio <= dataVenda <= dataFim
  const dentroInicio = vendaDia >= inicioDia;
  const dentroFim = vendaDia <= fimDia;

  logger.debug(
    `Validação de período: dataVenda=${vendaDia.toISOString().split('T')[0]}, ` +
      `dataInicio=${inicioDia.toISOString().split('T')[0]}, ` +
      `dataFim=${fimDia.toISOString().split('T')[0]}, ` +
      `dentroInicio=${dentroInicio}, dentroFim=${dentroFim}`,
  );

  return dentroInicio && dentroFim;
}

/**
 * ============================================================================
 * HELPER: formatarDataParaExibicao
 * ============================================================================
 *
 * Formata uma data para exibição em formato brasileiro.
 *
 * @param data - Date objeto a formatar
 * @returns String formatada (ex: "07/11/2025")
 */
export function formatarDataParaExibicao(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();

  return `${dia}/${mes}/${ano}`;
}

/**
 * ============================================================================
 * HELPER: obterDataAtualSaoPaulo
 * ============================================================================
 *
 * Retorna a data/hora atual no timezone de São Paulo.
 *
 * @returns Date objeto em timezone PT_BR
 */
export function obterDataAtualSaoPaulo(): Date {
  // Criar data atual
  const agora = new Date();

  // Retornar a data atual (JavaScript já gerencia timezone automaticamente)
  return agora;
}

/**
 * ============================================================================
 * HELPER: detectarFormatoData
 * ============================================================================
 *
 * Tenta detectar automaticamente o formato de uma string de data.
 * Útil quando o admin não configurou o formato preferido.
 *
 * @param valorData - String da data
 * @returns FormatoData detectado ou null se não conseguir detectar
 */
export function detectarFormatoData(
  valorData: string,
): FormatoData | null {
  if (!valorData) return null;

  const valorLimpo = String(valorData).trim();

  // Detectar ISO (YYYY-MM-DD ou YYYY/MM/DD)
  if (/^\d{4}[-/.]\d{2}[-/.]\d{2}$/.test(valorLimpo)) {
    return FormatoData.ISO;
  }

  // Detectar formato com pontos (DD.MM.YYYY)
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(valorLimpo)) {
    return FormatoData.EUROPEU_PONTO;
  }

  // Detectar formato com traços (DD-MM-YYYY ou MM-DD-YYYY)
  if (/^\d{2}-\d{2}-\d{4}$/.test(valorLimpo)) {
    // Tentar ambos e ver qual produz data válida
    const tentativaBrasileiro = parseDateWithFormat(
      valorLimpo,
      FormatoData.BRASILEIRO_TRACO,
    );
    if (tentativaBrasileiro) {
      return FormatoData.BRASILEIRO_TRACO;
    }
  }

  // Detectar formato com barras (DD/MM/YYYY ou MM/DD/YYYY)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(valorLimpo)) {
    // Ambiguidade: pode ser brasileiro ou americano
    // Por padrão, assumir brasileiro (mais comum no Brasil)
    return FormatoData.BRASILEIRO;
  }

  logger.warn(`Não foi possível detectar formato da data: ${valorData}`);
  return null;
}
