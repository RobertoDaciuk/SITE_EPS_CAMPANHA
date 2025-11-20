/**
 * ============================================================================
 * COMPONENT: ALERTAS EQUIPE CARD
 * ============================================================================
 * 
 * Card com lista priorizada de alertas inteligentes.
 * Cores por severidade (vermelho/laranja/verde) e CTAs acionáveis.
 * 
 * @module DashboardGerente
 * ============================================================================
 */
"use client";

import { motion } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, ChevronRight } from "lucide-react";
import type { Alertas } from "@/types/dashboard-gerente";

interface AlertasEquipeCardProps {
  alertas: Alertas;
}

export function AlertasEquipeCard({ alertas }: AlertasEquipeCardProps) {
  const totalAlertas =
    alertas.criticos.length + alertas.atencao.length + alertas.oportunidades.length;

  const todosAlertas = [
    ...alertas.criticos.map((a) => ({ ...a, tipo: "CRITICO" as const })),
    ...alertas.atencao.map((a) => ({ ...a, tipo: "ATENCAO" as const })),
    ...alertas.oportunidades.map((a) => ({ ...a, tipo: "OPORTUNIDADE" as const })),
  ];

  const getIcone = (tipo: string) => {
    switch (tipo) {
      case "CRITICO":
        return <AlertTriangle className="h-5 w-5" />;
      case "ATENCAO":
        return <AlertCircle className="h-5 w-5" />;
      case "OPORTUNIDADE":
        return <Info className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getEstilo = (tipo: string) => {
    switch (tipo) {
      case "CRITICO":
        return {
          container: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50",
          icon: "text-rose-600 dark:text-rose-400",
          badge: "bg-rose-600 dark:bg-rose-500",
          text: "text-rose-900 dark:text-rose-100",
        };
      case "ATENCAO":
        return {
          container: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
          icon: "text-amber-600 dark:text-amber-400",
          badge: "bg-amber-600 dark:bg-amber-500",
          text: "text-amber-900 dark:text-amber-100",
        };
      case "OPORTUNIDADE":
        return {
          container: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50",
          icon: "text-emerald-600 dark:text-emerald-400",
          badge: "bg-emerald-600 dark:bg-emerald-500",
          text: "text-emerald-900 dark:text-emerald-100",
        };
      default:
        return {
          container: "bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800/50",
          icon: "text-gray-600 dark:text-gray-400",
          badge: "bg-gray-600 dark:bg-gray-500",
          text: "text-gray-900 dark:text-gray-100",
        };
    }
  };

  if (totalAlertas === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-2xl border border-border/40 bg-card/80 p-8 shadow-sm backdrop-blur-sm text-center"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Info className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Tudo sob controle!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Nenhum alerta pendente no momento
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-2xl border border-border/40 bg-card/80 p-6 shadow-sm backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Alertas da Equipe</h3>
          <p className="text-sm text-muted-foreground">
            {totalAlertas} {totalAlertas === 1 ? "alerta ativo" : "alertas ativos"}
          </p>
        </div>

        {/* Badges de Resumo */}
        <div className="flex items-center gap-2">
          {alertas.criticos.length > 0 && (
            <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">
              {alertas.criticos.length} críticos
            </span>
          )}
          {alertas.atencao.length > 0 && (
            <span className="rounded-full bg-amber-600 px-3 py-1 text-xs font-bold text-white">
              {alertas.atencao.length} atenção
            </span>
          )}
        </div>
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {todosAlertas.map((alerta, index) => {
          const estilo = getEstilo(alerta.tipo);
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className={`rounded-xl border p-4 transition-all hover:shadow-md ${estilo.container}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${estilo.icon}`}>{getIcone(alerta.tipo)}</div>
                
                <div className="flex-1 space-y-2">
                  <div>
                    <p className={`text-sm font-semibold ${estilo.text}`}>
                      {alerta.descricao}
                    </p>
                    {alerta.vendedor && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Vendedor: {alerta.vendedor}
                      </p>
                    )}
                  </div>
                  
                  <button
                    className={`flex items-center gap-1 text-xs font-semibold ${estilo.icon} hover:underline`}
                  >
                    {alerta.acao}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
