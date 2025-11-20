/**
 * ============================================================================
 * PÁGINA: DASHBOARD GERENTE PREMIUM
 * ============================================================================
 * 
 * Dashboard completo e enriquecido para o gerente.
 * Visão estratégica da equipe com métricas, alertas e insights acionáveis.
 * 
 * @module DashboardGerente
 * ============================================================================
 */
"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/contexts/ContextoAutenticacao";
import api from "@/lib/axios";
import type { DashboardGerenteCompleto } from "@/types/dashboard-gerente";

// Componentes
import { ComissaoHeroCard } from "@/components/dashboard/gerente/comissao-hero-card";
import { PerformanceEquipeCard } from "@/components/dashboard/gerente/performance-equipe-card";
import { AlertasEquipeCard } from "@/components/dashboard/gerente/alertas-equipe-card";
import { TopPerformersCarousel, PipelineVendasCard } from "@/components/dashboard/gerente/top-performers-pipeline";

const fetcher = (url: string) =>
  api.get<DashboardGerenteCompleto>(url).then((res) => res.data);

/**
 * Skeleton de Carregamento
 */
const SkeletonDashboard = () => (
  <div className="space-y-6">
    <div className="h-64 bg-card/50 rounded-3xl animate-pulse" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-80 bg-card/50 rounded-2xl animate-pulse" />
      <div className="h-80 bg-card/50 rounded-2xl animate-pulse" />
    </div>
    <div className="h-48 bg-card/50 rounded-2xl animate-pulse" />
  </div>
);

/**
 * Componente de Erro
 */
const ErrorState = ({ error, onRetry }: { error: Error; onRetry: () => void }) => (
  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
    <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
    <h3 className="text-xl font-semibold text-destructive mb-2">Erro ao carregar dashboard</h3>
    <p className="text-sm text-destructive/80 mb-4">{error.message || "Erro desconhecido"}</p>
    <button
      onClick={onRetry}
      className="rounded-full bg-destructive px-6 py-2 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors"
    >
      Tentar Novamente
    </button>
  </div>
);

/**
 * Página Principal do Dashboard Gerente
 */
export default function DashboardGerentePage() {
  const { usuario, carregando: authLoading } = useAuth();
  const router = useRouter();

  // Buscar dados do dashboard
  const { data, error, isLoading, mutate } = useSWR<DashboardGerenteCompleto>(
    usuario?.papel === "GERENTE" ? "/dashboard/gerente/completo" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 120000, // Atualizar a cada 2 minutos
    }
  );

  // Redirecionar se não for gerente
  useEffect(() => {
    if (!authLoading && usuario && usuario.papel !== "GERENTE") {
      router.push("/");
    }
  }, [usuario, authLoading, router]);

  // Estado de carregamento inicial
  if (authLoading || (!usuario && !error)) {
    return (
      <div className="flex h-full items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Verificação de permissão
  if (!usuario || usuario.papel !== "GERENTE") {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/80 p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <h2 className="text-2xl font-semibold">Acesso restrito</h2>
        <p className="mt-2 text-muted-foreground">
          Esta área é exclusiva para gerentes. Entre em contato com o suporte se precisar de acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Dashboard do Gerente
          </h1>
        </div>
        <p className="text-muted-foreground">
          Visão completa da performance da sua equipe, alertas inteligentes e insights acionáveis.
        </p>
      </motion.div>

      {/* Estado de Erro */}
      {error && <ErrorState error={error} onRetry={() => mutate()} />}

      {/* Estado de Carregamento */}
      {isLoading && !data && <SkeletonDashboard />}

      {/* Dashboard Completo */}
      {data && (
        <div className="space-y-6">
          {/* 1. HERO SECTION - Comissão */}
          <ComissaoHeroCard comissao={data.comissao} />

          {/* 2. PERFORMANCE EXPANDIDA (Grid 1 coluna) */}
          <div className="w-full">
            <PerformanceEquipeCard performance={data.performance} />
          </div>

          {/* 3. TOP PERFORMERS */}
          <TopPerformersCarousel topPerformers={data.topPerformers} />

          {/* 4. PIPELINE DE VENDAS */}
          <PipelineVendasCard pipeline={data.pipeline} />

          {/* 5. QUICK STATS - Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <div className="rounded-xl border border-border/30 bg-card/60 p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{data.overview.totalVendedores}</p>
              <p className="text-sm text-muted-foreground mt-1">Total de Vendedores</p>
            </div>
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">{data.overview.ativos}</p>
              <p className="text-sm text-muted-foreground mt-1">Ativos</p>
            </div>
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
              <p className="text-3xl font-bold text-amber-600">{data.overview.pendentes}</p>
              <p className="text-sm text-muted-foreground mt-1">Pendentes</p>
            </div>
            <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 text-center">
              <p className="text-3xl font-bold text-rose-600">{data.overview.bloqueados}</p>
              <p className="text-sm text-muted-foreground mt-1">Bloqueados</p>
            </div>
          </motion.div>

          {/* 6. LINKS RÁPIDOS */}
          {/* Bloco de ações rápidas removido */}
        </div>
      )}
    </div>
  );
}
