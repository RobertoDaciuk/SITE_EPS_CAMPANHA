'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Trophy,
  DollarSign,
  Users,
  Calendar,
  Search,
  Filter,
  Check,
  Ban,
  Sparkles,
  Target,
  Zap,
  Award,
  Activity,
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { formatarDataBR, formatarDataCurtaBR, formatarMoeda, formatarNumero } from '@/lib/timezone';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campanhaId: string;
  tituloCampanha: string;
}

interface AnalyticsData {
  totalEnvios: number;
  totalValidados: number;
  totalRejeitados: number;
  totalEmAnalise: number;
  totalConflito: number;
  taxaConversao: number;
  totalPontosReaisDistribuidos: number;
  rankingVendedores: Array<{
    vendedorId: string;
    nomeVendedor: string;
    emailVendedor: string;
    totalEnvios: number;
    totalValidados: number;
    totalRejeitados: number;
    totalEmAnalise: number;
    totalConflito: number;
    totalPontosReaisGanhos: number;
  }>;
  evolucaoTemporal: Array<{
    data: string;
    totalEnvios: number;
    totalValidados: number;
  }>;
  envios: Array<{
    id: string;
    numeroPedido: string;
    status: string;
    dataEnvio: string;
    dataValidacao: string | null;
    vendedor: { id: string; nome: string; email: string };
    numeroCartelaAtendida: number | null;
    motivoRejeicao: string | null;
    motivoRejeicaoVendedor: string | null;
    infoConflito: string | null;
    dadosValidacao: any;
    valorPontosReaisRecebido?: number;
    multiplicadorAplicado?: number;
    valorFinalComEvento?: number;
    pontosAdicionadosAoSaldo?: boolean;
  }>;
}

const STATUS_COLORS = {
  VALIDADO: 'bg-gradient-to-r from-green-500 to-emerald-500',
  REJEITADO: 'bg-gradient-to-r from-red-500 to-rose-500',
  EM_ANALISE: 'bg-gradient-to-r from-yellow-500 to-amber-500',
  CONFLITO_MANUAL: 'bg-gradient-to-r from-orange-500 to-red-500',
};

const STATUS_LABELS = {
  VALIDADO: 'Validado',
  REJEITADO: 'Rejeitado',
  EM_ANALISE: 'Em Análise',
  CONFLITO_MANUAL: 'Conflito',
};

