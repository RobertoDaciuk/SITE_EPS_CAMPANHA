"use client";

import { Trophy, Filter } from "lucide-react";
import { motion } from "framer-motion";

export default function RankingSkeleton() {
  return (
    <div className="flex-1 space-y-8 pb-8">
      {/* Header com gradiente */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-8 md:p-10 bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border border-warning/20 backdrop-blur-sm"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-warning/10 rounded-full blur-3xl -z-10" />
        <div className="flex items-start gap-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-warning to-warning/90 shadow-lg shadow-warning/30">
            <Trophy className="w-10 h-10 text-warning-foreground" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black">Ranking Geral</h1>
            <p className="text-muted-foreground mt-2">Desempenho por valor de vendas</p>
          </div>
        </div>
      </motion.div>

      {/* Filtro Skeleton */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card/70 border border-border/20 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-warning" />
          <h3 className="text-lg font-bold">Filtrar por Ótica</h3>
        </div>
        <div className="w-full h-12 bg-muted/50 rounded-xl animate-pulse" />
      </motion.div>

      {/* Tabela Skeleton */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card/70 border border-border/20 rounded-2xl overflow-hidden"
      >
        <table className="w-full">
          <thead className="bg-warning/10 border-b border-border/20">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase">Posição</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase">Vendedor</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase">Ótica</th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase">Pontos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {[...Array(10)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-6 py-4">
                  <div className="w-12 h-6 bg-muted/50 rounded" />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted/50" />
                    <div className="w-32 h-5 bg-muted/50 rounded" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <div className="w-40 h-4 bg-muted/50 rounded" />
                    <div className="w-28 h-3 bg-muted/50 rounded" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="ml-auto w-24 h-6 bg-muted/50 rounded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginação Skeleton */}
        <div className="px-6 py-4 border-t border-border/20 flex justify-between">
          <div className="w-32 h-5 bg-muted/50 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="w-10 h-10 bg-muted/50 rounded-lg animate-pulse" />
            <div className="w-10 h-10 bg-muted/50 rounded-lg animate-pulse" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
