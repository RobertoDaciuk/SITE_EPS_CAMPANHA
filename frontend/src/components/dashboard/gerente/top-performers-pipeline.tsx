/**
 * ============================================================================
 * COMPONENT: TOP PERFORMERS CAROUSEL & PIPELINE VENDAS CARD
 * ============================================================================
 */
"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, User, FileSearch, CheckCircle, XCircle, Clock } from "lucide-react";
import type { TopPerformer, Pipeline } from "@/types/dashboard-gerente";

const numberFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  signDisplay: "always",
  minimumFractionDigits: 1,
});

// TOP PERFORMERS CAROUSEL
export function TopPerformersCarousel({ topPerformers }: { topPerformers: TopPerformer[] }) {
  if (topPerformers.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/80 p-8 text-center">
        <p className="text-muted-foreground">Nenhum vendedor com pontos acumulados ainda</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-2xl border border-border/40 bg-card/80 p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold mb-4">🏆 Top Vendedores da Semana</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {topPerformers.map((performer, index) => (
          <motion.div
            key={performer.vendedor.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="relative rounded-xl border border-border/30 bg-gradient-to-br from-card to-muted/20 p-4 text-center hover:shadow-lg transition-shadow"
          >
            {performer.badge && (
              <div className="absolute -top-3 -right-3 text-3xl">{performer.badge}</div>
            )}
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-primary/10 mb-3">
              {performer.vendedor.avatarUrl ? (
                <img
                  src={performer.vendedor.avatarUrl}
                  alt={performer.vendedor.nome}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
            </div>
            <p className="font-semibold text-sm truncate mb-1">{performer.vendedor.nome}</p>
            <p className="text-2xl font-bold text-primary">{numberFormatter.format(performer.pontos)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {performer.crescimento >= 0 ? (
                <span className="text-emerald-600 flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {percentFormatter.format(performer.crescimento / 100)}
                </span>
              ) : (
                <span className="text-rose-600 flex items-center justify-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {percentFormatter.format(performer.crescimento / 100)}
                </span>
              )}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// PIPELINE VENDAS CARD
export function PipelineVendasCard({ pipeline }: { pipeline: Pipeline }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="rounded-2xl border border-border/40 bg-card/80 p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FileSearch className="h-5 w-5" />
        Pipeline de Vendas
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-2">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-amber-600">{pipeline.emAnalise}</p>
          <p className="text-xs text-muted-foreground mt-1">Em Análise</p>
        </div>
        <div className="text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-2">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-emerald-600">{pipeline.validadasHoje}</p>
          <p className="text-xs text-muted-foreground mt-1">Validadas Hoje</p>
        </div>
        <div className="text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 mb-2">
            <XCircle className="h-6 w-6 text-rose-600" />
          </div>
          <p className="text-3xl font-bold text-rose-600">{pipeline.rejeitadas7Dias}</p>
          <p className="text-xs text-muted-foreground mt-1">Rejeitadas (7d)</p>
        </div>
        <div className="text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 mb-2">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{pipeline.aguardandoVendedor}</p>
          <p className="text-xs text-muted-foreground mt-1">Aguardando</p>
        </div>
      </div>
    </motion.div>
  );
}
