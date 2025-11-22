'use client';

/**
 * ============================================================================
 * PÁGINA: Gerenciamento de Óticas (Admin)
 * ============================================================================
 *
 * Página protegida (apenas ADMIN) para gerenciamento completo de óticas.
 *
 * Features:
 * - Listagem de todas as óticas
 * - Filtros por nome, CNPJ, status
 * - Criação de novas óticas (modal)
 * - Edição de óticas existentes (modal)
 * - Desativar/Reativar óticas
 * - Proteção de rota (redirect se não for Admin)
 * - Estados de loading e vazios
 * - Responsivo (mobile-first)
 *
 * @module AdminOticasPage
 * ============================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/ContextoAutenticacao';
import { Plus, Search, Filter, Loader2, Building2, AlertCircle, FileUp, Sparkles } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import OticaListItem from '@/components/admin/oticas/OticaListItem';
import CriarEditarOticaModal from '@/components/admin/oticas/CriarEditarOticaModal';
import ImportarOticasModal from '@/components/admin/oticas/ImportarOticasModal';
import { useDebounce } from '@/hooks/useDebounce';

// ============================================================================
// INTERFACES
// ============================================================================

interface Optica {
  id: string;
  nome: string;
  cnpj: string;
  codigoOtica?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
  email?: string | null;
  ativa: boolean;
  ehMatriz: boolean;
  matrizId?: string | null;
  matriz?: {
    id: string;
    nome: string;
  } | null;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AdminOticasPage() {
  const router = useRouter();
  const { usuario, carregando: isAuthLoading } = useAuth();

  // ==========================================================================
  // ESTADOS
  // ==========================================================================

  const [oticas, setOticas] = useState<Optica[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImportarOpen, setModalImportarOpen] = useState(false);
  const [oticaSelecionada, setOticaSelecionada] = useState<Optica | null>(null);

  // Estados de Filtros
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroCnpj, setFiltroCnpj] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativa' | 'inativa'>('todos');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'matriz' | 'filial'>('todos');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce nos filtros de busca (reduz re-renders e chamadas ao useMemo)
  const filtroNomeDebounced = useDebounce(filtroNome, 500);
  const filtroCnpjDebounced = useDebounce(filtroCnpj, 500);

  // ==========================================================================
  // PROTEÇÃO DE ROTA
  // ==========================================================================

  useEffect(() => {
    if (!isAuthLoading && (!usuario || usuario.papel !== 'ADMIN')) {
      router.push('/');
      toast.error('Acesso negado: Apenas administradores');
    }
  }, [isAuthLoading, usuario, router]);

  // ==========================================================================
  // FETCH INICIAL
  // ==========================================================================

  useEffect(() => {
    if (usuario?.papel === 'ADMIN') {
      fetchOticas();
    }
  }, [usuario]);

  // ==========================================================================
  // FUNÇÃO: Buscar Óticas
  // ==========================================================================

  const fetchOticas = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/oticas');
      setOticas(response.data);
    } catch (error: any) {
      console.error('Erro ao buscar óticas:', error);
      toast.error('Erro ao carregar lista de óticas');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // HANDLERS: Modais
  // ==========================================================================

  const handleAbrirModalCriar = () => {
    setOticaSelecionada(null);
    setModalOpen(true);
  };

  const handleAbrirModalEditar = (otica: Optica) => {
    setOticaSelecionada(otica);
    setModalOpen(true);
  };

  const handleFecharModal = () => {
    setModalOpen(false);
    setOticaSelecionada(null);
  };

  const handleSucessoModal = () => {
    handleFecharModal();
    fetchOticas();
  };

  // ==========================================================================
  // HANDLER: Toggle Ativa/Inativa
  // ==========================================================================

  const handleToggleAtiva = async (id: string, novoStatus: boolean) => {
    const endpoint = novoStatus ? `/oticas/${id}/reativar` : `/oticas/${id}/desativar`;
    const acao = novoStatus ? 'reativar' : 'desativar';

    try {
      await toast.promise(api.patch(endpoint), {
        loading: `${novoStatus ? 'Reativando' : 'Desativando'} ótica...`,
        success: `Ótica ${novoStatus ? 'reativada' : 'desativada'} com sucesso!`,
        error: `Erro ao ${acao} ótica`,
      });

      fetchOticas();
    } catch (error: any) {
      console.error(`Erro ao ${acao} ótica:`, error);
    }
  };

  // ==========================================================================
  // FILTROS (Client-side)
  // ==========================================================================

  const oticasFiltradas = useMemo(() => {
    return oticas.filter((otica) => {
      // Filtro: Nome (debounced)
      if (
        filtroNomeDebounced &&
        !otica.nome.toLowerCase().includes(filtroNomeDebounced.toLowerCase())
      ) {
        return false;
      }

      // Filtro: CNPJ (debounced)
      if (
        filtroCnpjDebounced &&
        !otica.cnpj.includes(filtroCnpjDebounced.replace(/\D/g, ''))
      ) {
        return false;
      }

      // Filtro: Status
      if (filtroStatus === 'ativa' && !otica.ativa) return false;
      if (filtroStatus === 'inativa' && otica.ativa) return false;

      // Filtro: Tipo
      if (filtroTipo === 'matriz' && !otica.ehMatriz) return false;
      if (filtroTipo === 'filial' && otica.ehMatriz) return false;

      return true;
    });
  }, [oticas, filtroNomeDebounced, filtroCnpjDebounced, filtroStatus, filtroTipo]);

  // ==========================================================================
  // RENDER: Loading Inicial
  // ==========================================================================

  if (isAuthLoading || (isLoading && oticas.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Carregando óticas...</p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: Não é Admin
  // ==========================================================================

  if (!usuario || usuario.papel !== 'ADMIN') {
    return null;
  }

  // ==========================================================================
  // RENDER PRINCIPAL
  // ==========================================================================

  return (
    <div className="flex-1 space-y-8 pb-8">
      {/* Cabeçalho Premium */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl p-8 md:p-10
                   bg-gradient-to-br from-primary/10 via-primary/5 to-transparent
                   border border-primary/20 backdrop-blur-sm"
      >
        {/* Decoração de fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-light/10 rounded-full blur-3xl -z-10" />

        <div className="relative flex items-start gap-6">
          {/* Avatar/Ícone */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="hidden sm:flex items-center justify-center w-20 h-20 rounded-2xl
                       bg-gradient-to-br from-primary to-primary-light
                       shadow-lg shadow-primary/30"
          >
            <Building2 className="w-10 h-10 text-primary-foreground" />
          </motion.div>

          {/* Texto */}
          <div className="flex-1 space-y-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center gap-3 flex-wrap"
            >
              <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                Gerenciamento de <span className="text-gradient">Óticas</span>
              </h1>
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl"
            >
              Gerencie as óticas parceiras da plataforma de forma simples e eficiente
            </motion.p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            {/* Botões: Adicionar e Importar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setModalImportarOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:from-emerald-700 hover:to-teal-700 transition-all"
              >
                <FileUp className="h-5 w-5" />
                <span>Importar Novos Cadastros</span>
              </button>

              <button
                onClick={handleAbrirModalCriar}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                <Plus className="h-5 w-5" />
                <span>Adicionar Ótica</span>
              </button>
            </div>
          </div>

        </div>
      </motion.div>

      {/* Estatísticas Rápidas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="bg-card rounded-xl shadow-sm border border-border p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-muted-foreground font-medium">Total</p>
          <p className="text-2xl font-bold text-foreground mt-1">{oticas.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="bg-card rounded-xl shadow-sm border border-border p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-emerald-600 font-medium">Ativas</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {oticas.filter((o) => o.ativa).length}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="bg-card rounded-xl shadow-sm border border-border p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-purple-600 font-medium">Matrizes</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">
            {oticas.filter((o) => o.ehMatriz).length}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="bg-card rounded-xl shadow-sm border border-border p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-blue-600 font-medium">Filiais</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {oticas.filter((o) => !o.ehMatriz).length}
          </p>
        </motion.div>
      </motion.div>

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.6 }}
        className="bg-card rounded-xl shadow-sm border border-border overflow-hidden"
      >
          {/* Toggle Filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-gray-600" />
              <span className="font-semibold text-gray-900">Filtros</span>
              {(filtroNomeDebounced || filtroCnpjDebounced || filtroStatus !== 'todos' || filtroTipo !== 'todos') && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  {oticasFiltradas.length} resultados
                </span>
              )}
            </div>
            <svg
              className={`h-5 w-5 text-gray-600 transition-transform ${
                showFilters ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Campos de Filtro */}
          {showFilters && (
            <div className="px-6 pb-6 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {/* Filtro: Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={filtroNome}
                    onChange={(e) => setFiltroNome(e.target.value)}
                    placeholder="Buscar por nome..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filtro: CNPJ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={filtroCnpj}
                    onChange={(e) => setFiltroCnpj(e.target.value)}
                    placeholder="Buscar por CNPJ..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filtro: Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="todos">Todos</option>
                    <option value="ativa">Ativas</option>
                    <option value="inativa">Inativas</option>
                  </select>
                </div>

                {/* Filtro: Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="todos">Todos</option>
                    <option value="matriz">Matrizes</option>
                    <option value="filial">Filiais</option>
                  </select>
                </div>
              </div>

              {/* Botão: Limpar Filtros */}
              {(filtroNome || filtroCnpj || filtroStatus !== 'todos' || filtroTipo !== 'todos') && (
                <button
                  onClick={() => {
                    setFiltroNome('');
                    setFiltroCnpj('');
                    setFiltroStatus('todos');
                    setFiltroTipo('todos');
                  }}
                  className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          )}
      </motion.div>

      {/* Lista de Óticas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.6 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : oticasFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma ótica encontrada
            </h3>
            <p className="text-gray-600 mb-6">
              {oticas.length === 0
                ? 'Adicione a primeira ótica para começar'
                : 'Tente ajustar os filtros'}
            </p>
            {oticas.length === 0 && (
              <button
                onClick={handleAbrirModalCriar}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Adicionar Primeira Ótica
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {oticasFiltradas.map((otica) => (
              <OticaListItem
                key={otica.id}
                otica={otica}
                onEdit={handleAbrirModalEditar}
                onToggleAtiva={handleToggleAtiva}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Modal: Criar/Editar */}
      <CriarEditarOticaModal
        isOpen={modalOpen}
        onClose={handleFecharModal}
        onSuccess={handleSucessoModal}
        oticaToEdit={oticaSelecionada}
      />

      {/* Modal: Importar Óticas */}
      <ImportarOticasModal
        isOpen={modalImportarOpen}
        onClose={() => setModalImportarOpen(false)}
        onSuccess={() => {
          setModalImportarOpen(false);
          fetchOticas();
        }}
      />
    </div>
  );
}
