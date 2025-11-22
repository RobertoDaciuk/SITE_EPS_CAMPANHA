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
 * OTIMIZADO: Reduzido stagger de 0.1 → 0.06 (40% mais rápido)
 */
const containerVariantes = {
  oculto: { opacity: 0 },
  visivel: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06, // Reduzido de 0.1 → 0.06 (40% mais rápido)
      ease: [0.25, 0.1, 0.25, 1.0],
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
    <div className="space-y-6">
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

      {/* Call to Action - Dashboard Completo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.24, // Reduzido de 0.4 → 0.24 (40% mais rápido)
          duration: 0.28, // Reduzido de 0.5 → 0.28 (44% mais rápido)
          ease: [0.25, 0.1, 0.25, 1.0]
        }}
        className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              📊 Dashboard Premium do Gerente
            </h3>
            <p className="text-sm text-muted-foreground">
              Acesse insights avançados, alertas inteligentes e performance detalhada da sua equipe
            </p>
          </div>
          <a
            href="/gerente"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:scale-105 shadow-lg shadow-primary/20"
          >
            Ver Dashboard Completo →
          </a>
        </div>
      </motion.div>
    </div>
  );
}