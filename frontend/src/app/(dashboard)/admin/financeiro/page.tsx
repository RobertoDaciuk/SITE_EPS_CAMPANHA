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
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
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
// MAIN COMPONENT
// ============================================================================

export default function FinanceiroPage() {
  // ================================================================
  // STATE MANAGEMENT
  // ================================================================
  const [activeView, setActiveView] = useState<'dashboard' | 'lotes' | 'auditoria' | 'relatorios'>('dashboard');
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Dashboard State
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalPagoMesAtual: 0,
    totalPagoMesAnterior: 0,
    volumeLotes: 0,
    ticketMedio: 0,
    saldoDisponivel: 0,
    saldoReservado: 0,
    usuariosAtivos: 0,
    pendentes: 0,
  });

  // Lotes State
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [filteredLotes, setFilteredLotes] = useState<Lote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDENTE' | 'PAGO'>('ALL');

  // Preview State (Lógica do V1 integrada)
  const [usuariosPreview, setUsuariosPreview] = useState<Usuario[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'preview'>('list'); // Controla se estamos vendo lista de lotes ou preview de saldos
  const [valorTotalDisponivelPreview, setValorTotalDisponivelPreview] = useState(0);
  const [valorTotalReservadoPreview, setValorTotalReservadoPreview] = useState(0);

  // ================================================================
  // COMPUTED VALUES
  // ================================================================
  const percentualMesAnterior = useMemo(() => {
    if (dashboardStats.totalPagoMesAnterior === 0) return 0;
    return ((dashboardStats.totalPagoMesAtual - dashboardStats.totalPagoMesAnterior) / dashboardStats.totalPagoMesAnterior) * 100;
  }, [dashboardStats.totalPagoMesAtual, dashboardStats.totalPagoMesAnterior]);

  // ================================================================
  // API CALLS
  // ================================================================
  const carregarDashboardStats = useCallback(async () => {
    try {
  setLoadingDashboard(true);
      
      const inicioMesAtual = startOfMonth(new Date());
      const fimMesAtual = endOfMonth(new Date());
      const inicioMesAnterior = startOfMonth(subMonths(new Date(), 1));
      const fimMesAnterior = endOfMonth(subMonths(new Date(), 1));

      const [lotesResponse, saldosResponse] = await Promise.all([
        axios.get('/financeiro/lotes'),
        axios.get('/financeiro/saldos'),
      ]);

      const lotesData = lotesResponse.data?.lotes || lotesResponse.data;
      const todosLotes = Array.isArray(lotesData) ? lotesData : [];
      
      const lotesMesAtual = todosLotes.filter((l: Lote) => {
        const data = parseISO(l.criadoEm);
        return data >= inicioMesAtual && data <= fimMesAtual;
      });

      const lotesMesAnterior = todosLotes.filter((l: Lote) => {
        const data = parseISO(l.criadoEm);
        return data >= inicioMesAnterior && data <= fimMesAnterior;
      });

      const totalPagoMesAtual = lotesMesAtual
        .filter((l: Lote) => l.status === 'PAGO')
        .reduce((acc: number, l: Lote) => acc + l.valorTotal, 0);

      const totalPagoMesAnterior = lotesMesAnterior
        .filter((l: Lote) => l.status === 'PAGO')
        .reduce((acc: number, l: Lote) => acc + l.valorTotal, 0);

      const lotesPagos = todosLotes.filter((l: Lote) => l.status === 'PAGO');
      const ticketMedio = lotesPagos.length > 0
        ? lotesPagos.reduce((acc: number, l: Lote) => acc + l.valorTotal, 0) / lotesPagos.length
        : 0;

      const pendentes = todosLotes.filter((l: Lote) => l.status === 'PENDENTE').length;

      setDashboardStats({
        totalPagoMesAtual,
        totalPagoMesAnterior,
        volumeLotes: todosLotes.length,
        ticketMedio,
        saldoDisponivel: saldosResponse.data.valorTotalDisponivel || 0,
        saldoReservado: saldosResponse.data.valorTotalReservado || 0,
        usuariosAtivos: saldosResponse.data.totalUsuarios || 0,
        pendentes,
      });

    } catch (error: any) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar estatísticas do dashboard');
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  const carregarLotes = useCallback(async () => {
    try {
      setLoadingLotes(true);
      const response = await axios.get('/financeiro/lotes');
      const lotesData = response.data?.lotes || response.data;
      const lotesFinal = Array.isArray(lotesData) ? lotesData : [];
      setLotes(lotesFinal);
      setFilteredLotes(lotesFinal);
    } catch (error: any) {
      toast.error('Erro ao carregar lotes');
      setLotes([]);
      setFilteredLotes([]);
    } finally {
      setLoadingLotes(false);
    }
  }, []);

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
      await Promise.all([carregarLotes(), carregarDashboardStats()]);
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
      
      await Promise.all([carregarLotes(), carregarDashboardStats()]);
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
      await Promise.all([carregarLotes(), carregarDashboardStats()]);
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
  // INITIAL LOAD
  // ================================================================
  useEffect(() => {
    carregarDashboardStats();
    carregarLotes();
  }, [carregarDashboardStats, carregarLotes]);

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
            carregarLotes={carregarLotes}
          />
        )}

        {/* PLACEHOLDERS */}
        {activeView === 'auditoria' && <AuditoriaView />}
        {activeView === 'relatorios' && <RelatoriosView />}

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
    className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
      active
        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30'
        : 'bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
    }`}
  >
    {icon}
    <span className="hidden xl:inline">{label}</span>
  </motion.button>
);

// --- DASHBOARD VIEW ---
const DashboardView: React.FC<any> = ({ stats, loading, percentualMesAnterior }) => (
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

    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Gráficos de tendência em desenvolvimento</p>
          <p className="text-sm mt-2">Em breve: visualização temporal de pagamentos</p>
        </div>
      </div>
    </div>
  </motion.div>
);

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
          <div className="flex gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <p className="text-emerald-100 text-xs font-medium mb-0.5">Disponível</p>
              <p className="text-xl font-bold">R$ {valorTotalDisponivel.toFixed(2)}</p>
            </div>
            {valorTotalReservado > 0 && (
              <div className="bg-yellow-400/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-yellow-300/30">
                <p className="text-yellow-100 text-xs font-medium mb-0.5 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Reservado
                </p>
                <p className="text-xl font-bold text-yellow-50">R$ {valorTotalReservado.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-emerald-100 text-sm font-medium">Usuários</p>
          <p className="text-3xl font-bold">{usuarios.length}</p>
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
                  {usuario.optica && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Building2 className="w-3 h-3"/> {usuario.optica.nome}</p>}
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

const AuditoriaView = () => (
  <motion.div
    key="auditoria"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700"
  >
    <Shield className="w-20 h-20 text-gray-400 mx-auto mb-4" />
    <h3 className="text-2xl font-bold mb-2">Auditoria Financeira</h3>
    <p className="text-muted-foreground max-w-md mx-auto">Em desenvolvimento: Timeline de ações administrativas</p>
  </motion.div>
);

const RelatoriosView = () => (
  <motion.div
    key="relatorios"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700"
  >
    <Target className="w-20 h-20 text-gray-400 mx-auto mb-4" />
    <h3 className="text-2xl font-bold mb-2">Relatórios Gerenciais</h3>
    <p className="text-muted-foreground max-w-md mx-auto">Em desenvolvimento: Análises por ótica, rankings e comparativos</p>
  </motion.div>
);