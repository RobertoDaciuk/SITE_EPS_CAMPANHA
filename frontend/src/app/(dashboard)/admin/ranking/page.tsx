"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import api from "@/lib/axios";
import { useSearchParams, useRouter } from "next/navigation";
import { Trophy, Store, Coins, DollarSign, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import toast from "react-hot-toast";

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

export default function RankingAdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [oticas, setOticas] = useState<Otica[]>([]);
  const [oticaSelecionada, setOticaSelecionada] = useState<string>("");
  const [carregando, setCarregando] = useState(true);
  const paginaAtual = parseInt(searchParams.get("pagina") || "1");

  useEffect(() => {
    const carregarOticas = async () => {
      try {
        const response = await api.get("/oticas");
        setOticas(response.data);
      } catch (error: any) {
        toast.error("Erro ao carregar lista de óticas");
      }
    };
    carregarOticas();
  }, []);

  useEffect(() => {
    const carregarRanking = async () => {
      setCarregando(true);
      try {
        const params: any = { pagina: paginaAtual, limite: 50 };
        if (oticaSelecionada) params.oticaId = oticaSelecionada;
        const response = await api.get("/ranking/admin", { params });
        setRanking(response.data);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Erro ao carregar ranking");
      } finally {
        setCarregando(false);
      }
    };
    carregarRanking();
  }, [paginaAtual, oticaSelecionada]);

  const mudarPagina = (novaPagina: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("pagina", novaPagina.toString());
    router.push(`/admin/ranking?${params.toString()}`);
  };

  const formatarValor = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  
  const formatarCNPJ = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  const getNivelColor = (n: string) => n === "DIAMANTE" ? "text-cyan-400" : n === "OURO" ? "text-yellow-400" : n === "PRATA" ? "text-gray-400" : "text-orange-400";
  const getPosicaoMedal = (p: number) => p === 1 ? "" : p === 2 ? "" : p === 3 ? "" : null;

  if (carregando && !ranking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warning" />
      </div>
    );
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
              <th className="px-6 py-4 text-left text-xs font-bold uppercase">Nível</th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase">Valor Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {ranking?.dados.map((v) => (
              <tr key={v.id} className="hover:bg-warning/5">
                <td className="px-6 py-4">{getPosicaoMedal(v.posicao) || `#${v.posicao}`}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-warning">{v.nome.charAt(0)}</span>
                    </div>
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
                <td className="px-6 py-4"><span className={`text-sm font-bold ${getNivelColor(v.nivel)}`}>{v.nivel}</span></td>
                <td className="px-6 py-4 text-right"><span className="text-lg font-bold text-success">{formatarValor(v.valorTotal)}</span></td>
                
              </tr>
            ))}
          </tbody>
        </table>

        {ranking && ranking.totalPaginas > 1 && (
          <div className="px-6 py-4 border-t border-border/20 flex justify-between">
            <p className="text-sm text-muted-foreground">Página {ranking.paginaAtual} de {ranking.totalPaginas}</p>
            <div className="flex gap-2">
              <button onClick={() => mudarPagina(paginaAtual - 1)} disabled={paginaAtual === 1} className="px-4 py-2 rounded-lg border hover:bg-warning/10 disabled:opacity-50">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => mudarPagina(paginaAtual + 1)} disabled={paginaAtual === ranking.totalPaginas} className="px-4 py-2 rounded-lg border hover:bg-warning/10 disabled:opacity-50">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
