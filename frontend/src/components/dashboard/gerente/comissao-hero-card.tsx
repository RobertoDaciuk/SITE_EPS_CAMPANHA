/**
 * ============================================================================
 * COMPONENT: COMISSÃO HERO CARD
 * ============================================================================
 * 
 * Card de destaque com informações financeiras do gerente.
 * Hero section com glassmorphism e gradiente roxo.
 * 
 * @module DashboardGerente
 * ============================================================================
 */
"use client";

import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Calendar, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Comissao } from "@/types/dashboard-gerente";

interface ComissaoHeroCardProps {
  comissao: Comissao;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

export function ComissaoHeroCard({ comissao }: ComissaoHeroCardProps) {
  const formatarData = (data: Date | string | undefined | null) => {
    if (!data) return "—";
    const dataObj = typeof data === "string" ? new Date(data) : data;
    if (Number.isNaN(dataObj.getTime())) return "—";
    return format(dataObj, "dd 'de' MMMM", { locale: ptBR });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-8 shadow-2xl shadow-purple-500/20"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      
      {/* Glassmorphism Overlay */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl" />

      {/* Content */}
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-200">Pontos da Equipe</p>
              <h3 className="text-2xl font-bold text-white">Total Acumulado</h3>
            </div>
          </div>
          
          {comissao.proximoPagamento && (
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
              <Calendar className="h-4 w-4 text-purple-200" />
              <span className="text-sm font-semibold text-white">
                Próximo pagamento: {formatarData(comissao.proximoPagamento.data)}
              </span>
            </div>
          )}
        </div>

        {/* Valor Principal - PONTOS */}
        <div className="space-y-2">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-6xl font-extrabold text-white drop-shadow-lg"
          >
            {numberFormatter.format(comissao.pendente)} <span className="text-3xl">pts</span>
          </motion.h2>
          <p className="text-sm text-purple-200">
            Pontos totais de comissão acumulados da sua equipe
          </p>
        </div>

        {/* Métricas Secundárias */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Próximo Pagamento */}
          {comissao.proximoPagamento && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-purple-300" />
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-300">
                  Próximo Pagamento
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {currencyFormatter.format(comissao.proximoPagamento.valor)}
              </p>
            </motion.div>
          )}

          {/* Histórico 30 Dias */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <History className="h-4 w-4 text-purple-300" />
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-300">
                Recebido (30 dias)
              </p>
            </div>
            <p className="text-2xl font-bold text-white">
              {currencyFormatter.format(comissao.historico30Dias)}
            </p>
          </motion.div>

          {/* Pontos Pendentes da Equipe */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-300" />
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-300">
                Pontos Pendentes
              </p>
            </div>
            <p className="text-2xl font-bold text-white">
              {numberFormatter.format(comissao.pontosPendentesEquipe)} pts
            </p>
            <p className="text-xs text-purple-200 mt-1">
              Vendas validadas aguardando conclusão de cartela
            </p>
          </motion.div>
        </div>
      </div>

      {/* Glow Effect */}
      <div className="absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-purple-400/20 blur-3xl" />
      <div className="absolute -top-12 -left-12 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
    </motion.div>
  );
}
