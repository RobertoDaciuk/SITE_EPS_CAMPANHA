/**
 * ============================================================================
 * PÁGINA DASHBOARD (Refatorada V2 - Dashboard Premium para Vendedor)
 * ============================================================================
 *
 * REFATORAÇÃO V2 (Sprint 21 - Dashboard Magnífico):
 * - Contexto: Mantém useAuth de ContextoAutenticacao
 * - Busca de Dados: Dual-endpoint strategy:
 *   * /dashboard/kpis - KPIs básicos (compatibilidade com Admin/Gerente)
 *   * /dashboard/vendedor/completo - Dados enriquecidos (apenas Vendedor)
 * - Renderização Condicional: 
 *   * Admin/Gerente: KpisAdmin/KpisGerente (existentes)
 *   * Vendedor: Dashboard Premium com componentes especializados
 * - Design: Layout responsivo com grid moderno, componentes glassmorphism
 * - Animações: Framer Motion com entrada escalonada e micro-interações
 *
 * @module DashboardPage
 * ============================================================================
 */
"use client";

import useSWR from "swr";
import { useAuth } from "@/contexts/ContextoAutenticacao";
import { KpisAdmin } from "@/components/dashboard/KpisAdmin";
import { KpisGerente } from "@/components/dashboard/KpisGerente";
import { KpisVendedor } from "@/components/dashboard/KpisVendedor";
import { SaldoCard } from "@/components/dashboard/vendedor/saldo-card";
import { CampanhasAtivasCarousel } from "@/components/dashboard/vendedor/campanhas-ativas-carousel";
import { MiniRanking } from "@/components/dashboard/vendedor/mini-ranking";
import { MetasAtuais } from "@/components/dashboard/vendedor/metas-atuais";
import { FeedDeAtividades } from "@/components/dashboard/vendedor/feed-de-atividades";
import api from "@/lib/axios";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Função 'fetcher' para o SWR usar com o Axios.
 */
