'use client';

/**
 * ============================================================================
 * PÁGINA FINANCEIRO UNIFICADA (V3.0)
 * ============================================================================
 * * ARQUITETURA INTEGRADA:
 * - Dashboard Analytics (KPIs, Gráficos, Comparativos)
 * - Sistema de Lotes Completo (Listagem, Filtros, Ações)
 * - Fluxo de Geração de Lote (Preview de Saldos, Lógica de Reservas)
 * - Auditoria e Relatórios
 * * FEATURES PRESERVADAS:
 * - Lógica de Timezone (dateToSaoPauloISO)
 * - Visualização de Saldo Disponível vs Reservado (Lock icon)
 * - Exportações (Excel Simples e Detalhado)
'use client';

/**
 * ============================================================================
 * PÁGINA FINANCEIRO UNIFICADA (V3.0)
 * ============================================================================
 * * ARQUITETURA INTEGRADA:
 * - Dashboard Analytics (KPIs, Gráficos, Comparativos)
 * - Sistema de Lotes Completo (Listagem, Filtros, Ações)
 * - Fluxo de Geração de Lote (Preview de Saldos, Lógica de Reservas)
 * - Auditoria e Relatórios
 * * FEATURES PRESERVADAS:
 * - Lógica de Timezone (dateToSaoPauloISO)
 * - Visualização de Saldo Disponível vs Reservado (Lock icon)
 * - Exportações (Excel Simples e Detalhado)
 * - Processamento Atômico de Pagamentos
 * - Design Premium (Glassmorphism, Framer Motion)
 * * ============================================================================
 */

import { useState, useEffect, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, eachMonthOfInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useLotesFinanceiros, useDashboardFinanceiro } from '@/hooks/useFinanceiro';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  FileDown,
  CheckCircle,
  Clock,
  Loader2,
  DollarSign,
  Users,
  FileText,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Building2,
  Calendar,
  Trash2,
  Zap,
  CreditCard,
  Download,
  RefreshCw,
  Lock,
  Search,
  BarChart3,
  Activity,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  Target
} from 'lucide-react';

// ============================================================================
// HELPER: Converter data local para ISO com timezone de São Paulo
// ============================================================================
const dateToSaoPauloISO = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);

  const offset = -date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const offsetSign = offset >= 0 ? '+' : '-';

  const isoDate = date.toISOString().split('T')[0];
  const isoTime = '00:00:00';
  const isoOffset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

  return `${isoDate}T${isoTime}${isoOffset}`;
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf: string | null;
  whatsapp: string | null;
  papel: string;
  saldoPontos: number;
  saldoReservado: number;
  optica?: {
    id: string;
    nome: string;
    cnpj: string;
    cidade: string;
    estado: string;
  };
}

interface Lote {
  numeroLote: string;
  dataCorte: string;
  status: 'PENDENTE' | 'PAGO';
  relatorios: any[];
  totalRelatorios: number;
  valorTotal: number;
  criadoEm: string;
  dataPagamento?: string;
  processadoPor?: {
    nome: string;
  };
}

interface DashboardStats {
  totalPagoMesAtual: number;
  totalPagoMesAnterior: number;
  volumeLotes: number;
  ticketMedio: number;
  saldoDisponivel: number;
  saldoReservado: number;
  usuariosAtivos: number;
  pendentes: number;
}

// ============================================================================
// TYPES & INTERFACES - AUDITORIA E RELATÓRIOS
// ============================================================================

type AcaoFinanceira = 
  | 'VISUALIZAR_SALDOS'
  | 'GERAR_LOTE'
  | 'PROCESSAR_LOTE'
  | 'CANCELAR_LOTE'
  | 'EXPORTAR_EXCEL'
  | 'BUSCAR_LOTE'
  | 'LISTAR_LOTES';

interface AuditoriaFinanceira {
  id: string;
  acao: AcaoFinanceira;
  numeroLote?: string;
  adminId: string;
  admin: {
    id: string;
    nome: string;
    email: string;
  };
  dadosAntes?: any;
  dadosDepois?: any;
  ipAddress: string;
  userAgent?: string;
  metadata?: any;
  criadoEm: string;
}

interface PaginacaoMeta {
  pagina: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
}

interface AuditoriaResponse {
  auditorias: AuditoriaFinanceira[];
  paginacao: PaginacaoMeta;
}

interface EvolucaoTemporal {
  mes: string; // "YYYY-MM"
  total: number;
}

interface MetricasRelatorio {
  totalPago: number;
  totalLotesPagos: number;
  totalLotesPendentes: number;
  ticketMedio: number;
  usuariosUnicosPagos: number;
  evolucaoTemporal: EvolucaoTemporal[];
}

interface RankingOtica {
  posicao: number;
  optica: {
    id: string;
    nome: string;
    cidade: string;
    estado: string;
  };
  totalPago: number;
  numeroPagamentos: number;
}

interface PerformanceVendedor {
  posicao: number;
  vendedor: {
    id: string;
    nome: string;
    optica?: {
      id: string;
      nome: string;
    };
  };
  totalRecebido: number;
  numeroPagamentos: number;
}

interface Campanha {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FinanceiroPage() {
  // ================================================================
  // STATE MANAGEMENT
  // ================================================================
  // ⚡ SWR HOOKS - Cache automático e deduping
  // ================================================================
  const { lotes, isLoading: loadingLotes, mutate: revalidarLotes } = useLotesFinanceiros();
  const { stats: dashboardStats, isLoading: loadingDashboard } = useDashboardFinanceiro();

  // ================================================================
  // UI STATE
  // ================================================================
  const [activeView, setActiveView] = useState<'dashboard' | 'lotes' | 'auditoria' | 'relatorios'>('dashboard');
  const [loadingAction, setLoadingAction] = useState(false);
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Filtros de Lotes
  const [filteredLotes, setFilteredLotes] = useState<Lote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDENTE' | 'PAGO'>('ALL');

