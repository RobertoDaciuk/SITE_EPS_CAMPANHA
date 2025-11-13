"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/ContextoAutenticacao";
import api from "@/lib/axios";
import { Loader2, Search, Filter, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

// Componentes
import AdminCampaignCard from "@/components/admin/campanhas/AdminCampaignCard";
import CriarCampanhaWizard from "@/components/admin/campanhas/CriarCampanhaWizard";
import HistoricoModal from "@/components/admin/campanhas/HistoricoModal";
import SkeletonCampaignCard from "@/components/campanhas/SkeletonCampaignCard";

// ========================================
// TIPOS E INTERFACES
// ========================================

interface EventoEspecial {
  id: string;
  nome: string;
  multiplicador: number;
  corDestaque: string;
  dataInicio: string;
  dataFim: string;
  ativo: boolean;
}

export interface Campanha {
  id: string;
  titulo: string;
  descricao: string;
  pontosReaisPorCartela: number;
  percentualGerente: number;
  dataInicio: string;
  dataFim: string;
  status: string;
  imagemCampanha?: string;
  eventosEspeciais?: EventoEspecial[];
  tags?: string[];
  paraTodasOticas?: boolean;
  oticasAlvo?: any[];
  _count?: {
    enviosVenda: number;
    cartelasConcluidas: number;
  };
}

/**
 * Tipo de filtro de status
 */
type FiltroStatus = "ATIVAS" | "CONCLUIDAS" | "EXPIRADAS";

/**
 * Determina o status atual da campanha baseado nas datas, considerando o fuso horário.
 * 
 * @param campanha - Dados da campanha
 * @returns Status calculado (ATIVA, CONCLUIDA, EXPIRADA)
 */
function getStatusCampanha(campanha: Campanha): string {
  // A verdade é UTC. Convertemos a hora atual de São Paulo para UTC para uma comparação justa.
  const agoraEmUtc = fromZonedTime(new Date(), 'America/Sao_Paulo');
  const dataInicio = new Date(campanha.dataInicio);
  const dataFim = new Date(campanha.dataFim);

  // Campanha ainda não começou
  if (agoraEmUtc < dataInicio) {
    return "EXPIRADA"; // Futura (agrupada com expiradas por enquanto)
  }

  // Campanha está no período ativo
  if (agoraEmUtc >= dataInicio && agoraEmUtc <= dataFim) {
    return "ATIVA";
  }

  // Campanha já terminou
  if (agoraEmUtc > dataFim) {
    return "CONCLUIDA";
  }

  // Fallback para o status da API
  return campanha.status;
}

/**
 * Página de Listagem de Campanhas
 * 
 * Características:
 * - Busca todas as campanhas da API
 * - Filtros por abas (Ativas, Concluídas, Expiradas)
 * - Grid responsivo de cards
 * - Estados de loading e vazio
 * - Navegação para detalhes da campanha
 */
export default function CampanhasPage() {
  const router = useRouter();
  const { estaAutenticado, carregando: isAuthLoading, usuario } = useAuth();

  // Estados
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("ATIVAS");

  // Estados do Modal (wizard + histórico)
  const [modalWizardOpen, setModalWizardOpen] = useState(false);
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<Campanha | null>(null);
  
  // Estados do Modal de Histórico
  const [modalHistoricoOpen, setModalHistoricoOpen] = useState(false);
  const [historicoInfo, setHistoricoInfo] = useState<{ id: string; titulo: string } | null>(null);

  // ========================================
  // PROTEÇÃO DE ROTA
  // ========================================

  useEffect(() => {
    if (isAuthLoading) return;

    // Redireciona não autenticado
    if (!estaAutenticado) {
      router.push("/login");
      return;
    }

    // Proteção de papel: Apenas ADMIN pode acessar esta página
    if (usuario?.papel !== "ADMIN") {
      router.push("/");
    }
  }, [isAuthLoading, estaAutenticado, usuario?.papel, router]);

  // ========================================
  // BUSCAR CAMPANHAS DA API
  // ========================================

  useEffect(() => {
    const fetchCampanhas = async () => {
      if (!estaAutenticado) return;

      setIsLoading(true);

      try {
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

    if (estaAutenticado && usuario?.papel === "ADMIN") {
      fetchCampanhas();
    }
  }, [estaAutenticado, usuario?.papel]);

  // ========================================
  // HANDLERS: Modal de Edição e Criação
  // ========================================
  const handleEditarCampanha = (campanha: Campanha) => {
    console.log('✏️ Editar campanha:', campanha);
    setCampanhaSelecionada(campanha);
    setModalWizardOpen(true);
  };

  const handleCriarNovaCampanha = () => {
    setCampanhaSelecionada(null);
    setModalWizardOpen(true);
  };

  const handleVisualizarCampanha = (campanhaId: string) => {
    router.push(`/admin/campanhas/${campanhaId}`);
  };

  const handleVisualizarHistorico = (campanhaId: string, titulo: string) => {
    setHistoricoInfo({ id: campanhaId, titulo });
    setModalHistoricoOpen(true);
  };

  const handleFecharModal = () => {
    setModalWizardOpen(false);
    setCampanhaSelecionada(null);
  };

  const handleSucessoModal = () => {
    // Recarregar lista de campanhas
    const fetchCampanhas = async () => {
      if (!estaAutenticado) return;
      setIsLoading(true);
      try {
        const response = await api.get<Campanha[]>("/campanhas");
        setCampanhas(response.data);
        toast.success('Lista de campanhas atualizada!');
      } catch (error: any) {
        console.error("Erro ao buscar campanhas:", error);
        toast.error("Erro ao carregar campanhas. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCampanhas();
  };

  // ========================================
  // FILTRAR CAMPANHAS POR STATUS
  // ========================================

  const campanhasFiltradas = useMemo(() => {
    return campanhas.filter((campanha) => {
      const statusAtual = getStatusCampanha(campanha);

      if (filtroStatus === "ATIVAS") return statusAtual === "ATIVA";
      if (filtroStatus === "CONCLUIDAS") return statusAtual === "CONCLUIDA";
      if (filtroStatus === "EXPIRADAS") return statusAtual === "EXPIRADA";

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

  // Bloqueio de UI para não-admin (fallback rápido)
  if (estaAutenticado && usuario?.papel !== "ADMIN") {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">Acesso negado</p>
          <p className="text-muted-foreground text-sm">Somente administradores podem acessar Gerenciar Campanhas.</p>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER DA PÁGINA
  // ========================================

  return (
    <div className="space-y-8 p-6">
      {/* ========================================
          HEADER MAGNIFICO
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card rounded-2xl p-8 border border-white/10"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl backdrop-blur-sm border border-white/10">
              <svg className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Gerenciar Campanhas
              </h1>
              <p className="text-muted-foreground mt-2 text-base leading-relaxed max-w-2xl">
                Central de controle completa. Crie campanhas incentivadoras, defina metas, gerencie produtos e acompanhe o desempenho em tempo real.
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-muted-foreground">{campanhas.filter(c => getStatusCampanha(c) === "ATIVA").length} ativas</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-muted-foreground">{campanhas.length} no total</span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setModalWizardOpen(true)}
            disabled={usuario?.papel !== "ADMIN"}
            className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-6 w-6" />
            <div className="text-left">
              <div className="text-sm">Criar Nova</div>
              <div className="text-xs opacity-80">Campanha Incentivadora</div>
            </div>
          </button>
        </div>
      </motion.div>

      {/* ========================================
          ABAS DE FILTRO MAGNIFICAS
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="glass-card rounded-2xl p-3 inline-flex space-x-3 border border-white/10"
      >
        {/* Aba: Ativas */}
        <button
          onClick={() => setFiltroStatus("ATIVAS")}
          className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
            filtroStatus === "ATIVAS"
              ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-2 border-green-500/50 shadow-lg shadow-green-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${filtroStatus === "ATIVAS" ? "bg-green-400 animate-pulse" : "bg-muted-foreground"}`}></div>
            <span>Ativas</span>
            {!isLoading && (
              <span
                className={`ml-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  filtroStatus === "ATIVAS"
                    ? "bg-green-400/20 text-green-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {
                  campanhas.filter(
                    (c) => getStatusCampanha(c) === "ATIVA"
                  ).length
                }
              </span>
            )}
          </div>
        </button>

        {/* Aba: Concluídas */}
        <button
          onClick={() => setFiltroStatus("CONCLUIDAS")}
          className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
            filtroStatus === "CONCLUIDAS"
              ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 border-2 border-blue-500/50 shadow-lg shadow-blue-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${filtroStatus === "CONCLUIDAS" ? "bg-blue-400" : "bg-muted-foreground"}`}></div>
            <span>Concluídas</span>
            {!isLoading && (
              <span
                className={`ml-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  filtroStatus === "CONCLUIDAS"
                    ? "bg-blue-400/20 text-blue-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {
                  campanhas.filter(
                    (c) => getStatusCampanha(c) === "CONCLUIDA"
                  ).length
                }
              </span>
            )}
          </div>
        </button>

        {/* Aba: Expiradas */}
        <button
          onClick={() => setFiltroStatus("EXPIRADAS")}
          className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
            filtroStatus === "EXPIRADAS"
              ? "bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-400 border-2 border-gray-500/50 shadow-lg shadow-gray-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${filtroStatus === "EXPIRADAS" ? "bg-gray-400" : "bg-muted-foreground"}`}></div>
            <span>Expiradas</span>
            {!isLoading && (
              <span
                className={`ml-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  filtroStatus === "EXPIRADAS"
                    ? "bg-gray-400/20 text-gray-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {
                  campanhas.filter(
                    (c) => getStatusCampanha(c) === "EXPIRADA"
                  ).length
                }
              </span>
            )}
          </div>
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
                {filtroStatus === "EXPIRADAS" && "expiradas"} no momento.
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
                <AdminCampaignCard
                  campanha={campanha as any}
                  onEdit={handleEditarCampanha}
                  onView={handleVisualizarCampanha}
                  onViewHistory={handleVisualizarHistorico}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wizard Unificado de Criação/Edição */}
      <CriarCampanhaWizard
        isOpen={modalWizardOpen}
        onClose={handleFecharModal}
        onSuccess={handleSucessoModal}
        campanhaParaEditar={campanhaSelecionada as any}
      />

      {/* Modal de Histórico */}
      {historicoInfo && (
        <HistoricoModal
          isOpen={modalHistoricoOpen}
          onClose={() => setModalHistoricoOpen(false)}
          campanhaId={historicoInfo.id}
          tituloCampanha={historicoInfo.titulo}
        />
      )}
    </div>
  );
}