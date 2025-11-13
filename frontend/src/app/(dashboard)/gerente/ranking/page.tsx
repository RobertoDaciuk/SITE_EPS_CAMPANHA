/**
 * ============================================================================
 * RANKING PAGE - GERENTE
 * ============================================================================
 *
 * Propósito:
 * Página de ranking para perfil GERENTE com filtros condicionais.
 * Exibe ranking por VALOR de vendas aprovadas.
 *
 * Funcionalidades:
 * - Gerente de Matriz: pode filtrar por filial específica
 * - Gerente de Filial: vê apenas sua filial (sem filtros)
 * - Ordenação por valor total de vendas
 * - Toggle para habilitar/desabilitar ranking para vendedores
 * - Paginação
 *
 * @module Ranking
 * ============================================================================
 */
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import api from "@/lib/axios";
import { useAuth } from "@/contexts/ContextoAutenticacao";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Trophy,
  Store,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

interface Vendedor {
  id: string;
  nome: string;
  avatarUrl?: string;
  nivel: string;
  valorTotal: number;
  posicao: number;
  optica: {
    id: string;
    nome: string;
    cnpj: string;
  };
}

interface RankingResponse {
  dados: Vendedor[];
  paginaAtual: number;
  totalPaginas: number;
  totalRegistros: number;
  oticasFiltro?: Array<{ id: string; nome: string; cnpj: string }>;
}

