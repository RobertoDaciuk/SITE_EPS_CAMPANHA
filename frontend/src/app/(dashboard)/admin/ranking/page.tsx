"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/axios";
import { useSearchParams, useRouter } from "next/navigation";
import { Trophy, Store, ChevronLeft, ChevronRight, Filter, Award } from "lucide-react";
import toast from "react-hot-toast";
import RankingSkeleton from "@/components/admin/ranking/RankingSkeleton";
import ButtonWithLoading from "@/components/ui/ButtonWithLoading";

interface Vendedor {
  id: string;
  nome: string;
  avatarUrl?: string;
  nivel: string;
  valorTotal: number;
  posicao: number;
  optica: { id: string; nome: string; cnpj: string; };
}

interface RankingResponse {
  dados: Vendedor[];
  paginaAtual: number;
  totalPaginas: number;
  totalRegistros: number;
}

interface Otica {
  id: string;
  nome: string;
  cnpj: string;
}

// Fetcher genérico para SWR
const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function RankingAdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [oticaSelecionada, setOticaSelecionada] = useState<string>("");
  const paginaAtual = parseInt(searchParams.get("pagina") || "1");

  // Buscar óticas com SWR (cache de 5 minutos)
  const { data: oticas = [], error: erroOticas } = useSWR<Otica[]>(
    "/oticas",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutos sem re-request
      onError: () => toast.error("Erro ao carregar lista de óticas"),
    }
  );

  // Buscar ranking com SWR (atualização automática)
  const rankingUrl = `/ranking/admin?pagina=${paginaAtual}&limite=50${
    oticaSelecionada ? `&oticaId=${oticaSelecionada}` : ""
  }`;

  const {
    data: ranking,
    error: erroRanking,
    isLoading
  } = useSWR<RankingResponse>(
    rankingUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // 10 segundos sem re-request
      keepPreviousData: true, // Mantém dados antigos enquanto revalida (Optimistic UI)
      onError: (err: any) => toast.error(err.response?.data?.message || "Erro ao carregar ranking"),
    }
  );

  const mudarPagina = (novaPagina: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("pagina", novaPagina.toString());
    router.push(`/admin/ranking?${params.toString()}`);
  };

  const formatarCNPJ = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

  // Função para retornar medalhas (com suporte a emoji)
  const getPosicaoMedal = (p: number) => {
    if (p === 1) return "🥇";
    if (p === 2) return "🥈";
    if (p === 3) return "🥉";
    return null;
  };

  // Função para retornar classes de gradiente para Top 3
  const getTopClassNames = (p: number) => {
    if (p === 1) return "bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-l-4 border-yellow-500";
    if (p === 2) return "bg-gradient-to-r from-gray-400/10 to-slate-400/10 border-l-4 border-gray-400";
    if (p === 3) return "bg-gradient-to-r from-orange-600/10 to-amber-700/10 border-l-4 border-orange-600";
    return "";
  };


  // Mostrar skeleton apenas no primeiro carregamento
  if (isLoading && !ranking) {
    return <RankingSkeleton />;
  }

  return (
    <div className="flex-1 space-y-8 pb-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl p-8 md:p-10 bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border border-warning/20 backdrop-blur-sm">
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

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card/70 border border-border/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-warning" />
          <h3 className="text-lg font-bold">Filtrar por Ótica</h3>
        </div>
        <select value={oticaSelecionada} onChange={(e) => setOticaSelecionada(e.target.value)} className="w-full h-12 px-4 bg-background/60 border-2 border-border/50 rounded-xl font-medium focus:outline-none focus:ring-4 focus:ring-warning/20 focus:border-warning">
          <option value="">Todas as Óticas</option>
          {oticas.map((o) => <option key={o.id} value={o.id}>{o.nome} - {formatarCNPJ(o.cnpj)}</option>)}
        </select>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card/70 border border-border/20 rounded-2xl overflow-hidden">
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
            <AnimatePresence mode="popLayout">
              {ranking?.dados.map((v, index) => {
                const medal = getPosicaoMedal(v.posicao);
                const topClasses = getTopClassNames(v.posicao);

                return (
                  <motion.tr
                    key={v.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                    whileHover={{ scale: 1.01, x: 4 }}
                    className={`hover:bg-warning/5 transition-colors ${topClasses}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {medal ? (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: index * 0.03 + 0.2 }}
                            className="text-2xl"
                          >
                            {medal}
                          </motion.span>
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">#{v.posicao}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: [0, -5, 5, -5, 0] }}
                          transition={{ duration: 0.5 }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            v.posicao <= 3
                              ? "bg-gradient-to-br from-warning to-amber-500"
                              : "bg-warning/20"
                          }`}
                        >
                          <span className={`text-sm font-bold ${v.posicao <= 3 ? "text-white" : "text-warning"}`}>
                            {v.nome.charAt(0)}
                          </span>
                        </motion.div>
                        <span className="font-semibold">{v.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{v.optica.nome}</p>
                          <p className="text-xs text-muted-foreground">{formatarCNPJ(v.optica.cnpj)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-lg font-bold text-success">{v.valorTotal.toLocaleString('pt-BR')}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>

        {ranking && ranking.totalPaginas > 1 && (
          <div className="px-6 py-4 border-t border-border/20 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Página {ranking.paginaAtual} de {ranking.totalPaginas}</p>
            <div className="flex gap-2">
              <ButtonWithLoading
                icon={ChevronLeft}
                iconOnly
                onClick={() => mudarPagina(paginaAtual - 1)}
                disabled={paginaAtual === 1}
                variant="ghost"
                size="sm"
                className="px-4 py-2 rounded-lg border hover:bg-warning/10"
              />
              <ButtonWithLoading
                icon={ChevronRight}
                iconOnly
                onClick={() => mudarPagina(paginaAtual + 1)}
                disabled={paginaAtual === ranking.totalPaginas}
                variant="ghost"
                size="sm"
                className="px-4 py-2 rounded-lg border hover:bg-warning/10"
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
