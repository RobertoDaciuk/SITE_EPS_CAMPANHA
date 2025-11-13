/**
 * UTILITÁRIO DE SINCRONIA TEMPORAL UNIVERSAL
 * 
 * Todas as datas no sistema devem ser:
 * - Armazenadas em UTC no backend/banco
 * - Transmitidas em ISO 8601 UTC entre cliente/servidor
 * - Exibidas SEMPRE em America/Sao_Paulo no frontend
 * 
 * Este módulo centraliza toda formatação de datas para garantir consistência temporal.
 */

import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

// Timezone unificado do sistema
export const TIMEZONE_BR = 'America/Sao_Paulo';

/**
 * Formata uma data UTC para exibição em São Paulo
 * @param date - Data em UTC (string ISO ou Date object)
 * @param formatStr - Padrão de formatação (padrão: dd/MM/yyyy)
 * @returns String formatada no timezone de São Paulo
 */
export function formatarDataBR(
  date: string | Date | null | undefined,
  formatStr: string = 'dd/MM/yyyy'
): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(dateObj, TIMEZONE_BR, formatStr);
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '-';
  }
}

/**
 * Formata data e hora completa em São Paulo
 * @param date - Data em UTC
 * @returns String no formato "dd/MM/yyyy HH:mm"
 */
export function formatarDataHoraBR(date: string | Date | null | undefined): string {
  return formatarDataBR(date, 'dd/MM/yyyy HH:mm');
}

/**
 * Formata data e hora com segundos em São Paulo
 * @param date - Data em UTC
 * @returns String no formato "dd/MM/yyyy HH:mm:ss"
 */
export function formatarDataHoraSegundosBR(date: string | Date | null | undefined): string {
  return formatarDataBR(date, 'dd/MM/yyyy HH:mm:ss');
}

/**
 * Formata apenas a hora em São Paulo
 * @param date - Data em UTC
 * @returns String no formato "HH:mm"
 */
export function formatarHoraBR(date: string | Date | null | undefined): string {
  return formatarDataBR(date, 'HH:mm');
}

/**
 * Formata data curta (dia/mês) em São Paulo
 * @param date - Data em UTC
 * @returns String no formato "dd/MM"
 */
export function formatarDataCurtaBR(date: string | Date | null | undefined): string {
  return formatarDataBR(date, 'dd/MM');
}

/**
 * Formata data por extenso em São Paulo
 * @param date - Data em UTC
 * @returns String no formato "dd 'de' MMMM 'de' yyyy"
 */
export function formatarDataPorExtensoBR(date: string | Date | null | undefined): string {
  return formatarDataBR(date, "dd 'de' MMMM 'de' yyyy");
}

/**
 * Converte uma data do timezone de São Paulo para UTC (para envio ao backend)
 * @param date - Data local em São Paulo
 * @returns Date object em UTC
 */
export function converterParaUTC(date: Date): Date {
  return fromZonedTime(date, TIMEZONE_BR);
}

/**
 * Converte uma data UTC para o timezone de São Paulo (para manipulação local)
 * @param date - Data em UTC
 * @returns Date object no timezone de São Paulo
 */
export function converterParaBR(date: string | Date): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(dateObj, TIMEZONE_BR);
}

/**
 * Retorna a data/hora atual em São Paulo
 * @returns Date object no timezone de São Paulo
 */
export function agoraBR(): Date {
  return toZonedTime(new Date(), TIMEZONE_BR);
}

/**
 * Retorna a data/hora atual em UTC (para envio ao backend)
 * @returns Date object em UTC
 */
export function agoraUTC(): Date {
  return new Date();
}

/**
 * Formata número como moeda brasileira (BRL)
 * @param valor - Valor numérico
 * @returns String formatada como R$ X.XXX,XX
 */
export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

/**
 * Formata número com separadores brasileiros (1.234,56)
 * @param valor - Valor numérico
 * @param casasDecimais - Número de casas decimais (padrão: 0)
 * @returns String formatada
 */
export function formatarNumero(
  valor: number | null | undefined,
  casasDecimais: number = 0
): string {
  if (valor === null || valor === undefined) return '0';
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  }).format(valor);
}

/**
 * Verifica se uma data (UTC) está no passado em relação a São Paulo
 * @param date - Data em UTC
 * @returns true se a data é passada em SP
 */
export function estaNoPassadoBR(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const dataBR = toZonedTime(dateObj, TIMEZONE_BR);
  const agora = agoraBR();
  return dataBR < agora;
}

/**
 * Verifica se uma data (UTC) está no futuro em relação a São Paulo
 * @param date - Data em UTC
 * @returns true se a data é futura em SP
 */
export function estaNoFuturoBR(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const dataBR = toZonedTime(dateObj, TIMEZONE_BR);
  const agora = agoraBR();
  return dataBR > agora;
}

/**
 * Verifica se uma data está entre duas outras (todas em UTC, comparadas em SP)
 * @param date - Data a verificar
 * @param inicio - Data de início
 * @param fim - Data de fim
 * @returns true se está no intervalo
 */
export function estaEntreBR(
  date: string | Date,
  inicio: string | Date,
  fim: string | Date
): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const inicioObj = typeof inicio === 'string' ? parseISO(inicio) : inicio;
  const fimObj = typeof fim === 'string' ? parseISO(fim) : fim;
  
  const dataBR = toZonedTime(dateObj, TIMEZONE_BR);
  const inicioBR = toZonedTime(inicioObj, TIMEZONE_BR);
  const fimBR = toZonedTime(fimObj, TIMEZONE_BR);
  
  return dataBR >= inicioBR && dataBR <= fimBR;
}
