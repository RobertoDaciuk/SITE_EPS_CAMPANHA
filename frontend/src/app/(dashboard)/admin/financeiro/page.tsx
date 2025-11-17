'use client';

/**
 * ============================================================================
 * PÁGINA: FINANCEIRO - SISTEMA DE LOTES DE PAGAMENTO V2.0 (Design Premium)
 * ============================================================================
 *
 * Interface de 3 fases para gestão de pagamentos:
 * 
 * FASE 1: PREVIEW/VISUALIZAÇÃO
 * - Listar vendedores/gerentes com saldo > 0
 * - Filtrar por data, papel, ótica
 * - Visualizar totais sem modificar dados
 * - Exportar Excel da prévia
 *
 * FASE 2: GERAÇÃO DE LOTE
 * - Criar lote de pagamento com status PENDENTE
 * - Revisar dados antes de processar
 * - Possibilidade de cancelar
 *
 * FASE 3: PROCESSAMENTO
 * - Processar lote em transação atômica
 * - Subtrai saldos e marca envios como liquidados
 * - Notifica usuários
 * - Exporta comprovante Excel
 *
 * Design Premium:
 * - Animações Framer Motion suaves
 * - Glassmorphism e gradientes modernos
 * - Layout responsivo perfeito
 * - Feedback visual rico com toast notifications
 * - UX inspirada em /perfil e /validacao
 *
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  FileDown,
  CheckCircle,
  XCircle,
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
  Lock // ✅ M2: Ícone para saldo reservado
} from 'lucide-react';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf: string | null;
  whatsapp: string | null;
  papel: string;
  saldoPontos: number;
  saldoReservado: number; // ✅ M2: Saldo reservado em lotes PENDENTES
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

export default function FinanceiroPage() {
  const [fase, setFase] = useState<'preview' | 'lotes'>('lotes');
  const [loading, setLoading] = useState(false);
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Estado FASE 1: Preview
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [valorTotalDisponivel, setValorTotalDisponivel] = useState(0); // ✅ M2: Saldo disponível
  const [valorTotalReservado, setValorTotalReservado] = useState(0);   // ✅ M2: Saldo reservado
  
  // Estado FASE 2/3: Lotes
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loteAtual, setLoteAtual] = useState<Lote | null>(null);

  /**
   * ========================================================================
   * FASE 1: VISUALIZAR SALDOS (Preview)
   * ========================================================================
   */
  const handleVisualizarSaldos = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/financeiro/saldos', {
        params: { dataFim: new Date(dataFim).toISOString() },
      });

      setUsuarios(response.data.usuarios);
      setValorTotalDisponivel(response.data.valorTotalDisponivel || 0); // ✅ M2
      setValorTotalReservado(response.data.valorTotalReservado || 0);   // ✅ M2
      setFase('preview');

      toast.success(
        `${response.data.totalUsuarios} usuários com saldo encontrados`,
        {
          icon: '💰',
          duration: 4000,
        }
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao visualizar saldos');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ========================================================================
   * FASE 2: GERAR LOTE DE PAGAMENTO
   * ========================================================================
   */
  const handleGerarLote = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/financeiro/lotes', {
        dataCorte: new Date(dataFim).toISOString(),
        observacoes: `Lote gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      });

      toast.success(
        `Lote ${response.data.numeroLote} criado com sucesso!`,
        {
          icon: '✅',
          duration: 5000,
        }
      );
      
      await carregarLotes();
      setFase('lotes');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao gerar lote');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ========================================================================
   * LISTAR LOTES
   * ========================================================================
   */
  const carregarLotes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/financeiro/lotes');
      setLotes(response.data);
    } catch (error: any) {
      toast.error('Erro ao carregar lotes');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ========================================================================
   * FASE 3: PROCESSAR LOTE
   * ========================================================================
   */
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
      setLoading(true);
      const response = await axios.patch(`/financeiro/lotes/${numeroLote}/processar`, {
        observacoes: `Processado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      });

      toast.success(
        `Lote processado! ${response.data.totalProcessado} pagamentos efetuados.`,
        {
          icon: '🎉',
          duration: 6000,
        }
      );
      
      await carregarLotes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao processar lote');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ========================================================================
   * CANCELAR LOTE (apenas PENDENTE)
   * ========================================================================
   */
  const handleCancelarLote = async (numeroLote: string) => {
    const confirmacao = window.confirm(
      `Confirma o cancelamento do lote ${numeroLote}?\n\nTodos os relatórios serão removidos.`
    );

    if (!confirmacao) return;

    try {
      setLoading(true);
      await axios.delete(`/financeiro/lotes/${numeroLote}`);
      
      toast.success('Lote cancelado com sucesso', {
        icon: '🗑️',
      });
      
      await carregarLotes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao cancelar lote');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ========================================================================
   * EXPORTAR EXCEL
   * ========================================================================
   */
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

      toast.success('Excel exportado com sucesso', {
        id: 'excel-export',
        icon: '📊',
        duration: 3000,
      });
    } catch (error: any) {
      toast.error('Erro ao exportar Excel', { id: 'excel-export' });
    }
  };

  /**
   * ========================================================================
   * EFFECTS
   * ========================================================================
   */
  useEffect(() => {
    carregarLotes();
  }, []);

  return (
    <div className="flex-1 space-y-8 pb-8">
      {/* ====================================================================
          CABEÇALHO PREMIUM
      ==================================================================== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl p-8 md:p-10
                   bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-transparent
                   border border-emerald-500/20 backdrop-blur-sm"
      >
        {/* Decoração de fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-500/10 rounded-full blur-3xl -z-10" />
        
        <div className="relative flex items-start gap-6">
          {/* Avatar/Ícone */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="hidden sm:flex items-center justify-center w-20 h-20 rounded-2xl
                       bg-gradient-to-br from-emerald-500 to-green-600
                       shadow-lg shadow-emerald-500/30"
          >
            <DollarSign className="w-10 h-10 text-white" />
          </motion.div>

          {/* Texto */}
          <div className="flex-1 space-y-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                Financeiro <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-green-600">Pagamentos</span>
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

          {/* Tabs de Navegação */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex gap-2"
          >
            <button
              onClick={() => setFase('lotes')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                fase === 'lotes'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Lotes
            </button>
            <button
              onClick={() => setFase('preview')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                fase === 'preview'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          </motion.div>
        </div>
      </motion.div>

      {/* ====================================================================
          CONTROLES DE DATA E AÇÕES
      ==================================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Filtros e Ações</h3>
            <p className="text-sm text-muted-foreground">
              Selecione a data de corte para visualizar saldos ou gerar lote
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="dataFim" className="block text-sm font-medium mb-2 text-foreground">
              Data de Corte
            </label>
            <input
              id="dataFim"
              type="date"
              value={dataFim}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDataFim(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                         transition-all duration-200"
            />
          </div>
          
          <div className="flex items-end gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleVisualizarSaldos}
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white 
                         rounded-xl hover:from-blue-600 hover:to-blue-700 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         flex items-center gap-2 font-semibold shadow-lg shadow-blue-500/30
                         transition-all duration-200"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              Visualizar
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGerarLote}
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white 
                         rounded-xl hover:from-emerald-600 hover:to-green-700 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         flex items-center gap-2 font-semibold shadow-lg shadow-emerald-500/30
                         transition-all duration-200"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Gerar Lote
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={carregarLotes}
              disabled={loading}
              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                         rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         flex items-center gap-2 font-medium
                         transition-all duration-200"
              title="Recarregar lotes"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ====================================================================
          FASE 1: PREVIEW DE SALDOS
      ==================================================================== */}
      <AnimatePresence mode="wait">
        {fase === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Card de Resumo - M2: Breakdown de saldos */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-4">
                  {/* Valor Total */}
                  <div>
                    <p className="text-emerald-100 text-sm font-medium mb-1">Valor Total</p>
                    <p className="text-4xl font-black">
                      R$ {(valorTotalDisponivel + valorTotalReservado).toFixed(2)}
                    </p>
                  </div>

                  {/* Breakdown */}
                  <div className="flex gap-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                      <p className="text-emerald-100 text-xs font-medium mb-0.5">Disponível</p>
                      <p className="text-xl font-bold">R$ {valorTotalDisponivel.toFixed(2)}</p>
                    </div>

                    {valorTotalReservado > 0 && (
                      <div className="bg-yellow-400/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-yellow-300/30">
                        <p className="text-yellow-100 text-xs font-medium mb-0.5 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Reservado
                        </p>
                        <p className="text-xl font-bold text-yellow-50">R$ {valorTotalReservado.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-emerald-100 text-sm font-medium">Total de Usuários</p>
                    <p className="text-3xl font-bold">{usuarios.length}</p>
                  </div>
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <TrendingUp className="w-10 h-10" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Lista de Usuários */}
            <div className="space-y-4">
              {usuarios.map((usuario, index) => (
                <motion.div
                  key={usuario.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 
                             hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 
                                      flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {usuario.nome.charAt(0)}
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-lg text-foreground">{usuario.nome}</h4>
                          <Badge 
                            variant={usuario.papel === 'VENDEDOR' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {usuario.papel}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">{usuario.email}</p>
                        
                        <div className="flex flex-wrap gap-2">
                          {usuario.cpf && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                              <CreditCard className="w-3 h-3" />
                              CPF: {usuario.cpf}
                            </div>
                          )}
                          {usuario.optica && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                              <Building2 className="w-3 h-3" />
                              {usuario.optica.nome}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Valor - M2: Mostrar saldo disponível e reservado */}
                    <div className="text-right space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Saldo Disponível</p>
                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                          R$ {Number(usuario.saldoPontos).toFixed(2)}
                        </p>
                      </div>

                      {/* Indicador de saldo reservado */}
                      {usuario.saldoReservado > 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-1 font-medium">
                              <Lock className="w-3 h-3" />
                              Reservado
                            </span>
                            <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                              R$ {Number(usuario.saldoReservado).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      {usuario.optica && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {usuario.optica.cidade}/{usuario.optica.estado}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {usuarios.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-700"
                >
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                    Nenhum usuário com saldo encontrado
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Clique em "Visualizar" para buscar saldos na data selecionada
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================
          FASE 2/3: LISTA DE LOTES
      ==================================================================== */}
      <AnimatePresence mode="wait">
        {fase === 'lotes' && (
          <motion.div
            key="lotes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {lotes.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-700"
              >
                <FileText className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Nenhum lote criado ainda</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Use o botão "Gerar Lote" para criar um novo lote de pagamento após visualizar os saldos disponíveis.
                </p>
              </motion.div>
            )}

            {lotes.map((lote, index) => (
              <motion.div
                key={lote.numeroLote}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.4 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden
                           hover:shadow-2xl hover:border-emerald-500/50 transition-all duration-300"
              >
                {/* Header do Lote */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl shadow-lg ${
                        lote.status === 'PENDENTE'
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                          : 'bg-gradient-to-br from-emerald-500 to-green-600'
                      }`}>
                        {lote.status === 'PENDENTE' ? (
                          <Clock className="w-6 h-6 text-white" />
                        ) : (
                          <CheckCircle className="w-6 h-6 text-white" />
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-black text-foreground flex items-center gap-3">
                          {lote.numeroLote}
                          <Badge 
                            variant={lote.status === 'PENDENTE' ? 'outline' : 'default'}
                            className={`text-xs ${
                              lote.status === 'PENDENTE'
                                ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                                : 'bg-emerald-500 text-white'
                            }`}
                          >
                            {lote.status === 'PENDENTE' ? '⏳ PENDENTE' : '✅ PAGO'}
                          </Badge>
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Criado em {format(new Date(lote.criadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {lote.dataPagamento && (
                            <> • Processado em {format(new Date(lote.dataPagamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2">
                      {lote.status === 'PENDENTE' && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleProcessarLote(lote.numeroLote)}
                            disabled={loading}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm rounded-xl 
                                       hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed 
                                       flex items-center gap-2 font-semibold shadow-lg shadow-emerald-500/30"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Processar
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCancelarLote(lote.numeroLote)}
                            disabled={loading}
                            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm rounded-xl 
                                       hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed 
                                       flex items-center gap-2 font-semibold shadow-lg shadow-red-500/30"
                          >
                            <Trash2 className="w-4 h-4" />
                            Cancelar
                          </motion.button>
                        </>
                      )}
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleExportarExcel(lote.numeroLote)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-xl 
                                   hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 font-medium
                                   transition-all duration-200"
                      >
                        <Download className="w-4 h-4" />
                        Excel
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Stats do Lote */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Usuários */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
                    >
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total de Usuários</p>
                        <p className="text-2xl font-black text-blue-900 dark:text-blue-100">{lote.totalRelatorios}</p>
                      </div>
                    </motion.div>

                    {/* Valor Total */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800"
                    >
                      <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Valor Total</p>
                        <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                          R$ {lote.valorTotal.toFixed(2)}
                        </p>
                      </div>
                    </motion.div>

                    {/* Data de Corte */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800"
                    >
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Data de Corte</p>
                        <p className="text-xl font-black text-purple-900 dark:text-purple-100">
                          {format(new Date(lote.dataCorte), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
