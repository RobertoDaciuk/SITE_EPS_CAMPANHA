/**
 * ============================================================================
 * KPIS GERENTE (Corrigido) - Princípios 1, 3, 4
 * ============================================================================
 *
 * Propósito:
 * Renderiza o grid de KPIs específico para o perfil GERENTE.
 *
 * CORREÇÃO (Princípio 1):
 * - Adicionada verificação defensiva para prevenir erros com valores nulos/indefinidos.
 *
 * @module Dashboard
 * ============================================================================
 */
"use client";

import { motion } from "framer-motion";
import { KpiCard } from "./KpiCard";
import { Users, Files, DollarSign, Gem } from "lucide-react";

/**
 * Propriedades do KpisGerente.
 */
interface KpisGerenteProps {
  /**
   * Dados buscados do endpoint /api/dashboard/kpis.
   */
  dados: {
    totalVendedores: number;
    vendasTimeAnalise: number;
    comissaoPendente: number;
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
 * Formata um valor numérico para o padrão BRL.
 */
const formatarBRL = (valor: number) => {
  // Adiciona verificação defensiva
  const valorSeguro = valor ?? 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valorSeguro);
};

/**
 * Componente do Dashboard do Gerente.
 */
export function KpisGerente({ dados }: KpisGerenteProps) {
  if (!dados) return null;

  return (
    <motion.div
      variants={containerVariantes}
      initial="oculto"
      animate="visivel"
      className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4"
    >
      <KpiCard
        titulo="Comissão Pendente"
        valor={formatarBRL(dados.comissaoPendente)}
        descricao="Valor a receber"
        Icone={DollarSign}
        cor={dados.comissaoPendente > 0 ? "success" : "primary"}
      />
      <KpiCard
        titulo="Vendedores na Equipe"
        valor={(dados.totalVendedores ?? 0).toLocaleString("pt-BR")}
        descricao="Total de vendedores gerenciados"
        Icone={Users}
        cor="primary"
      />
      <KpiCard
        titulo="Vendas (Equipe) em Análise"
        valor={(dados.vendasTimeAnalise ?? 0).toLocaleString("pt-BR")}
        descricao="Aguardando validação do Admin"
        Icone={Files}
        cor={dados.vendasTimeAnalise > 0 ? "warning" : "primary"}
      />
      
    </motion.div>
  );
}