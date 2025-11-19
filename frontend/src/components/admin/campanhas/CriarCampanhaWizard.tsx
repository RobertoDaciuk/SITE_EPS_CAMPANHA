'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, Info, Zap, Calendar, Building2, Layers, FileText, Target, Monitor, Smartphone, AlertTriangle } from 'lucide-react';
// Package removido pois Step3Produtos foi removido (Sprint 21)
import toast from 'react-hot-toast';
import api from '@/lib/axios';
// Tipagem local para evitar acoplamento com a página
type Campanha = {
  id: string;
  titulo: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  pontosReaisPorCartela: number; // Campo legado (campanhas antigas)
  pontosReaisMaximo?: number; // Campo novo (campanhas com valores variáveis)
  percentualGerente: number;
  imagemCampanha?: string;
  tags?: string[];
  regras?: string;
  tipoPedido?: string;
  paraTodasOticas: boolean;
  oticasAlvo?: Array<{ id: string; nome?: string }>;
  eventosEspeciais?: Array<{ id: string; [key: string]: any }>;
  cartelas?: Array<any>;
  // produtosCampanha REMOVIDO (Sprint 21): produtos agora são sempre por requisito
};
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

// Importar steps individuais
import Step1DadosBasicos from './wizard-steps/Step1DadosBasicos';
import Step2Targeting from './wizard-steps/Step2Targeting';
// Step3Produtos REMOVIDO (Sprint 21): Produtos agora são configurados por requisito no Step3Cartelas
import Step3Cartelas from './wizard-steps/Step3Cartelas';
import Step4EventosEspeciais from './wizard-steps/Step4EventosEspeciais';
import Step5Regras from './wizard-steps/Step5Regras';
import Step6Revisao from './wizard-steps/Step6Revisao';
import PreviewCampanha from './PreviewCampanha';

const timeZone = 'America/Sao_Paulo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campanhaParaEditar?: Campanha | null;
}

// Estado do wizard
export interface WizardState {
  // Step 1: Dados Básicos
  titulo: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  pontosReaisMaximo: number; // Valor máximo que pode ser pago (usado para label "Ganhe até X")
  percentualGerente: number;
  imagemCampanha: string; // DEPRECATED: mantido para compatibilidade, usar imagemCampanha16x9Url
  imagemCampanha16x9Url?: string; // Nova imagem 16:9 para cards e listagens
  imagemCampanha1x1Url?: string; // Nova imagem 1:1 para página de regras
  imagemCampanha16x9Preview?: string; // Preview local em memória para 16:9
  imagemCampanha1x1Preview?: string; // Preview local em memória para 1:1
  tags: string[];
  regras: string;
  tipoPedido: 'OS_OP_EPS' | 'OPTICLICK' | 'EPSWEB' | 'ENVELOPE_OTICA' | '';

  // Step 2: Targeting
  paraTodasOticas: boolean;
  oticasAlvoIds: string[];
  matrizesSelecionadasIds: string[];

  // Step 3: Cartelas e Requisitos
  modoCartelas: 'MANUAL' | 'AUTO_REPLICANTE';
  tipoIncremento: 'SEM_INCREMENTO' | 'MULTIPLICADOR';
  fatorIncremento: number;
  limiteCartelas: number | null;
  cartelas: CartelaFormData[];

  // Step 4: Eventos Especiais
  eventosEspeciais: EventoEspecialFormData[];
}

export interface CartelaFormData {
  numeroCartela: number;
  descricao: string;
  requisitos: RequisitoFormData[];
}

export interface RequisitoFormData {
  id?: string; // ID do requisito (apenas para edição)
  descricao: string;
  quantidade: number;
  tipoUnidade: 'PAR' | 'UNIDADE';
  ordem: number;
  // Sprint 21: Produtos por requisito
  produtos?: Array<{ codigoRef: string; pontosReais: number }>;
  importSessionId?: string; // ID da sessão de staging para este requisito
  quantidadeStaging?: number; // Quantidade de produtos na sessão de staging (para exibição na UI)
  maxPontos?: number; // Maior valor de pontos encontrado nos produtos deste requisito
  // DEPRECADO: Condições removidas (validação agora é 100% por produtos)
  condicoes?: CondicaoFormData[];
}