export default function AnalyticsModal({
  isOpen,
  onClose,
  campanhaId,
  tituloCampanha,
}: AnalyticsModalProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [activeTab, setActiveTab] = useState<'kpis' | 'ranking' | 'grafico' | 'envios'>('kpis');
  const [rejeitandoEnvioId, setRejeitandoEnvioId] = useState<string | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [processandoEnvioId, setProcessandoEnvioId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen, campanhaId]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/campanhas/${campanhaId}/analytics`);
      const raw = response.data || {};
      const normalized: AnalyticsData = {
        totalEnvios: Number(raw.totalEnvios) || 0,
        totalValidados: Number(raw.totalValidados) || 0,
        totalRejeitados: Number(raw.totalRejeitados) || 0,
        totalEmAnalise: Number(raw.totalEmAnalise) || 0,
        totalConflito: Number(raw.totalConflito) || 0,
        taxaConversao: Number(raw.taxaConversao) || 0,
        totalPontosReaisDistribuidos: Number(raw.totalPontosReaisDistribuidos) || 0,
        rankingVendedores: Array.isArray(raw.rankingVendedores) ? raw.rankingVendedores : [],
        evolucaoTemporal: Array.isArray(raw.evolucaoTemporal) ? raw.evolucaoTemporal : [],
        envios: Array.isArray(raw.envios) ? raw.envios : [],
      };
      setData(normalized);
    } catch (error: any) {
      console.error('Erro ao buscar analytics:', error);
      toast.error('Erro ao carregar analytics da campanha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAprovarEnvio = async (envioId: string) => {
    if (processandoEnvioId) return;

    setProcessandoEnvioId(envioId);
    try {
      await api.patch(`/envios-venda/${envioId}/validar-manual`);
      toast.success('Envio aprovado com sucesso!');
      await fetchAnalytics();
    } catch (error: any) {
      console.error('Erro ao aprovar envio:', error);
      toast.error(error.response?.data?.message || 'Erro ao aprovar envio');
    } finally {
      setProcessandoEnvioId(null);
    }
  };

  const handleRejeitarEnvio = async (envioId: string) => {
    if (!motivoRejeicao.trim()) {
      toast.error('Por favor, informe o motivo da rejeição');
      return;
    }

    if (motivoRejeicao.trim().length < 5) {
      toast.error('O motivo deve ter pelo menos 5 caracteres');
      return;
    }

    if (processandoEnvioId) return;

    setProcessandoEnvioId(envioId);
    try {
      await api.patch(`/envios-venda/${envioId}/rejeitar-manual`, {
        motivoRejeicao: motivoRejeicao.trim(),
      });
      toast.success('Envio rejeitado com sucesso!');
      setRejeitandoEnvioId(null);
      setMotivoRejeicao('');
      await fetchAnalytics();
    } catch (error: any) {
      console.error('Erro ao rejeitar envio:', error);
      toast.error(error.response?.data?.message || 'Erro ao rejeitar envio');
    } finally {
      setProcessandoEnvioId(null);
    }
  };

  if (!isOpen) return null;

  const filteredEnvios = (data?.envios ?? []).filter((envio) => {
    const matchSearch =
      envio.numeroPedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      envio.vendedor.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'TODOS' || envio.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Cálculos adicionais
  const pontosPendentes = (data?.envios ?? [])
    .filter(e => e.status === 'EM_ANALISE')
    .reduce((acc, e) => acc + (Number(e.valorPontosReaisRecebido) || 0), 0);

  const pontosLiberados = (data?.envios ?? [])
    .filter(e => e.status === 'VALIDADO')
    .reduce((acc, e) => acc + (Number(e.valorPontosReaisRecebido) || 0), 0);

  const pontosComMultiplicador = (data?.envios ?? [])
    .filter(e => e.status === 'VALIDADO')
    .reduce((acc, e) => acc + (Number(e.valorFinalComEvento || e.valorPontosReaisRecebido) || 0), 0);

  const bonusPorEventos = pontosComMultiplicador - pontosLiberados;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="glass rounded-2xl shadow-2xl w-full max-w-7xl max-h-[92vh] overflow-hidden flex flex-col border border-border/50"
      >
        {/* Header Ultra Magnifico */}
        <div className="relative p-6 border-b border-border/30 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl backdrop-blur-sm border border-white/10">
                <Activity className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Analytics da Campanha
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{tituloCampanha}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-xl transition-all duration-300 hover:scale-110 hover:rotate-90"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs Magnificas */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2">
            {[
              { id: 'kpis', label: 'Visão Geral', icon: TrendingUp, gradient: 'from-blue-500 to-cyan-500' },
              { id: 'ranking', label: 'Ranking', icon: Trophy, gradient: 'from-yellow-500 to-orange-500' },
              { id: 'grafico', label: 'Evolução', icon: Calendar, gradient: 'from-purple-500 to-pink-500' },
              { id: 'envios', label: 'Todos os Envios', icon: Filter, gradient: 'from-green-500 to-emerald-500' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group relative px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'scale-105'
                    : 'hover:scale-105 opacity-60 hover:opacity-100'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} rounded-xl opacity-20`}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  />
                )}
                <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground'}`} />
                <span className={activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground'}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content com scroll suave */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="relative">
                <div className="h-16 w-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <div className="absolute inset-0 h-16 w-16 border-4 border-transparent border-r-purple-500 rounded-full animate-spin animation-delay-150" />
              </div>
            </div>
          ) : data ? (
            <AnimatePresence mode="wait">
              {activeTab === 'kpis' && (
                <motion.div
                  key="kpis"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* KPIs Principais - Grid Responsivo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MagnificoKPICard
                      icon={Users}
                      label="Total de Envios"
                      value={formatarNumero(data.totalEnvios)}
                      gradient="from-blue-500 to-cyan-500"
                      iconColor="text-blue-400"
                    />
                    <MagnificoKPICard
                      icon={CheckCircle2}
                      label="Validados"
                      value={formatarNumero(data.totalValidados)}
                      gradient="from-green-500 to-emerald-500"
                      iconColor="text-green-400"
                      subtitle={`${data.taxaConversao.toFixed(1)}% taxa`}
                    />
                    <MagnificoKPICard
                      icon={Clock}
                      label="Em Análise"
                      value={formatarNumero(data.totalEmAnalise)}
                      gradient="from-yellow-500 to-amber-500"
                      iconColor="text-yellow-400"
                    />
                    <MagnificoKPICard
                      icon={XCircle}
                      label="Rejeitados"
                      value={formatarNumero(data.totalRejeitados)}
                      gradient="from-red-500 to-rose-500"
                      iconColor="text-red-400"
                    />
                  </div>

                  {/* KPIs Secundários */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <MagnificoKPICard
                      icon={AlertTriangle}
                      label="Conflitos Manuais"
                      value={formatarNumero(data.totalConflito)}
                      gradient="from-orange-500 to-red-500"
                      iconColor="text-orange-400"
                    />
                    <MagnificoKPICard
                      icon={TrendingUp}
                      label="Taxa de Conversão"
                      value={`${data.taxaConversao.toFixed(1)}%`}
                      gradient="from-purple-500 to-pink-500"
                      iconColor="text-purple-400"
                      subtitle="Aprovações vs Total"
                    />
                  </div>

                  {/* Seção de Pontos Ultra Detalhada */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-amber-400" />
                      <h3 className="text-lg font-bold text-foreground">Análise Detalhada de Pontos</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Pontos Liberados (Validados) */}
                      <div className="glass rounded-xl p-6 border border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/20">
                            <CheckCircle2 className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Pontos Liberados</p>
                            <p className="text-xs text-muted-foreground/70">Pedidos validados</p>
                          </div>
                        </div>
                        <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                          {formatarMoeda(pontosLiberados)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {data.totalValidados} pedidos aprovados
                        </p>
                      </div>

                      {/* Pontos Pendentes */}
                      <div className="glass rounded-xl p-6 border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-amber-500/5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl shadow-lg shadow-yellow-500/20">
                            <Clock className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Pontos Pendentes</p>
                            <p className="text-xs text-muted-foreground/70">Aguardando análise</p>
                          </div>
                        </div>
                        <p className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                          {formatarMoeda(pontosPendentes)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {data.totalEmAnalise} pedidos em análise
                        </p>
                      </div>

                      {/* Pontos com Multiplicadores */}
                      <div className="glass rounded-xl p-6 border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/20">
                            <Zap className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Pontos Totais (com Eventos)</p>
                            <p className="text-xs text-muted-foreground/70">Incluindo multiplicadores</p>
                          </div>
                        </div>
                        <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                          {formatarMoeda(pontosComMultiplicador)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Bônus: {formatarMoeda(bonusPorEventos)} (eventos especiais)
                        </p>
                      </div>

                      {/* Total Distribuído */}
                      <div className="glass rounded-xl p-6 border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/20">
                            <DollarSign className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Valor Total Distribuído</p>
                            <p className="text-xs text-muted-foreground/70">Soma de todos os pedidos validados</p>
                          </div>
                        </div>
                        <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                          {formatarMoeda(data.totalPontosReaisDistribuidos)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Média por pedido: {formatarMoeda(data.totalValidados > 0 ? data.totalPontosReaisDistribuidos / data.totalValidados : 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'ranking' && (
                <motion.div
                  key="ranking"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    <h3 className="text-xl font-bold text-foreground">Ranking de Vendedores</h3>
                  </div>

                  <div className="glass rounded-xl overflow-hidden border border-border/30">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/30 bg-muted/30">
                            <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Rank</th>
                            <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Vendedor</th>
                            <th className="text-center p-4 text-sm font-semibold text-muted-foreground">Envios</th>
                            <th className="text-center p-4 text-sm font-semibold text-muted-foreground">Validados</th>
                            <th className="text-center p-4 text-sm font-semibold text-muted-foreground">Rejeitados</th>
                            <th className="text-center p-4 text-sm font-semibold text-muted-foreground">Pontos Ganhos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.rankingVendedores.map((vendedor, index) => (
                            <motion.tr
                              key={vendedor.vendedorId}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-border/20 hover:bg-accent/30 transition-all duration-200"
                            >
                              <td className="p-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg ${
                                  index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                                  index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                                  index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                                  'glass border border-border/30 text-muted-foreground'
                                }`}>
                                  {index === 0 && '🥇'}
                                  {index === 1 && '🥈'}
                                  {index === 2 && '🥉'}
                                  {index > 2 && index + 1}
                                </div>
                              </td>
                              <td className="p-4">
                                <div>
                                  <p className="font-semibold text-foreground">{vendedor.nomeVendedor}</p>
                                  <p className="text-xs text-muted-foreground">{vendedor.emailVendedor}</p>
                                </div>
                              </td>
                              <td className="text-center p-4">
                                <span className="px-3 py-1 glass rounded-lg text-sm font-medium border border-border/30">
                                  {vendedor.totalEnvios}
                                </span>
                              </td>
                              <td className="text-center p-4">
                                <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium border border-green-500/20">
                                  {vendedor.totalValidados}
                                </span>
                              </td>
                              <td className="text-center p-4">
                                <span className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-500/20">
                                  {vendedor.totalRejeitados}
                                </span>
                              </td>
                              <td className="text-center p-4">
                                <span className="font-bold text-lg bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                                  {formatarMoeda(vendedor.totalPontosReaisGanhos)}
                                </span>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {data.rankingVendedores.length === 0 && (
                    <div className="text-center py-16 glass rounded-xl">
                      <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                      <p className="text-muted-foreground">Nenhum vendedor participou desta campanha ainda.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'grafico' && (
                <motion.div
                  key="grafico"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="h-6 w-6 text-purple-500" />
                    <h3 className="text-xl font-bold text-foreground">Evolução Temporal das Vendas</h3>
                  </div>

                  {data.evolucaoTemporal.length > 0 ? (
                    <LineChart data={data.evolucaoTemporal} />
                  ) : (
                    <div className="text-center py-16 glass rounded-xl">
                      <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                      <p className="text-muted-foreground">Nenhum dado temporal disponível.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'envios' && (
                <motion.div
                  key="envios"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Filter className="h-6 w-6 text-blue-500" />
                    <h3 className="text-xl font-bold text-foreground">Todos os Envios</h3>
                  </div>

                  {/* Filtros Magnificos */}
                  <div className="flex flex-col sm:flex-row gap-3 glass rounded-xl p-4 border border-border/30">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Buscar por pedido ou vendedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 glass border border-border/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2.5 glass border border-border/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    >
                      <option value="TODOS">Todos os Status</option>
                      <option value="VALIDADO">✓ Validado</option>
                      <option value="REJEITADO">✗ Rejeitado</option>
                      <option value="EM_ANALISE">⏱ Em Análise</option>
                      <option value="CONFLITO_MANUAL">⚠ Conflito</option>
                    </select>
                  </div>

                  {/* Tabela de Envios */}
                  <div className="glass rounded-xl overflow-hidden border border-border/30">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/30 bg-muted/30">
                            <th className="text-left p-3 font-semibold text-muted-foreground">Pedido</th>
                            <th className="text-left p-3 font-semibold text-muted-foreground">Vendedor</th>
                            <th className="text-center p-3 font-semibold text-muted-foreground">Status</th>
                            <th className="text-center p-3 font-semibold text-muted-foreground">Data</th>
                            <th className="text-center p-3 font-semibold text-muted-foreground">Cartela</th>
                            <th className="text-center p-3 font-semibold text-muted-foreground">Pontos</th>
                            <th className="text-left p-3 font-semibold text-muted-foreground">Observações</th>
                            <th className="text-center p-3 font-semibold text-muted-foreground">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEnvios?.map((envio, index) => (
                            <motion.tr
                              key={envio.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.02 }}
                              className="border-b border-border/20 hover:bg-accent/30 transition-all"
                            >
                              <td className="p-3 font-mono text-xs font-semibold">{envio.numeroPedido}</td>
                              <td className="p-3">
                                <div>
                                  <p className="font-medium text-sm">{envio.vendedor.nome}</p>
                                  <p className="text-xs text-muted-foreground">{envio.vendedor.email}</p>
                                </div>
                              </td>
                              <td className="text-center p-3">
                                <span className={`inline-block px-3 py-1 ${STATUS_COLORS[envio.status as keyof typeof STATUS_COLORS]} text-white rounded-lg text-xs font-semibold shadow-md`}>
                                  {STATUS_LABELS[envio.status as keyof typeof STATUS_LABELS]}
                                </span>
                              </td>
                              <td className="text-center p-3 text-xs">
                                {formatarDataBR(envio.dataEnvio, 'dd/MM/yyyy')}
                              </td>
                              <td className="text-center p-3">
                                {envio.numeroCartelaAtendida ? (
                                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold border border-primary/20">
                                    C{envio.numeroCartelaAtendida}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </td>
                              <td className="text-center p-3">
                                {envio.valorPontosReaisRecebido ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="font-bold text-xs text-green-600 dark:text-green-400">
                                      {formatarMoeda(envio.valorPontosReaisRecebido)}
                                    </span>
                                    {envio.multiplicadorAplicado && envio.multiplicadorAplicado > 1 && (
                                      <span className="text-[10px] text-purple-600 dark:text-purple-400">
                                        ×{envio.multiplicadorAplicado.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </td>
                              <td className="p-3 text-xs text-muted-foreground max-w-xs">
                                {envio.status === 'EM_ANALISE' && rejeitandoEnvioId === envio.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={motivoRejeicao}
                                      onChange={(e) => setMotivoRejeicao(e.target.value)}
                                      placeholder="Motivo da rejeição..."
                                      className="w-full px-2 py-1 glass border border-border rounded text-xs resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                                      rows={2}
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleRejeitarEnvio(envio.id)}
                                        disabled={processandoEnvioId === envio.id || !motivoRejeicao.trim()}
                                        className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg text-xs font-semibold hover:shadow-lg hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                      >
                                        Confirmar
                                      </button>
                                      <button
                                        onClick={() => {
                                          setRejeitandoEnvioId(null);
                                          setMotivoRejeicao('');
                                        }}
                                        disabled={processandoEnvioId === envio.id}
                                        className="px-3 py-1.5 glass border border-border/30 rounded-lg text-xs font-semibold hover:bg-accent disabled:opacity-50 transition-all"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {envio.motivoRejeicaoVendedor && (
                                      <div className="text-xs">
                                        <span className="font-semibold text-blue-600 dark:text-blue-400">👤 Vendedor:</span>
                                        <p className="mt-0.5 text-foreground/80">{envio.motivoRejeicaoVendedor}</p>
                                      </div>
                                    )}
                                    {envio.motivoRejeicao && (
                                      <div className="text-xs">
                                        <span className="font-semibold text-orange-600 dark:text-orange-400">🔧 Técnico:</span>
                                        <p className="mt-0.5 font-mono text-[10px] text-foreground/70 glass p-1.5 rounded">{envio.motivoRejeicao}</p>
                                      </div>
                                    )}
                                    {!envio.motivoRejeicaoVendedor && !envio.motivoRejeicao && (
                                      <span className="block">{envio.infoConflito || '-'}</span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                {envio.status === 'EM_ANALISE' && rejeitandoEnvioId !== envio.id && (
                                  <div className="flex gap-2 justify-center">
                                    <button
                                      onClick={() => handleAprovarEnvio(envio.id)}
                                      disabled={processandoEnvioId === envio.id}
                                      className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Aprovar envio"
                                    >
                                      {processandoEnvioId === envio.id ? (
                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <Check className="h-4 w-4" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setRejeitandoEnvioId(envio.id)}
                                      disabled={processandoEnvioId === envio.id}
                                      className="p-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Rejeitar envio"
                                    >
                                      <Ban className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                                {envio.status !== 'EM_ANALISE' && (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {filteredEnvios?.length === 0 && (
                    <div className="text-center py-16 glass rounded-xl">
                      <Filter className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                      <p className="text-muted-foreground">Nenhum envio encontrado com os filtros aplicados.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/30 flex justify-end bg-muted/10">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Fechar
          </button>
        </div>
      </motion.div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary));
        }
        .animation-delay-150 {
          animation-delay: 150ms;
        }
      `}</style>
    </div>
  );
}

// Componente de KPI Card Magnifico
function MagnificoKPICard({
  icon: Icon,
  label,
  value,
  gradient,
  iconColor,
  subtitle,
}: {
  icon: any;
  label: string;
  value: string | number;
  gradient: string;
  iconColor: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="glass rounded-xl p-5 border border-border/30 relative overflow-hidden group"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      <div className="relative flex items-center gap-4">
        <div className={`p-3 bg-gradient-to-br ${gradient} rounded-xl shadow-lg opacity-20 group-hover:opacity-100 transition-opacity duration-300`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Componente de Gráfico de Linha Magnifico
function LineChart({ data }: { data: Array<{ data: string; totalEnvios: number; totalValidados: number }> }) {
  const maxValue = Math.max(...data.map((d) => Math.max(d.totalEnvios, d.totalValidados)), 1);
  const padding = 50;
  const width = 900;
  const height = 350;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const xStep = chartWidth / (data.length - 1 || 1);
  const yScale = chartHeight / maxValue;

  const pointsEnvios = data.map((d, i) => ({
    x: padding + i * xStep,
    y: height - padding - d.totalEnvios * yScale,
  }));

  const pointsValidados = data.map((d, i) => ({
    x: padding + i * xStep,
    y: height - padding - d.totalValidados * yScale,
  }));

  const lineEnvios = pointsEnvios.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const lineValidados = pointsValidados.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Área sob a linha (fill)
  const areaEnvios = `M ${padding} ${height - padding} L ${pointsEnvios.map(p => `${p.x} ${p.y}`).join(' L ')} L ${width - padding} ${height - padding} Z`;
  const areaValidados = `M ${padding} ${height - padding} L ${pointsValidados.map(p => `${p.x} ${p.y}`).join(' L ')} L ${width - padding} ${height - padding} Z`;

  return (
    <div className="glass rounded-xl p-6 border border-border/30">
      <div className="flex items-center gap-6 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg shadow-blue-500/30" />
          <span className="text-sm font-medium text-foreground">Total de Envios</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg shadow-green-500/30" />
          <span className="text-sm font-medium text-foreground">Validados</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid horizontal */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={padding}
              y1={padding + chartHeight * ratio}
              x2={width - padding}
              y2={padding + chartHeight * ratio}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.3"
            />
            <text
              x={padding - 10}
              y={padding + chartHeight * ratio + 5}
              textAnchor="end"
              className="text-[10px] fill-muted-foreground"
            >
              {Math.round(maxValue * (1 - ratio))}
            </text>
          </g>
        ))}

        {/* Área sob as linhas (gradiente sutil) */}
        <defs>
          <linearGradient id="gradientEnvios" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradientValidados" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaEnvios} fill="url(#gradientEnvios)" />
        <path d={areaValidados} fill="url(#gradientValidados)" />

        {/* Linhas */}
        <path d={lineEnvios} fill="none" stroke="rgb(59, 130, 246)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={lineValidados} fill="none" stroke="rgb(16, 185, 129)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Pontos com shadow */}
        {pointsEnvios.map((p, i) => (
          <g key={`envios-${i}`}>
            <circle cx={p.x} cy={p.y} r="6" fill="rgb(59, 130, 246)" opacity="0.3" />
            <circle cx={p.x} cy={p.y} r="4" fill="rgb(59, 130, 246)" />
          </g>
        ))}
        {pointsValidados.map((p, i) => (
          <g key={`validados-${i}`}>
            <circle cx={p.x} cy={p.y} r="6" fill="rgb(16, 185, 129)" opacity="0.3" />
            <circle cx={p.x} cy={p.y} r="4" fill="rgb(16, 185, 129)" />
          </g>
        ))}

        {/* Eixo X com labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={padding + i * xStep}
            y={height - padding + 25}
            textAnchor="middle"
            className="text-[11px] fill-muted-foreground font-medium"
          >
            {formatarDataCurtaBR(d.data)}
          </text>
        ))}
      </svg>
    </div>
  );
}
