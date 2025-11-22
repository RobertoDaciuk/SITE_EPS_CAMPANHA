"use client";

import { motion } from "framer-motion";
import { Trophy, Crown, Medal, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface VendedorRanking {
  id: string;
  nome: string;
  avatarUrl: string | null;
  nivel: string;
  totalPontos: number;
  posicao: number;
  ehUsuarioAtual: boolean;
}

interface MiniRankingProps {
  ranking: {
    topVendedores: VendedorRanking[];
    posicaoAtual: number;
  };
}

const CORES_NIVEL: Record<string, string> = {
  BRONZE: "text-amber-700",
  PRATA: "text-gray-400",
  OURO: "text-yellow-500",
  DIAMANTE: "text-cyan-400",
};

const ICONES_POSICAO: Record<number, React.ReactNode> = {
  1: <Crown className="w-5 h-5 text-yellow-500" fill="currentColor" />,
  2: <Medal className="w-5 h-5 text-gray-400" fill="currentColor" />,
  3: <Medal className="w-5 h-5 text-amber-700" fill="currentColor" />,
};

export function MiniRanking({ ranking }: MiniRankingProps) {
  const { topVendedores, posicaoAtual } = ranking;

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
      <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 backdrop-blur-sm">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Top Vendedores</h3>
              <p className="text-sm text-muted-foreground">
                Você está em {posicaoAtual}º lugar
              </p>
            </div>
          </div>
          <Link href="/ranking">
            <motion.button
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.18, ease: [0.34, 1.25, 0.64, 1] }
              }}
              whileTap={{ scale: 0.95 }}
              className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
            >
              Ver ranking completo
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Lista de Vendedores */}
      <div className="p-6 space-y-3">
        {topVendedores.map((vendedor, idx) => (
          <motion.div
            key={vendedor.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: idx * 0.06, // Reduzido de 0.1 → 0.06 (40% mais rápido)
              duration: 0.28,
              ease: [0.25, 0.1, 0.25, 1.0]
            }}
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl transition-colors duration-200", // Corrigido: transition-all → transition-colors
              vendedor.ehUsuarioAtual
                ? "bg-primary/10 border-2 border-primary/30 shadow-lg shadow-primary/10"
                : "bg-card/50 hover:bg-card border border-border/30"
            )}
          >
            {/* Posição */}
            <div className="flex items-center justify-center w-8">
              {ICONES_POSICAO[vendedor.posicao] || (
                <span className="text-sm font-bold text-muted-foreground" style={{ fontFeatureSettings: '"tnum"' }}>
                  {vendedor.posicao}º
                </span>
              )}
            </div>

            {/* Avatar */}
            <div className="relative">
              <div
                className={cn(
                  "w-12 h-12 rounded-full overflow-hidden border-2 transition-all",
                  vendedor.ehUsuarioAtual ? "border-primary" : "border-border"
                )}
              >
                {vendedor.avatarUrl ? (
                  <Image
                    src={vendedor.avatarUrl}
                    alt={vendedor.nome}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {vendedor.nome.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Badge de nível */}
              {vendedor.posicao <= 3 && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-background flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-success" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={cn(
                  "font-semibold truncate",
                  vendedor.ehUsuarioAtual && "text-primary"
                )}>
                  {vendedor.nome}
                  {vendedor.ehUsuarioAtual && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (Você)
                    </span>
                  )}
                </p>
              </div>
              <p className={cn(
                "text-xs font-medium",
                CORES_NIVEL[vendedor.nivel] || "text-muted-foreground"
              )}>
                {vendedor.nivel.charAt(0) + vendedor.nivel.slice(1).toLowerCase()}
              </p>
            </div>

            {/* Pontos */}
            <div className="text-right">
              <p className={cn(
                "text-lg font-bold",
                vendedor.ehUsuarioAtual ? "text-primary" : "text-foreground"
              )}
              style={{ fontFeatureSettings: '"tnum"' }}>
                {vendedor.totalPontos.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-muted-foreground">pontos</p>
            </div>
          </motion.div>
        ))}

        {/* Mensagem se usuário não está no Top 5 */}
        {!topVendedores.some((v) => v.ehUsuarioAtual) && posicaoAtual > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: 0.30, // Reduzido de 0.5 → 0.30 (40% mais rápido)
              duration: 0.28,
              ease: [0.25, 0.1, 0.25, 1.0]
            }}
            className="mt-4 p-4 rounded-2xl bg-muted/50 border border-border/50 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Continue vendendo para entrar no <strong>Top 5!</strong>
              <br />
              Você está em <strong>{posicaoAtual}º lugar</strong>.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
