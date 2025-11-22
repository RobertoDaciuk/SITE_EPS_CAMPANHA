"use client";

import { motion } from "framer-motion";
import { Target, Zap, CheckCircle, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface RequisitoIncompleto {
  descricao: string;
  quantidadeAtual: number;
  quantidadeTotal: number;
  faltam: number;
}

interface ProximaMeta {
  campanhaTitulo: string;
  campanhaId: string;
  numeroCartela: number;
  descricaoCartela: string | null;
  progresso: number;
  vendasNecessarias: number;
  requisitosIncompletos: RequisitoIncompleto[];
}

interface EventoAtivo {
  id: string;
  nome: string;
  multiplicador: number;
  corDestaque: string;
  dataInicio: Date;
  dataFim: Date;
}

interface MetasAtuaisProps {
  metas: {
    proximaCartela: ProximaMeta | null;
    eventosAtivos: EventoAtivo[];
  };
}

export function MetasAtuais({ metas }: MetasAtuaisProps) {
  const { proximaCartela, eventosAtivos } = metas;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28, // Reduzido de 0.5 → 0.28 (44% mais rápido)
        ease: [0.25, 0.1, 0.25, 1.0]
      }}
      className="rounded-3xl bg-card border border-border/50 shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-success/10 backdrop-blur-sm">
            <Target className="w-6 h-6 text-success" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Suas Metas</h3>
            <p className="text-sm text-muted-foreground">
              Objetivos e desafios ativos
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-6 space-y-6">
        {/* Próxima Cartela */}
        {proximaCartela ? (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.08, // Reduzido de 0.2 → 0.08 (60% mais rápido)
              duration: 0.28,
              ease: [0.25, 0.1, 0.25, 1.0]
            }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <h4 className="font-semibold">Próxima Cartela a Completar</h4>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-success/5 to-primary/5 border border-border/30">
              <div className="mb-3">
                <Link href={`/campanhas/${proximaCartela.campanhaId}`}>
                  <h5 className="font-bold text-lg hover:text-primary transition-colors cursor-pointer">
                    {proximaCartela.campanhaTitulo}
                  </h5>
                </Link>
                <p className="text-sm text-muted-foreground">
                  Cartela {proximaCartela.numeroCartela}
                  {proximaCartela.descricaoCartela && ` - ${proximaCartela.descricaoCartela}`}
                </p>
              </div>

              {/* Progresso */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progresso</span>
                  <span className="text-sm font-bold text-primary" style={{ fontFeatureSettings: '"tnum"' }}>
                    {proximaCartela.progresso}%
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${proximaCartela.progresso}%` }}
                    transition={{
                      duration: 0.45, // Reduzido de 1 → 0.45 (55% mais rápido!)
                      delay: 0.12, // Reduzido de 0.3 → 0.12 (60% mais rápido)
                      ease: [0.34, 1.35, 0.64, 1] // easeOutBack para bounce sutil
                    }}
                    className="h-full bg-gradient-to-r from-success to-primary rounded-full"
                  />
                </div>
              </div>

              {/* Requisitos Incompletos */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Faltam {proximaCartela.vendasNecessarias} vendas
                </p>
                {proximaCartela.requisitosIncompletos.slice(0, 3).map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{req.descricao}</p>
                      <p className="text-xs text-muted-foreground" style={{ fontFeatureSettings: '"tnum"' }}>
                        {req.quantidadeAtual} / {req.quantidadeTotal}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-warning ml-2" style={{ fontFeatureSettings: '"tnum"' }}>
                      Faltam {req.faltam}
                    </span>
                  </div>
                ))}
                {proximaCartela.requisitosIncompletos.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    + {proximaCartela.requisitosIncompletos.length - 3} requisitos
                  </p>
                )}
              </div>

              {/* CTA */}
              <Link href={`/campanhas/${proximaCartela.campanhaId}`}>
                <motion.button
                  whileHover={{
                    scale: 1.02,
                    transition: { duration: 0.2, ease: [0.34, 1.25, 0.64, 1] }
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                           bg-success text-white font-semibold
                           hover:bg-success/90 transition-colors duration-200"
                >
                  Ver Campanha
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Nenhuma meta ativa no momento
            </p>
          </div>
        )}

        {/* Eventos Especiais Ativos */}
        {eventosAtivos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.16, // Reduzido de 0.4 → 0.16 (60% mais rápido)
              duration: 0.28,
              ease: [0.25, 0.1, 0.25, 1.0]
            }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning" />
              <h4 className="font-semibold">Eventos Especiais Ativos</h4>
            </div>

            <div className="space-y-3">
              {eventosAtivos.map((evento, idx) => (
                <motion.div
                  key={evento.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.20 + idx * 0.04, // Reduzido de 0.5 + idx*0.1 → 0.20 + idx*0.04 (60% mais rápido)
                    duration: 0.24,
                    ease: [0.25, 0.1, 0.25, 1.0]
                  }}
                  className="p-4 rounded-2xl border-2 relative overflow-hidden"
                  style={{
                    borderColor: `${evento.corDestaque}40`,
                    backgroundColor: `${evento.corDestaque}08`,
                  }}
                >
                  {/* Efeito de brilho */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      background: `linear-gradient(135deg, transparent 0%, ${evento.corDestaque} 100%)`,
                    }}
                  />

                  <div className="relative flex items-center gap-3">
                    <div
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: `${evento.corDestaque}20` }}
                    >
                      <Zap
                        className="w-6 h-6"
                        style={{ color: evento.corDestaque }}
                        fill="currentColor"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5
                        className="font-bold text-sm"
                        style={{ color: evento.corDestaque }}
                      >
                        {evento.nome}
                      </h5>
                      <p className="text-xs text-muted-foreground">
                        Até{" "}
                        {new Date(evento.dataFim).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <div
                      className="px-3 py-1 rounded-full font-bold text-sm"
                      style={{
                        backgroundColor: `${evento.corDestaque}20`,
                        color: evento.corDestaque,
                        fontFeatureSettings: '"tnum"'
                      }}
                    >
                      {evento.multiplicador}x
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Motivação */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: 0.24, // Reduzido de 0.6 → 0.24 (60% mais rápido)
            duration: 0.3,
            ease: [0.25, 0.1, 0.25, 1.0]
          }}
          className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-success/5 border border-border/30 text-center"
        >
          <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Continue assim! Cada venda te aproxima dos seus objetivos.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
