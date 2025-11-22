/**
 * ============================================================================
 * COMPONENT: PERFORMANCE EQUIPE CARD
 * ============================================================================
 * 
 * Card com métricas agregadas da performance da equipe.
 * Inclui sparkline de crescimento e métricas principais.
 * 
 * @module DashboardGerente
 * ============================================================================
 */
"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Users, Trophy, Target } from "lucide-react";
import type { Performance } from "@/types/dashboard-gerente";

interface PerformanceEquipeCardProps {
  performance: Performance;
}

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function PerformanceEquipeCard({ performance }: PerformanceEquipeCardProps) {
  const crescimentoPositivo = performance.crescimentoSemana >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-2xl border border-border/40 bg-card/80 p-6 shadow-sm backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Performance da Equipe</h3>
            <p className="text-sm text-muted-foreground">Métricas consolidadas</p>
          </div>
        </div>

        {/* Badge de Crescimento */}
        <div
          className={`flex items-center gap-2 rounded-full px-4 py-2 ${
            crescimentoPositivo
              ? "bg-emerald-100 dark:bg-emerald-900/30"
              : "bg-rose-100 dark:bg-rose-900/30"
          }`}
        >
          {crescimentoPositivo ? (
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          )}
          <span
            className={`text-sm font-bold ${
              crescimentoPositivo
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {crescimentoPositivo ? "+" : ""}
            {percentFormatter.format(performance.crescimentoSemana / 100)}
          </span>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total de Pontos */}
        <motion.div
          whileHover={{ scale: 1.03, y: -2 }}
          transition={{ duration: 0.2 }}
          className="space-y-2 rounded-xl bg-background/40 p-4 cursor-pointer hover:bg-background/60 hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <span>Total de Pontos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {numberFormatter.format(performance.totalPontosEquipe)}
          </p>
          <p className="text-xs text-muted-foreground">Pontos acumulados</p>
        </motion.div>

        {/* Média por Vendedor */}
        <motion.div
          whileHover={{ scale: 1.03, y: -2 }}
          transition={{ duration: 0.2 }}
          className="space-y-2 rounded-xl bg-background/40 p-4 cursor-pointer hover:bg-background/60 hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Média / Vendedor</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {numberFormatter.format(performance.mediaVendedorAtivo)}
          </p>
          <p className="text-xs text-muted-foreground">Pontos por ativo</p>
        </motion.div>

        {/* Cartelas Completas */}
        <motion.div
          whileHover={{ scale: 1.03, y: -2 }}
          transition={{ duration: 0.2 }}
          className="space-y-2 rounded-xl bg-background/40 p-4 cursor-pointer hover:bg-background/60 hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>Cartelas Completas</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {numberFormatter.format(performance.cartelasCompletas)}
          </p>
          <p className="text-xs text-muted-foreground">Total conquistado</p>
        </motion.div>
      </div>

      {/* Sparkline (Mini Gráfico) */}
      <div className="mt-6 pt-6 border-t border-border/30">
        <p className="text-sm font-semibold text-muted-foreground mb-3">
          Evolução (últimos 30 dias)
        </p>
        <div className="flex items-end justify-between gap-1 h-20 px-1">
          {performance.evolucaoTemporal.slice(-30).map((item, index) => {
            const maxPontos = Math.max(...performance.evolucaoTemporal.slice(-30).map((e) => e.pontos));
            const altura = maxPontos > 0 ? (item.pontos / maxPontos) * 100 : 0;
            return (
              <motion.div
                key={index}
                initial={{ height: 0 }}
                animate={{ height: `${altura}%` }}
                whileHover={{ scale: 1.2, y: -4 }}
                transition={{ delay: index * 0.01, duration: 0.3 }}
                className="group relative flex-1 bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 dark:from-blue-500 dark:via-blue-400 dark:to-blue-300 rounded-t-md min-h-[6px] hover:shadow-lg hover:shadow-blue-500/40 transition-all duration-200 cursor-pointer"
                title={`${item.pontos} pontos em ${new Date(item.data).toLocaleDateString("pt-BR")}`}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="bg-foreground text-background text-xs font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    {item.pontos} pts
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="flex justify-between mt-3 text-xs text-muted-foreground">
          <span>-30d</span>
          <span>Hoje</span>
        </div>
      </div>
    </motion.div>
  );
}