export interface CondicaoFormData {
  campo: 'NOME_PRODUTO' | 'CODIGO_PRODUTO' | 'VALOR_VENDA' | 'CATEGORIA_PRODUTO' | 'CODIGO_DA_REFERENCIA';
  operador: 'CONTEM' | 'NAO_CONTEM' | 'IGUAL_A' | 'NAO_IGUAL_A' | 'MAIOR_QUE' | 'MENOR_QUE';
  valor: string | string[];
}

export interface EventoEspecialFormData {
  id?: string; // ID do evento (apenas para edição)
  nome: string;
  descricao: string;
  multiplicador: number;
  dataInicio: string;
  dataFim: string;
  ativo: boolean;
  corDestaque: string;
}

const initialState: WizardState = {
  titulo: '',
  descricao: '',
  dataInicio: '',
  dataFim: '',
  pontosReaisMaximo: 500,
  percentualGerente: 10, // 10% (será convertido para 0.1 no submit)
  imagemCampanha: '',
  imagemCampanha16x9Url: '',
  imagemCampanha1x1Url: '',
  imagemCampanha16x9Preview: '',
  imagemCampanha1x1Preview: '',
  tags: [],
  regras: '',
  tipoPedido: '',
  paraTodasOticas: true,
  oticasAlvoIds: [],
  matrizesSelecionadasIds: [],
  modoCartelas: 'AUTO_REPLICANTE',
  tipoIncremento: 'SEM_INCREMENTO',
  fatorIncremento: 0,
  limiteCartelas: null,
  cartelas: [
    {
      numeroCartela: 1,
      descricao: 'Cartela',
      requisitos: [
        {
          descricao: '',
          quantidade: 1,
          tipoUnidade: 'PAR',
          ordem: 1,
          // Sprint 21: Produtos por requisito (vazio inicialmente)
          produtos: [],
          importSessionId: undefined,
          // DEPRECADO: Condições removidas
          condicoes: [],
        },
      ],
    },
  ],
  eventosEspeciais: [],
};

export default function CriarCampanhaWizard({ isOpen, onClose, onSuccess, campanhaParaEditar }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  const totalSteps = 6; // Sprint 21: Removido Step3Produtos (agora produtos são por requisito)
  const isEdicao = !!campanhaParaEditar;

  // Detectar tamanho da tela
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 1280); // xl breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

