/**
 * ============================================================================
 * KPIS ADMIN (Implementado) - Princípios 1, 3, 4
 * ============================================================================
 *
 * Propósito:
 * Renderiza o grid de KPIs específico para o perfil ADMIN.
 *
 * @module Dashboard
 * ============================================================================
 */
"use client";

import { motion } from "framer-motion";
import { KpiCard } from "./KpiCard";
import { Building, FileSearch, PackageCheck, UserCheck } from "lucide-react";

/**
 * Propriedades do KpisAdmin.
 */
interface KpisAdminProps {
  /**
   * Dados buscados do endpoint /api/dashboard/kpis.
   */
  dados: {
    usuariosPendentes: number;
    vendasEmAnalise: number;
    oticasAtivas: number;
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
 * Componente do Dashboard do Admin.
 */
export function KpisAdmin({ dados }: KpisAdminProps) {
  if (!dados) return null;

  return (
    <motion.div
      variants={containerVariantes}
      initial="oculto"
      animate="visivel"
      className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4"
    >
      <KpiCard
        titulo="Usuários Pendentes"
        valor={dados.usuariosPendentes}
        descricao="Aguardando sua aprovação"
        Icone={UserCheck}
        cor={dados.usuariosPendentes > 0 ? "warning" : "success"}
      />
      <KpiCard
        titulo="Vendas em Análise"
        valor={dados.vendasEmAnalise}
        descricao="Aguardando validação manual"
        Icone={FileSearch}
        cor={dados.vendasEmAnalise > 0 ? "warning" : "primary"}
      />
      <KpiCard
        titulo="Óticas Ativas"
        valor={dados.oticasAtivas}
        descricao="Parceiras na plataforma"
        Icone={Building}
        cor="primary"
      />
    </motion.div>
  );
}