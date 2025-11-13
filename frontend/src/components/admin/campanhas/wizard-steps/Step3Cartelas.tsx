'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Calculator, 
  Trophy,
  Package,
  Search,
  X,
  CheckCircle2,
  CheckCircle,
  Lock,
  Info as InfoIcon,
} from 'lucide-react';
import { useEffect, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import type { WizardState, CondicaoFormData } from '../CriarCampanhaWizard';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  modoEdicao?: boolean;
  cartelasOriginais?: any[];
  campanhaId?: string;
}

export default function Step3Cartelas({ state, setState, modoEdicao = false, cartelasOriginais = [], campanhaId }: Props) {
  // ========================================
  // ESTADOS LOCAIS - PRODUTOS DO STAGING
  // ========================================
  const [produtosStaging, setProdutosStaging] = useState<Array<{ codigoRef: string; pontos: number; nomeProduto?: string }>>([]);
  const [totalProdutosStaging, setTotalProdutosStaging] = useState(0);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [filtroProduto, setFiltroProduto] = useState('');
  
  // Estados para controle de filtro por requisito (chave: `${cartelaIndex}-${requisitoIndex}`)
  const [filtrosRequisito, setFiltrosRequisito] = useState<Record<string, string>>({});
  
  // Estados removidos (agora produtos vêm do staging):
  // - novoCodigoRef, novoPontosReais, produtoEditando
  // - produtosBloqueados, verificandoProduto
  // - showColumnMapper, previewRows, availableColumns
  // - mappedCodeColumn, mappedValueColumn, etc.
  // - workerRef, bufferRef

  // ========================================
  // CARREGAR PRODUTOS DO STAGING
  // ========================================
  useEffect(() => {
    if (state.importSessionId) {
      carregarProdutosStaging();
    }
  }, [state.importSessionId]);

  const carregarProdutosStaging = async () => {
    if (!state.importSessionId) return;

    setCarregandoProdutos(true);
    try {
      const response = await api.get('/imports/staging/search', {
        params: {
          sessionId: state.importSessionId,
          limit: 10000, // Carregar todos para seleção
        },
      });

      setProdutosStaging(response.data.products || []);
      setTotalProdutosStaging(response.data.totalInSession || 0);
    } catch (error) {
      console.error('Erro ao carregar produtos do staging:', error);
      toast.error('Erro ao carregar produtos importados');
    } finally {
      setCarregandoProdutos(false);
    }
  };
  
  // ========================================
  // useEffect: Setar AUTO_REPLICANTE como padrão ao montar
  // ========================================
  useEffect(() => {
    if (!state.modoCartelas) {
      setState((prev) => ({ ...prev, modoCartelas: 'AUTO_REPLICANTE' }));
    }
  }, []);

  // ========================================
  // FILTRO DE PRODUTOS DO STAGING
  // ========================================
  const produtosFiltrados = useMemo(() => {
    if (!filtroProduto.trim()) return produtosStaging;
    
    const termo = filtroProduto.toLowerCase();
    return produtosStaging.filter((p) =>
      p.codigoRef.toLowerCase().includes(termo) ||
      (p.nomeProduto && p.nomeProduto.toLowerCase().includes(termo))
    );
  }, [produtosStaging, filtroProduto]);

  // ========================================
  // CALLBACKS EXISTENTES
  // ========================================
  const obterCodigosReferencia = useCallback((valor: string | string[] | undefined): string[] => {
    if (!valor) {
      return [];
    }

    if (Array.isArray(valor)) {
      return valor.map((item) => item.trim()).filter((item) => item.length > 0);
    }

    const texto = valor.trim();
    if (!texto) {
      return [];
    }

    if (texto.startsWith('[') && texto.endsWith(']')) {
      try {
        const parsed = JSON.parse(texto);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter((item) => item.length > 0);
        }
      } catch {
        // Ignora erros de parse e tenta fallback para split
      }
    }

    return texto
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }, []);

  // ========================================
  // AUTO-CÁLCULO DO PONTOS REAIS MÁXIMO
  // ========================================
  const calcularPontosReaisMaximo = useMemo(() => {
    if (produtosStaging.length === 0 || state.cartelas.length === 0) {
      return 0;
    }

    // Para cada cartela, soma: (maior valor do produto × quantidade total)
    let totalMaximo = 0;

    for (const cartela of state.cartelas) {
      let somaQuantidades = 0;
      let maiorValorProduto = 0;

      for (const requisito of cartela.requisitos) {
        somaQuantidades += requisito.quantidade;

        // Verifica se alguma condição referencia um produto específico
        for (const condicao of requisito.condicoes) {
          if (condicao.campo === 'CODIGO_DA_REFERENCIA' && condicao.valor) {
            const codigos = obterCodigosReferencia(condicao.valor);
            for (const codigo of codigos) {
              const produto = produtosStaging.find((p) => p.codigoRef === codigo);
              if (produto && produto.pontos > maiorValorProduto) {
                maiorValorProduto = produto.pontos;
              }
            }
          }
        }
      }

      // Se não achou produto específico, usa o maior valor da campanha
      if (maiorValorProduto === 0 && produtosStaging.length > 0) {
        maiorValorProduto = Math.max(...produtosStaging.map(p => p.pontos));
      }

      totalMaximo += maiorValorProduto * somaQuantidades;
    }

    return parseFloat(totalMaximo.toFixed(2));
  }, [produtosStaging, state.cartelas, obterCodigosReferencia]);

  // Atualiza automaticamente o pontosReaisMaximo quando muda
  useEffect(() => {
    if (calcularPontosReaisMaximo > 0 && state.pontosReaisMaximo !== calcularPontosReaisMaximo) {
      setState(prev => ({ ...prev, pontosReaisMaximo: calcularPontosReaisMaximo }));
    }
  }, [calcularPontosReaisMaximo]);

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
          condicoes: [
            {
              campo: 'NOME_PRODUTO' as const,
              operador: 'CONTEM' as const,
              valor: '',
            },
          ],
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
      condicoes: [
        {
          campo: 'NOME_PRODUTO' as const,
          operador: 'CONTEM' as const,
          valor: '',
        },
      ],
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
      {/* ============== SEÇÃO 1: PRODUTOS IMPORTADOS ============== */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-lg text-gray-900 dark:text-white">Produtos da Campanha</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Produtos importados na etapa anterior
            </p>
          </div>
          <div className="bg-green-500/10 px-3 py-1 rounded-full">
            <span className="text-sm font-bold text-green-600 dark:text-green-400">
              {carregandoProdutos ? '...' : `${totalProdutosStaging} produto(s)`}
            </span>
          </div>
        </div>
        
        {!state.importSessionId && (
          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">Nenhum produto importado</p>
              <p className="text-muted-foreground">
                Volte para a etapa "Produtos" e importe uma planilha XLSX com os produtos da campanha.
              </p>
            </div>
          </div>
        )}

        {state.importSessionId && (
          <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">
                {totalProdutosStaging} produtos prontos para seleção nas cartelas
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Card de Auto-Cálculo */}
      {calcularPontosReaisMaximo > 0 && (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Calculator className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-700 dark:text-green-300 mb-1">
                Pontos Máximos Calculados
              </h4>
              <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                Com base nos produtos da campanha e nas quantidades dos requisitos:
              </p>
              <div className="bg-background/50 rounded-lg px-4 py-3 border border-green-500/20">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Math.floor(calcularPontosReaisMaximo)} pts
                </div>
                <p className="text-xs text-muted-foreground mt-1">Usado na label "Ganhe até {Math.floor(calcularPontosReaisMaximo)} pts"</p>
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

        {/* Alerta sobre produtos da campanha */}
        {produtosStaging.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-600 dark:text-green-400 mb-1">Produtos da Campanha Carregados</p>
              <p className="text-muted-foreground">
                <strong>{totalProdutosStaging} produtos</strong> disponíveis para validação.
                Use o campo <strong>"Código da Ref (Campanha)"</strong> nas condições para validar produtos específicos.
                Apenas vendas com produtos cadastrados na planilha serão aceitas pelo robô de validação!
              </p>
            </div>
          </div>
        )}

        {/* Alerta sobre spillover */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-500 mb-1">Dica sobre Spillover</p>
            <p className="text-muted-foreground">
              O campo <strong>ordem</strong> permite agrupar requisitos relacionados entre cartelas diferentes.
              Requisitos com a mesma ordem "transbordam" (spillover) entre cartelas.
              <br />
              Ex: "Lentes X" com ordem=1 nas Cartelas 1, 2 e 3 são o mesmo requisito lógico.
            </p>
          </div>
        </div>
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

                  {/* Condições - FIXO: Apenas CODIGO_DA_REFERENCIA */}
                  <div className="bg-accent/30 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Validação por Código de Referência (Produtos da Campanha)
                    </p>
                    {requisito.condicoes.map((condicao, condicaoIndex) => {
                      const codigosSelecionados = obterCodigosReferencia(condicao.valor);
                      const totalProdutosDisponiveis = produtosStaging.length;
                      
                      // Chave única para este requisito
                      const requisitoKey = `${cartelaIndex}-${requisitoIndex}`;
                      const filtroLocal = filtrosRequisito[requisitoKey] || '';
                      
                      // Filtrar produtos baseado no filtro local
                      const produtosFiltradosRequisito = filtroLocal.trim()
                        ? produtosStaging.filter((p) =>
                            p.codigoRef.toLowerCase().includes(filtroLocal.toLowerCase()) ||
                            (p.nomeProduto && p.nomeProduto.toLowerCase().includes(filtroLocal.toLowerCase()))
                          )
                        : produtosStaging;
                      
                      // Mostrar apenas 5 produtos por padrão (ou todos se houver filtro)
                      const produtosParaExibir = filtroLocal.trim()
                        ? produtosFiltradosRequisito.slice(0, 50) // Se filtrado, mostrar até 50
                        : produtosFiltradosRequisito.slice(0, 5); // Sem filtro, apenas 5

                      const atualizarCondicao = (dados: Partial<CondicaoFormData>) => {
                        setState((prev) => ({
                          ...prev,
                          cartelas: prev.cartelas.map((cart, idxCart) => {
                            if (idxCart !== cartelaIndex) return cart;
                            return {
                              ...cart,
                              requisitos: cart.requisitos.map((req, idxReq) => {
                                if (idxReq !== requisitoIndex) return req;
                                return {
                                  ...req,
                                  condicoes: req.condicoes.map((cond, idxCond) => {
                                    if (idxCond !== condicaoIndex) return cond;
                                    // Sempre manter como CODIGO_DA_REFERENCIA
                                    return { ...cond, ...dados, campo: 'CODIGO_DA_REFERENCIA' };
                                  }),
                                };
                              }),
                            };
                          }),
                        }));
                      };

                      const handleToggleCodigo = (codigo: string) => {
                        const atualizado = codigosSelecionados.includes(codigo)
                          ? codigosSelecionados.filter((item) => item !== codigo)
                          : [...codigosSelecionados, codigo];
                        atualizarCondicao({ valor: atualizado });
                      };

                      const handleSelecionarTodos = () => {
                        const todosCodigos = produtosStaging.map((produto) => produto.codigoRef);
                        atualizarCondicao({ valor: todosCodigos });
                      };

                      const handleLimparTodos = () => {
                        atualizarCondicao({ valor: [] });
                      };

                      return (
                        <div key={condicaoIndex} className="space-y-3">
                          {/* Campo fixo: CODIGO_DA_REFERENCIA - sem dropdown */}
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                              📋 Validação por Código de Referência (Produtos da Campanha)
                            </p>
                          </div>

                          {/* Botões de ação */}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <button
                              type="button"
                              onClick={handleSelecionarTodos}
                              disabled={totalProdutosDisponiveis === 0 || isBloqueada}
                              className={`px-3 py-1.5 border border-primary/40 rounded-lg text-primary hover:bg-primary/10 disabled:opacity-50 font-medium ${isBloqueada ? 'cursor-not-allowed' : ''}`}
                            >
                              ✓ Selecionar todos
                            </button>
                            <button
                              type="button"
                              onClick={handleLimparTodos}
                              disabled={codigosSelecionados.length === 0 || isBloqueada}
                              className={`px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:bg-accent/50 disabled:opacity-50 ${isBloqueada ? 'cursor-not-allowed' : ''}`}
                            >
                              ✗ Limpar
                            </button>
                            <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg font-semibold">
                              {codigosSelecionados.length} de {totalProdutosDisponiveis} selecionados
                            </span>
                          </div>

                          {/* Campo de Filtro */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={filtroLocal}
                              onChange={(e) => setFiltrosRequisito(prev => ({
                                ...prev,
                                [requisitoKey]: e.target.value
                              }))}
                              placeholder="Buscar por código ou nome..."
                              disabled={isBloqueada}
                              className="w-full pl-10 pr-10 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50"
                            />
                            {filtroLocal && (
                              <button
                                onClick={() => setFiltrosRequisito(prev => ({
                                  ...prev,
                                  [requisitoKey]: ''
                                }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          {/* Lista de produtos para seleção */}
                          <div className={`border border-border rounded-lg p-3 ${isBloqueada ? 'bg-gray-100 dark:bg-gray-800' : 'bg-background'}`}>
                            {totalProdutosDisponiveis === 0 ? (
                              <p className="text-xs text-amber-600">
                                ⚠️ Nenhum produto disponível. Volte para a etapa "Produtos" e importe uma planilha.
                              </p>
                            ) : (
                              <>
                                {/* Aviso de filtro ativo */}
                                {filtroLocal.trim() && produtosFiltradosRequisito.length === 0 && (
                                  <p className="text-xs text-amber-600 mb-2">
                                    ⚠️ Nenhum produto encontrado com o termo "{filtroLocal}"
                                  </p>
                                )}
                                
                                {/* Grid de checkboxes */}
                                {produtosParaExibir.length > 0 && (
                                  <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {produtosParaExibir.map((produto) => {
                                      const selecionado = codigosSelecionados.includes(produto.codigoRef);
                                      return (
                                        <label
                                          key={produto.codigoRef}
                                          className={`flex items-center gap-2 px-2 py-1 border rounded text-xs transition-colors ${
                                            selecionado
                                              ? 'border-primary bg-primary/10 text-primary'
                                              : 'border-border text-foreground hover:border-primary/50 hover:bg-accent/30'
                                          } ${isBloqueada ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selecionado}
                                            disabled={isBloqueada}
                                            onChange={() => handleToggleCodigo(produto.codigoRef)}
                                            className="text-primary rounded"
                                          />
                                          <span className="font-mono flex-1">{produto.codigoRef}</span>
                                          <span className="text-muted-foreground">{Math.floor(produto.pontos)} pts</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                {/* Mensagem informativa */}
                                {!filtroLocal.trim() && produtosStaging.length > 5 && (
                                  <p className="text-xs text-muted-foreground mt-2 text-center">
                                    Mostrando 5 de {totalProdutosDisponiveis} produtos. Use o campo de busca acima para encontrar mais produtos.
                                  </p>
                                )}
                                
                                {filtroLocal.trim() && produtosFiltradosRequisito.length > 50 && (
                                  <p className="text-xs text-muted-foreground mt-2 text-center">
                                    Mostrando 50 de {produtosFiltradosRequisito.length} produtos filtrados. Refine sua busca para ver resultados específicos.
                                  </p>
                                )}

                                {/* Chips dos códigos selecionados */}
                                {codigosSelecionados.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                                    {codigosSelecionados.slice(0, 8).map((codigo) => (
                                      <span
                                        key={codigo}
                                        className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-mono"
                                      >
                                        {codigo}
                                      </span>
                                    ))}
                                    {codigosSelecionados.length > 8 && (
                                      <span className="text-xs text-muted-foreground self-center">
                                        +{codigosSelecionados.length - 8} outros
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Aviso se nenhum selecionado */}
                                {codigosSelecionados.length === 0 && (
                                  <p className="text-xs text-amber-600 mt-3 pt-3 border-t border-border">
                                    ⚠️ Selecione pelo menos um código de referência para que o requisito seja validado.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
    </motion.div>
  );
}
