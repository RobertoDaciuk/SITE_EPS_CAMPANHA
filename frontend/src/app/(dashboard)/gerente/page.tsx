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
 * Skeleton de Carregamento com Shimmer Effect
 */
const SkeletonDashboard = () => (
  <div className="space-y-6">
    {/* Hero Card Skeleton - Comissão */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-border/20 bg-gradient-to-br from-purple-100/50 via-purple-50/30 to-indigo-100/50 dark:from-purple-950/30 dark:via-purple-900/20 dark:to-indigo-950/30 p-8"
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-white/20 dark:bg-white/10" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded-full bg-white/20 dark:bg-white/10" />
            <div className="h-6 w-48 rounded-full bg-white/30 dark:bg-white/15" />
          </div>
        </div>
        <div className="h-16 w-64 rounded-2xl bg-white/30 dark:bg-white/15" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/20 dark:bg-white/10" />
          ))}
        </div>
      </div>
    </motion.div>

    {/* Performance Card Skeleton */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative overflow-hidden rounded-2xl border border-border/20 bg-card/70 p-6"
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.1s] bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-muted/60" />
            <div className="space-y-2">
              <div className="h-4 w-40 rounded-full bg-muted/60" />
              <div className="h-3 w-32 rounded-full bg-muted/40" />
            </div>
          </div>
          <div className="h-8 w-24 rounded-full bg-muted/60" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded-full bg-muted/40" />
              <div className="h-8 w-20 rounded-full bg-muted/60" />
            </div>
          ))}
        </div>
        <div className="h-16 w-full rounded-xl bg-muted/40" />
      </div>
    </motion.div>

    {/* Top Performers Skeleton */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative overflow-hidden rounded-2xl border border-border/20 bg-card/70 p-6"
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.2s] bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />

      <div className="h-5 w-48 rounded-full bg-muted/60 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-16 w-16 rounded-full bg-muted/60 mx-auto" />
            <div className="h-4 w-20 rounded-full bg-muted/40 mx-auto" />
            <div className="h-6 w-16 rounded-full bg-muted/60 mx-auto" />
          </div>
        ))}
      </div>
    </motion.div>

    {/* Overview Stats Skeleton */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="relative overflow-hidden rounded-xl border border-border/20 bg-card/60 p-4">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
          <div className="h-8 w-16 rounded-full bg-muted/60 mx-auto mb-2" />
          <div className="h-3 w-24 rounded-full bg-muted/40 mx-auto" />
        </div>
      ))}
    </motion.div>
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
          Visão completa da performance da sua equipe.
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ scale: 1.05, y: -4 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="group rounded-xl border border-border/30 bg-card/60 p-4 text-center hover:bg-card/80 hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer"
            >
              <p className="text-3xl font-bold text-foreground group-hover:scale-110 transition-transform inline-block">{data.overview.totalVendedores}</p>
              <p className="text-sm text-muted-foreground mt-1">Total de Vendedores</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ scale: 1.05, y: -4 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="group rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center hover:shadow-lg hover:shadow-emerald-500/30 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer"
            >
              <p className="text-3xl font-bold text-emerald-600 group-hover:scale-110 transition-transform inline-block">{data.overview.ativos}</p>
              <p className="text-sm text-muted-foreground mt-1">Ativos</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ scale: 1.05, y: -4 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="group rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-center hover:shadow-lg hover:shadow-amber-500/30 hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer"
            >
              <p className="text-3xl font-bold text-amber-600 group-hover:scale-110 transition-transform inline-block">{data.overview.pendentes}</p>
              <p className="text-sm text-muted-foreground mt-1">Pendentes</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ scale: 1.05, y: -4 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="group rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 text-center hover:shadow-lg hover:shadow-rose-500/30 hover:border-rose-300 dark:hover:border-rose-700 transition-all cursor-pointer"
            >
              <p className="text-3xl font-bold text-rose-600 group-hover:scale-110 transition-transform inline-block">{data.overview.bloqueados}</p>
              <p className="text-sm text-muted-foreground mt-1">Bloqueados</p>
            </motion.div>
          </div>

          {/* 6. LINKS RÁPIDOS */}
          {/* Bloco de ações rápidas removido */}
        </div>
      )}
    </div>
  );
}
