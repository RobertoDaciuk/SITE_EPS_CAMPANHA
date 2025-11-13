/**
 * ============================================================================
 * PÁGINA: Listagem de Campanhas (CORRIGIDO - Erros de Módulo, Tipagem e Lógica)
 * ============================================================================
 * * Descrição:
 * Página de listagem de campanhas com filtros por status e carregamento dinâmico.
 * * CORREÇÃO (Q.I. 170):
 * - Corrigida a importação de `useAuth` e a desestruturação de `carregando`
 * para resolver o erro de compilação (Princípio 1, 2).
 * - Refatorada a função `getStatusCampanha` para adicionar o status `FUTURA`
 * e corrigir a lógica de agrupamento.
 *
 * @module Campanhas
 * ============================================================================
 */
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/ContextoAutenticacao"; // CORRIGIDO: Nome do contexto
import api from "@/lib/axios";
import { Loader2, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

// Componentes
import CampaignCard, { Campanha } from "@/components/campanhas/CampaignCard";
import SkeletonCampaignCard from "@/components/campanhas/SkeletonCampaignCard";

/**
 * Tipo de filtro de status (Adicionado FUTURAS para melhor UX)
 */
type FiltroStatus = "ATIVAS" | "CONCLUIDAS" | "EXPIRADAS" | "FUTURAS";

/**
 * Determina o status atual da campanha baseado nas datas (Lógica Corrigida)
 * * @param campanha - Dados da campanha
 * @returns Status calculado (ATIVA, CONCLUIDA, EXPIRADA, FUTURA)
 */
function getStatusCampanha(campanha: Campanha): string {
  const agora = new Date();
  const dataInicio = new Date(campanha.dataInicio);
  const dataFim = new Date(campanha.dataFim);

  // Campanha ainda não começou (CORRIGIDO: Status FUTURA)
  if (agora < dataInicio) {
    return "FUTURA";
  }

  // Campanha já terminou
  if (agora > dataFim) {
    return "CONCLUIDA";
  }

  // Campanha está no período ativo
  if (agora >= dataInicio && agora <= dataFim) {
    return "ATIVA";
  }

  // Fallback para o status da API (embora as datas devam cobrir todos os casos)
  return campanha.status;
}

/**
 * Página de Listagem de Campanhas
 */
export default function CampanhasPage() {
  const router = useRouter();
  // CORRIGIDO: Usar 'carregando' e renomear para isAuthLoading
  const { estaAutenticado, carregando: isAuthLoading } = useAuth();

  // Estados
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("ATIVAS");

  // ========================================
  // PROTEÇÃO DE ROTA
  // ========================================

  useEffect(() => {
    if (isAuthLoading) return;

    if (!estaAutenticado) {
      router.push("/login");
    }
  }, [isAuthLoading, estaAutenticado, router]);

  // ========================================
  // BUSCAR CAMPANHAS DA API
  // ========================================

  useEffect(() => {
    const fetchCampanhas = async () => {
      if (!estaAutenticado) return;

      setIsLoading(true);

      try {
        // O serviço de backend já filtra as campanhas visíveis ao usuário (Princípio 5.5)
        const response = await api.get<Campanha[]>("/campanhas"); 
        setCampanhas(response.data);
      } catch (error: any) {
        console.error("Erro ao buscar campanhas:", error);

        const errorMessage =
          error.response?.data?.message ||
          "Erro ao carregar campanhas. Tente novamente.";

        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (estaAutenticado) {
      fetchCampanhas();
    }
  }, [estaAutenticado]);

  // ========================================
  // FILTRAR CAMPANHAS POR STATUS
  // ========================================

  const campanhasFiltradas = useMemo(() => {
    return campanhas.filter((campanha) => {
      const statusAtual = getStatusCampanha(campanha);

      if (filtroStatus === "ATIVAS") return statusAtual === "ATIVA";
      if (filtroStatus === "CONCLUIDAS") return statusAtual === "CONCLUIDA";
      if (filtroStatus === "EXPIRADAS") return statusAtual === "EXPIRADA"; // Mantido se o backend usar
      if (filtroStatus === "FUTURAS") return statusAtual === "FUTURA";

      return false;
    });
  }, [campanhas, filtroStatus]);

  // ========================================
  // LOADING STATE INICIAL
  // ========================================

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER DA PÁGINA
  // ========================================

  // Função auxiliar para contar o número de campanhas por status
  const contarStatus = (status: string) => 
    campanhas.filter((c) => getStatusCampanha(c) === status).length;


  return (
    <div className="space-y-6">
      {/* ========================================
          HEADER
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold">Campanhas</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Participe das campanhas e acumule pontos
        </p>
      </motion.div>

      {/* ========================================
          ABAS DE FILTRO
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="glass rounded-xl p-2 inline-flex flex-wrap space-x-2"
      >
        {/* Aba: Ativas */}
        <button
          onClick={() => setFiltroStatus("ATIVAS")}
          className={`px-3 py-1 rounded-lg text-xs md:px-4 md:py-2 md:text-sm font-medium transition-all duration-200 ${
            filtroStatus === "ATIVAS"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          Ativas
          {!isLoading && (
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                filtroStatus === "ATIVAS"
                  ? "bg-primary-foreground/20"
                  : "bg-muted"
              }`}
            >
              {contarStatus("ATIVA")}
            </span>
          )}
        </button>

        {/* Aba: Futuras (NOVA ABA) */}
        <button
          onClick={() => setFiltroStatus("FUTURAS")}
          className={`px-2 py-1 rounded-lg text-xs md:px-4 md:py-2 md:text-sm font-medium transition-all duration-200 ${
            filtroStatus === "FUTURAS"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          Futuras
          {!isLoading && (
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                filtroStatus === "FUTURAS"
                  ? "bg-primary-foreground/20"
                  : "bg-muted"
              }`}
            >
              {contarStatus("FUTURA")}
            </span>
          )}
        </button>

        {/* Aba: Concluídas */}
        <button
          onClick={() => setFiltroStatus("CONCLUIDAS")}
          className={`px-2 py-1 rounded-lg text-xs md:px-4 md:py-2 md:text-sm font-medium transition-all duration-200 ${
            filtroStatus === "CONCLUIDAS"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          Concluídas
          {!isLoading && (
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                filtroStatus === "CONCLUIDAS"
                  ? "bg-primary-foreground/20"
                  : "bg-muted"
              }`}
            >
              {contarStatus("CONCLUIDA")}
            </span>
          )}
        </button>

        {/* Aba: Expiradas (Pode ser removida no futuro, mas mantida por agora) */}
        <button
          onClick={() => setFiltroStatus("EXPIRADAS")}
          className={`px-2 py-1 rounded-lg text-xs md:px-4 md:py-2 md:text-sm font-medium transition-all duration-200 ${
            filtroStatus === "EXPIRADAS"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          Expiradas
          {!isLoading && (
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                filtroStatus === "EXPIRADAS"
                  ? "bg-primary-foreground/20"
                  : "bg-muted"
              }`}
            >
              {contarStatus("EXPIRADA")}
            </span>
          )}
        </button>
      </motion.div>

      {/* ========================================
          GRID DE CAMPANHAS
          ======================================== */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          // LOADING - Skeletons
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCampaignCard key={index} />
            ))}
          </motion.div>
        ) : campanhasFiltradas.length === 0 ? (
          // ESTADO VAZIO
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-2xl p-12 text-center"
          >
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
                <Filter className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">
                Nenhuma campanha encontrada
              </h3>
              <p className="text-muted-foreground text-sm">
                Não há campanhas{" "}
                {filtroStatus === "ATIVAS" && "ativas"}
                {filtroStatus === "CONCLUIDAS" && "concluídas"}
                {filtroStatus === "EXPIRADAS" && "expiradas"}
                {filtroStatus === "FUTURAS" && "futuras"}
                 no momento.
              </p>
              {filtroStatus !== "ATIVAS" && (
                <button
                  onClick={() => setFiltroStatus("ATIVAS")}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Ver campanhas ativas
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          // GRID DE CARDS
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {campanhasFiltradas.map((campanha, index) => (
              <motion.div
                key={campanha.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <CampaignCard campanha={campanha} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}