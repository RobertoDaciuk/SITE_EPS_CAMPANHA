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
      transition={{
        duration: 0.28, // Reduzido de 0.5 → 0.28 (44% mais rápido)
        delay: 0.18, // Reduzido de 0.3 → 0.18 (40% mais rápido)
        ease: [0.25, 0.1, 0.25, 1.0]
      }}
      className="rounded-2xl border border-border/40 bg-card/80 p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold mb-4">🏆 Top Vendedores da Semana</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {topPerformers.map((performer, index) => (
          <motion.div
            key={performer.vendedor.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.05, y: -8 }}
            transition={{
              delay: index * 0.06, // Otimizado: 0.1 → 0.06 (40% mais rápido)
              duration: 0.28, // Otimizado: 0.4 → 0.28 (30% mais rápido)
              ease: [0.25, 0.1, 0.25, 1.0]
            }}
            className="group relative rounded-xl border border-border/30 bg-gradient-to-br from-card to-muted/20 p-4 text-center hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 transition-all duration-300 cursor-pointer"
          >
            {performer.badge && (
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 200 }}
                className="absolute -top-3 -right-3 text-3xl group-hover:scale-125 transition-transform duration-300"
              >
                {performer.badge}
              </motion.div>
            )}
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-primary/10 mb-3 group-hover:bg-primary/20 group-hover:ring-4 group-hover:ring-primary/30 transition-all duration-300">
              {performer.vendedor.avatarUrl ? (
                <img
                  src={performer.vendedor.avatarUrl}
                  alt={performer.vendedor.nome}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
              )}
            </div>
            <p className="font-semibold text-sm truncate mb-1 group-hover:text-primary transition-colors">{performer.vendedor.nome}</p>
            <p className="text-2xl font-bold text-primary group-hover:scale-110 transition-transform inline-block" style={{ fontFeatureSettings: '"tnum"' }}>{numberFormatter.format(performer.pontos)}</p>
            <p className="text-xs text-muted-foreground mt-1" style={{ fontFeatureSettings: '"tnum"' }}>
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
      transition={{
        duration: 0.28, // Reduzido de 0.5 → 0.28 (44% mais rápido)
        delay: 0.24, // Reduzido de 0.4 → 0.24 (40% mais rápido)
        ease: [0.25, 0.1, 0.25, 1.0]
      }}
      className="rounded-2xl border border-border/40 bg-card/80 p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FileSearch className="h-5 w-5" />
        Pipeline de Vendas
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.05, y: -4 }}
          transition={{ duration: 0.2 }}
          className="group text-center p-4 rounded-xl hover:bg-amber-50/50 dark:hover:bg-amber-950/20 hover:shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer"
        >
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-2 group-hover:ring-4 group-hover:ring-amber-200 dark:group-hover:ring-amber-800 transition-all">
            <Clock className="h-6 w-6 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-3xl font-bold text-amber-600 group-hover:scale-110 transition-transform inline-block" style={{ fontFeatureSettings: '"tnum"' }}>{pipeline.emAnalise}</p>
          <p className="text-xs text-muted-foreground mt-1">Em Análise</p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.05, y: -4 }}
          transition={{ duration: 0.2 }}
          className="group text-center p-4 rounded-xl hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-2 group-hover:ring-4 group-hover:ring-emerald-200 dark:group-hover:ring-emerald-800 transition-all">
            <CheckCircle className="h-6 w-6 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-3xl font-bold text-emerald-600 group-hover:scale-110 transition-transform inline-block" style={{ fontFeatureSettings: '"tnum"' }}>{pipeline.validadasHoje}</p>
          <p className="text-xs text-muted-foreground mt-1">Validadas Hoje</p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.05, y: -4 }}
          transition={{ duration: 0.2 }}
          className="group text-center p-4 rounded-xl hover:bg-rose-50/50 dark:hover:bg-rose-950/20 hover:shadow-lg hover:shadow-rose-500/20 transition-all cursor-pointer"
        >
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 mb-2 group-hover:ring-4 group-hover:ring-rose-200 dark:group-hover:ring-rose-800 transition-all">
            <XCircle className="h-6 w-6 text-rose-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-3xl font-bold text-rose-600 group-hover:scale-110 transition-transform inline-block" style={{ fontFeatureSettings: '"tnum"' }}>{pipeline.rejeitadas7Dias}</p>
          <p className="text-xs text-muted-foreground mt-1">Rejeitadas (7d)</p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.05, y: -4 }}
          transition={{ duration: 0.2 }}
          className="group text-center p-4 rounded-xl hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:shadow-lg hover:shadow-blue-500/20 transition-all cursor-pointer"
        >
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 mb-2 group-hover:ring-4 group-hover:ring-blue-200 dark:group-hover:ring-blue-800 transition-all">
            <Clock className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform inline-block" style={{ fontFeatureSettings: '"tnum"' }}>{pipeline.aguardandoVendedor}</p>
          <p className="text-xs text-muted-foreground mt-1">Aguardando</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
