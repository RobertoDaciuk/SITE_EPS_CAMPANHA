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
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { formatarDataBR, formatarDataCurtaBR, formatarMoeda, formatarNumero } from '@/lib/timezone';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campanhaId: string;
  campanhaTitulo: string;
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
    motivoRejeicaoVendedor: string | null; // Mensagem formal para vendedor
    infoConflito: string | null;
    dadosValidacao: any;
  }>;
}

const STATUS_COLORS = {
  VALIDADO: 'bg-green-500',
  REJEITADO: 'bg-red-500',
  EM_ANALISE: 'bg-yellow-500',
  CONFLITO_MANUAL: 'bg-orange-500',
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
  campanhaTitulo,
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
      await fetchAnalytics(); // Recarrega os dados
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
      await fetchAnalytics(); // Recarrega os dados
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col border border-border"
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Analytics da Campanha</h2>
              <p className="text-sm text-muted-foreground mt-1">{campanhaTitulo}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto">
            {[
              { id: 'kpis', label: 'Visão Geral', icon: TrendingUp },
              { id: 'ranking', label: 'Ranking', icon: Trophy },
              { id: 'grafico', label: 'Evolução', icon: Calendar },
              { id: 'envios', label: 'Todos os Envios', icon: Filter },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <AnimatePresence mode="wait">
              {activeTab === 'kpis' && (
                <motion.div
                  key="kpis"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* KPIs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                      icon={Users}
                      label="Total de Envios"
                      value={data.totalEnvios}
                      color="blue"
                    />
                    <KPICard
                      icon={CheckCircle2}
                      label="Validados"
                      value={data.totalValidados}
                      color="green"
                    />
                    <KPICard
                      icon={XCircle}
                      label="Rejeitados"
                      value={data.totalRejeitados}
                      color="red"
                    />
                    <KPICard
                      icon={Clock}
                      label="Em Análise"
                      value={data.totalEmAnalise}
                      color="yellow"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <KPICard
                      icon={AlertTriangle}
                      label="Conflitos"
                      value={data.totalConflito}
                      color="orange"
                    />
                    <KPICard
                      icon={TrendingUp}
                      label="Taxa de Conversão"
                      value={`${data.taxaConversao}%`}
                      color="purple"
                    />
                    
                  </div>

                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <DollarSign className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Total Distribuído</p>
                        <p className="text-3xl font-bold text-foreground">
                          {formatarMoeda(data.totalPontosReaisDistribuidos)}
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
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Ranking de Vendedores
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-sm font-semibold text-muted-foreground">#</th>
                          <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Vendedor</th>
                          <th className="text-center p-3 text-sm font-semibold text-muted-foreground">Envios</th>
                          <th className="text-center p-3 text-sm font-semibold text-muted-foreground">Validados</th>
                          <th className="text-center p-3 text-sm font-semibold text-muted-foreground">Rejeitados</th>
                          
                          <th className="text-center p-3 text-sm font-semibold text-muted-foreground">R$ Ganhos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.rankingVendedores.map((vendedor, index) => (
                          <tr key={vendedor.vendedorId} className="border-b border-border hover:bg-accent/50 transition-colors">
                            <td className="p-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                index === 0 ? 'bg-yellow-500 text-white' :
                                index === 1 ? 'bg-gray-400 text-white' :
                                index === 2 ? 'bg-orange-600 text-white' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {index + 1}
                              </div>
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-foreground">{vendedor.nomeVendedor}</p>
                                <p className="text-xs text-muted-foreground">{vendedor.emailVendedor}</p>
                              </div>
                            </td>
                            <td className="text-center p-3 font-medium">{vendedor.totalEnvios}</td>
                            <td className="text-center p-3">
                              <span className="px-2 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-medium">
                                {vendedor.totalValidados}
                              </span>
                            </td>
                            <td className="text-center p-3">
                              <span className="px-2 py-1 bg-red-500/10 text-red-600 rounded-full text-xs font-medium">
                                {vendedor.totalRejeitados}
                              </span>
                            </td>
                            
                            <td className="text-center p-3 font-bold text-green-600">
                              {formatarMoeda(vendedor.totalPontosReaisGanhos)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {data.rankingVendedores.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum vendedor participou desta campanha ainda.</p>
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
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Evolução Temporal das Vendas
                  </h3>

                  {data.evolucaoTemporal.length > 0 ? (
                    <LineChart data={data.evolucaoTemporal} />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum dado temporal disponível.</p>
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
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Filter className="h-5 w-5 text-purple-500" />
                    Todos os Envios
                  </h3>

                  {/* Filtros */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Buscar por pedido ou vendedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="TODOS">Todos os Status</option>
                      <option value="VALIDADO">Validado</option>
                      <option value="REJEITADO">Rejeitado</option>
                      <option value="EM_ANALISE">Em Análise</option>
                      <option value="CONFLITO_MANUAL">Conflito</option>
                    </select>
                  </div>

                  {/* Tabela de Envios */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 font-semibold text-muted-foreground">Pedido</th>
                          <th className="text-left p-3 font-semibold text-muted-foreground">Vendedor</th>
                          <th className="text-center p-3 font-semibold text-muted-foreground">Status</th>
                          <th className="text-center p-3 font-semibold text-muted-foreground">Data Envio</th>
                          <th className="text-center p-3 font-semibold text-muted-foreground">Cartela</th>
                          <th className="text-left p-3 font-semibold text-muted-foreground">Observações</th>
                          <th className="text-center p-3 font-semibold text-muted-foreground">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEnvios?.map((envio) => (
                          <tr key={envio.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                            <td className="p-3 font-mono text-xs">{envio.numeroPedido}</td>
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{envio.vendedor.nome}</p>
                                <p className="text-xs text-muted-foreground">{envio.vendedor.email}</p>
                              </div>
                            </td>
                            <td className="text-center p-3">
                              <span className={`px-2 py-1 ${STATUS_COLORS[envio.status as keyof typeof STATUS_COLORS]} text-white rounded-full text-xs font-medium`}>
                                {STATUS_LABELS[envio.status as keyof typeof STATUS_LABELS]}
                              </span>
                            </td>
                            <td className="text-center p-3 text-xs">
                              {formatarDataBR(envio.dataEnvio)}
                            </td>
                            <td className="text-center p-3">
                              {envio.numeroCartelaAtendida ? (
                                <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                  Cartela {envio.numeroCartelaAtendida}
                                </span>
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
                                    className="w-full px-2 py-1 border border-border rounded text-xs resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                                    rows={2}
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleRejeitarEnvio(envio.id)}
                                      disabled={processandoEnvioId === envio.id || !motivoRejeicao.trim()}
                                      className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Confirmar
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRejeitandoEnvioId(null);
                                        setMotivoRejeicao('');
                                      }}
                                      disabled={processandoEnvioId === envio.id}
                                      className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 disabled:opacity-50"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {/* Mensagem enviada ao vendedor */}
                                  {envio.motivoRejeicaoVendedor && (
                                    <div className="text-xs">
                                      <span className="font-semibold text-blue-600 dark:text-blue-400">👤 Vendedor:</span>
                                      <p className="mt-0.5 text-foreground/80">{envio.motivoRejeicaoVendedor}</p>
                                    </div>
                                  )}
                                  
                                  {/* Motivo técnico para admin */}
                                  {envio.motivoRejeicao && (
                                    <div className="text-xs">
                                      <span className="font-semibold text-orange-600 dark:text-orange-400">🔧 Técnico:</span>
                                      <p className="mt-0.5 font-mono text-[10px] text-foreground/70 bg-muted/30 p-1.5 rounded">{envio.motivoRejeicao}</p>
                                    </div>
                                  )}

                                  {/* Fallback para info de conflito ou vazio */}
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
                                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredEnvios?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum envio encontrado com os filtros aplicados.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-accent hover:bg-accent/80 rounded-lg font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Componente de KPI Card
function KPICard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 ${colorClasses[color as keyof typeof colorClasses]} rounded-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Componente de Gráfico de Linha Simples
function LineChart({ data }: { data: Array<{ data: string; totalEnvios: number; totalValidados: number }> }) {
  const maxValue = Math.max(...data.map((d) => Math.max(d.totalEnvios, d.totalValidados)), 1);
  const padding = 40;
  const width = 800;
  const height = 300;
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

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span className="text-sm text-muted-foreground">Total de Envios</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-sm text-muted-foreground">Validados</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            y1={padding + chartHeight * ratio}
            x2={width - padding}
            y2={padding + chartHeight * ratio}
            stroke="hsl(var(--border))"
            strokeWidth="1"
            strokeDasharray="4"
          />
        ))}

        {/* Lines */}
        <path d={lineEnvios} fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d={lineValidados} fill="none" stroke="#10b981" strokeWidth="2" />

        {/* Points */}
        {pointsEnvios.map((p, i) => (
          <circle key={`envios-${i}`} cx={p.x} cy={p.y} r="4" fill="#3b82f6" />
        ))}
        {pointsValidados.map((p, i) => (
          <circle key={`validados-${i}`} cx={p.x} cy={p.y} r="4" fill="#10b981" />
        ))}

        {/* X-axis Labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={padding + i * xStep}
            y={height - padding + 20}
            textAnchor="middle"
            className="text-[10px] fill-muted-foreground"
          >
            {formatarDataCurtaBR(d.data)}
          </text>
        ))}
      </svg>
    </div>
  );
}
