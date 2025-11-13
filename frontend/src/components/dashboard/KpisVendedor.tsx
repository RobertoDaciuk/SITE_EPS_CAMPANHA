/**
 * ============================================================================
 * KPIS VENDEDOR (Corrigido - Lógica de Ranking) - Princípios 1, 3, 4
 * ============================================================================
 *
 * Propósito:
 * Renderiza o grid de KPIs específico para o perfil VENDEDOR.
 *
 * CORREÇÃO (Q.I. 170 - Lógica de Ranking):
 * - Refatorada a formatação e exibição da `posicaoRanking`.
 * - Se `posicaoRanking` é 0 (Não Ranqueado), exibe "N/A" ao invés de "0º".
 * - Ajustada a lógica de cor do card para usar "warning" apenas para o Top 3.
 *
 * @module Dashboard
 * ============================================================================
 */
"use client";

import { motion } from "framer-motion";
import { KpiCard } from "./KpiCard";
import { Wallet, Gem, CheckCircle, Trophy, Star } from "lucide-react";

/**
 * Propriedades do KpisVendedor.
 */
interface KpisVendedorProps {
  /**
   * Dados buscados do endpoint /api/dashboard/kpis.
   */
  dados: {
    totalPontosReais: number;
    nivel: string;
    vendasAprovadas: number;
    cartelasCompletas: number;
    posicaoRanking: number;
  };
}

/**
 * Variantes de animação para o container (stagger).
 */
const containerVariantes = {
  oculto: { opacity: 0 },
  visivel: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

/**
 * Componente do Dashboard do Vendedor.
 */
export function KpisVendedor({ dados }: KpisVendedorProps) {
  if (!dados) return null;

  const posicaoSegura = dados.posicaoRanking ?? 0;

  /**
   * CORREÇÃO DE LÓGICA (Princípio 1):
   * Se a posição for 0, o usuário não está ranqueado.
   * Exibir "N/A" ou "Não Ranqueado" melhora a UX.
   */
  const posicaoFormatada = posicaoSegura === 0 ? "N/A" : `${posicaoSegura}º`;

  return (
    <motion.div
      variants={containerVariantes}
      initial="oculto"
      animate="visivel"
      className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-5"
    >
      <KpiCard
        titulo="Posição no Ranking"
        valor={posicaoFormatada}
        descricao="Sua posição geral"
        Icone={Trophy}
        // Corrigido: Aplica 'warning' apenas se posição for entre 1 e 3
        cor={posicaoSegura > 0 && posicaoSegura <= 3 ? "warning" : "primary"}
      />
      <KpiCard
        titulo="Total (Pontos)"
        // Exibe pontos reais acumulados (R$ convertidos em pontos)
        valor={(dados.totalPontosReais ?? 0).toLocaleString("pt-BR")}
        descricao="Total de pontos recebidos"
        Icone={Wallet}
        cor="success"
      />
      <KpiCard
        titulo="Vendas Aprovadas"
        // CORRIGIDO: Adicionado `?? 0` para robustez
        valor={(dados.vendasAprovadas ?? 0).toLocaleString("pt-BR")}
        descricao="Total de vendas validadas"
        Icone={CheckCircle}
        cor="primary"
      />
      <KpiCard
        titulo="Nível Atual"
        valor={
          (dados.nivel ?? "BRONZE").charAt(0) +
          (dados.nivel ?? "BRONZE").slice(1).toLowerCase()
        }
        descricao="Seu nível de prestígio"
        Icone={Star}
        cor="primary"
      />
    </motion.div>
  );
}