const fetcher = (url: string) =>
  api.get(url).then((res) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DASHBOARD SWR] Dados recebidos:`, res.data);
    }
    return res.data;
  });

/**
 * Componente Skeleton para estado de carregamento.
 */
const SkeletonKpis = () => (
  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        className="bg-card/70 backdrop-blur-lg border border-border/20 
                   rounded-2xl p-6 shadow-lg shadow-black/5 animate-pulse"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-muted-foreground/20 rounded-md w-3/4"></div>
          <div className="h-9 w-9 bg-muted-foreground/20 rounded-full"></div>
        </div>
        <div className="h-10 bg-muted-foreground/20 rounded-md w-1/2"></div>
        <div className="h-3 bg-muted-foreground/20 rounded-md w-full mt-3"></div>
      </div>
    ))}
  </div>
);

/**
 * Skeleton para Dashboard Vendedor Completo
 */
const SkeletonDashboardVendedor = () => (
  <div className="space-y-6">
    <div className="h-64 bg-card/50 rounded-3xl animate-pulse" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-96 bg-card/50 rounded-3xl animate-pulse" />
      <div className="h-96 bg-card/50 rounded-3xl animate-pulse" />
    </div>
  </div>
);

/**
 * Página principal do Dashboard.
 */
export default function DashboardPage() {
  /**
   * Hook de Autenticação.
   */
  const { usuario } = useAuth();

  /**
   * Hook de busca de dados (SWR) - KPIs Básicos
   */
  const { data: dadosKpis, error: erroKpis } = useSWR(
    usuario ? "/dashboard/kpis" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  /**
   * Hook de busca de dados (SWR) - Dashboard Completo (apenas Vendedor)
   */
  const { data: dashboardCompleto, error: erroDashboard } = useSWR(
    usuario?.papel === "VENDEDOR" ? "/dashboard/vendedor/completo" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  /**
   * Renderiza o dashboard específico por papel
   */
  const renderizarDashboard = () => {
    // 1. Estado de Erro
    if (erroKpis || erroDashboard) {
      return (
        <div
          className="bg-destructive/10 border border-destructive/30 
                     text-destructive p-4 rounded-xl flex 
                     items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5" />
          <div>
            <h4 className="font-semibold">Erro ao carregar dados</h4>
            <p className="text-sm">
              {(erroKpis || erroDashboard)?.message || "Erro desconhecido"}
            </p>
          </div>
        </div>
      );
    }

    // 2. Estado de Carregamento
    if (!usuario || !dadosKpis) {
      return <SkeletonKpis />;
    }

    // 3. Renderização por Papel
    switch (usuario.papel) {
      case "ADMIN":
        return <KpisAdmin dados={dadosKpis} />;
      
      case "GERENTE":
        return <KpisGerente dados={dadosKpis} />;
      
      case "VENDEDOR":
        // Dashboard Premium para Vendedor
        if (!dashboardCompleto) {
          return <SkeletonDashboardVendedor />;
        }

        return (
          <div className="space-y-8">
            {/* KPIs Principais */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <KpisVendedor dados={dadosKpis} />
            </motion.div>

            {/* Saldo Card - Destaque */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <SaldoCard saldo={dashboardCompleto.saldo} />
            </motion.div>

            {/* Campanhas Ativas Carousel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <CampanhasAtivasCarousel campanhas={dashboardCompleto.campanhas} />
            </motion.div>

            {/* Grid 2 Colunas: Metas + Ranking + Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna 1: Metas Atuais */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="lg:col-span-1"
              >
                <MetasAtuais metas={dashboardCompleto.metas} />
              </motion.div>

              {/* Coluna 2: Mini Ranking */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="lg:col-span-1"
              >
                <MiniRanking ranking={dashboardCompleto.ranking} />
              </motion.div>

              {/* Coluna 3: Feed de Atividades */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="lg:col-span-1"
              >
                <FeedDeAtividades
                  historico={dashboardCompleto.historico}
                  notificacoes={dashboardCompleto.notificacoes}
                />
              </motion.div>
            </div>
          </div>
        );
      
      default:
        return (
          <p className="text-muted-foreground">
            Perfil de usuário desconhecido.
          </p>
        );
    }
  };

  /**
   * Obtém a saudação com base no nome do usuário.
   */
  const getSaudacao = () => {
    if (!usuario) return "Carregando...";
    
    const hora = new Date().getHours();
    let periodo = "Bom dia";
    if (hora >= 12 && hora < 18) periodo = "Boa tarde";
    if (hora >= 18) periodo = "Boa noite";

    const primeiroNome = usuario.nome.split(" ")[0];
    return `${periodo}, ${primeiroNome}!`;
  };

  const getSubsaudacao = () => {
    if (!usuario) return "Aguarde enquanto buscamos suas informações...";
    
    switch (usuario.papel) {
      case "VENDEDOR":
        return "Aqui está o resumo completo das suas atividades e metas.";
      case "GERENTE":
        return "Acompanhe o desempenho da sua equipe em tempo real.";
      case "ADMIN":
        return "Visão geral do sistema e métricas administrativas.";
      default:
        return "";
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Cabeçalho com Animação */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between space-y-2"
      >
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r 
                       from-primary to-primary/60 bg-clip-text text-transparent">
            {getSaudacao()}
          </h2>
          <p className="text-muted-foreground mt-1">{getSubsaudacao()}</p>
        </div>
        
        {/* Badge de Nível (apenas Vendedor) */}
        {usuario?.papel === "VENDEDOR" && dashboardCompleto && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full 
                     bg-primary/10 border border-primary/20"
          >
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-semibold text-primary">
              Nível {dashboardCompleto.usuario.nivel}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Renderização Condicional dos Dashboards */}
      {renderizarDashboard()}
    </div>
  );
}