  // Preview State (Lógica do V1 integrada)
  const [usuariosPreview, setUsuariosPreview] = useState<Usuario[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'preview'>('list'); // Controla se estamos vendo lista de lotes ou preview de saldos
  const [valorTotalDisponivelPreview, setValorTotalDisponivelPreview] = useState(0);
  const [valorTotalReservadoPreview, setValorTotalReservadoPreview] = useState(0);

  // Auditoria State
  const [auditorias, setAuditorias] = useState<AuditoriaFinanceira[]>([]);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);
  const [paginacaoAuditoria, setPaginacaoAuditoria] = useState<PaginacaoMeta>({
    pagina: 1,
    porPagina: 20,
    total: 0,
    totalPaginas: 0,
  });
  const [filtrosAuditoria, setFiltrosAuditoria] = useState<{
    acao?: AcaoFinanceira;
    numeroLote?: string;
    dataInicio?: string;
    dataFim?: string;
  }>({
    dataInicio: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    dataFim: format(new Date(), 'yyyy-MM-dd'),
  });

  // Relatórios State
  const [metricas, setMetricas] = useState<MetricasRelatorio | null>(null);
  const [rankingOticas, setRankingOticas] = useState<RankingOtica[]>([]);
  const [performanceVendedores, setPerformanceVendedores] = useState<PerformanceVendedor[]>([]);
  const [loadingRelatorios, setLoadingRelatorios] = useState(false);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [filtrosRelatorios, setFiltrosRelatorios] = useState<{
    dataInicio?: string;
    dataFim?: string;
    campanhaId?: string;
  }>({
    dataInicio: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    dataFim: format(new Date(), 'yyyy-MM-dd'),
  });

  // ================================================================
  // COMPUTED VALUES
  // ================================================================
  const percentualMesAnterior = useMemo(() => {
    if (dashboardStats.totalPagoMesAnterior === 0) return 0;
    return ((dashboardStats.totalPagoMesAtual - dashboardStats.totalPagoMesAnterior) / dashboardStats.totalPagoMesAnterior) * 100;
  }, [dashboardStats.totalPagoMesAtual, dashboardStats.totalPagoMesAnterior]);

  // ================================================================
  // API CALLS - Agora gerenciados por SWR hooks
  // ================================================================
  // ✅ carregarDashboardStats() removido - substituído por useDashboardFinanceiro()
  // ✅ carregarLotes() removido - substituído por useLotesFinanceiros()

