"use client";

import { motion } from "framer-motion";
import { Wallet, TrendingUp, DollarSign, Lock, Info } from "lucide-react";

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
      transition={{
        duration: 0.28, // Reduzido de 0.5 → 0.28 (40% mais rápido, abaixo do limiar de 300ms)
        ease: [0.25, 0.1, 0.25, 1.0] // Cubic-bezier customizado: início rápido, fim suave (substitui spring)
      }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background
                 border border-primary/20 shadow-2xl shadow-primary/10"
    >
      {/* Efeito de brilho sutil (shimmer removido - sem definição CSS) */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/3 to-transparent opacity-60" />
      
      <div className="relative p-8">
        {/* Grid de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total de Pontos */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.08, // Reduzido: easing exponencial (0.08, 0.12, 0.16, 0.20)
              duration: 0.32,
              ease: [0.22, 0.61, 0.36, 1] // "easeOutCubic" - mais natural
            }}
            className="p-4 rounded-2xl bg-primary/10 border border-primary/20 group relative overflow-visible"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary">Total de Pontos</span>
              </div>
              <div className="relative">
                <Info className="w-3.5 h-3.5 text-primary/50 hover:text-primary transition-colors cursor-help" />
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-50 w-40">
                  <div className="bg-popover text-popover-foreground text-xs rounded-lg p-2 shadow-lg border">
                    Total de pontos já pagos desde o início
                  </div>
                </div>
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">
              {Math.floor(total).toLocaleString("pt-BR")} pts
            </p>
          </motion.div>

          {/* Pontos Disponíveis */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.12,
              duration: 0.32,
              ease: [0.22, 0.61, 0.36, 1]
            }}
            className="p-4 rounded-2xl bg-success/10 border border-success/20 group relative overflow-visible"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-success" />
                <span className="text-xs font-medium text-success">Pontos Disponíveis</span>
              </div>
              <div className="relative">
                <Info className="w-3.5 h-3.5 text-success/50 hover:text-success transition-colors cursor-help" />
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-50 w-40">
                  <div className="bg-popover text-popover-foreground text-xs rounded-lg p-2 shadow-lg border">
                    Total de pontos liberados para pagamento
                  </div>
                </div>
              </div>
            </div>
            <p className="text-2xl font-bold text-success">
              {Math.floor(disponivel).toLocaleString("pt-BR")} pts
            </p>
          </motion.div>

          {/* Pontos Pendentes */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.16,
              duration: 0.32,
              ease: [0.22, 0.61, 0.36, 1]
            }}
            className="p-4 rounded-2xl bg-warning/10 border border-warning/20 group relative overflow-visible"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-warning" />
                <span className="text-xs font-medium text-warning">Pontos Pendentes</span>
              </div>
              <div className="relative">
                <Info className="w-3.5 h-3.5 text-warning/50 hover:text-warning transition-colors cursor-help" />
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-50 w-40">
                  <div className="bg-popover text-popover-foreground text-xs rounded-lg p-2 shadow-lg border">
                    Vendas validadas aguardando conclusão de cartela
                  </div>
                </div>
              </div>
            </div>
            <p className="text-2xl font-bold text-warning">
              {Math.floor(reservado).toLocaleString("pt-BR")} pts
            </p>
          </motion.div>

          {/* Ganhos do Mês */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.20,
              duration: 0.32,
              ease: [0.22, 0.61, 0.36, 1]
            }}
            className="p-4 rounded-2xl bg-primary/10 border border-primary/20 group relative overflow-visible"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary">Neste mês</span>
              </div>
              <div className="relative">
                <Info className="w-3.5 h-3.5 text-primary/50 hover:text-primary transition-colors cursor-help" />
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-50 w-40">
                  <div className="bg-popover text-popover-foreground text-xs rounded-lg p-2 shadow-lg border">
                    Pontos conquistados no mês atual
                  </div>
                </div>
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">
              {Math.floor(ganhosMes).toLocaleString("pt-BR")} pts
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
