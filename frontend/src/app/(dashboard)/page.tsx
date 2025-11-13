/**
 * ============================================================================
 * PÁGINA DASHBOARD (Refatorada) - Princípios 1, 2, 3
 * ============================================================================
 *
 * REFATORAÇÃO (Q.I. 170):
 * - Contexto: Atualizado para `useAuth` de `ContextoAutenticacao` (Princípio 2).
 * - Busca de Dados: Implementado `useSWR` para buscar KPIs do novo
 * endpoint unificado `/api/dashboard/kpis`.
 * - Renderização: Renderiza condicionalmente `KpisAdmin`, `KpisGerente`,
 * ou `KpisVendedor` com base no `usuario.papel`.
 * - Skeletons: Adicionado estado de carregamento (Princípio 1).
 *
 * @module DashboardPage
 * ============================================================================
 */
"use client";

import useSWR from "swr";
import { useAuth } from "@/contexts/ContextoAutenticacao"; // Corrigido (Princípio 2)
import { KpisAdmin } from "@/components/dashboard/KpisAdmin";
import { KpisGerente } from "@/components/dashboard/KpisGerente";
import { KpisVendedor } from "@/components/dashboard/KpisVendedor";
import api from "@/lib/axios";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * Função 'fetcher' para o SWR usar com o Axios.
 */
const fetcher = (url: string) =>
  api.get(url).then((res) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DASHBOARD SWR] Dados recebidos:`, res.data);
    }
    return res.data;
  });

/**
 * Componente Skeleton para estado de carregamento (Princípio 4).
 */
const SkeletonKpis = () => (
  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        className="bg-card/70 backdrop-blur-lg border border-border/20 
                   rounded-2xl p-6 shadow-lg shadow-black/5 animate-pulse"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-muted-foreground/20 rounded-md w-3/4"></div>
          <div className="h-9 w-9 bg-muted-foreground/20 rounded-full"></div>
        </div>
        <div className="h-10 bg-muted-foreground/20 rounded-md w-1/2"></div>
        <div className="h-3 bg-muted-foreground/20 rounded-md w-full mt-3"></div>
      </div>
    ))}
  </div>
);

/**
 * Página principal do Dashboard.
 */
export default function DashboardPage() {
  /**
   * Hook de Autenticação (Princípio 2).
   */
  const { usuario } = useAuth();

  /**
   * Hook de busca de dados (SWR).
   * Busca dados do endpoint unificado.
   * A rota é protegida, então o SWR (via Axios) enviará o token JWT.
   */
  const { data: dadosKpis, error: erroKpis } = useSWR(
    usuario ? "/dashboard/kpis" : null, // Só busca se o usuário existir
    fetcher,
    {
      revalidateOnFocus: false, // Evita buscas desnecessárias
    },
  );

  /**
   * Renderiza o componente de KPI correto com base no papel do usuário.
   */
  const renderizarKpisPorPapel = () => {
    // 1. Estado de Erro
    if (erroKpis) {
      return (
        <div
          className="bg-destructive/10 border border-destructive/30 
                     text-destructive p-4 rounded-xl flex 
                     items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5" />
          <div>
            <h4 className="font-semibold">Erro ao carregar dados</h4>
            <p className="text-sm">
              Não foi possível buscar os KPIs: {erroKpis.message}
            </p>
          </div>
        </div>
      );
    }

    // 2. Estado de Carregamento
    if (!dadosKpis && !erroKpis) {
      return <SkeletonKpis />;
    }

    // 3. Estado de Sucesso
    if (!usuario || !dadosKpis) return null;

    switch (usuario.papel) {
      case "ADMIN":
        return <KpisAdmin dados={dadosKpis} />;
      case "GERENTE":
        return <KpisGerente dados={dadosKpis} />;
      case "VENDEDOR":
        return <KpisVendedor dados={dadosKpis} />;
      default:
        return (
          <p className="text-muted-foreground">
            Perfil de usuário desconhecido.
          </p>
        );
    }
  };

  /**
   * Obtém a saudação com base no nome do usuário.
   */
  const saudacao = usuario
    ? `Bem-vindo de volta, ${usuario.nome.split(" ")[0]}!`
    : "Carregando...";
  const subsaudacao = usuario
    ? `Aqui está o resumo das atividades para seu perfil de ${usuario.papel.toLowerCase()}.`
    : "Aguarde enquanto buscamos suas informações...";

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{saudacao}</h2>
          <p className="text-muted-foreground">{subsaudacao}</p>
        </div>
      </div>

      {/* Renderização Condicional dos KPIs */}
      {renderizarKpisPorPapel()}
    </div>
  );
}