export default function RankingGerentePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { usuario } = useAuth();
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [filialSelecionada, setFilialSelecionada] = useState<string>("");
  const [carregando, setCarregando] = useState(true);
  const [rankingVisivel, setRankingVisivel] = useState(false);
  const [alterandoVisibilidade, setAlterandoVisibilidade] = useState(false);
  const paginaAtual = parseInt(searchParams.get("pagina") || "1");

  // Verifica se é gerente de matriz (tem filiais disponíveis)
  const ehGerenteMatriz = ranking?.oticasFiltro && ranking.oticasFiltro.length > 0;

  // Carregar estado inicial do ranking visível
  useEffect(() => {
    if (usuario?.optica?.rankingVisivelParaVendedores !== undefined) {
      setRankingVisivel(usuario.optica.rankingVisivelParaVendedores);
    }
  }, [usuario]);

  // Carregar ranking
  useEffect(() => {
    const carregarRanking = async () => {
      setCarregando(true);
      try {
        const params: any = { pagina: paginaAtual, limite: 50 };
        if (filialSelecionada) {
          params.filialId = filialSelecionada;
        }

        const response = await api.get("/ranking/gerente", { params });
        setRanking(response.data);
      } catch (error: any) {
        console.error("Erro ao carregar ranking:", error);
        toast.error(error.response?.data?.message || "Erro ao carregar ranking");
      } finally {
        setCarregando(false);
      }
    };

    carregarRanking();
  }, [paginaAtual, filialSelecionada]);

  const mudarPagina = (novaPagina: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("pagina", novaPagina.toString());
    router.push(`/gerente/ranking?${params.toString()}`);
  };

  const toggleVisibilidadeRanking = async () => {
    setAlterandoVisibilidade(true);
    const novoEstado = !rankingVisivel;

    try {
      // Debug: verificar se o token está presente
      const token = localStorage.getItem('eps_campanhas_token');
      console.log('🔑 Token presente:', !!token);
      console.log('📤 Enviando requisição PATCH para toggle ranking');
      
      await api.patch("/oticas/minha-otica/toggle-ranking-vendedores", {
        rankingVisivelParaVendedores: novoEstado,
      });

      setRankingVisivel(novoEstado);
      toast.success(
        novoEstado
          ? "Ranking habilitado para vendedores!"
          : "Ranking desabilitado para vendedores!"
      );
    } catch (error: any) {
      console.error("❌ Erro ao alterar visibilidade:", error);
      console.error("📋 Detalhes do erro:", error.response?.data);
      toast.error(
        error.response?.data?.message || "Erro ao alterar visibilidade do ranking"
      );
    } finally {
      setAlterandoVisibilidade(false);
    }
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case "DIAMANTE":
        return "text-cyan-400";
      case "OURO":
        return "text-yellow-400";
      case "PRATA":
        return "text-gray-400";
      default:
        return "text-orange-400";
    }
  };

  const getPosicaoMedal = (posicao: number) => {
    if (posicao === 1) return "🥇";
    if (posicao === 2) return "🥈";
    if (posicao === 3) return "🥉";
    return null;
  };

  if (carregando && !ranking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando ranking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 pb-8">
      {/* Cabeçalho */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl p-8 md:p-10
                   bg-gradient-to-br from-warning/10 via-warning/5 to-transparent
                   border border-warning/20 backdrop-blur-sm"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-warning/10 rounded-full blur-3xl -z-10" />
        <div className="flex items-start gap-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-warning to-warning/90 shadow-lg shadow-warning/30">
            <Trophy className="w-10 h-10 text-warning-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              Ranking da Equipe
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mt-2">
              Desempenho dos vendedores por valor de vendas
            </p>
          </div>
        </div>
      </motion.div>

      {/* Controles: Filtros + Toggle Visibilidade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Filtros (apenas se for gerente de matriz) */}
        {ehGerenteMatriz && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-card/70 backdrop-blur-lg border border-border/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Filtrar por Filial</h3>
            </div>
            <select
              value={filialSelecionada}
              onChange={(e) => setFilialSelecionada(e.target.value)}
              className="w-full h-12 px-4 bg-background/60 dark:bg-background/40
                         border-2 border-border/50 rounded-xl
                         text-foreground font-medium
                         focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary
                         transition-all duration-300"
            >
              <option value="">Todas as Filiais</option>
              {ranking?.oticasFiltro?.map((filial) => (
                <option key={filial.id} value={filial.id}>
                  {filial.nome}
                </option>
              ))}
            </select>
          </motion.div>
        )}

        {/* Toggle Visibilidade para Vendedores */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-card/70 backdrop-blur-lg border border-border/20 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {rankingVisivel ? (
                <Eye className="w-5 h-5 text-success" />
              ) : (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              )}
              <h3 className="text-lg font-bold text-foreground">
                Ranking para Vendedores
              </h3>
            </div>
            <button
              onClick={toggleVisibilidadeRanking}
              disabled={alterandoVisibilidade}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors
                         ${rankingVisivel ? "bg-success" : "bg-muted"}
                         ${alterandoVisibilidade ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform
                           ${rankingVisivel ? "translate-x-7" : "translate-x-1"}`}
              />
            </button>
          </div>
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {rankingVisivel
                ? "Vendedores podem ver o ranking no menu"
                : "Ranking oculto para vendedores"}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Tabela de Ranking */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="bg-card/70 backdrop-blur-lg border border-border/20 rounded-2xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-warning/10 border-b border-border/20">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                  Posição
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                  Ótica
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                  Nível
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-foreground uppercase tracking-wider">
                  <div className="flex items-center justify-end gap-2">
                    <DollarSign className="w-4 h-4" />
                    Valor Total
                  </div>
                </th>
                
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {ranking?.dados.map((vendedor) => {
                const medal = getPosicaoMedal(vendedor.posicao);
                return (
                  <motion.tr
                    key={vendedor.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="hover:bg-warning/5 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {medal ? (
                          <span className="text-2xl">{medal}</span>
                        ) : (
                          <span className="text-lg font-bold text-foreground">
                            #{vendedor.posicao}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                          <span className="text-sm font-bold text-warning">
                            {vendedor.nome.charAt(0)}
                          </span>
                        </div>
                        <span className="font-semibold text-foreground">
                          {vendedor.nome}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {vendedor.optica.nome}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-bold ${getNivelColor(vendedor.nivel)}`}>
                        {vendedor.nivel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-lg font-bold text-success">
                        {formatarValor(vendedor.valorTotal)}
                      </span>
                    </td>
                    
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {ranking && ranking.totalPaginas > 1 && (
          <div className="px-6 py-4 border-t border-border/20 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {ranking.paginaAtual} de {ranking.totalPaginas} ({ranking.totalRegistros}{" "}
              vendedores)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => mudarPagina(paginaAtual - 1)}
                disabled={paginaAtual === 1}
                className="px-4 py-2 rounded-lg border border-border/50 
                           hover:bg-warning/10 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => mudarPagina(paginaAtual + 1)}
                disabled={paginaAtual === ranking.totalPaginas}
                className="px-4 py-2 rounded-lg border border-border/50 
                           hover:bg-warning/10 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
