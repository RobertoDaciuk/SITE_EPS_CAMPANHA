"use client";

import { motion } from "framer-motion";
import { Wallet, TrendingUp, ArrowRight, DollarSign, Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SaldoCardProps {
  saldo: {
    disponivel: number;
    reservado: number;
    total: number;
    ganhosMes: number;
  };
}

export function SaldoCard({ saldo }: SaldoCardProps) {
  const { disponivel, reservado, total, ganhosMes } = saldo;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background
                 border border-primary/20 shadow-2xl shadow-primary/10"
    >
      {/* Efeito de brilho animado */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent 
                      animate-shimmer" />
      
      <div className="relative p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 backdrop-blur-sm">
              <Wallet className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Saldo Total</h3>
              <p className="text-xs text-muted-foreground/70">Pontos acumulados</p>
            </div>
          </div>
        </div>

        {/* Valor Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-muted-foreground">R$</span>
            <span className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 
                           bg-clip-text text-transparent">
              {total.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </motion.div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Disponível */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-2xl bg-success/10 border border-success/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-success" />
              <span className="text-xs font-medium text-success">Disponível</span>
            </div>
            <p className="text-2xl font-bold text-success">
              R$ {disponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </motion.div>

          {/* Reservado */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 rounded-2xl bg-warning/10 border border-warning/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-warning" />
              <span className="text-xs font-medium text-warning">Reservado</span>
            </div>
            <p className="text-2xl font-bold text-warning">
              R$ {reservado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </motion.div>

          {/* Ganhos do Mês */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="p-4 rounded-2xl bg-primary/10 border border-primary/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary">Neste mês</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              R$ {ganhosMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </motion.div>
        </div>

        {/* CTA */}
        <Link href="/perfil?tab=financeiro">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl
                     bg-primary text-primary-foreground font-semibold
                     hover:bg-primary/90 transition-all duration-300
                     shadow-lg shadow-primary/20"
          >
            Ver Extrato Detalhado
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}
