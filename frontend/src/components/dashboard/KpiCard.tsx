/**
 * ============================================================================
 * KPI CARD (Corrigido) - Componente de UI Reutilizável
 * ============================================================================
 *
 * Propósito:
 * Componente de UI reutilizável para exibir uma única métrica (KPI)
 * no dashboard, seguindo o Princípio 4 (Design Magnífico).
 *
 * CORREÇÃO:
 * - Importado `Variants` de `framer-motion`.
 * - Adicionada a tipagem `Variants` ao objeto `cardVariantes`
 * para resolver o erro de inferência de tipo (TS2322).
 *
 * @module Dashboard
 * ============================================================================
 */
"use client";

import { motion, Variants } from "framer-motion"; // Corrigido
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

/**
 * Propriedades do KpiCard.
 */
interface KpiCardProps {
  /**
   * Título da métrica (ex: "Usuários Pendentes").
   */
  titulo: string;
  /**
   * Valor principal da métrica (ex: "15" ou "R$ 1.200,50").
   */
  valor: string | number;
  /**
   * Descrição ou contexto da métrica (ex: "+5% vs. ontem").
   */
  descricao?: string;
  /**
   * Ícone do Lucide a ser exibido.
   */
  Icone: LucideIcon;
  /**
   * Cor do ícone e do valor (opcional, padrão 'primary').
   */
  cor?: "primary" | "success" | "warning" | "danger";
}

/**
 * Mapeamento de cores Tailwind HSL (Princípio 4).
 */
const coresMap = {
  primary: "text-primary",
  success: "text-green-500",
  warning: "text-yellow-500",
  danger: "text-red-500",
};

/**
 * Variantes de animação para o Framer Motion.
 * CORRIGIDO: Adicionada a tipagem explícita `Variants`
 */
const cardVariantes: Variants = {
  oculto: { opacity: 0, y: 20, scale: 0.98 },
  visivel: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut", // O tipo 'Variants' garante que "easeOut" é válido
    },
  },
};

/**
 * Componente de Card para exibição de KPIs.
 */
export function KpiCard({
  titulo,
  valor,
  descricao,
  Icone,
  cor = "primary",
}: KpiCardProps) {
  const corValor = coresMap[cor] || coresMap.primary;

  return (
    <motion.div
      variants={cardVariantes} // Corrigido
      className="bg-card/70 backdrop-blur-lg 
                 border border-border/20 rounded-2xl 
                 p-5 md:p-6 shadow-lg shadow-black/5"
    >
      <div className="flex items-center justify-between mb-4">
        {/* Título */}
        <span className="text-sm font-medium text-muted-foreground">
          {titulo}
        </span>
        {/* Ícone */}
        <div
          className={`p-2 bg-background rounded-full ${corValor} bg-opacity-50`}
        >
          <Icone className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        {/* Valor Principal */}
        <h3 className={`text-3xl md:text-4xl font-bold ${corValor}`}>
          {valor}
        </h3>
      </div>

      {/* Descrição Opcional */}
      {descricao && (
        <p className="text-xs text-muted-foreground mt-2">{descricao}</p>
      )}
    </motion.div>
  );
}