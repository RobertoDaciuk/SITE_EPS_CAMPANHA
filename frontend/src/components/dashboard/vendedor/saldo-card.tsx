"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wallet, TrendingUp, DollarSign, Lock, Info } from "lucide-react";
import { useState } from "react";

interface SaldoCardProps {
  saldo: {
    disponivel: number;
    reservado: number;
    total: number;
    ganhosMes: number;
  };
}

/**
 * Componente reutilizável de Tooltip com animação suave
 * @param text - Texto do tooltip
 * @param colorClass - Classe de cor do ícone (ex: "text-primary")
 */
function InfoTooltip({ text, colorClass }: { text: string; colorClass: string }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <Info className={`w-3.5 h-3.5 ${colorClass}/50 hover:${colorClass} transition-colors duration-150 cursor-help`} />

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{
              duration: 0.15,
              ease: [0.16, 1, 0.3, 1], // easeOutExpo - suave e elegante
            }}
            className="absolute top-full right-0 mt-2 z-50 w-40 pointer-events-none"
            role="tooltip"
            aria-live="polite"
          >
            <div className="bg-popover text-popover-foreground text-xs rounded-lg p-2 shadow-lg border backdrop-blur-sm">
              {text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
            className="p-4 rounded-2xl bg-primary/10 border border-primary/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary">Total de Pontos</span>
              </div>
              <InfoTooltip
                text="Total de pontos já pagos desde o início"
                colorClass="text-primary"
              />
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
            className="p-4 rounded-2xl bg-success/10 border border-success/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-success" />
                <span className="text-xs font-medium text-success">Pontos Disponíveis</span>
              </div>
              <InfoTooltip
                text="Total de pontos liberados para pagamento"
                colorClass="text-success"
              />
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
            className="p-4 rounded-2xl bg-warning/10 border border-warning/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-warning" />
                <span className="text-xs font-medium text-warning">Pontos Pendentes</span>
              </div>
              <InfoTooltip
                text="Vendas validadas aguardando conclusão de cartela"
                colorClass="text-warning"
              />
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
            className="p-4 rounded-2xl bg-primary/10 border border-primary/20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary">Neste mês</span>
              </div>
              <InfoTooltip
                text="Pontos conquistados no mês atual"
                colorClass="text-primary"
              />
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
