"use client";

import useSWR from "swr";
import axios from "@/lib/axios";
import { useMemo } from "react";

// Fetcher genérico
const fetcher = (url: string) => axios.get(url).then((res) => res.data);

// ============================================================================
// HOOK: useOticas
// Busca lista de óticas com cache
// ============================================================================
export function useOticas() {
  const { data, error, isLoading } = useSWR("/oticas", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minuto (dados raramente mudam)
  });

  return {
    oticas: data || [],
    isLoading,
    error,
  };
}

// ============================================================================
// HOOK: useUsuarios
// Busca usuários com filtros opcionais
// ============================================================================
interface UseUsuariosParams {
  nomeOuEmail?: string;
  papel?: string;
  status?: string;
  opticaId?: string;
}

export function useUsuarios(params: UseUsuariosParams = {}) {
  // Construir URL com query params
  const url = useMemo(() => {
    const searchParams = new URLSearchParams();
    if (params.nomeOuEmail) searchParams.append("nomeOuEmail", params.nomeOuEmail);
    if (params.papel) searchParams.append("papel", params.papel);
    if (params.status) searchParams.append("status", params.status);
    if (params.opticaId) searchParams.append("opticaId", params.opticaId);

    const query = searchParams.toString();
    return query ? `/usuarios?${query}` : "/usuarios";
  }, [params.nomeOuEmail, params.papel, params.status, params.opticaId]);

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000, // 10 segundos
    keepPreviousData: true, // Optimistic UI ao mudar filtros
  });

  return {
    usuarios: data || [],
    isLoading,
    error,
    mutate, // Para revalidar após criar/editar/deletar usuário
  };
}
