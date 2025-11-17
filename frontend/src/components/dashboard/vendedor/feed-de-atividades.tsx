"use client";

import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle,
  XCircle,
  Trophy,
  DollarSign,
  Clock,
  Bell,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface HistoricoVenda {
  id: string;
  numeroPedido: string;
  status: string;
  dataEnvio: Date;
  dataValidacao: Date | null;
  valorFinal: number;
  multiplicadorAplicado: number;
  numeroCartelaAtendida: number | null;
  motivoRejeicaoVendedor: string | null;
  campanha: {
    titulo: string;
    imagemCampanha16x9Url: string | null;
  };
  requisito: {
    descricao: string;
  };
}

interface Notificacao {
  id: string;
  mensagem: string;
  dataCriacao: Date;
  linkUrl: string | null;
}

interface FeedDeAtividadesProps {
  historico: HistoricoVenda[];
  notificacoes: {
    itens: Notificacao[];
    totalNaoLidas: number;
  };
}

const STATUS_CONFIG = {
  VALIDADO: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
    label: "Aprovada",
  },
  REJEITADO: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    label: "Rejeitada",
  },
  EM_ANALISE: {
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
    label: "Em Análise",
  },
  CONFLITO_MANUAL: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    label: "Conflito",
  },
};

export function FeedDeAtividades({ historico, notificacoes }: FeedDeAtividadesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl bg-card border border-border/50 shadow-xl overflow-hidden h-full flex flex-col"
    >
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 backdrop-blur-sm relative">
              <Activity className="w-6 h-6 text-primary" />
              {notificacoes.totalNaoLidas > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive 
                               flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {notificacoes.totalNaoLidas > 9 ? "9+" : notificacoes.totalNaoLidas}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold">Feed de Atividades</h3>
              <p className="text-sm text-muted-foreground">
                Últimas atualizações e notificações
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-6">
          {/* Notificações Não Lidas */}
          {notificacoes.itens.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Notificações</h4>
              </div>

              {notificacoes.itens.map((notif, idx) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 rounded-2xl bg-primary/5 border border-primary/20 hover:bg-primary/10 
                           transition-all duration-300 cursor-pointer group"
                  onClick={() => {
                    if (notif.linkUrl) {
                      window.location.href = notif.linkUrl;
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm flex-1">{notif.mensagem}</p>
                    {notif.linkUrl && (
                      <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 
                                           transition-transform flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(notif.dataCriacao), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Histórico de Vendas */}
          {historico.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-success" />
                <h4 className="font-semibold">Histórico Recente</h4>
              </div>

              {historico.map((venda, idx) => {
                const config = STATUS_CONFIG[venda.status as keyof typeof STATUS_CONFIG];
                const Icon = config?.icon || Activity;
                const dataExibicao = venda.dataValidacao || venda.dataEnvio;

                return (
                  <motion.div
                    key={venda.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (notificacoes.itens.length + idx) * 0.1 }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all duration-300",
                      config?.bg,
                      config?.border
                    )}
                  >
                    {/* Header da Venda */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-5 h-5", config?.color)} />
                        <div>
                          <p className="text-sm font-semibold">
                            Pedido #{venda.numeroPedido}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {venda.campanha.titulo}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          config?.bg,
                          config?.color
                        )}
                      >
                        {config?.label}
                      </span>
                    </div>

                    {/* Detalhes */}
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {venda.requisito.descricao}
                      </p>

                      {venda.status === "VALIDADO" && (
                        <div className="flex items-center gap-2 mt-2">
                          <DollarSign className="w-4 h-4 text-success" />
                          <span className="text-sm font-bold text-success">
                            +R$ {venda.valorFinal.toLocaleString("pt-BR", { 
                              minimumFractionDigits: 2 
                            })}
                          </span>
                          {venda.multiplicadorAplicado > 1 && (
                            <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning 
                                         text-xs font-bold">
                              {venda.multiplicadorAplicado}x
                            </span>
                          )}
                        </div>
                      )}

                      {venda.status === "REJEITADO" && venda.motivoRejeicaoVendedor && (
                        <p className="text-xs text-destructive mt-2">
                          Motivo: {venda.motivoRejeicaoVendedor}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(dataExibicao), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Estado Vazio */}
          {historico.length === 0 && notificacoes.itens.length === 0 && (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Nenhuma atividade recente
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