  // Lógica V1: Visualizar Saldos (Phase 1)
  const handleVisualizarSaldos = async () => {
    try {
      setLoadingAction(true);
      const response = await axios.get('/financeiro/saldos', {
        params: { dataFim: dateToSaoPauloISO(dataFim) },
      });

      setUsuariosPreview(response.data.usuarios);
      setValorTotalDisponivelPreview(response.data.valorTotalDisponivel || 0);
      setValorTotalReservadoPreview(response.data.valorTotalReservado || 0);
      setViewMode('preview');

      toast.success(
        `${response.data.totalUsuarios} usuários com saldo encontrados`,
        { icon: '💰', duration: 4000 }
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao visualizar saldos');
    } finally {
      setLoadingAction(false);
    }
  };

  // Lógica V1: Gerar Lote (Phase 2)
  const handleGerarLote = async () => {
    try {
      setLoadingAction(true);
      const response = await axios.post('/financeiro/lotes', {
        dataCorte: dateToSaoPauloISO(dataFim),
        observacoes: `Lote gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      });

      toast.success(
        `Lote ${response.data.numeroLote} criado com sucesso!`,
        { icon: '✅', duration: 5000 }
      );

      // Retorna para a view de lista e atualiza
      setViewMode('list');
      setUsuariosPreview([]);
      await revalidarLotes(); // SWR revalida cache automaticamente
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao gerar lote');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleVoltarParaLista = () => {
    setViewMode('list');
    setUsuariosPreview([]);
  };

  // Ações de Lote
  const handleProcessarLote = async (numeroLote: string) => {
    const confirmacao = window.confirm(
      `⚠️ ATENÇÃO: Confirma o processamento do lote ${numeroLote}?\n\n` +
      `Esta ação é IRREVERSÍVEL e irá:\n` +
      `• Debitar saldos dos usuários\n` +
      `• Marcar envios como liquidados\n` +
      `• Enviar notificações`
    );

    if (!confirmacao) return;

    try {
      setLoadingAction(true);
      const response = await axios.patch(`/financeiro/lotes/${numeroLote}/processar`, {
        observacoes: `Processado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      });

      toast.success(
        `Lote processado! ${response.data.totalProcessado} pagamentos efetuados.`,
        { icon: '🎉', duration: 6000 }
      );

      await revalidarLotes(); // SWR revalida cache automaticamente
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao processar lote');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelarLote = async (numeroLote: string) => {
    const confirmacao = window.confirm(
      `Confirma o cancelamento do lote ${numeroLote}?\n\nTodos os relatórios serão removidos e saldos devolvidos.`
    );

    if (!confirmacao) return;

    try {
      setLoadingAction(true);
      await axios.delete(`/financeiro/lotes/${numeroLote}`);

      toast.success('Lote cancelado e saldos devolvidos com sucesso', { icon: '🗑️' });
      await revalidarLotes(); // SWR revalida cache automaticamente
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao cancelar lote');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleExportarExcel = async (numeroLote: string) => {
    try {
      toast.loading('Gerando arquivo Excel...', { id: 'excel-export' });
      const response = await axios.get(`/financeiro/lotes/${numeroLote}/exportar-excel`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lote-${numeroLote}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Excel exportado com sucesso', { id: 'excel-export', icon: '📊', duration: 3000 });
    } catch (error: any) {
      toast.error('Erro ao exportar Excel', { id: 'excel-export' });
    }
  };

  const handleExportarExcelDetalhado = async (numeroLote: string) => {
    try {
      toast.loading('Gerando arquivo Excel DETALHADO...', { id: 'excel-export-detalhado' });
      const response = await axios.get(`/financeiro/lotes/${numeroLote}/exportar-excel-detalhado`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lote-${numeroLote}-DETALHADO.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Excel detalhado exportado com sucesso', { id: 'excel-export-detalhado', icon: '📋', duration: 3000 });
    } catch (error: any) {
      toast.error('Erro ao exportar Excel detalhado', { id: 'excel-export-detalhado' });
    }
  };

  // ================================================================
  // API CALLS - AUDITORIA E RELATÓRIOS
  // ================================================================

  const carregarAuditoria = useCallback(async () => {
    try {
      setLoadingAuditoria(true);
      const params: any = {
        pagina: paginacaoAuditoria.pagina,
        porPagina: paginacaoAuditoria.porPagina,
      };

      if (filtrosAuditoria.acao) params.acao = filtrosAuditoria.acao;
      if (filtrosAuditoria.numeroLote) params.numeroLote = filtrosAuditoria.numeroLote;
      if (filtrosAuditoria.dataInicio) params.dataInicio = filtrosAuditoria.dataInicio;
      if (filtrosAuditoria.dataFim) params.dataFim = filtrosAuditoria.dataFim;

      const response = await axios.get<AuditoriaResponse>('/financeiro/auditoria', { params });

      setAuditorias(response.data.auditorias || []);
      setPaginacaoAuditoria(response.data.paginacao || {
        pagina: 1,
        porPagina: 20,
        total: 0,
        totalPaginas: 0,
      });
    } catch (error: any) {
      console.error('Erro ao carregar auditoria:', error);
      const mensagemErro = error.response?.data?.message || error.message || 'Erro ao carregar logs de auditoria';
      
      // Se for erro 500, pode ser que a tabela não existe ou está vazia
      if (error.response?.status === 500) {
        console.warn('Erro 500: Tabela de auditoria pode não estar criada. Execute as migrations do banco.');
        toast.error('Sistema de auditoria não configurado. Contate o administrador.');
      } else {
        toast.error(mensagemErro);
      }
      
      setAuditorias([]);
      setPaginacaoAuditoria({
        pagina: 1,
        porPagina: 20,
        total: 0,
        totalPaginas: 0,
      });
    } finally {
      setLoadingAuditoria(false);
    }
  }, [paginacaoAuditoria.pagina, paginacaoAuditoria.porPagina, filtrosAuditoria]);

  const carregarCampanhas = useCallback(async () => {
    try {
      const response = await axios.get<Campanha[]>('/campanhas');
      setCampanhas(response.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar campanhas:', error);
      setCampanhas([]);
    }
  }, []);

  const carregarMetricas = useCallback(async () => {
    try {
      setLoadingRelatorios(true);
      const params: any = {};

      if (filtrosRelatorios.dataInicio) params.dataInicio = filtrosRelatorios.dataInicio;
      if (filtrosRelatorios.dataFim) params.dataFim = filtrosRelatorios.dataFim;
      if (filtrosRelatorios.campanhaId) params.campanhaId = filtrosRelatorios.campanhaId;

      const response = await axios.get<MetricasRelatorio>('/financeiro/relatorios/metricas', { params });
      setMetricas(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar métricas:', error);
      toast.error('Erro ao carregar métricas gerais');
      setMetricas(null);
    }
  }, [filtrosRelatorios]);

  const carregarRankingOticas = useCallback(async () => {
    try {
      const params: any = { limite: 10 };

      if (filtrosRelatorios.dataInicio) params.dataInicio = filtrosRelatorios.dataInicio;
      if (filtrosRelatorios.dataFim) params.dataFim = filtrosRelatorios.dataFim;

      const response = await axios.get<RankingOtica[]>('/financeiro/relatorios/ranking-oticas', { params });
      setRankingOticas(response.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar ranking de óticas:', error);
      toast.error('Erro ao carregar ranking de óticas');
      setRankingOticas([]);
    }
  }, [filtrosRelatorios]);

  const carregarPerformanceVendedores = useCallback(async () => {
    try {
      const params: any = { limite: 20 };

      if (filtrosRelatorios.dataInicio) params.dataInicio = filtrosRelatorios.dataInicio;
      if (filtrosRelatorios.dataFim) params.dataFim = filtrosRelatorios.dataFim;

      const response = await axios.get<PerformanceVendedor[]>('/financeiro/relatorios/performance-vendedores', { params });
      setPerformanceVendedores(response.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar performance de vendedores:', error);
      toast.error('Erro ao carregar performance de vendedores');
      setPerformanceVendedores([]);
    } finally {
      setLoadingRelatorios(false);
    }
  }, [filtrosRelatorios]);

  const carregarTodosRelatorios = useCallback(async () => {
    setLoadingRelatorios(true);
    await Promise.all([
      carregarMetricas(),
      carregarRankingOticas(),
      carregarPerformanceVendedores(),
    ]);
  }, [carregarMetricas, carregarRankingOticas, carregarPerformanceVendedores]);

  // ================================================================
  // FILTERS & SEARCH
  // ================================================================
  useEffect(() => {
    let result = lotes;

    if (statusFilter !== 'ALL') {
      result = result.filter(l => l.status === statusFilter);
    }

    if (searchTerm) {
      result = result.filter(l =>
        l.numeroLote.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.relatorios.some(r =>
          r.usuario?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    setFilteredLotes(result);
  }, [lotes, statusFilter, searchTerm]);

  // ================================================================
  // INITIAL LOAD - Agora automático via SWR hooks
  // ================================================================
  // ✅ useEffect removido - SWR busca automaticamente no mount

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="flex-1 space-y-8 pb-8">
      {/* HEADER MAGISTRAL */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl p-8 md:p-10
                   bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-transparent
                   border border-emerald-500/20 backdrop-blur-sm"
      >
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -z-10" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="hidden sm:flex items-center justify-center w-20 h-20 rounded-2xl
                         bg-gradient-to-br from-emerald-500 to-green-600
                         shadow-lg shadow-emerald-500/30"
            >
              <Wallet className="w-10 h-10 text-white" />
            </motion.div>

            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="flex items-center gap-3"
              >
                <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                  Central <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-green-600">Financeira</span>
                </h1>
                <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl"
              >
                Gestão inteligente de pagamentos em lote para vendedores e gerentes
              </motion.p>
            </div>
          </div>

          {/* Navigation Pills */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="hidden lg:flex gap-2"
          >
            <NavPill
              active={activeView === 'dashboard'}
              onClick={() => setActiveView('dashboard')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Dashboard"
            />
            <NavPill
              active={activeView === 'lotes'}
              onClick={() => setActiveView('lotes')}
              icon={<Receipt className="w-4 h-4" />}
              label="Pagamentos"
            />
            <NavPill
              active={activeView === 'auditoria'}
              onClick={() => setActiveView('auditoria')}
              icon={<Shield className="w-4 h-4" />}
              label="Auditoria"
            />
            <NavPill
              active={activeView === 'relatorios'}
              onClick={() => setActiveView('relatorios')}
              icon={<Target className="w-4 h-4" />}
              label="Relatórios"
            />
          </motion.div>
        </div>
      </motion.div>

      {/* MAIN CONTENT AREA */}
      <AnimatePresence mode="wait">

        {/* DASHBOARD VIEW */}
        {activeView === 'dashboard' && (
          <DashboardView
            stats={dashboardStats}
            loading={loadingDashboard}
            percentualMesAnterior={percentualMesAnterior}
            lotes={lotes}
          />
        )}

        {/* LOTES VIEW (HYBRID) */}
        {activeView === 'lotes' && (
          <LotesView
            // Props de Estado
            lotes={filteredLotes}
            loadingAction={loadingAction}
            loadingLotes={loadingLotes}
            viewMode={viewMode}
            // Props de Preview
            usuariosPreview={usuariosPreview}
            valorTotalDisponivel={valorTotalDisponivelPreview}
            valorTotalReservado={valorTotalReservadoPreview}
            // Props de Filtro
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dataFim={dataFim}
            setDataFim={setDataFim}
            // Props de Ação
            handleVisualizarSaldos={handleVisualizarSaldos}
            handleGerarLote={handleGerarLote}
            handleVoltarParaLista={handleVoltarParaLista}
            handleProcessarLote={handleProcessarLote}
            handleCancelarLote={handleCancelarLote}
            handleExportarExcel={handleExportarExcel}
            handleExportarExcelDetalhado={handleExportarExcelDetalhado}
            carregarLotes={revalidarLotes}
          />
        )}

        {/* AUDITORIA VIEW */}
        {activeView === 'auditoria' && (
          <AuditoriaView
            activeView={activeView}
            auditorias={auditorias}
            loadingAuditoria={loadingAuditoria}
            paginacaoAuditoria={paginacaoAuditoria}
            filtrosAuditoria={filtrosAuditoria}
            setPaginacaoAuditoria={setPaginacaoAuditoria}
            setFiltrosAuditoria={setFiltrosAuditoria}
            carregarAuditoria={carregarAuditoria}
          />
        )}

        {/* RELATÓRIOS VIEW */}
        {activeView === 'relatorios' && (
          <RelatoriosView
            activeView={activeView}
            metricas={metricas}
            rankingOticas={rankingOticas}
            performanceVendedores={performanceVendedores}
            loadingRelatorios={loadingRelatorios}
            campanhas={campanhas}
            filtrosRelatorios={filtrosRelatorios}
            setFiltrosRelatorios={setFiltrosRelatorios}
            carregarCampanhas={carregarCampanhas}
            carregarTodosRelatorios={carregarTodosRelatorios}
          />
        )}

      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface NavPillProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavPill: React.FC<NavPillProps> = ({ active, onClick, icon, label }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${active
      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30'
      : 'bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
      }`}
  >
    {icon}
    <span className="hidden xl:inline">{label}</span>
  </motion.button>
);

// --- DASHBOARD VIEW ---
const DashboardView: React.FC<any> = ({ stats, loading, percentualMesAnterior, lotes }) => {
  // Prepare data for charts
  const chartData = useMemo(() => {
    if (!lotes || lotes.length === 0) return [];

    const today = new Date();
    const sixMonthsAgo = subMonths(today, 5);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: today });

    return months.map(month => {
      const monthStr = format(month, 'MMM', { locale: ptBR });
      const monthKey = format(month, 'yyyy-MM');

      const total = lotes
        .filter((l: Lote) => l.status === 'PAGO' && l.criadoEm.startsWith(monthKey))
        .reduce((acc: number, l: Lote) => acc + l.valorTotal, 0);

      return { name: monthStr, total };
    });
  }, [lotes]);

  const pieData = useMemo(() => {
    if (!lotes) return [];
    let vendedor = 0;
    let gerente = 0;

    lotes.forEach((l: Lote) => {
      if (l.status === 'PAGO') {
        l.relatorios.forEach((r: any) => {
          const valor = Number(r.valor || 0);
          if (r.tipo === 'VENDEDOR') vendedor += valor;
          else if (r.tipo === 'GERENTE') gerente += valor;
        });
      }
    });

    return [
      { name: 'Vendedores', value: vendedor },
      { name: 'Gerentes', value: gerente },
    ];
  }, [lotes]);

  const COLORS = ['#10B981', '#3B82F6'];

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Pago Mês Atual"
          value={`R$ ${stats.totalPagoMesAtual.toFixed(2)}`}
          trend={percentualMesAnterior}
          icon={<DollarSign className="w-6 h-6" />}
          color="emerald"
        />
        <KPICard
          title="Volume de Lotes"
          value={stats.volumeLotes.toString()}
          icon={<FileText className="w-6 h-6" />}
          color="blue"
        />
        <KPICard
          title="Ticket Médio"
          value={`R$ ${stats.ticketMedio.toFixed(2)}`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="purple"
        />
        <KPICard
          title="Lotes Pendentes"
          value={stats.pendentes.toString()}
          icon={<Clock className="w-6 h-6" />}
          color="orange"
          alert={stats.pendentes > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Volume de Pagamentos (Últimos 6 meses)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(value) => `R$${value / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Total Pago']}
                />
                <Area type="monotone" dataKey="total" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Distribuição
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium">Vendedores</span>
              </div>
              <span className="font-bold">R$ {pieData[0]?.value.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm font-medium">Gerentes</span>
              </div>
              <span className="font-bold">R$ {pieData[1]?.value.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Saldo Disponível"
          value={`R$ ${stats.saldoDisponivel.toFixed(2)}`}
          subtitle="Pronto para gerar lote"
          icon={<Wallet className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Saldo Reservado"
          value={`R$ ${stats.saldoReservado.toFixed(2)}`}
          subtitle="Em lotes pendentes"
          icon={<Lock className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="Usuários Ativos"
          value={stats.usuariosAtivos.toString()}
          subtitle="Com saldo > 0"
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
      </div>
    </motion.div>
  );
};

// --- LOTES VIEW (HYBRID) ---
interface LotesViewProps {
  lotes: Lote[];
  loadingAction: boolean;
  loadingLotes: boolean;
  viewMode: 'list' | 'preview';
  usuariosPreview: Usuario[];
  valorTotalDisponivel: number;
  valorTotalReservado: number;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  statusFilter: 'ALL' | 'PENDENTE' | 'PAGO';
  setStatusFilter: Dispatch<SetStateAction<'ALL' | 'PENDENTE' | 'PAGO'>>;
  dataFim: string;
  setDataFim: Dispatch<SetStateAction<string>>;
  handleVisualizarSaldos: () => void;
  handleGerarLote: () => void;
  handleVoltarParaLista: () => void;
  handleProcessarLote: (id: string) => void;
  handleCancelarLote: (id: string) => void;
  handleExportarExcel: (id: string) => void;
  handleExportarExcelDetalhado: (id: string) => void;
  carregarLotes: () => void;
}

const LotesView: React.FC<LotesViewProps> = (props) => (
  <motion.div
    key="lotes"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.4 }}
    className="space-y-6"
  >
    {/* CONTROLS CARD (Only in list mode or header of preview) */}
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="space-y-4">
        {props.viewMode === 'list' && (
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número de lote ou nome..."
                value={props.searchTerm}
                onChange={(e) => props.setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <select
              value={props.statusFilter}
              onChange={(e) => props.setStatusFilter(e.target.value as 'ALL' | 'PENDENTE' | 'PAGO')}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Todos os status</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="PAGO">Pagos</option>
            </select>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-end">
          {props.viewMode === 'list' ? (
            <>
              <div className="flex-1 w-full">
                <label className="text-xs text-muted-foreground ml-1 mb-1 block">Data de Corte</label>
                <input
                  type="date"
                  value={props.dataFim}
                  onChange={(e) => props.setDataFim(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={props.handleVisualizarSaldos}
                  disabled={props.loadingAction}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold shadow-lg"
                >
                  {props.loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  Visualizar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={props.carregarLotes}
                  disabled={props.loadingLotes}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${props.loadingLotes ? 'animate-spin' : ''}`} />
                </motion.button>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center w-full">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-500" />
                Preview de Lote
              </h3>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={props.handleVoltarParaLista}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={props.handleGerarLote}
                  disabled={props.loadingAction}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl shadow-lg flex items-center gap-2 font-bold"
                >
                  {props.loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Confirmar e Gerar
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* CONTENT: PREVIEW OR LIST */}
    <AnimatePresence mode="wait">
      {props.viewMode === 'preview' ? (
        <PreviewContent
          usuarios={props.usuariosPreview}
          valorTotalDisponivel={props.valorTotalDisponivel}
          valorTotalReservado={props.valorTotalReservado}
        />
      ) : (
        <LotesList
          lotes={props.lotes}
          handleProcessarLote={props.handleProcessarLote}
          handleCancelarLote={props.handleCancelarLote}
          handleExportarExcel={props.handleExportarExcel}
          handleExportarExcelDetalhado={props.handleExportarExcelDetalhado}
          loadingAction={props.loadingAction}
          loadingLotes={props.loadingLotes}
        />
      )}
    </AnimatePresence>
  </motion.div>
);

// --- PREVIEW CONTENT (FROM V1) ---
const PreviewContent: React.FC<any> = ({ usuarios, valorTotalDisponivel, valorTotalReservado }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-6"
  >
    {/* Resumo Financeiro do Preview */}
    <motion.div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-4">
          <div>
            <p className="text-emerald-100 text-sm font-medium mb-1">Valor Total</p>
            <p className="text-4xl font-black">
              R$ {(valorTotalDisponivel + valorTotalReservado).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>

    {/* Lista de Usuários do Preview */}
    <div className="space-y-4">
      {usuarios.map((usuario: Usuario, index: number) => (
        <motion.div
          key={usuario.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 * index }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                {usuario.nome.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-lg">{usuario.nome}</h4>
                  <Badge variant="secondary" className="text-xs">{usuario.papel}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{usuario.email}</p>
                {usuario.optica && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> {usuario.optica.nome}</p>}
              </div>
            </div>

            <div className="text-right space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Disponível</p>
                <p className="text-2xl font-black text-emerald-600">R$ {Number(usuario.saldoPontos).toFixed(2)}</p>
              </div>
              {usuario.saldoReservado > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded border border-yellow-200 dark:border-yellow-800 flex items-center gap-2 justify-end">
                  <Lock className="w-3 h-3 text-yellow-600" />
                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">R$ {Number(usuario.saldoReservado).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
      {usuarios.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum usuário com saldo para a data selecionada.</p>
        </div>
      )}
    </div>
  </motion.div>
);

// --- LIST OF LOTES (FROM V2) ---
interface LotesListProps {
  lotes: Lote[];
  handleProcessarLote: (id: string) => void;
  handleCancelarLote: (id: string) => void;
  handleExportarExcel: (id: string) => void;
  handleExportarExcelDetalhado: (id: string) => void;
  loadingAction: boolean;
  loadingLotes: boolean;
}

const LotesList: React.FC<LotesListProps> = ({
  lotes,
  handleProcessarLote,
  handleCancelarLote,
  handleExportarExcel,
  handleExportarExcelDetalhado,
  loadingAction,
  loadingLotes,
}) => {
  if (loadingLotes) return <LoadingState />;
  if (lotes.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      {lotes.map((lote: Lote, index: number) => (
        <LoteCard
          key={lote.numeroLote}
          lote={lote}
          index={index}
          onProcessar={handleProcessarLote}
          onCancelar={handleCancelarLote}
          onExportar={handleExportarExcel}
          onExportarDetalhado={handleExportarExcelDetalhado}
          isActionLoading={loadingAction}
        />
      ))}
    </div>
  );
};

const LoadingState = () => (
  <motion.div
    initial={{ opacity: 0.4 }}
    animate={{ opacity: 1 }}
    transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1.2 }}
    className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700"
  >
    <Loader2 className="w-10 h-10 mx-auto mb-4 text-emerald-500 animate-spin" />
    <p className="text-muted-foreground">Carregando lotes financeiros...</p>
  </motion.div>
);

const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-700"
  >
    <FileText className="w-20 h-20 text-gray-400 mx-auto mb-4" />
    <h3 className="text-xl font-bold text-foreground mb-2">Nenhum lote encontrado</h3>
    <p className="text-muted-foreground max-w-md mx-auto">
      Use os filtros acima ou gere um novo lote de pagamento após visualizar saldos.
    </p>
  </motion.div>
);

interface LoteCardProps {
  lote: Lote;
  index: number;
  onProcessar: (id: string) => void;
  onCancelar: (id: string) => void;
  onExportar: (id: string) => void;
  onExportarDetalhado: (id: string) => void;
  isActionLoading: boolean;
}

const LoteCard: React.FC<LoteCardProps> = ({ lote, index, onProcessar, onCancelar, onExportar, onExportarDetalhado, isActionLoading }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 * index, duration: 0.4 }}
    className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl hover:border-emerald-500/50 transition-all duration-300"
  >
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${lote.status === 'PENDENTE' ? 'bg-yellow-500' : 'bg-emerald-500'}`}>
            {lote.status === 'PENDENTE' ? <Clock className="w-6 h-6 text-white" /> : <CheckCircle className="w-6 h-6 text-white" />}
          </div>
          <div>
            <h3 className="text-xl font-bold">{lote.numeroLote}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={lote.status === 'PENDENTE' ? 'outline' : 'default'} className={lote.status === 'PENDENTE' ? 'text-yellow-600 border-yellow-600' : ''}>
                {lote.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(lote.criadoEm), "dd/MM/yyyy 'às' HH:mm")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {lote.status === 'PENDENTE' && (
            <>
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => onProcessar(lote.numeroLote)} disabled={isActionLoading} className="px-3 py-2 bg-emerald-500 text-white rounded-lg flex items-center gap-1 text-sm font-medium disabled:opacity-60">
                <CheckCircle className="w-4 h-4" /> Processar
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => onCancelar(lote.numeroLote)} disabled={isActionLoading} className="px-3 py-2 bg-red-500 text-white rounded-lg flex items-center gap-1 text-sm font-medium disabled:opacity-60">
                <Trash2 className="w-4 h-4" /> Cancelar
              </motion.button>
            </>
          )}
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => onExportar(lote.numeroLote)} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center gap-1 text-sm">
            <Download className="w-4 h-4" /> Resumo
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => onExportarDetalhado(lote.numeroLote)} className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center gap-1 text-sm">
            <FileDown className="w-4 h-4" /> Detalhado
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
          <Users className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-sm text-muted-foreground">Usuários</p>
          <p className="text-xl font-bold">{lote.totalRelatorios}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl">
          <DollarSign className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-sm text-muted-foreground">Valor Total</p>
          <p className="text-xl font-bold">R$ {lote.valorTotal.toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
          <Calendar className="w-5 h-5 text-purple-600 mb-2" />
          <p className="text-sm text-muted-foreground">Data de Corte</p>
          <p className="text-xl font-bold">{format(new Date(lote.dataCorte), 'dd/MM/yy')}</p>
        </div>
      </div>
    </div>
  </motion.div>
);

// --- UI COMPONENTS ---
const KPICard: React.FC<any> = ({ title, value, trend, icon, color, alert }) => {
  const colorClasses: any = {
    emerald: 'from-emerald-500 to-green-600 border-emerald-200',
    blue: 'from-blue-500 to-blue-600 border-blue-200',
    purple: 'from-purple-500 to-purple-600 border-purple-200',
    orange: 'from-orange-500 to-orange-600 border-orange-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className={`bg-white dark:bg-gray-800 rounded-2xl p-6 border ${alert ? 'border-orange-500' : 'border-gray-200 dark:border-gray-700'} shadow-lg hover:shadow-xl transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white`}>{icon}</div>
      </div>
      <p className="text-3xl font-black text-foreground mb-2">{value}</p>
      {trend !== undefined && trend !== 0 && (
        <div className={`flex items-center gap-1 text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {Math.abs(trend).toFixed(1)}% vs mês anterior
        </div>
      )}
    </motion.div>
  );
};

const StatCard: React.FC<any> = ({ title, value, subtitle, icon, color }) => {
  const colorClasses: any = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  };
  return (
    <div className={`rounded-2xl p-6 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-2xl font-black mb-1">{value}</p>
      <p className="text-xs opacity-80">{subtitle}</p>
    </div>
  );
};

interface AuditoriaViewProps {
  activeView: string;
  auditorias: AuditoriaFinanceira[];
  loadingAuditoria: boolean;
  paginacaoAuditoria: PaginacaoMeta;
  filtrosAuditoria: {
    acao?: AcaoFinanceira;
    numeroLote?: string;
    dataInicio?: string;
    dataFim?: string;
  };
  setPaginacaoAuditoria: Dispatch<SetStateAction<PaginacaoMeta>>;
  setFiltrosAuditoria: Dispatch<SetStateAction<{
    acao?: AcaoFinanceira;
    numeroLote?: string;
    dataInicio?: string;
    dataFim?: string;
  }>>;
  carregarAuditoria: () => Promise<void>;
}

const AuditoriaView: React.FC<AuditoriaViewProps> = ({
  activeView,
  auditorias,
  loadingAuditoria,
  paginacaoAuditoria,
  filtrosAuditoria,
  setPaginacaoAuditoria,
  setFiltrosAuditoria,
  carregarAuditoria,
}) => {
  // Carregar auditoria ao montar componente ou quando filtros mudarem
  useEffect(() => {
    if (activeView === 'auditoria') {
      carregarAuditoria();
    }
  }, [activeView, carregarAuditoria]);

  const handlePaginaChange = (novaPagina: number) => {
    setPaginacaoAuditoria(prev => ({ ...prev, pagina: novaPagina }));
  };

  const handleFiltroChange = (campo: string, valor: any) => {
    setFiltrosAuditoria(prev => ({ ...prev, [campo]: valor }));
    setPaginacaoAuditoria(prev => ({ ...prev, pagina: 1 })); // Resetar para página 1 ao filtrar
  };

  const acoesTraduzidas: Record<AcaoFinanceira, string> = {
    VISUALIZAR_SALDOS: 'Visualizar Saldos',
    GERAR_LOTE: 'Gerar Lote',
    PROCESSAR_LOTE: 'Processar Lote',
    CANCELAR_LOTE: 'Cancelar Lote',
    EXPORTAR_EXCEL: 'Exportar Excel',
    BUSCAR_LOTE: 'Buscar Lote',
    LISTAR_LOTES: 'Listar Lotes',
  };

  return (
    <motion.div
      key="auditoria"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-purple-500" />
          Filtros
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Ação</label>
            <select
              value={filtrosAuditoria.acao || ''}
              onChange={(e) => handleFiltroChange('acao', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <option value="">Todas</option>
              {Object.entries(acoesTraduzidas).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Nº Lote</label>
            <input
              type="text"
              value={filtrosAuditoria.numeroLote || ''}
              onChange={(e) => handleFiltroChange('numeroLote', e.target.value || undefined)}
              placeholder="Ex: LOTE-2025-11-001"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Data Início</label>
            <input
              type="date"
              value={filtrosAuditoria.dataInicio || ''}
              onChange={(e) => handleFiltroChange('dataInicio', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Data Fim</label>
            <input
              type="date"
              value={filtrosAuditoria.dataFim || ''}
              onChange={(e) => handleFiltroChange('dataFim', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Timeline de Auditoria */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-500" />
            Auditoria Financeira
            {!loadingAuditoria && (
              <span className="text-sm text-muted-foreground font-normal">
                ({paginacaoAuditoria.total} registro{paginacaoAuditoria.total !== 1 ? 's' : ''})
              </span>
            )}
          </h3>
          <button
            onClick={carregarAuditoria}
            disabled={loadingAuditoria}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loadingAuditoria ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {loadingAuditoria ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : auditorias.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="font-medium mb-2">Nenhum registro de auditoria encontrado</p>
            <p className="text-sm">
              {filtrosAuditoria.dataInicio || filtrosAuditoria.dataFim || filtrosAuditoria.acao || filtrosAuditoria.numeroLote
                ? 'Tente ajustar os filtros para ver mais resultados'
                : 'As ações financeiras aparecerão aqui automaticamente'}
            </p>
          </div>
        ) : (
          <>
            <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-8 py-4">
              {auditorias.map((auditoria, index) => (
                <motion.div
                  key={auditoria.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative pl-8"
                >
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-500 border-4 border-white dark:border-gray-800" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                      {acoesTraduzidas[auditoria.acao] || auditoria.acao}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(auditoria.criadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {auditoria.numeroLote && (
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      Lote: {auditoria.numeroLote}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Por: {auditoria.admin.nome} ({auditoria.admin.email})
                  </p>
                  {auditoria.metadata && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-purple-500 hover:text-purple-600">
                        Ver detalhes
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto">
                        {JSON.stringify(auditoria.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Paginação */}
            {paginacaoAuditoria.totalPaginas > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handlePaginaChange(paginacaoAuditoria.pagina - 1)}
                  disabled={paginacaoAuditoria.pagina === 1}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-muted-foreground">
                  Página {paginacaoAuditoria.pagina} de {paginacaoAuditoria.totalPaginas}
                </span>
                <button
                  onClick={() => handlePaginaChange(paginacaoAuditoria.pagina + 1)}
                  disabled={paginacaoAuditoria.pagina === paginacaoAuditoria.totalPaginas}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

interface RelatoriosViewProps {
  activeView: string;
  metricas: MetricasRelatorio | null;
  rankingOticas: RankingOtica[];
  performanceVendedores: PerformanceVendedor[];
  loadingRelatorios: boolean;
  campanhas: Campanha[];
  filtrosRelatorios: {
    dataInicio?: string;
    dataFim?: string;
    campanhaId?: string;
  };
  setFiltrosRelatorios: Dispatch<SetStateAction<{
    dataInicio?: string;
    dataFim?: string;
    campanhaId?: string;
  }>>;
  carregarCampanhas: () => Promise<void>;
  carregarTodosRelatorios: () => Promise<void>;
}

const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  activeView,
  metricas,
  rankingOticas,
  performanceVendedores,
  loadingRelatorios,
  campanhas,
  filtrosRelatorios,
  setFiltrosRelatorios,
  carregarCampanhas,
  carregarTodosRelatorios,
}) => {
  // Carregar dados ao montar componente ou quando filtros mudarem
  useEffect(() => {
    if (activeView === 'relatorios') {
      carregarCampanhas();
      carregarTodosRelatorios();
    }
  }, [activeView, carregarTodosRelatorios, carregarCampanhas]);

  const handleFiltroRelatorioChange = (campo: string, valor: any) => {
    setFiltrosRelatorios(prev => ({ ...prev, [campo]: valor }));
  };

  const handleAplicarFiltros = () => {
    carregarTodosRelatorios();
  };

  const handleImprimirRelatorio = () => {
    window.print();
  };

  // Preparar dados para o gráfico de evolução temporal
  const dadosGraficoEvolucao = useMemo(() => {
    if (!metricas?.evolucaoTemporal) return [];
    
    return metricas.evolucaoTemporal.map(item => ({
      mes: format(parseISO(`${item.mes}-01`), 'MMM/yy', { locale: ptBR }),
      valor: item.total,
    }));
  }, [metricas]);

  return (
    <motion.div
      key="relatorios"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg no-print">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-500" />
          Filtros de Período
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Data Início</label>
            <input
              type="date"
              value={filtrosRelatorios.dataInicio || ''}
              onChange={(e) => handleFiltroRelatorioChange('dataInicio', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Data Fim</label>
            <input
              type="date"
              value={filtrosRelatorios.dataFim || ''}
              onChange={(e) => handleFiltroRelatorioChange('dataFim', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Campanha</label>
            <select
              value={filtrosRelatorios.campanhaId || ''}
              onChange={(e) => handleFiltroRelatorioChange('campanhaId', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <option value="">Todas as Campanhas</option>
              {campanhas.map((campanha) => (
                <option key={campanha.id} value={campanha.id}>
                  {campanha.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleAplicarFiltros}
              disabled={loadingRelatorios}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingRelatorios ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Atualizar
            </button>
            <button
              onClick={handleImprimirRelatorio}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center gap-2"
              title="Imprimir/Exportar PDF"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {loadingRelatorios ? (
        <div className="flex items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Seção 1: KPIs e Métricas Gerais */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-500" />
              Métricas Gerais
            </h3>
            
            {metricas ? (
              <>
                {/* Cards de KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Pago</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                      R$ {metricas.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Lotes Pagos</span>
                    </div>
                    <p className="text-2xl font-black text-blue-900 dark:text-blue-100">
                      {metricas.totalLotesPagos}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {metricas.totalLotesPendentes} pendentes
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Ticket Médio</span>
                    </div>
                    <p className="text-2xl font-black text-purple-900 dark:text-purple-100">
                      R$ {metricas.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Usuários Pagos</span>
                    </div>
                    <p className="text-2xl font-black text-orange-900 dark:text-orange-100">
                      {metricas.usuariosUnicosPagos}
                    </p>
                  </div>
                </div>

                {/* Gráfico de Evolução Temporal */}
                {dadosGraficoEvolucao.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-lg font-bold mb-4">Evolução Temporal (Últimos 6 Meses)</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={dadosGraficoEvolucao}>
                        <defs>
                          <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="mes" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="valor"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorValor)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado disponível para o período selecionado
              </div>
            )}
          </div>

          {/* Seção 2: Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ranking de Óticas */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-500" />
                Top 10 Óticas (Volume Pago)
              </h3>
              {rankingOticas.length > 0 ? (
                <div className="space-y-3">
                  {rankingOticas.map((item, index) => (
                    <motion.div
                      key={item.optica.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-orange-600' :
                          'bg-blue-500'
                        }`}>
                          {item.posicao}
                        </div>
                        <div>
                          <p className="font-bold">{item.optica.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.optica.cidade}/{item.optica.estado} • {item.numeroPagamentos} pagamentos
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-lg">
                        R$ {item.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma ótica encontrada no período
                </div>
              )}
            </div>

            {/* Performance de Vendedores */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-orange-500" />
                Top 20 Vendedores (Valor Recebido)
              </h3>
              {performanceVendedores.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {performanceVendedores.map((item, index) => (
                    <motion.div
                      key={item.vendedor.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 text-white flex items-center justify-center font-bold text-sm">
                          {item.posicao}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{item.vendedor.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.vendedor.optica?.nome || 'Sem ótica'} • {item.numeroPagamentos} pag.
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-sm">
                        R$ {item.totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum vendedor encontrado no período
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};