"use client";

import useSWR from "swr";
import axios from "@/lib/axios";
import { startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { useMemo } from "react";

// Fetcher genérico
const fetcher = (url: string) => axios.get(url).then((res) => res.data);

// ============================================================================
// HOOK: useLotesFinanceiros
// Busca e cacheia lista de lotes com revalidação inteligente
// ============================================================================
export function useLotesFinanceiros() {
  const { data, error, isLoading, mutate } = useSWR(
    "/financeiro/lotes",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 15000, // 15 segundos sem re-request
      keepPreviousData: true, // Optimistic UI
    }
  );

  // Normalizar dados (pode vir como { lotes: [] } ou [])
  const lotes = useMemo(() => {
    if (!data) return [];
    const lotesData = data?.lotes || data;
    return Array.isArray(lotesData) ? lotesData : [];
  }, [data]);

  return {
    lotes,
    isLoading,
    error,
    mutate, // Função para revalidar manualmente
  };
}

// ============================================================================
// HOOK: useSaldosFinanceiros
// Busca saldos disponíveis e reservados dos usuários
// ============================================================================
export function useSaldosFinanceiros(dataFim?: string) {
  const url = dataFim
    ? `/financeiro/saldos?dataFim=${dataFim}`
    : "/financeiro/saldos";

  const { data, error, isLoading } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 15000,
  });

  return {
    saldos: data || {
      usuarios: [],
      valorTotalDisponivel: 0,
      valorTotalReservado: 0,
      totalUsuarios: 0,
    },
    isLoading,
    error,
  };
}

// ============================================================================
// HOOK: useDashboardFinanceiro
// Combina lotes + saldos e calcula estatísticas agregadas
// Elimina requests duplicados usando os hooks acima
// ============================================================================
export function useDashboardFinanceiro() {
  const { lotes, isLoading: isLoadingLotes } = useLotesFinanceiros();
  const { saldos, isLoading: isLoadingSaldos } = useSaldosFinanceiros();

  // Calcular estatísticas derivadas (memoized)
  const stats = useMemo(() => {
    if (!lotes.length) {
      return {
        totalPagoMesAtual: 0,
        totalPagoMesAnterior: 0,
        volumeLotes: 0,
        ticketMedio: 0,
        saldoDisponivel: 0,
        saldoReservado: 0,
        usuariosAtivos: 0,
        pendentes: 0,
      };
    }

    const inicioMesAtual = startOfMonth(new Date());
    const fimMesAtual = endOfMonth(new Date());
    const inicioMesAnterior = startOfMonth(subMonths(new Date(), 1));
    const fimMesAnterior = endOfMonth(subMonths(new Date(), 1));

    const lotesMesAtual = lotes.filter((l: any) => {
      const data = parseISO(l.criadoEm);
      return data >= inicioMesAtual && data <= fimMesAtual;
    });

    const lotesMesAnterior = lotes.filter((l: any) => {
      const data = parseISO(l.criadoEm);
      return data >= inicioMesAnterior && data <= fimMesAnterior;
    });

    const totalPagoMesAtual = lotesMesAtual
      .filter((l: any) => l.status === "PAGO")
      .reduce((acc: number, l: any) => acc + l.valorTotal, 0);

    const totalPagoMesAnterior = lotesMesAnterior
      .filter((l: any) => l.status === "PAGO")
      .reduce((acc: number, l: any) => acc + l.valorTotal, 0);

    const lotesPagos = lotes.filter((l: any) => l.status === "PAGO");
    const ticketMedio =
      lotesPagos.length > 0
        ? lotesPagos.reduce((acc: number, l: any) => acc + l.valorTotal, 0) /
          lotesPagos.length
        : 0;

    const pendentes = lotes.filter((l: any) => l.status === "PENDENTE").length;

    return {
      totalPagoMesAtual,
      totalPagoMesAnterior,
      volumeLotes: lotes.length,
      ticketMedio,
      saldoDisponivel: saldos.valorTotalDisponivel || 0,
      saldoReservado: saldos.valorTotalReservado || 0,
      usuariosAtivos: saldos.totalUsuarios || 0,
      pendentes,
    };
  }, [lotes, saldos]);

  return {
    stats,
    isLoading: isLoadingLotes || isLoadingSaldos,
  };
}
