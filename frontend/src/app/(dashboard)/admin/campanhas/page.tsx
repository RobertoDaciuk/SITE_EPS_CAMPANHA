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
import AnalyticsModal from "@/components/admin/campanhas/AnalyticsModal";
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

  // Estados do Modal (wizard + histórico + analytics)
  const [modalWizardOpen, setModalWizardOpen] = useState(false);
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<Campanha | null>(null);

  // Estados do Modal de Histórico
  const [modalHistoricoOpen, setModalHistoricoOpen] = useState(false);
  const [historicoInfo, setHistoricoInfo] = useState<{ id: string; titulo: string } | null>(null);

  // Estados do Modal de Analytics
  const [modalAnalyticsOpen, setModalAnalyticsOpen] = useState(false);
  const [analyticsInfo, setAnalyticsInfo] = useState<{ id: string; titulo: string } | null>(null);

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
    const campanha = campanhas.find(c => c.id === campanhaId);
    if (campanha) {
      setAnalyticsInfo({ id: campanhaId, titulo: campanha.titulo });
      setModalAnalyticsOpen(true);
    }
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
    <div className="space-y-6">
      {/* ========================================
          HEADER SIMPLES E ELEGANTE
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Campanhas</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Central de controle completa. Crie campanhas incentivadoras e acompanhe o desempenho em tempo real.
          </p>
        </div>
        <button
          onClick={() => setModalWizardOpen(true)}
          disabled={usuario?.papel !== "ADMIN"}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-5 w-5" />
          <span>Criar Nova Campanha</span>
        </button>
      </motion.div>

      {/* ========================================
          ABAS DE FILTRO (PADRÃO VENDEDOR)
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
              {campanhas.filter((c) => getStatusCampanha(c) === "ATIVA").length}
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
              {campanhas.filter((c) => getStatusCampanha(c) === "CONCLUIDA").length}
            </span>
          )}
        </button>

        {/* Aba: Expiradas */}
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
              {campanhas.filter((c) => getStatusCampanha(c) === "EXPIRADA").length}
            </span>
          )}
        </button>
      </motion.div>

      {/* ========================================
          GRID DE CAMPANHAS (PADRÃO VENDEDOR)
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

      {/* Modal de Analytics */}
      {analyticsInfo && (
        <AnalyticsModal
          isOpen={modalAnalyticsOpen}
          onClose={() => setModalAnalyticsOpen(false)}
          campanhaId={analyticsInfo.id}
          tituloCampanha={analyticsInfo.titulo}
        />
      )}
    </div>
  );
}