// Carregar dados da campanha para edição com conversão de timezone
  useEffect(() => {
    const carregarDadosCampanha = async () => {
      if (!campanhaParaEditar || !isOpen) return;

      try {
        // Buscar campanha completa com todos os dados aninhados
        const response = await api.get(`/campanhas/${campanhaParaEditar.id}`);
        const campanhaCompleta = response.data;

        console.log('📥 Campanha completa carregada:', campanhaCompleta);

        // Converte as datas UTC do banco para o fuso de São Paulo e formata para o input
        const dataInicioLocal = format(
          toZonedTime(new Date(campanhaCompleta.dataInicio), timeZone),
          'yyyy-MM-dd'
        );
        const dataFimLocal = format(
          toZonedTime(new Date(campanhaCompleta.dataFim), timeZone),
          'yyyy-MM-dd'
        );

        // Carregar cartelas completas (requisitos + produtos + condições)
        const cartelas = (campanhaCompleta.cartelas || []).map((cartela: any) => ({
          numeroCartela: cartela.numeroCartela,
          descricao: cartela.descricao || '',
          requisitos: (cartela.requisitos || []).map((req: any) => ({
            id: req.id,
            descricao: req.descricao,
            quantidade: req.quantidade,
            tipoUnidade: req.tipoUnidade,
            ordem: req.ordem,
            // Sprint 21: Carregar produtos do requisito
            produtos: (req.produtos || []).map((p: any) => ({
              codigoRef: p.codigoRef,
              pontosReais: Number(p.pontosReais),
            })),
            importSessionId: req.importSessionId || undefined,
            // DEPRECADO: Condições (mantido para compatibilidade)
            condicoes: (req.condicoes || []).map((cond: any) => ({
              campo: cond.campo,
              operador: cond.operador,
              valor: cond.campo === 'CODIGO_DA_REFERENCIA' && cond.valor.includes(',')
                ? cond.valor.split(',').map((v: string) => v.trim())
                : cond.valor,
            })),
          })),
        }));

        // Carregar eventos especiais
        const eventosEspeciais = (campanhaCompleta.eventosEspeciais || []).map((evento: any) => ({
          id: evento.id, // Importante para edição
          nome: evento.nome,
          descricao: evento.descricao,
          multiplicador: Number(evento.multiplicador),
          dataInicio: format(toZonedTime(new Date(evento.dataInicio), timeZone), 'yyyy-MM-dd'),
          dataFim: format(toZonedTime(new Date(evento.dataFim), timeZone), 'yyyy-MM-dd'),
          ativo: evento.ativo,
          corDestaque: evento.corDestaque,
        }));

        // Carregar óticas alvo
        const oticasAlvoIds = (campanhaCompleta.oticasAlvo || []).map((o: any) => o.id);

        setState({
          ...initialState,
          titulo: campanhaCompleta.titulo,
          descricao: campanhaCompleta.descricao,
          dataInicio: dataInicioLocal,
          dataFim: dataFimLocal,
          pontosReaisMaximo: Number(campanhaCompleta.pontosReaisMaximo || 0),
          percentualGerente: Number(campanhaCompleta.percentualGerente) * 100, // CONVERSÃO: 0.1 → 10%
          imagemCampanha16x9Url: campanhaCompleta.imagemCampanha16x9Url || '',
          imagemCampanha1x1Url: campanhaCompleta.imagemCampanha1x1Url || '',
          regras: campanhaCompleta.regras || '',
          tipoPedido: campanhaCompleta.tipoPedido || '',
          paraTodasOticas: campanhaCompleta.paraTodasOticas || false,
          oticasAlvoIds,
          matrizesSelecionadasIds: [], // Será preenchido pelo Step2Targeting
          cartelas: cartelas.length > 0 ? cartelas : initialState.cartelas,
          eventosEspeciais,
          // Manter configurações de wizard padrão
          modoCartelas: initialState.modoCartelas,
          tipoIncremento: initialState.tipoIncremento,
          fatorIncremento: initialState.fatorIncremento,
          limiteCartelas: initialState.limiteCartelas,
        });

        toast.success('Dados da campanha carregados com sucesso!');
      } catch (error: any) {
        console.error('Erro ao carregar dados da campanha:', error);
        toast.error('Erro ao carregar dados da campanha. Tente novamente.');
      }
    };

    if (campanhaParaEditar && isOpen) {
      carregarDadosCampanha();
    } else if (isOpen && !campanhaParaEditar) {
      setState(initialState);
      setCurrentStep(1);
    }
  }, [campanhaParaEditar, isOpen]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      console.log(`🔄 Navegando de Step ${currentStep} → Step ${currentStep + 1}`);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Converte as datas locais (string 'yyyy-MM-dd') para UTC antes de enviar
      // IMPORTANTE: Concatenar 'T00:00:00' força interpretação como meia-noite LOCAL
      const dataInicioUtc = fromZonedTime(new Date(state.dataInicio + 'T00:00:00'), timeZone).toISOString();
      const dataFimUtc = fromZonedTime(new Date(state.dataFim + 'T23:59:59'), timeZone).toISOString();

      if (isEdicao) {
        // ======================================================================
        // MODO EDIÇÃO AVANÇADA (Sprint 19.5)
        // ======================================================================
        console.log('🔄 Modo Edição Avançada - Preparando dados...');

        // Preparar eventos para envio (novos, atualizados e removidos)
        const eventosOriginais = campanhaParaEditar.eventosEspeciais || [];
        const eventosAtuais = state.eventosEspeciais;

        const eventosIdsOriginais = eventosOriginais.map((e: any) => e.id);
        const eventosIdsAtuais = eventosAtuais.filter((e: any) => e.id).map((e: any) => e.id);

        // Eventos a adicionar (não têm ID)
        const eventosAdicionar = eventosAtuais
          .filter((e: any) => !e.id)
          .map((evento: any) => ({
            nome: evento.nome,
            descricao: evento.descricao,
            multiplicador: Number(evento.multiplicador),
            dataInicio: fromZonedTime(new Date(evento.dataInicio + 'T00:00:00'), timeZone).toISOString(),
            dataFim: fromZonedTime(new Date(evento.dataFim + 'T23:59:59'), timeZone).toISOString(),
            ativo: !!evento.ativo,
            corDestaque: evento.corDestaque,
          }));

        // Eventos a atualizar (têm ID e ainda existem)
        const eventosAtualizar = eventosAtuais
          .filter((e: any) => e.id && eventosIdsOriginais.includes(e.id))
          .map((evento: any) => ({
            id: evento.id,
            nome: evento.nome,
            descricao: evento.descricao,
            multiplicador: Number(evento.multiplicador),
            dataInicio: fromZonedTime(new Date(evento.dataInicio + 'T00:00:00'), timeZone).toISOString(),
            dataFim: fromZonedTime(new Date(evento.dataFim + 'T23:59:59'), timeZone).toISOString(),
            ativo: !!evento.ativo,
            corDestaque: evento.corDestaque,
          }));

        // Eventos a remover (estavam no original mas não estão mais)
        const eventosRemover = eventosIdsOriginais.filter((id: string) => !eventosIdsAtuais.includes(id));

        // Payload de edição avançada: qualquer campo que não for string, number, boolean ou array deve ser enviado como objeto
        const payloadEdicaoAvancada: any = {
          // Campos básicos
          titulo: state.titulo,
          descricao: state.descricao,
          dataInicio: dataInicioUtc,
          dataFim: dataFimUtc,
          pontosReaisMaximo: Number(state.pontosReaisMaximo),
          percentualGerente: Number(state.percentualGerente) / 100, // CONVERSÃO: 10% → 0.1
          paraTodasOticas: !!state.paraTodasOticas,
          ...(state.tipoPedido ? { tipoPedido: state.tipoPedido } : {}),
          ...(state.regras ? { regras: state.regras } : {}),
          ...(state.tags && state.tags.length > 0 ? { tags: state.tags } : {}),
          ...(state.imagemCampanha16x9Url ? { imagemCampanha16x9Url: state.imagemCampanha16x9Url } : {}),
          ...(state.imagemCampanha1x1Url ? { imagemCampanha1x1Url: state.imagemCampanha1x1Url } : {}),
        };

        // Sprint 21: Produtos globais removidos da edição (agora são por requisito)

        // Eventos especiais
        if (eventosAdicionar.length > 0) {
          payloadEdicaoAvancada.eventosAdicionar = eventosAdicionar;
        }
        if (eventosAtualizar.length > 0) {
          payloadEdicaoAvancada.eventosAtualizar = eventosAtualizar;
        }
        if (eventosRemover.length > 0) {
          payloadEdicaoAvancada.eventosRemover = eventosRemover;
        }

        // Óticas - Diff (Adicionar/Remover)
        if (!state.paraTodasOticas) {
          const oticasOriginaisIds = (campanhaParaEditar.oticasAlvo || []).map((o: any) => o.id);
          const oticasAtuaisIds = state.oticasAlvoIds;

          const oticasAdicionar = oticasAtuaisIds.filter(id => !oticasOriginaisIds.includes(id));
          const oticasRemover = oticasOriginaisIds.filter((id: string) => !oticasAtuaisIds.includes(id));

          if (oticasAdicionar.length > 0) {
            payloadEdicaoAvancada.oticasAdicionar = oticasAdicionar;
          }
          if (oticasRemover.length > 0) {
            payloadEdicaoAvancada.oticasRemover = oticasRemover;
          }
        }

        console.log('📤 Payload de edição avançada:', payloadEdicaoAvancada);

        // Chamar endpoint de edição avançada
        await api.patch(`/campanhas/${campanhaParaEditar.id}/edicao-avancada`, payloadEdicaoAvancada);
        toast.success('Campanha atualizada com sucesso!');
      } else {
        // ======================================================================
        // MODO CRIAÇÃO (Original)
        // ======================================================================
        console.log('✨ Modo Criação - Preparando dados...');

        const eventosEspeciais = state.eventosEspeciais.map((evento) => ({
          nome: evento.nome,
          descricao: evento.descricao,
          multiplicador: Number(evento.multiplicador),
          dataInicio: fromZonedTime(new Date(evento.dataInicio + 'T00:00:00'), timeZone).toISOString(),
          dataFim: fromZonedTime(new Date(evento.dataFim + 'T23:59:59'), timeZone).toISOString(),
          ativo: !!evento.ativo,
          corDestaque: evento.corDestaque,
        }));

        // Sprint 21: Mapear cartelas com produtos por requisito
        const cartelasParaEnvio = state.cartelas.map((cartela) => ({
          ...cartela,
          requisitos: cartela.requisitos.map((requisito) => ({
            descricao: requisito.descricao,
            quantidade: requisito.quantidade,
            tipoUnidade: requisito.tipoUnidade,
            ordem: requisito.ordem,
            // Sprint 21: Produtos por requisito
            ...(requisito.importSessionId ? { importSessionId: requisito.importSessionId } : {}),
            ...(requisito.produtos && requisito.produtos.length > 0 ? { produtos: requisito.produtos } : {}),
            // DEPRECADO: Condições (mantido para compatibilidade)
            ...(requisito.condicoes && requisito.condicoes.length > 0 ? {
              condicoes: requisito.condicoes.map((condicao) => ({
                ...condicao,
                valor: Array.isArray(condicao.valor)
                  ? condicao.valor.join(',')
                  : condicao.valor,
              })),
            } : {}),
          })),
        }));

        const payloadCriacao: any = {
          titulo: state.titulo,
          descricao: state.descricao,
          dataInicio: dataInicioUtc,
          dataFim: dataFimUtc,
          pontosReaisMaximo: Number(state.pontosReaisMaximo),
          percentualGerente: Number(state.percentualGerente) / 100, // CONVERSÃO: 10% → 0.1
          paraTodasOticas: !!state.paraTodasOticas,
          cartelas: cartelasParaEnvio,
          // Sprint 21: produtosCampanha REMOVIDO - produtos agora são sempre por requisito
          ...(state.tipoPedido ? { tipoPedido: state.tipoPedido } : {}),
          ...(state.regras ? { regras: state.regras } : {}),
          ...(state.tags && state.tags.length > 0 ? { tags: state.tags } : {}),
          ...(eventosEspeciais.length > 0 ? { eventosEspeciais } : {}),
          ...(state.imagemCampanha16x9Url ? { imagemCampanha16x9Url: state.imagemCampanha16x9Url } : {}),
          ...(state.imagemCampanha1x1Url ? { imagemCampanha1x1Url: state.imagemCampanha1x1Url } : {}),
          ...(!state.paraTodasOticas ? { oticasAlvoIds: state.oticasAlvoIds } : {}),
        };

        console.log('📤 Payload de criação:', payloadCriacao);
        console.log('📦 Total de cartelas:', payloadCriacao.cartelas.length);
        payloadCriacao.cartelas.forEach((cartela: any, idx: number) => {
          console.log(`  📋 Cartela ${idx + 1}:`, cartela.requisitos.length, 'requisitos');
          cartela.requisitos.forEach((req: any, reqIdx: number) => {
            const prodCount = req.produtos?.length || 0;
            const hasSession = !!req.importSessionId;
            console.log(`    ✅ Requisito ${reqIdx + 1}: ${prodCount} produtos ${hasSession ? `(sessionId: ${req.importSessionId})` : ''}`);
          });
        });

        const response = await api.post('/campanhas', payloadCriacao);
        console.log('✅ Campanha criada:', response.data);
        toast.success('Campanha criada com sucesso!');
      }

      // Aguardar um pouco para garantir que o banco confirmou
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fechar modal automaticamente após sucesso
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ Erro ao salvar campanha:', error);
      console.error('📋 Response data:', error.response?.data);
      console.error('📋 Response status:', error.response?.status);
      
      // Extrair mensagem de erro detalhada
      let errorMessage = 'Erro ao salvar campanha';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
          
          // Se houver array de erros de validação
          if (Array.isArray(error.response.data.message)) {
            errorMessage = error.response.data.message.join(', ');
          }
        }
      }
      
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Aviso para telas pequenas
  if (isSmallScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
        >
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4">
              <Monitor className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Tela Muito Pequena
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              A criação de campanhas contém muitas informações e campos que exigem uma tela maior para melhor experiência.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <Monitor className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div className="text-left">
                <p className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
                  Resolução Recomendada
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Mínimo: 1280x720 pixels (HD)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <Smartphone className="w-6 h-6 text-gray-400 flex-shrink-0" />
              <div className="text-left">
                <p className="font-semibold text-gray-900 dark:text-gray-300 text-sm">
                  Sua Tela Atual
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight} pixels` : 'Detectando...'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all"
          >
            Entendi
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            💡 Acesse de um computador ou notebook para criar campanhas
          </p>
        </motion.div>
      </div>
    );
  }

  // Sprint 21: Removido step "Produtos" - agora produtos são configurados por requisito nas Cartelas
  const steps = [
    { number: 1, title: 'Informações Gerais', icon: Info },
    { number: 2, title: 'Óticas Vinculadas', icon: Building2 },
    { number: 3, title: 'Cartelas e Produtos', icon: Layers }, // Renomeado: inclui produtos por requisito
    { number: 4, title: 'Eventos Multiplicadores', icon: Zap },
    { number: 5, title: 'Regras', icon: FileText },
    { number: 6, title: 'Revisão', icon: Check },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal - Tela Quase Completa */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-4 md:inset-10 z-50 overflow-hidden"
          >
            <div className="w-full h-full bg-gradient-to-br from-white via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700">
              {/* Header */}
              <div className="relative p-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {isEdicao ? `Editar: ${campanhaParaEditar.titulo}` : 'Nova Campanha'}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {isEdicao
                        ? 'Modifique as informações da campanha (cartelas não podem ser editadas)'
                        : 'Configure todos os detalhes da sua campanha de vendas'}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => (
                    <div key={step.number} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                            currentStep > step.number
                              ? 'bg-green-500 text-white shadow-lg shadow-green-500/50'
                              : currentStep === step.number
                              ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {currentStep > step.number ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <step.icon className="h-5 w-5" />
                          )}
                        </div>
                        <span className="text-xs mt-2 text-gray-600 dark:text-gray-400 hidden xl:block text-center">
                          {step.title}
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`h-1 flex-1 transition-all duration-500 ${
                            currentStep > step.number 
                              ? 'bg-green-500' 
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Content - Layout Split */}
              <div className="flex-1 overflow-hidden flex">
                {/* Lado Esquerdo - Preview (40%) */}
                <div className="hidden xl:block w-2/5 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                  <PreviewCampanha state={state} currentStep={currentStep} />
                </div>

                {/* Lado Direito - Formulário (60%) */}
                <div className="flex-1 overflow-y-auto p-6 xl:p-8">
                  <AnimatePresence mode="wait">
                    {currentStep === 1 && (
                      <Step1DadosBasicos
                        key="step1"
                        state={state}
                        setState={setState}
                        modoEdicao={!!campanhaParaEditar}
                      />
                    )}
                    {currentStep === 2 && (
                      <Step2Targeting key="step2" state={state} setState={setState} />
                    )}
                    {/* Sprint 21: Step3Produtos REMOVIDO - produtos agora são configurados por requisito */}
                    {currentStep === 3 && (
                      <Step3Cartelas
                        key="step3"
                        state={state}
                        setState={setState}
                        modoEdicao={!!campanhaParaEditar}
                        cartelasOriginais={campanhaParaEditar?.cartelas || []}
                        campanhaId={campanhaParaEditar?.id}
                      />
                    )}
                    {currentStep === 4 && (
                      <Step4EventosEspeciais key="step4" state={state} setState={setState} />
                    )}
                    {currentStep === 5 && (
                      <Step5Regras key="step5" state={state} setState={setState} />
                    )}
                    {currentStep === 6 && (
                      <Step6Revisao key="step6" state={state} />
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="px-5 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-gray-300 dark:border-gray-600 shadow-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>

                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Etapa {currentStep} de {totalSteps}
                </div>

                {currentStep < totalSteps ? (
                  <button
                    onClick={handleNext}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:from-blue-600 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30"
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-green-500/30"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        {isEdicao ? 'Atualizar' : 'Criar'} Campanha
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
