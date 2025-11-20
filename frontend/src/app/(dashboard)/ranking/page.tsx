"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import api from "@/lib/axios";
import { useSearchParams, useRouter } from "next/navigation";
import { Trophy, Coins, ChevronLeft, ChevronRight, Award } from "lucide-react";
import toast from "react-hot-toast";

interface Vendedor {
  id: string;
  nome: string;
  valorTotal: number;
  nivel: string;
  posicao: number;
}

interface RankingResponse {
  dados: Vendedor[];
  paginaAtual: number;
  totalPaginas: number;
  totalRegistros: number;
}

export default function RankingVendedorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const paginaAtual = parseInt(searchParams.get("pagina") || "1");

  useEffect(() => {
    const carregarRanking = async () => {
      setCarregando(true);
      try {
        const params = { pagina: paginaAtual, limite: 50 };
        const response = await api.get("/ranking/vendedor", { params });
        setRanking(response.data);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Erro ao carregar ranking");
      } finally {
        setCarregando(false);
      }
    };
    carregarRanking();
  }, [paginaAtual]);

  const mudarPagina = (novaPagina: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("pagina", novaPagina.toString());
    router.push(`/ranking?${params.toString()}`);
  };

  const formatarNumero = (m: number) => new Intl.NumberFormat("pt-BR").format(m);
  const getNivelColor = (n: string) => n === "DIAMANTE" ? "text-cyan-400" : n === "OURO" ? "text-yellow-400" : n === "PRATA" ? "text-gray-400" : "text-orange-400";
  const getNivelBg = (n: string) => n === "DIAMANTE" ? "bg-cyan-400/20" : n === "OURO" ? "bg-yellow-400/20" : n === "PRATA" ? "bg-gray-400/20" : "bg-orange-400/20";
  const getPosicaoMedal = (p: number) => p === 1 ? "" : p === 2 ? "" : p === 3 ? "" : null;

  const top3 = ranking?.dados.slice(0, 3) || [];
  const demais = ranking?.dados.slice(3) || [];

  if (carregando && !ranking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 pb-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl p-8 md:p-10 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
            <div className="flex items-start gap-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/90 shadow-lg shadow-primary/30">
            <Trophy className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black">Ranking da Equipe</h1>
            <p className="text-muted-foreground mt-2">Classificação por pontos</p>
          </div>
        </div>
      </motion.div>

      {paginaAtual === 1 && top3.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card/70 border border-border/20 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold">Top 3 Vendedores</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {top3.map((v) => (
              <div
                key={v.id}
                className={`rounded-2xl p-6 border-2 ${
                  v.posicao === 1
                    ? "border-yellow-400"
                    : v.posicao === 2
                    ? "border-gray-400"
                    : "border-orange-400"
                } ${getNivelBg(v.nivel)}`}
              >
                <div className="text-center">
                  <div className="text-5xl mb-4">{getPosicaoMedal(v.posicao)}</div>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-foreground">{v.nome.charAt(0)}</span>
                  </div>
                  <h4 className="text-lg font-bold mb-2">{v.nome}</h4>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${getNivelColor(v.nivel)} ${getNivelBg(v.nivel)}`}>{v.nivel}</span>
                  <div className="flex items-center justify-center gap-2 text-2xl font-black text-primary">
                    <Coins className="w-6 h-6" />
                    {formatarNumero((v as any).valorTotal ?? 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card/70 border border-border/20 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-primary/10 border-b border-border/20">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase">Posição</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase">Vendedor</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase">Pontos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {(paginaAtual === 1 ? demais : ranking?.dados || []).map((v) => (
              <tr key={v.id} className="hover:bg-primary/5">
                <td className="px-6 py-4">
                  {getPosicaoMedal(v.posicao) || `#${v.posicao}`}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{v.nome.charAt(0)}</span>
                    </div>
                    <span className="font-semibold">{v.nome}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                    <span className="text-lg font-bold text-primary">{formatarNumero((v as any).valorTotal ?? 0)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {ranking && ranking.totalPaginas > 1 && (
          <div className="px-6 py-4 border-t border-border/20 flex justify-between">
            <p className="text-sm text-muted-foreground">Página {ranking.paginaAtual} de {ranking.totalPaginas}</p>
            <div className="flex gap-2">
              <button onClick={() => mudarPagina(paginaAtual - 1)} disabled={paginaAtual === 1} className="px-4 py-2 rounded-lg border hover:bg-primary/10 disabled:opacity-50">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => mudarPagina(paginaAtual + 1)} disabled={paginaAtual === ranking.totalPaginas} className="px-4 py-2 rounded-lg border hover:bg-primary/10 disabled:opacity-50">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
