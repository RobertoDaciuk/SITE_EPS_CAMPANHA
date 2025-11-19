'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Plus, 
  Trash2, 
  AlertCircle,
  Package,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import type { WizardState } from '../CriarCampanhaWizard';
import GerenciarProdutosModal from '../GerenciarProdutosModal';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  modoEdicao?: boolean;
  cartelasOriginais?: any[];
  campanhaId?: string;
}

export default function Step3Cartelas({ state, setState, modoEdicao = false, cartelasOriginais = [], campanhaId }: Props) {
  // Sprint 21: Estado para modal de gerenciamento de produtos por requisito
  const [modalProdutosAberto, setModalProdutosAberto] = useState(false);
  const [requisitoModalAtivo, setRequisitoModalAtivo] = useState<{
    cartelaIndex: number;
    requisitoIndex: number;
  } | null>(null);

  // ========================================
  // useEffect: Setar AUTO_REPLICANTE como padrão ao montar
  // ========================================
  useEffect(() => {
    if (!state.modoCartelas) {
      setState((prev) => ({ ...prev, modoCartelas: 'AUTO_REPLICANTE' }));
    }
  }, []);

  // ========================================
  // useEffect: Calcular Pontos Reais Máximo
  // ========================================
  useEffect(() => {
    // Calcular a soma dos maiores pontos de cada requisito em todas as cartelas
    // Lógica: (Max Req 1) + (Max Req 2) + ...
    // Se houver múltiplas cartelas, assume-se que o vendedor pode ganhar em todas (acumulativo)
    // ou se for progressivo, o cálculo pode variar, mas a regra solicitada é a soma.
    
    const totalMaxPontos = state.cartelas.reduce((accCartela, cartela) => {
      const somaRequisitos = cartela.requisitos.reduce((accReq, req) => {
        // Se tiver maxPontos definido (via Staging ou Array direto), usa ele
        // Se não, tenta calcular do array de produtos se existir
        let maxReq = req.maxPontos || 0;
        
        if (!maxReq && req.produtos && req.produtos.length > 0) {
          maxReq = Math.max(...req.produtos.map(p => Number(p.pontosReais || 0)));
        }
        
        // Multiplicar pelo quantidade do requisito
        return accReq + (maxReq * (req.quantidade || 1));
      }, 0);
      return accCartela + somaRequisitos;
    }, 0);

    // Atualizar o estado apenas se o valor mudou para evitar loops
    if (state.pontosReaisMaximo !== totalMaxPontos) {
      // Usar setTimeout para evitar erro de "Cannot update a component while rendering a different component"
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, pontosReaisMaximo: totalMaxPontos }));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [state.cartelas, setState, state.pontosReaisMaximo]);

  // Helper para verificar se uma cartela é original (bloqueada em modo edição)
  const isCartelaOriginal = (numeroCartela: number) => {
    if (!modoEdicao || cartelasOriginais.length === 0) return false;
    return cartelasOriginais.some((c: any) => c.numeroCartela === numeroCartela);
  };

  const addCartela = () => {
    // Bloquear adição de cartelas em modo edição
    if (modoEdicao) {
      toast.error('❌ Não é possível adicionar novas cartelas em modo edição!');
      return;
    }

    const novaCartela = {
      numeroCartela: state.cartelas.length + 1,
      descricao: 'Cartela',
      requisitos: [
        {
          descricao: '',
          quantidade: 1,
          tipoUnidade: 'PAR' as const,
          ordem: 1,
          // Sprint 21: Condições removidas (validação por produtos)
          condicoes: [],
        },
      ],
    };
    setState({ ...state, cartelas: [...state.cartelas, novaCartela] });
  };

  const removeCartela = (index: number) => {
    // Bloquear remoção de cartelas em modo edição
    if (modoEdicao) {
      toast.error('❌ Não é possível remover cartelas em modo edição!');
      return;
    }

    if (state.cartelas.length === 1) {
      alert('A campanha deve ter pelo menos uma cartela!');
      return;
    }
    const novasCartelas = state.cartelas.filter((_, i) => i !== index);
    // Renumerar cartelas
    const renumeradas = novasCartelas.map((cartela, i) => ({
      ...cartela,
      numeroCartela: i + 1,
    }));
    setState({ ...state, cartelas: renumeradas });
  };

  const updateCartela = (index: number, field: string, value: any) => {
    const novasCartelas = [...state.cartelas];
    novasCartelas[index] = { ...novasCartelas[index], [field]: value };
    setState({ ...state, cartelas: novasCartelas });
  };

  const addRequisitoToCartela = (cartelaIndex: number) => {
    const novasCartelas = [...state.cartelas];
    const novoRequisito = {
      descricao: '',
      quantidade: 1,
      tipoUnidade: 'PAR' as const,
      ordem: novasCartelas[cartelaIndex].requisitos.length + 1,
      // Sprint 21: Condições removidas (validação por produtos)
      condicoes: [],
    };
    novasCartelas[cartelaIndex].requisitos.push(novoRequisito);
    setState({ ...state, cartelas: novasCartelas });
  };

  const removeRequisitoFromCartela = (cartelaIndex: number, requisitoIndex: number) => {
    const novasCartelas = [...state.cartelas];
    novasCartelas[cartelaIndex].requisitos = novasCartelas[cartelaIndex].requisitos.filter(
      (_, i) => i !== requisitoIndex
    );
    setState({ ...state, cartelas: novasCartelas });
  };

  const updateRequisito = (cartelaIndex: number, requisitoIndex: number, field: string, value: any) => {
    const novasCartelas = [...state.cartelas];
    novasCartelas[cartelaIndex].requisitos[requisitoIndex] = {
      ...novasCartelas[cartelaIndex].requisitos[requisitoIndex],
      [field]: value,
    };
    setState({ ...state, cartelas: novasCartelas });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* ============== SPRINT 21: PRODUTOS POR REQUISITO ============== */}
      {/* Cada requisito tem seus próprios produtos, gerenciados no modal GerenciarProdutosModal */}

      {/* Card de Resumo de Produtos */}
      {state.cartelas.some(c => c.requisitos.some(r => (r.produtos && r.produtos.length > 0) || r.importSessionId)) && (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-700 dark:text-green-300 mb-1">
                Produtos Configurados
              </h4>
              <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                {state.cartelas.reduce((total, cartela) => 
                  total + cartela.requisitos.filter(r => (r.produtos && r.produtos.length > 0) || r.importSessionId).length
                , 0)} requisito(s) com produtos definidos
              </p>
              <div className="bg-background/50 rounded-lg px-4 py-3 border border-green-500/20">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {state.cartelas.reduce((total, cartela) => 
                    total + cartela.requisitos.reduce((reqTotal, req) => 
                      reqTotal + (req.produtos?.length || req.quantidadeStaging || 0)
                    , 0)
                  , 0).toLocaleString()} produtos total
                </div>
                <p className="text-xs text-muted-foreground mt-1">Vinculados aos requisitos de cada cartela</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: Modo de Criação - APENAS AUTO_REPLICANTE */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h4 className="font-semibold text-foreground">Modo de Criação de Cartelas</h4>

        {/* Apenas modo AUTO_REPLICANTE visível */}
        <div className="p-4 rounded-lg border-2 border-primary bg-primary/10">
          <div className="font-semibold text-foreground flex items-center gap-2">
            ♾️ Auto-Replicante
            <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
              Padrão
            </span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Configure apenas a Cartela 1 e as próximas serão geradas automaticamente conforme o vendedor avança
          </div>
        </div>

        {/* Configurações de Auto-Replicação */}
        {state.modoCartelas === 'AUTO_REPLICANTE' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 pt-4 border-t border-border"
          >
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                  <p className="font-semibold">🔄 Modo Cartelas Infinitas</p>
                  <p className="text-xs">
                    Configure apenas a Cartela 1. As próximas serão geradas dinamicamente conforme o vendedor avança!
                  </p>
                  <div className="text-xs bg-blue-500/10 rounded-lg p-2 mt-2">
                    <p className="font-semibold mb-1">💡 Transbordamento (Spillover):</p>
                    <p>
                      Produtos não consumidos em uma cartela <strong>continuam disponíveis</strong> para as próximas cartelas <strong>com o mesmo número de ordem</strong>.
                    </p>
                    <p className="mt-1 italic">
                      Exemplo: a Cartela 1 pede 5 lentes e o vendedor envia 6 vendas. Enquanto não forem validadas pelo robô, ficam <strong>Em Análise</strong>. Quando as vendas forem <strong>Validadas</strong>, a 6ª venda (excedente) <strong>transborda</strong> automaticamente para a Cartela 2 no requisito de mesma ordem.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Tipo de Incremento
                </label>
                <select
                  value={state.tipoIncremento}
                  onChange={(e) => setState({ ...state, tipoIncremento: e.target.value as any })}
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="SEM_INCREMENTO">Sem Incremento (sempre igual)</option>
                  <option value="MULTIPLICADOR">Multiplicador Customizável</option>
                </select>
              </div>

              {state.tipoIncremento === 'MULTIPLICADOR' && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Fator de Incremento
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={state.fatorIncremento}
                    onChange={(e) => setState({ ...state, fatorIncremento: parseInt(e.target.value) || 0 })}
                    placeholder="Ex: 5"
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ex: 5 → Cartela 1: 5un, Cartela 2: 10un, Cartela 3: 15un...
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Limite de Cartelas (opcional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={state.limiteCartelas || ''}
                  onChange={(e) => setState({ ...state, limiteCartelas: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Deixe vazio para ilimitado"
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Layers className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Configure a Cartela</h3>
          <p className="text-sm text-muted-foreground">Defina os requisitos que o vendedor precisa cumprir</p>
        </div>
      </div>

      {/* Alertas Informativos */}
      <div className="space-y-3">
        {/* Alerta sobre modo de edição */}
        {modoEdicao && cartelasOriginais.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
            <Lock className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400 mb-1">🔒 Cartelas Bloqueadas em Modo Edição</p>
              <p className="text-muted-foreground">
                <strong>Todas as cartelas</strong> existentes estão bloqueadas para preservar a integridade das validações.
                Você <strong>não pode</strong> adicionar novas cartelas, remover existentes ou alterar seus requisitos/condições.
              </p>
            </div>
          </div>
        )}

        {/* Alerta sobre spillover removido conforme solicitação */}
      </div>

      {/* Lista de Cartelas */}
      <div className="space-y-6">
        {state.cartelas.map((cartela, cartelaIndex) => {
          const isBloqueada = isCartelaOriginal(cartela.numeroCartela);
          
          return (
          <div key={cartelaIndex} className={`border border-border rounded-xl overflow-hidden ${isBloqueada ? 'opacity-60' : ''}`}>
            {/* Header da Cartela */}
            <div className={`p-4 flex items-center justify-between ${isBloqueada ? 'bg-amber-500/10' : 'bg-accent/50'}`}>
              <div className="flex items-center gap-3 flex-1">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isBloqueada ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-primary text-primary-foreground'}`}>
                  {cartela.numeroCartela}
                </span>
                <input
                  type="text"
                  value={cartela.descricao}
                  onChange={(e) => updateCartela(cartelaIndex, 'descricao', e.target.value)}
                  placeholder="Descrição da cartela..."
                  disabled={isBloqueada}
                  className={`flex-1 px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${isBloqueada ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-background'}`}
                />
                {/* Badge Bloqueada */}
                {isBloqueada && (
                  <div className="group relative">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      <Lock className="h-3 w-3" />
                      Bloqueada
                    </span>
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 w-64 shadow-lg">
                        <p className="font-medium mb-1">Cartela Não Editável</p>
                        <p>Esta cartela já possui validações e não pode ser alterada para manter a integridade dos dados.</p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Badge indicador para modo AUTO_REPLICANTE */}
                {state.modoCartelas === 'AUTO_REPLICANTE' && !isBloqueada && (
                  <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    ♾️ Cartela Base
                  </span>
                )}
              </div>
              {state.cartelas.length > 1 && state.modoCartelas === 'MANUAL' && !isBloqueada && (
                <button
                  onClick={() => removeCartela(cartelaIndex)}
                  className="ml-3 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Requisitos da Cartela */}
            <div className="p-4 space-y-4">
              {cartela.requisitos.map((requisito, requisitoIndex) => (
                <div key={requisitoIndex} className="bg-background border border-border rounded-lg p-4 space-y-3">
                  {/* Cabeçalho do Requisito */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Requisito {requisitoIndex + 1}
                    </span>
                    {cartela.requisitos.length > 1 && !isBloqueada && (
                      <button
                        onClick={() => removeRequisitoFromCartela(cartelaIndex, requisitoIndex)}
                        className="text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Campos do Requisito */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={requisito.descricao}
                        onChange={(e) => updateRequisito(cartelaIndex, requisitoIndex, 'descricao', e.target.value)}
                        placeholder="Descrição (ex: Lentes BlueProtect)"
                        disabled={isBloqueada}
                        className={`w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${isBloqueada ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-background'}`}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={requisito.quantidade}
                        onChange={(e) => updateRequisito(cartelaIndex, requisitoIndex, 'quantidade', parseInt(e.target.value) || 1)}
                        placeholder="Quantidade"
                        min="1"
                        disabled={isBloqueada}
                        className={`w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${isBloqueada ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-background'}`}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Quantidade exigida para este requisito</p>
                    </div>
                    <div>
                      <div className={`inline-flex rounded-lg overflow-hidden border border-border ${isBloqueada ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <button
                          type="button"
                          onClick={() => !isBloqueada && updateRequisito(cartelaIndex, requisitoIndex, 'tipoUnidade', 'PAR')}
                          disabled={isBloqueada}
                          className={`px-3 py-2 text-sm ${requisito.tipoUnidade === 'PAR' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'} ${isBloqueada ? 'cursor-not-allowed' : ''}`}
                        >
                          PAR
                        </button>
                        <button
                          type="button"
                          onClick={() => !isBloqueada && updateRequisito(cartelaIndex, requisitoIndex, 'tipoUnidade', 'UNIDADE')}
                          disabled={isBloqueada}
                          className={`px-3 py-2 text-sm border-l border-border ${requisito.tipoUnidade === 'UNIDADE' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'} ${isBloqueada ? 'cursor-not-allowed' : ''}`}
                        >
                          UNIDADE
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Campo Ordem - REDUZIDO */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Ordem (spillover)</label>
                    <input
                      type="number"
                      value={requisito.ordem}
                      onChange={(e) => updateRequisito(cartelaIndex, requisitoIndex, 'ordem', parseInt(e.target.value) || 1)}
                      min="1"
                      disabled={isBloqueada}
                      className={`w-32 px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${isBloqueada ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-background'}`}
                      title="Requisitos com mesma ordem transbordam entre cartelas"
                    />
                  </div>

                  {/* Sprint 21: Botão Gerenciar Produtos */}
                  <button
                    onClick={() => {
                      setRequisitoModalAtivo({ cartelaIndex, requisitoIndex });
                      setModalProdutosAberto(true);
                    }}
                    // Permitir edição de produtos mesmo em cartelas bloqueadas
                    className={`w-full mt-2 p-3 border border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      isBloqueada
                        ? 'border-blue-300/50 dark:border-blue-600/50 text-blue-600/80 dark:text-blue-400/80 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        : 'border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    Gerenciar Produtos
                    {requisito.produtos && requisito.produtos.length > 0 && (
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs ml-2">
                        {requisito.produtos.length.toLocaleString()}
                      </span>
                    )}
                    {requisito.importSessionId && !requisito.produtos?.length && (
                      <span className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 px-2 py-0.5 rounded-full text-xs ml-2">
                        {requisito.quantidadeStaging ? `${requisito.quantidadeStaging.toLocaleString()} (Produtos vinculados ao requisito)` : 'Produtos vinculados ao requisito'}
                      </span>
                    )}
                  </button>
                </div>
              ))}

              {/* Botão Adicionar Requisito */}
              <button
                onClick={() => addRequisitoToCartela(cartelaIndex)}
                disabled={isBloqueada}
                className={`w-full py-3 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${isBloqueada ? 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
              >
                <Plus className="h-4 w-4" />
                Adicionar Requisito
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {/* Botão Adicionar Cartela - bloqueado em modo edição */}
      {state.modoCartelas === 'MANUAL' && !modoEdicao && (
        <button
          onClick={addCartela}
          className="w-full py-4 border-2 border-dashed border-primary/50 rounded-xl text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Plus className="h-5 w-5" />
          Adicionar Nova Cartela
        </button>
      )}

      {/* Alerta: Cartelas bloqueadas em edição */}
      {state.modoCartelas === 'MANUAL' && modoEdicao && (
        <div className="w-full py-4 border-2 border-dashed border-amber-500/30 rounded-xl bg-amber-500/5 flex items-center justify-center gap-3 text-amber-600 dark:text-amber-400">
          <Lock className="h-5 w-5" />
          <span className="font-medium">Adicionar/remover cartelas desabilitado em modo edição</span>
        </div>
      )}

      {/* Sprint 21: Modal de Gerenciamento de Produtos */}
      {modalProdutosAberto && requisitoModalAtivo && (
        <GerenciarProdutosModal
          isOpen={modalProdutosAberto}
          onClose={() => {
            setModalProdutosAberto(false);
            setRequisitoModalAtivo(null);
          }}
          onSave={async (produtos, sessionId, totalStaging, maxPontos) => {
            const { cartelaIndex, requisitoIndex } = requisitoModalAtivo;
            const requisitoAtual = state.cartelas[cartelaIndex].requisitos[requisitoIndex];

            // Se for edição e o requisito já tiver ID, salvar no backend imediatamente
            if (modoEdicao && requisitoAtual.id) {
              try {
                await api.patch(`/campanhas/requisitos/${requisitoAtual.id}/produtos`, {
                  importSessionId: sessionId,
                  produtos: sessionId ? undefined : produtos
                });
                toast.success('Produtos atualizados no backend!');
              } catch (error) {
                console.error('Erro ao salvar produtos:', error);
                toast.error('Erro ao salvar produtos no backend');
                return; // Não atualizar estado local se falhar
              }
            }

            setState((prev) => {
              const newCartelas = [...prev.cartelas];
              
              if (sessionId) {
                // Usar sessão de importação (staging)
                newCartelas[cartelaIndex].requisitos[requisitoIndex].importSessionId = sessionId;
                // Salvar a quantidade para exibição na UI
                newCartelas[cartelaIndex].requisitos[requisitoIndex].quantidadeStaging = totalStaging;
                newCartelas[cartelaIndex].requisitos[requisitoIndex].maxPontos = maxPontos;
                
                // IMPORTANTE: Remover produtos (não setar array vazio) para não enviar ao backend
                delete newCartelas[cartelaIndex].requisitos[requisitoIndex].produtos;
              } else {
                // Usar array direto de produtos
                newCartelas[cartelaIndex].requisitos[requisitoIndex].produtos = produtos;
                newCartelas[cartelaIndex].requisitos[requisitoIndex].maxPontos = maxPontos;
                // Remover sessionId e quantidadeStaging se existir
                delete newCartelas[cartelaIndex].requisitos[requisitoIndex].importSessionId;
                delete newCartelas[cartelaIndex].requisitos[requisitoIndex].quantidadeStaging;
              }
              return { ...prev, cartelas: newCartelas };
            });

            setModalProdutosAberto(false);
            setRequisitoModalAtivo(null);
            if (!modoEdicao) toast.success('Produtos atualizados!');
          }}
          produtosAtuais={state.cartelas[requisitoModalAtivo.cartelaIndex].requisitos[requisitoModalAtivo.requisitoIndex].produtos || []}
          currentSessionId={state.cartelas[requisitoModalAtivo.cartelaIndex].requisitos[requisitoModalAtivo.requisitoIndex].importSessionId}
          outrosRequisitos={
            // Passar requisitos disponíveis para cópia (array direto ou staging)
            state.cartelas.flatMap((cartela, cIdx) =>
              cartela.requisitos
                .filter((req, rIdx) => {
                  // Excluir o requisito atual
                  if (cIdx === requisitoModalAtivo.cartelaIndex && rIdx === requisitoModalAtivo.requisitoIndex) {
                    return false;
                  }
                  // Incluir se tiver produtos (array) OU staging (sessionId)
                  const temProdutosArray = req.produtos && req.produtos.length > 0;
                  const temStaging = !!req.importSessionId;
                  return temProdutosArray || temStaging;
                })
                .map(req => ({
                  descricao: req.descricao,
                  ordem: req.ordem,
                  produtos: req.produtos || [],
                  importSessionId: req.importSessionId,
                  quantidadeStaging: req.quantidadeStaging
                }))
            )
          }
          cartelaNumero={state.cartelas[requisitoModalAtivo.cartelaIndex].numeroCartela}
          requisitoOrdem={state.cartelas[requisitoModalAtivo.cartelaIndex].requisitos[requisitoModalAtivo.requisitoIndex].ordem}
        />
      )}
    </motion.div>
  );
}
