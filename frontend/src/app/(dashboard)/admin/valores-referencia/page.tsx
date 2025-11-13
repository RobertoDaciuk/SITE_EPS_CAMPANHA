'use client';

/**
 * ============================================================================
 * PÁGINA: Gerenciamento de Valores de Referência (Admin)
 * ============================================================================
 *
 * Página protegida (apenas ADMIN) para gerenciamento de valores de referência.
 *
 * Features:
 * - Listagem de todos os códigos de referência e seus valores
 * - Filtros por código, status
 * - Criação de novos códigos (modal)
 * - Edição de valores existentes (modal com histórico)
 * - Ativar/Desativar códigos
 * - Visualização do histórico de alterações
 * - Proteção de rota (redirect se não for Admin)
 * - Estados de loading e vazios
 * - Responsivo (mobile-first)
 *
 * @module AdminValoresReferenciaPage
 * ============================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/ContextoAutenticacao';
import { Plus, Search, Filter, Loader2, DollarSign, AlertCircle, History } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import ValorReferenciaListItem from '@/components/admin/valores-referencia/ValorReferenciaListItem';
import CriarEditarValorReferenciaModal from '@/components/admin/valores-referencia/CriarEditarValorReferenciaModal';

// ============================================================================
// INTERFACES
// ============================================================================

interface HistoricoAlteracao {
  data: string;
  valorAnterior: number;
  valorNovo: number;
  usuario?: string;
}

interface ValorReferencia {
  id: string;
  codigoReferencia: string;
  pontosReais: number;
  ativo: boolean;
  historicoAlteracoes?: HistoricoAlteracao[];
  criadoEm: string;
  atualizadoEm: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AdminValoresReferenciaPage() {
  const router = useRouter();
  const { usuario, carregando: isAuthLoading } = useAuth();

  // ==========================================================================
  // ESTADOS
  // ==========================================================================

  const [referencias, setReferencias] = useState<ValorReferencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [referenciaSelecionada, setReferenciaSelecionada] = useState<ValorReferencia | null>(null);

  // Estados de Filtros
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [showFilters, setShowFilters] = useState(false);

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
      fetchReferencias();
    }
  }, [usuario]);

  // ==========================================================================
  // FETCH DADOS
  // ==========================================================================

  const fetchReferencias = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/valores-referencia');
      setReferencias(response.data);
    } catch (error: any) {
      console.error('Erro ao buscar valores de referência:', error);
      toast.error(error.response?.data?.mensagem || 'Erro ao buscar valores de referência');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // FILTROS
  // ==========================================================================

  const referenciasFiltradas = useMemo(() => {
    return referencias.filter((ref) => {
      const matchCodigo = ref.codigoReferencia
        .toLowerCase()
        .includes(filtroCodigo.toLowerCase());
      
      const matchStatus =
        filtroStatus === 'todos' ||
        (filtroStatus === 'ativo' && ref.ativo) ||
        (filtroStatus === 'inativo' && !ref.ativo);

      return matchCodigo && matchStatus;
    });
  }, [referencias, filtroCodigo, filtroStatus]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleCriar = () => {
    setReferenciaSelecionada(null);
    setModalOpen(true);
  };

  const handleEditar = (ref: ValorReferencia) => {
    setReferenciaSelecionada(ref);
    setModalOpen(true);
  };

  const handleToggleAtivo = async (id: string, ativoAtual: boolean) => {
    try {
      await api.patch(`/valores-referencia/${id}`, {
        ativo: !ativoAtual,
      });
      toast.success(`Código ${!ativoAtual ? 'ativado' : 'desativado'} com sucesso!`);
      fetchReferencias();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      toast.error(error.response?.data?.mensagem || 'Erro ao alterar status');
    }
  };

  const handleModalClose = (sucesso?: boolean) => {
    setModalOpen(false);
    setReferenciaSelecionada(null);
    if (sucesso) {
      fetchReferencias();
    }
  };

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* =================================================================== */}
      {/* HEADER */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text flex items-center gap-2">
            <DollarSign className="w-7 h-7" />
            Valores de Referência
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os valores de pontos (R$) para cada código de referência
          </p>
        </div>

        <button
          onClick={handleCriar}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Novo Código
        </button>
      </div>

      {/* =================================================================== */}
      {/* FILTROS */}
      {/* =================================================================== */}
      <div className="glass rounded-xl p-4 space-y-4">
        {/* Barra de Pesquisa e Toggle de Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Campo de Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por código..."
              value={filtroCodigo}
              onChange={(e) => setFiltroCodigo(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>

          {/* Botão de Filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${
              showFilters ? 'bg-primary/10 border-primary' : ''
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>

        {/* Filtros Expandidos */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
            {/* Filtro Status */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
                className="input w-full"
              >
                <option value="todos">Todos</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </select>
            </div>
          </div>
        )}

        {/* Contador de Resultados */}
        <div className="text-sm text-muted-foreground">
          {referenciasFiltradas.length === referencias.length ? (
            <span>Exibindo todos os {referencias.length} códigos</span>
          ) : (
            <span>
              Exibindo {referenciasFiltradas.length} de {referencias.length} códigos
            </span>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* LISTAGEM */}
      {/* =================================================================== */}
      {referenciasFiltradas.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold mb-1">Nenhum código encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {referencias.length === 0
              ? 'Comece criando seu primeiro código de referência'
              : 'Tente ajustar os filtros de busca'}
          </p>
          {referencias.length === 0 && (
            <button onClick={handleCriar} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Criar Primeiro Código
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {referenciasFiltradas.map((ref) => (
            <ValorReferenciaListItem
              key={ref.id}
              referencia={ref}
              onEditar={handleEditar}
              onToggleAtivo={handleToggleAtivo}
            />
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL CRIAR/EDITAR */}
      {/* =================================================================== */}
      {modalOpen && (
        <CriarEditarValorReferenciaModal
          referencia={referenciaSelecionada}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
