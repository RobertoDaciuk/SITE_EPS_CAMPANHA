"use client";

/**
 * ============================================================================
 * PÁGINA: Validação de Campanhas - Design Magnífico V2.0
 * ============================================================================
 * 
 * Design Premium com:
 * - Animações Framer Motion suaves
 * - Glassmorphism e gradientes
 * - Layout responsivo perfeito
 * - Feedback visual rico
 * - UX inspirada em /perfil
 * 
 * @module AdminValidacao
 * ============================================================================
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/ContextoAutenticacao";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  Save,
  CheckCircle2,
  Settings,
  Target,
  XCircle,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Sparkles,
  Upload,
  FileCheck,
  Zap,
  ListChecks,
  Eye,
  Trash2,
  ChevronDown,
  Info,
  Columns,
  Play,
  Package,
  Clock,
  RefreshCw,
  History,
  Activity,
  Tag,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import UploadPlanilha from "@/components/validacao/UploadPlanilha";
import api from "@/lib/axios";

// ⚡ CODE SPLITTING: Componentes pesados carregados sob demanda
const DashboardValidacao = dynamic(
  () => import("@/components/validacao/DashboardValidacao"),
  {
    loading: () => import("@/components/validacao/DashboardSkeleton").then(m => <m.default />),
    ssr: false, // Gráficos não precisam de SSR
  }
);

const ModalDetalhesValidacao = dynamic(
  () => import("@/components/validacao/ModalDetalhesValidacao"),
  { ssr: false }
);

const ModalFormatoData = dynamic(
  () => import("@/components/validacao/ModalFormatoData"),
  { ssr: false }
);

/**
 * ========================================
 * INTERFACES E TIPOS
 * ========================================
 */

/**
 * Interface para uma campanha disponível para seleção
 */
interface CampanhaParaSelecao {
  id: string;
  titulo: string;
  status: string;
  dataInicio: string;
  dataFim: string;
}

/**
 * Interface para um envio detalhe
 */
interface EnvioDetalhe {
  id: string;
  numeroPedido: string;
  status: "VALIDADO" | "REJEITADO" | "CONFLITO_MANUAL" | "REVALIDADO" | "EM_ANALISE";
  motivo?: string;
  infoConflito?: string;
  vendedor: {
    id: string;
    nome: string;
    email: string;
  };
  optica: {
    nome: string;
    cnpj: string;
  };
  campanha: {
    id: string;
    titulo: string;
  };
  requisito: {
    descricao: string;
  };
  codigoReferencia: string;
  valorPontos: number;
  dataEnvio: string;
  dataValidacao?: string;
}

/**
 * Interface para o resultado do processamento retornado pela API
 * Espelha a resposta de POST /api/validacao/processar
 */
interface ResultadoProcessamento {
  mensagem: string;
  totalProcessados: number;
  validado: number;
  rejeitado: number;
  conflito_manual: number;
  em_analise: number;
  revalidado: number;
  detalhes: EnvioDetalhe[];
}

/**
 * Enum dos campos mapeáveis da planilha
 * Estes valores correspondem aos campos esperados pelo backend
 */
const CAMPOS_MAPEAVEIS = {
  IGNORAR: "IGNORAR",
  NUMERO_PEDIDO_OS: "NUMERO_PEDIDO_OS",
  NUMERO_PEDIDO_OPTICLICK: "NUMERO_PEDIDO_OPTICLICK",
  NUMERO_PEDIDO_ONLINE: "NUMERO_PEDIDO_ONLINE",
  NUMERO_PEDIDO_ENVELOPE: "NUMERO_PEDIDO_ENVELOPE",
  DATA_VENDA: "DATA_VENDA",
  NOME_PRODUTO: "NOME_PRODUTO",
  CNPJ_OTICA: "CNPJ_OTICA",
  CPF: "CPF",
  VALOR_VENDA: "VALOR_VENDA",
  CODIGO_REFERENCIA: "CODIGO_REFERENCIA",
} as const;

/**
 * Array de opções para os dropdowns de mapeamento
 */
const OPCOES_MAPEAMENTO = [
  { value: CAMPOS_MAPEAVEIS.IGNORAR, label: "Ignorar Coluna", obrigatorio: false },
  {
    value: CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_OS,
    label: "Número Pedido (OS/OP EPS)",
    obrigatorio: false,
    grupo: "numeroPedido",
  },
  {
    value: CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_OPTICLICK,
    label: "Número Pedido (OptiClick)",
    obrigatorio: false,
    grupo: "numeroPedido",
  },
  {
    value: CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_ONLINE,
    label: "Número Pedido (EPSWEB)",
    obrigatorio: false,
    grupo: "numeroPedido",
  },
  {
    value: CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_ENVELOPE,
    label: "Número Pedido (Envelope da Ótica)",
    obrigatorio: false,
    grupo: "numeroPedido",
  },
  {
    value: CAMPOS_MAPEAVEIS.DATA_VENDA,
    label: "Data da Venda *",
    obrigatorio: true,
  },
  {
    value: CAMPOS_MAPEAVEIS.NOME_PRODUTO,
    label: "Nome do Produto (Opcional)",
    obrigatorio: false,
  },
  {
    value: CAMPOS_MAPEAVEIS.CNPJ_OTICA,
    label: "CNPJ da Ótica *",
    obrigatorio: true,
  },
  { value: CAMPOS_MAPEAVEIS.CPF, label: "CPF (Opcional)", obrigatorio: false },
  {
    value: CAMPOS_MAPEAVEIS.VALOR_VENDA,
    label: "Valor da Venda (Opcional)",
    obrigatorio: false,
  },
  {
    value: CAMPOS_MAPEAVEIS.CODIGO_REFERENCIA,
    label: "Código de Referência *",
    obrigatorio: true,
  },
];

// ============================================================================
// VARIANTES DE ANIMAÇÃO
// ============================================================================

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

/**
 * ========================================
 * PÁGINA: Admin - Validação
 * ========================================
 * 
 * Página protegida para ADMIN realizar upload, mapeamento, validação
 * e processamento de planilhas de campanhas.
 * 
 * Funcionalidades:
 * - Upload de planilha (.xlsx, .xls, .csv)
 * - Parsing no cliente com FileReader + xlsx
 * - Mapeamento de colunas com persistência (salvar/carregar)
 * - Seleção de campanha ativa
 * - Modo simulação
 * - Validação para habilitar processamento
 * - Acionamento do "Robô" de validação via API
 * - Exibição de resultados do processamento
 * - Proteção de rota (apenas ADMIN)
 * 
 * Sprint: 17.3 - Admin - Validação (Acionando o Robô)
 * Tarefa: 41
 */
export default function ValidacaoPage() {
  // ========================================
  // HOOKS: Autenticação e Navegação
  // ========================================
  const { usuario, estaAutenticado, carregando: isAuthLoading } = useAuth();
  const router = useRouter();

  // ========================================
  // ESTADOS: Sistema de Abas (NOVO - Sprint 19)
  // ========================================
  type TabAtiva = "validacao" | "historico" | "dashboard";
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>("validacao");

  // ========================================
  // ESTADOS: Histórico de Validações (NOVO - Sprint 19)
  // ========================================
  const [historicos, setHistoricos] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [erroHistorico, setErroHistorico] = useState<string | null>(null);
  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const itensPorPaginaHistorico = 10;

  // ========================================
  // ESTADOS: Dashboard de Estatísticas (NOVO - Sprint 19)
  // ========================================
  const [statsDashboard, setStatsDashboard] = useState<any>(null);
  const [carregandoDashboard, setCarregandoDashboard] = useState(false);
  const [erroDashboard, setErroDashboard] = useState<string | null>(null);

  // ========================================
  // ESTADOS: Dados da Planilha
  // ========================================
  const [cabecalhos, setCabecalhos] = useState<string[]>([]);
  const [linhasPreview, setLinhasPreview] = useState<any[]>([]);
  const [linhasCompletas, setLinhasCompletas] = useState<any[]>([]);
  const [arquivoProcessado, setArquivoProcessado] = useState<File | null>(null);

  // ========================================
  // ESTADOS: Mapeamento de Colunas
  // ========================================
  const [mapaColunas, setMapaColunas] = useState<Record<string, string>>({});
  const [isSavingMap, setIsSavingMap] = useState(false);

  // ========================================
  // ESTADOS: Campanhas e Opções
  // ========================================
  const [campanhasDisponiveis, setCampanhasDisponiveis] = useState<
    CampanhaParaSelecao[]
  >([]);
  const [campanhaIdSelecionada, setCampanhaIdSelecionada] = useState("");
  const [ehSimulacao, setEhSimulacao] = useState(true);
  const [isLoadingCampanhas, setIsLoadingCampanhas] = useState(false);

  // ========================================
  // ESTADOS: Processamento (NOVO - Tarefa 41)
  // ========================================
  const [isLoadingProcessamento, setIsLoadingProcessamento] = useState(false);
  const [resultadoProcessamento, setResultadoProcessamento] =
    useState<ResultadoProcessamento | null>(null);

  // ========================================
  // ESTADOS: Mapeamento Automático
  // ========================================
  const [mapeamentoCarregado, setMapeamentoCarregado] = useState(false);

  // ========================================
  // ESTADOS: Modal de Detalhes
  // ========================================
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [dadosModalDetalhes, setDadosModalDetalhes] = useState<{
    detalhes: any[];
    resumo: {
      totalProcessados: number;
      validado: number;
      rejeitado: number;
      conflito_manual: number;
      em_analise: number;
      revalidado: number;
    };
  } | null>(null);

  // ========================================
  // ESTADOS: Modal de Formato de Data (NOVO)
  // ========================================
  const [modalFormatoDataAberto, setModalFormatoDataAberto] = useState(false);
  const [formatoDataAtual, setFormatoDataAtual] = useState("DD/MM/YYYY");

  // ========================================
  // EFEITO: Proteção de Rota (ADMIN)
  // ========================================
  useEffect(() => {
    if (isAuthLoading) return;

    if (!estaAutenticado) {
      toast.error("Você precisa estar autenticado para acessar esta página");
      router.push("/login");
      return;
    }

    if (usuario && usuario.papel !== "ADMIN") {
      toast.error(
        "Acesso negado! Esta página é exclusiva para administradores"
      );
      router.push("/");
      return;
    }
  }, [isAuthLoading, estaAutenticado, usuario, router]);

  // ========================================
  // EFEITO: Buscar Campanhas Ativas
  // ========================================
  useEffect(() => {
    if (!estaAutenticado || !usuario || usuario.papel !== "ADMIN") return;

    const buscarCampanhas = async () => {
      setIsLoadingCampanhas(true);
      try {
        const response = await api.get<CampanhaParaSelecao[]>("/campanhas");
        const campanhasAtivas = response.data.filter(
          (c) => c.status === "ATIVA"
        );
        setCampanhasDisponiveis(campanhasAtivas);
      } catch (error: any) {
        console.error("❌ Erro ao buscar campanhas:", error);
        toast.error("Erro ao carregar campanhas disponíveis");
      } finally {
        setIsLoadingCampanhas(false);
      }
    };

    buscarCampanhas();
  }, [estaAutenticado, usuario]);

  // ========================================
  // EFEITO: Carregar Mapeamento Salvo
  // ========================================
  useEffect(() => {
    if (!estaAutenticado || !usuario || usuario.papel !== "ADMIN") return;
    if (cabecalhos.length === 0 || mapeamentoCarregado) return;

    const carregarMapeamento = async () => {
      try {
        const response = await api.get("/validacao/mapeamento");
        const mapeamentoSalvo = response.data?.mapeamento;

        if (mapeamentoSalvo && typeof mapeamentoSalvo === "object") {
          const novoMapa: Record<string, string> = {};
          
          cabecalhos.forEach((cabecalho) => {
            if (cabecalho in mapeamentoSalvo) {
              novoMapa[cabecalho] = mapeamentoSalvo[cabecalho];
            } else {
              novoMapa[cabecalho] = CAMPOS_MAPEAVEIS.IGNORAR;
            }
          });

          setMapaColunas(novoMapa);
          setMapeamentoCarregado(true);
          toast.success("Mapeamento padrão carregado");
        }
      } catch (error: any) {
        console.error("❌ Erro ao carregar mapeamento:", error);
        // Não mostra erro ao usuário, apenas usa mapeamento padrão
      }
    };

    carregarMapeamento();
  }, [estaAutenticado, usuario, cabecalhos, mapeamentoCarregado]);

  // ========================================
  // FUNÇÃO: Carregar Mapa Salvo e Iniciar Mapeamento
  // ========================================
  const carregarMapaSalvoEIniciarMapeamento = useCallback(
    async (cabecalhosAtuais: string[]) => {
      try {
        const response = await api.get("/perfil/meu");
        const mapeamentoSalvo = response.data?.mapeamentoPlanilhaSalvo;

        const mapaInicial: Record<string, string> = {};

        cabecalhosAtuais.forEach((cabecalho) => {
          if (
            mapeamentoSalvo &&
            typeof mapeamentoSalvo === "object" &&
            cabecalho in mapeamentoSalvo
          ) {
            mapaInicial[cabecalho] = (mapeamentoSalvo as any)[cabecalho];
          } else {
            mapaInicial[cabecalho] = CAMPOS_MAPEAVEIS.IGNORAR;
          }
        });

        setMapaColunas(mapaInicial);
        toast.success("Mapeamento anterior carregado com sucesso");
      } catch (error: any) {
        console.error("❌ Erro ao carregar mapeamento salvo:", error);

        const mapaInicial: Record<string, string> = {};
        cabecalhosAtuais.forEach((cabecalho) => {
          mapaInicial[cabecalho] = CAMPOS_MAPEAVEIS.IGNORAR;
        });

        setMapaColunas(mapaInicial);
        toast("Nenhum mapeamento anterior encontrado", { icon: "ℹ️" });
      }
    },
    []
  );

  // ========================================
  // CALLBACK: Planilha Carregada (ATUALIZADO - Tarefa 41)
  // ========================================
  const handlePlanilhaCarregada = useCallback(
    async (cabecalhosExtraidos: string[], linhas: any[], arquivo: File) => {
      // Armazenar cabeçalhos
      setCabecalhos(cabecalhosExtraidos);

      // ✅ CRÍTICO: Armazenar TODAS as linhas (não apenas preview)
      setLinhasCompletas(linhas);

      // Armazenar apenas preview (primeiras 10 linhas)
      setLinhasPreview(linhas.slice(0, 10));

      // Armazenar arquivo original
      setArquivoProcessado(arquivo);

      // Carregar mapeamento salvo e inicializar mapa
      await carregarMapaSalvoEIniciarMapeamento(cabecalhosExtraidos);
    },
    [carregarMapaSalvoEIniciarMapeamento]
  );

  // ========================================
  // HANDLER: Mudança de Mapeamento
  // ========================================
  const handleMapChange = useCallback(
    async (cabecalho: string, valorSelecionado: string) => {
      const novoMapa = {
        ...mapaColunas,
        [cabecalho]: valorSelecionado,
      };
      
      setMapaColunas(novoMapa);

      // Salvar automaticamente no backend
      try {
        await api.post("/validacao/mapeamento", {
          mapeamento: novoMapa,
        });
      } catch (error) {
        console.error("❌ Erro ao salvar mapeamento:", error);
        // Não mostra erro ao usuário para não interromper o fluxo
      }
    },
    [mapaColunas]
  );



  // ========================================
  // HANDLER: Limpar Dados (ATUALIZADO - Tarefa 41)
  // ========================================
  const handleLimparDados = () => {
    setCabecalhos([]);
    setLinhasPreview([]);
    setLinhasCompletas([]);
    setArquivoProcessado(null);
    setMapaColunas({});
    setCampanhaIdSelecionada("");
    setResultadoProcessamento(null); // ✅ NOVO: Limpa resultado
    toast.success("Dados limpos com sucesso");
  };

  // ========================================
  // VALIDAÇÃO: Processar Habilitado
  // ========================================
  const isProcessarHabilitado = useMemo(() => {
    if (!campanhaIdSelecionada) return false;

    const valoresMapeados = Object.values(mapaColunas).filter(
      (valor) => valor !== CAMPOS_MAPEAVEIS.IGNORAR
    );

    const temNumeroPedido = valoresMapeados.some((valor) =>
      [
        CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_OS,
        CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_OPTICLICK,
        CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_ONLINE,
        CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_ENVELOPE,
      ].includes(valor as any)
    );

    const camposObrigatorios = [
      CAMPOS_MAPEAVEIS.DATA_VENDA,
      CAMPOS_MAPEAVEIS.CNPJ_OTICA,
      CAMPOS_MAPEAVEIS.CODIGO_REFERENCIA,
    ];

    const todosObrigatoriosMapeados = camposObrigatorios.every((campo) =>
      valoresMapeados.includes(campo)
    );

    return temNumeroPedido && todosObrigatoriosMapeados;
  }, [campanhaIdSelecionada, mapaColunas]);

  // ========================================
  // HANDLER: Processar Planilha (IMPLEMENTADO - Tarefa 41)
  // ========================================
  /**
   * Aciona o "Robô" de validação via POST /api/validacao/processar
   * 
   * Envia:
   * - campanhaId: ID da campanha selecionada
   * - ehSimulacao: true/false (define se altera dados reais)
   * - mapaColunas: Mapa de colunas cabeçalho->campo_sistema
   * - linhasPlanilha: TODAS as linhas da planilha (não apenas preview)
   * 
   * Recebe:
   * - ResultadoProcessamento (mensagem, totalProcessados, validado, rejeitado, conflito_manual)
   */
  const handleProcessarPlanilha = async () => {
    // Limpa resultado anterior
    setResultadoProcessamento(null);
    setIsLoadingProcessamento(true);

    // ========================================
    // MONTAR PAYLOAD
    // ========================================
    const payload = {
      campanhaId: campanhaIdSelecionada,
      ehSimulacao: ehSimulacao,
      mapaColunas: mapaColunas,
      linhasPlanilha: linhasCompletas, // ✅ CRÍTICO: Envia TODAS as linhas
      formatoData: formatoDataAtual, // Formato de data selecionado pelo usuário
    };

    // ========================================
    // CHAMAR API COM TOAST.PROMISE
    // ========================================
    try {
      const promise = api.post<ResultadoProcessamento>(
        "/validacao/processar",
        payload
      );

      toast.promise(promise, {
        loading: `Processando ${linhasCompletas.length} linhas... ${
          ehSimulacao ? "(Simulação)" : "(Modo Real)"
        }`,
        success: (response) => {
          setResultadoProcessamento(response.data);
          return response.data.mensagem || "Processamento concluído!";
        },
        error: (err) => {
          console.error("❌ Erro no processamento:", err);
          return (
            err.response?.data?.message ||
            "Erro desconhecido durante o processamento."
          );
        },
      });

      await promise; // Aguarda resolução para o finally
    } catch (error) {
      // Erro já tratado pelo toast.promise
      console.error("❌ Falha no processamento:", error);
    } finally {
      setIsLoadingProcessamento(false);
    }
  };

  // ========================================
  // FUNÇÃO: Buscar Histórico de Validações (NOVO - Sprint 19)
  // ========================================
  const buscarHistorico = useCallback(async () => {
    setCarregandoHistorico(true);
    setErroHistorico(null);

    try {
      const response = await api.get("/validacao/historico", {
        params: {
          limit: 50, // Buscar últimas 50 validações
        },
      });

      setHistoricos(response.data);
    } catch (error: any) {
      console.error("❌ Erro ao buscar histórico:", error);
      setErroHistorico(
        error.response?.data?.message || "Erro ao carregar histórico de validações"
      );
      toast.error("Não foi possível carregar o histórico");
    } finally {
      setCarregandoHistorico(false);
    }
  }, []);

  // ========================================
  // EFFECT: Carregar histórico ao trocar para aba Histórico
  // ========================================
  useEffect(() => {
    if (tabAtiva === "historico" && historicos.length === 0) {
      buscarHistorico();
    }
  }, [tabAtiva, historicos.length, buscarHistorico]);

  // ========================================
  // FUNÇÃO: Buscar Estatísticas do Dashboard (NOVO - Sprint 19)
  // ========================================
  const buscarStatsDashboard = useCallback(async () => {
    setCarregandoDashboard(true);
    setErroDashboard(null);

    try {
      const response = await api.get("/validacao/dashboard-stats");
      setStatsDashboard(response.data);
    } catch (error: any) {
      console.error("❌ Erro ao buscar estatísticas:", error);
      setErroDashboard(
        error.response?.data?.message || "Erro ao carregar estatísticas do dashboard"
      );
      toast.error("Não foi possível carregar as estatísticas");
    } finally {
      setCarregandoDashboard(false);
    }
  }, []);

  // ========================================
  // EFFECT: Carregar dashboard ao trocar para aba Dashboard
  // ========================================
  useEffect(() => {
    if (tabAtiva === "dashboard" && !statsDashboard) {
      buscarStatsDashboard();
    }
  }, [tabAtiva, statsDashboard, buscarStatsDashboard]);

  // ========================================
  // RENDERIZAÇÃO: Loading de Autenticação
  // ========================================
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600 font-medium">
            Verificando permissões...
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDERIZAÇÃO: Página Principal
  // ========================================
  return (
    <div className="flex-1 space-y-6 md:space-y-8 pb-8">
      {/* ========================================
          HERO HEADER - Gradiente Premium
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl md:rounded-3xl p-6 md:p-10
                   bg-gradient-to-br from-primary/10 via-primary/5 to-transparent
                   border border-primary/20 backdrop-blur-sm"
      >
        {/* Decoração de fundo */}
        <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-32 md:w-48 h-32 md:h-48 bg-purple-500/10 rounded-full blur-3xl -z-10" />

        <div className="relative flex flex-col sm:flex-row items-start gap-4 md:gap-6">
          {/* Ícone */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl
                       bg-gradient-to-br from-primary to-primary-light
                       shadow-lg shadow-primary/30"
          >
            <FileSpreadsheet className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" />
          </motion.div>

          {/* Texto */}
          <div className="flex-1 space-y-2 md:space-y-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center gap-2 md:gap-3 flex-wrap"
            >
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
                Validação de <span className="text-gradient">Campanhas</span>
              </h1>
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary animate-pulse" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-sm md:text-base lg:text-lg text-muted-foreground leading-relaxed max-w-3xl"
            >
              Processe planilhas de vendas com validação automática de CNPJ, regras de negócio e cálculo de pontos.
              Sistema inteligente com detecção de conflitos e múltiplos modos de validação.
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* ========================================
          NAVEGAÇÃO DE ABAS (NOVO - Sprint 19)
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2 p-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50"
      >
        <button
          onClick={() => setTabAtiva("validacao")}
          className={`
            flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold
            transition-all duration-200
            ${
              tabAtiva === "validacao"
                ? "bg-gradient-to-r from-primary to-primary-light text-primary-foreground shadow-lg shadow-primary/30"
                : "bg-transparent text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700"
            }
          `}
        >
          <FileCheck className="w-5 h-5" />
          <span className="hidden sm:inline">Validação de Vendas</span>
          <span className="sm:hidden">Validação</span>
        </button>

        <button
          onClick={() => setTabAtiva("historico")}
          className={`
            flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold
            transition-all duration-200
            ${
              tabAtiva === "historico"
                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30"
                : "bg-transparent text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700"
            }
          `}
        >
          <History className="w-5 h-5" />
          <span className="hidden sm:inline">Histórico</span>
          <span className="sm:hidden">Histórico</span>
        </button>

        <button
          onClick={() => setTabAtiva("dashboard")}
          className={`
            flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold
            transition-all duration-200
            ${
              tabAtiva === "dashboard"
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
                : "bg-transparent text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700"
            }
          `}
        >
          <Activity className="w-5 h-5" />
          <span className="hidden sm:inline">Dashboard</span>
          <span className="sm:hidden">Dashboard</span>
        </button>
      </motion.div>

      {/* ========================================
          CONTEÚDO DAS ABAS
          ======================================== */}
      
      {/* ABA 1: VALIDAÇÃO DE VENDAS */}
      {tabAtiva === "validacao" && (
        <AnimatePresence mode="wait">
          <motion.div
            key="validacao"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
      {/* ========================================
          CARD 1: Upload de Planilha
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="glass rounded-xl md:rounded-2xl border border-border/50 p-6 md:p-8 shadow-lg"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl
                         bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
            <span className="text-lg md:text-xl font-black text-primary">1</span>
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-foreground">Upload da Planilha</h2>
            <p className="text-xs md:text-sm text-muted-foreground">Arraste ou selecione um arquivo .xlsx, .xls ou .csv</p>
          </div>
        </div>
        
        <UploadPlanilha onPlanilhaCarregada={handlePlanilhaCarregada} />
      </motion.div>

      {/* ========================================
          CARD 2: Informações da Planilha
          ======================================== */}
      <AnimatePresence>
        {arquivoProcessado && cabecalhos.length > 0 && (
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.6 }}
            className="glass rounded-xl md:rounded-2xl border border-border/50 p-6 md:p-8 shadow-lg"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl
                               bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
                  <span className="text-lg md:text-xl font-black text-primary">2</span>
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-foreground">Informações da Planilha</h2>
                  <p className="text-xs md:text-sm text-muted-foreground">Dados extraídos do arquivo</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLimparDados}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive 
                         hover:bg-destructive/10 rounded-lg transition-colors border border-destructive/20"
              >
                <Trash2 className="w-4 h-4" />
                Limpar Dados
              </motion.button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
                <p className="text-xs md:text-sm text-blue-600 dark:text-blue-400 font-medium mb-1 relative">
                  Arquivo
                </p>
                <p className="text-base md:text-lg font-bold text-blue-700 dark:text-blue-300 truncate relative">
                  {arquivoProcessado.name}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl" />
                <p className="text-xs md:text-sm text-green-600 dark:text-green-400 font-medium mb-1 relative">
                  Total de Linhas
                </p>
                <p className="text-base md:text-lg font-bold text-green-700 dark:text-green-300 relative">
                  {linhasCompletas.length.toLocaleString("pt-BR")}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
                <p className="text-xs md:text-sm text-purple-600 dark:text-purple-400 font-medium mb-1 relative">
                  Colunas
                </p>
                <p className="text-base md:text-lg font-bold text-purple-700 dark:text-purple-300 relative">
                  {cabecalhos.length}
                </p>
              </motion.div>
            </div>

            {/* Cabeçalhos */}
            <div>
              <h3 className="text-base md:text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-primary" />
                Cabeçalhos Identificados
              </h3>
              <div className="flex flex-wrap gap-2">
                {cabecalhos.map((cabecalho, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * index }}
                    className="px-3 py-1.5 bg-primary/10 text-primary text-xs md:text-sm font-medium 
                             rounded-full border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    {cabecalho || `(Coluna ${index + 1})`}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 3: Pré-visualização dos Dados */}
      <AnimatePresence>
        {linhasPreview.length > 0 && (
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/95 to-white/90 backdrop-blur-xl border border-gray-200/50 shadow-xl mb-8"
          >
            {/* Header com gradiente */}
            <div className="relative p-6 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 border-b border-gray-200/50">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-xl font-bold shadow-lg"
                  >
                    3
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Eye className="w-5 h-5 text-purple-500" />
                      Pré-visualização dos Dados
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Confira os primeiros registros da planilha
                    </p>
                  </div>
                </div>
                <motion.span
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-gray-700 text-sm font-semibold rounded-full border border-blue-500/20"
                >
                  Primeiras 10 linhas
                </motion.span>
              </div>
            </div>

            {/* Alert de visualização limitada */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="m-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Visualização Limitada
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Exibindo apenas as 10 primeiras linhas de{" "}
                    <span className="font-bold">{linhasCompletas.length}</span> linhas totais. 
                    A validação completa processará todos os dados.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Tabela com glassmorphism */}
            <div className="p-6 pt-0">
              <div className="overflow-x-auto rounded-xl border border-gray-200/50 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200/50 sticky left-0 bg-gray-50 z-10">
                        #
                      </th>
                      {cabecalhos.map((cabecalho, index) => (
                        <th
                          key={index}
                          className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200/50 last:border-r-0 whitespace-nowrap"
                        >
                          {cabecalho || `Coluna ${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {linhasPreview.map((linha, linhaIndex) => (
                      <motion.tr
                        key={linhaIndex}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + linhaIndex * 0.05 }}
                        className="hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/50 transition-all duration-300"
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-gray-500 border-r border-gray-200/50 sticky left-0 bg-white group-hover:bg-purple-50/50">
                          {linhaIndex + 1}
                        </td>
                        {cabecalhos.map((cabecalho, colIndex) => {
                          const valor = linha[cabecalho];
                          return (
                            <td
                              key={colIndex}
                              className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200/50 last:border-r-0 whitespace-nowrap"
                            >
                              {valor !== undefined &&
                              valor !== null &&
                              valor !== ""
                                ? String(valor)
                                : "-"}
                            </td>
                          );
                        })}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer com contador */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-4 text-sm text-gray-500 text-center font-medium"
              >
                Exibindo linhas <span className="font-bold text-purple-600">1-{linhasPreview.length}</span> de{" "}
                <span className="font-bold text-purple-600">{linhasCompletas.length}</span> linhas totais
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 4: Mapeamento de Colunas */}
      <AnimatePresence>
        {cabecalhos.length > 0 && (
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/95 to-white/90 backdrop-blur-xl border border-gray-200/50 shadow-xl mb-8"
          >
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border-b border-gray-200/50">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-xl font-bold shadow-lg"
                >
                  4
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Columns className="w-5 h-5 text-blue-500" />
                    Mapeamento de Colunas
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Vincule cada coluna ao campo do sistema (salva automaticamente)
                  </p>
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div className="px-6 pt-6">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-gray-600 mb-6"
              >
                Associe cada coluna da planilha ao campo correspondente do sistema. 
                Campos marcados com <span className="text-red-500 font-bold">*</span> são obrigatórios.
              </motion.p>

              {/* Tabela de mapeamento */}
              <div className="overflow-x-auto rounded-xl border border-gray-200/50 shadow-sm mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Coluna da Planilha
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Exemplo (1ª linha)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Mapear Para
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {cabecalhos.map((cabecalho, index) => {
                      const exemplo = linhasPreview[0]?.[cabecalho];
                      return (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.03 }}
                          className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-300"
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            {cabecalho || `(Coluna ${index + 1})`}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                            {exemplo !== undefined &&
                            exemplo !== null &&
                            exemplo !== ""
                              ? String(exemplo)
                              : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={
                                mapaColunas[cabecalho] || CAMPOS_MAPEAVEIS.IGNORAR
                              }
                              onChange={(e) =>
                                handleMapChange(cabecalho, e.target.value)
                              }
                              className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white hover:border-gray-300"
                            >
                              {OPCOES_MAPEAMENTO.map((opcao) => (
                                <option key={opcao.value} value={opcao.value}>
                                  {opcao.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Card de requisitos */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200/50 rounded-xl mb-6"
              >
                <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  Requisitos de Mapeamento
                </h4>
                <ul className="text-xs text-blue-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span><span className="font-bold">Número do Pedido:</span> Pelo menos um dos campos de número de pedido deve ser mapeado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span><span className="font-bold">Data da Venda:</span> Campo obrigatório</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span><span className="font-bold">CNPJ da Ótica:</span> Campo obrigatório</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span><span className="font-bold">Código de Referência:</span> Campo obrigatório</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span><span className="font-bold">Nome do Produto e CPF:</span> Campos opcionais</span>
                  </li>
                </ul>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 5: Seleção de Campanha */}
      <AnimatePresence>
        {cabecalhos.length > 0 && (
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/95 to-white/90 backdrop-blur-xl border border-gray-200/50 shadow-xl mb-8"
          >
            <div className="relative p-6 bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-emerald-500/10 border-b border-gray-200/50">
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 text-white rounded-xl font-bold shadow-lg"
                >
                  5
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-500" />
                    Selecionar Campanha
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Valide todas as campanhas ou escolha uma específica
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="campanha-select"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Campanha Ativa <span className="text-red-500">*</span>
                  </label>
                  {isLoadingCampanhas ? (
                    <div className="flex items-center gap-2 text-gray-500 p-4 bg-gray-50 rounded-xl">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Carregando campanhas...</span>
                    </div>
                  ) : (
                    <select
                      id="campanha-select"
                      value={campanhaIdSelecionada}
                      onChange={(e) => setCampanhaIdSelecionada(e.target.value)}
                      className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white hover:border-gray-300"
                    >
                      <option value="">Selecione uma opção...</option>
                      <option value="TODAS" className="font-bold text-purple-600">
                        🎯 Validar Todas as Campanhas Ativas
                      </option>
                      <option disabled>──────────────────────</option>
                      {campanhasDisponiveis.map((campanha) => (
                        <option key={campanha.id} value={campanha.id}>
                          {campanha.titulo}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {campanhaIdSelecionada && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-4 rounded-xl border ${
                      campanhaIdSelecionada === "TODAS"
                        ? "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200/50"
                        : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {campanhaIdSelecionada === "TODAS" ? (
                        <>
                          <Target className="w-5 h-5 text-purple-600" />
                          <p className="text-sm font-bold text-purple-900">
                            Validando Todas as Campanhas
                          </p>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <p className="text-sm font-bold text-green-900">
                            Campanha Selecionada
                          </p>
                        </>
                      )}
                    </div>
                    <p className={`text-xs font-medium ${
                      campanhaIdSelecionada === "TODAS"
                        ? "text-purple-800"
                        : "text-green-800"
                    }`}>
                      {campanhaIdSelecionada === "TODAS"
                        ? `Processará envios de todas as ${campanhasDisponiveis.length} campanhas ativas`
                        : campanhasDisponiveis.find(
                            (c) => c.id === campanhaIdSelecionada
                          )?.titulo}
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 6: Opções de Processamento */}
      <AnimatePresence>
        {cabecalhos.length > 0 && (
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/95 to-white/90 backdrop-blur-xl border border-gray-200/50 shadow-xl mb-8"
          >
            <div className="relative p-6 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border-b border-gray-200/50">
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-xl font-bold shadow-lg"
                >
                  6
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-orange-500" />
                    Opções de Processamento
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Configure o modo de execução
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-white/50 rounded-xl border border-gray-200/50">
                  <input
                    type="checkbox"
                    id="modo-simulacao"
                    checked={ehSimulacao}
                    onChange={(e) => setEhSimulacao(e.target.checked)}
                    className="mt-1 w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="modo-simulacao"
                      className="text-sm font-bold text-gray-900 cursor-pointer"
                    >
                      Modo Simulação
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      Quando ativado, a planilha será processada apenas para validação, 
                      sem alterar dados reais no sistema.
                    </p>
                  </div>
                </div>

                {/* Configuração de Formato de Data */}
                <div className="flex items-start gap-3 p-4 bg-white/50 rounded-xl border border-gray-200/50">
                  <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          Formato de Data da Planilha
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Configure como as datas da planilha devem ser interpretadas
                        </p>
                      </div>
                      <motion.button
                        onClick={() => setModalFormatoDataAberto(true)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Configurar
                      </motion.button>
                    </div>
                    <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <span className="font-semibold">Formato atual:</span>{" "}
                        <span className="font-mono font-bold">{formatoDataAtual}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {ehSimulacao ? (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200/50 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-yellow-600" />
                      <p className="text-xs font-bold text-yellow-800">
                        Modo Simulação Ativo - Nenhum dado será alterado
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <p className="text-xs font-bold text-red-800">
                        Modo Real Ativo - Os dados serão processados e gravados
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 7: Processar Planilha */}
      <AnimatePresence>
        {cabecalhos.length > 0 && (
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/95 to-white/90 backdrop-blur-xl border border-gray-200/50 shadow-xl mb-8"
          >
            <div className="relative p-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border-b border-gray-200/50">
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-xl font-bold shadow-lg"
                >
                  7
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-500" />
                    Processar Planilha
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Execute a validação dos dados
                  </p>
                </div>
              </div>

              {!isProcessarHabilitado && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/50 rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-orange-800 mb-2">
                        Requisitos Pendentes
                      </p>
                      <ul className="text-xs text-orange-700 space-y-1">
                        {!campanhaIdSelecionada && (
                          <li>• Selecione uma campanha ativa</li>
                        )}
                        {!Object.values(mapaColunas).some((valor) =>
                          [
                            CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_OS,
                            CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_OPTICLICK,
                            CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_ONLINE,
                            CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_ENVELOPE,
                          ].includes(valor as any)
                        ) && <li>• Mapeie pelo menos um campo de Número do Pedido</li>}
                        {!Object.values(mapaColunas).includes(
                          CAMPOS_MAPEAVEIS.DATA_VENDA
                        ) && <li>• Mapeie o campo Data da Venda</li>}
                        {!Object.values(mapaColunas).includes(
                          CAMPOS_MAPEAVEIS.CNPJ_OTICA
                        ) && <li>• Mapeie o campo CNPJ da Ótica</li>}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.button
                whileHover={isProcessarHabilitado ? { scale: 1.02 } : {}}
                whileTap={isProcessarHabilitado ? { scale: 0.98 } : {}}
                onClick={handleProcessarPlanilha}
                disabled={!isProcessarHabilitado || isLoadingProcessamento}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {isLoadingProcessamento ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Processando {linhasCompletas.length} linhas...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    <span>
                      {isProcessarHabilitado
                        ? `Processar ${linhasCompletas.length} Linhas`
                        : "Configure todos os requisitos acima"}
                    </span>
                  </>
                )}
              </motion.button>

              {isProcessarHabilitado && !isLoadingProcessamento && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-3 text-xs text-center text-gray-500 font-medium"
                >
                  ✅ Todos os requisitos foram atendidos. Clique para processar a planilha.
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 8: Resultados do Processamento */}
      <AnimatePresence>
        {resultadoProcessamento && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/95 to-white/90 backdrop-blur-xl border-l-4 border-green-500 shadow-2xl mb-8"
          >
            {/* Header de Sucesso */}
            <div className="relative p-6 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 border-b border-gray-200/50">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full shadow-lg"
                >
                  <BarChart3 className="w-7 h-7 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Resultados do Processamento
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {resultadoProcessamento.mensagem}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Grid de Estatísticas Animadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Processados */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200/50 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-blue-700">
                        Total Processados
                      </p>
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-4xl font-black text-blue-900 mb-1">
                      {resultadoProcessamento.totalProcessados.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-blue-600 font-semibold">linhas da planilha</p>
                  </div>
                </motion.div>

                {/* Validados */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200/50 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-400/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-green-700">
                        ✅ Validados
                      </p>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-4xl font-black text-green-900 mb-1">
                      {resultadoProcessamento.validado.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-green-600 font-semibold">
                      {resultadoProcessamento.totalProcessados > 0
                        ? `${(
                            (resultadoProcessamento.validado /
                              resultadoProcessamento.totalProcessados) *
                            100
                          ).toFixed(1)}%`
                        : "0%"}{" "}
                      do total
                    </p>
                  </div>
                </motion.div>

                {/* Rejeitados */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl border border-red-200/50 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-400/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-red-700">
                        ❌ Rejeitados
                      </p>
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-4xl font-black text-red-900 mb-1">
                      {resultadoProcessamento.rejeitado.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-red-600 font-semibold">
                      {resultadoProcessamento.totalProcessados > 0
                        ? `${(
                            (resultadoProcessamento.rejeitado /
                              resultadoProcessamento.totalProcessados) *
                            100
                          ).toFixed(1)}%`
                        : "0%"}{" "}
                      do total
                    </p>
                  </div>
                </motion.div>

                {/* Conflitos Manuais */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="relative overflow-hidden bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl border border-yellow-200/50 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-yellow-700">
                        ⚠️ Conflitos
                      </p>
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <p className="text-4xl font-black text-yellow-900 mb-1">
                      {resultadoProcessamento.conflito_manual.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-yellow-600 font-semibold">
                      {resultadoProcessamento.totalProcessados > 0
                        ? `${(
                            (resultadoProcessamento.conflito_manual /
                              resultadoProcessamento.totalProcessados) *
                            100
                          ).toFixed(1)}%`
                        : "0%"}{" "}
                      do total
                    </p>
                  </div>
                </motion.div>

                {/* Em Análise */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-slate-100 p-5 rounded-xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gray-400/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-gray-700">
                        🕐 Em Análise
                      </p>
                      <Clock className="w-5 h-5 text-gray-600" />
                    </div>
                    <p className="text-4xl font-black text-gray-900 mb-1">
                      {resultadoProcessamento.em_analise.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-gray-600 font-semibold">
                      {resultadoProcessamento.totalProcessados > 0
                        ? `${(
                            (resultadoProcessamento.em_analise /
                              resultadoProcessamento.totalProcessados) *
                            100
                          ).toFixed(1)}%`
                        : "0%"}{" "}
                      aguardando
                    </p>
                  </div>
                </motion.div>

                {/* Revalidados - NOVO (Sprint 19) */}
                {resultadoProcessamento.revalidado > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-zinc-100 p-5 rounded-xl border border-slate-300/50 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-400/10 rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-slate-700">
                          🔄 Revalidados
                        </p>
                        <RefreshCw className="w-5 h-5 text-slate-600" />
                      </div>
                      <p className="text-4xl font-black text-slate-900 mb-1">
                        {resultadoProcessamento.revalidado.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-slate-600 font-semibold">
                        {resultadoProcessamento.totalProcessados > 0
                          ? `${(
                              (resultadoProcessamento.revalidado /
                                resultadoProcessamento.totalProcessados) *
                              100
                            ).toFixed(1)}%`
                          : "0%"}{" "}
                        recuperados
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Card de Informações */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200/50 mb-6"
              >
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Informações Detalhadas
                </h3>
                <ul className="text-xs text-gray-700 space-y-2.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Validados:</strong> Envios que atenderam a todos os
                      requisitos (CNPJ, regras, sem conflitos). {ehSimulacao ? "Em modo simulação, nenhum dado foi alterado." : "Foram processados e recompensas foram atribuídas."}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Rejeitados:</strong> Envios que falharam em alguma
                      validação (CNPJ inválido, regras não atendidas, código de
                      referência inválido).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Conflitos Manuais:</strong> Envios que requerem
                      análise manual (ex: mesmo pedido validado por dois vendedores
                      diferentes).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Em Análise:</strong> Pedidos que não foram encontrados
                      na planilha enviada. Permaneceram com status EM_ANALISE para
                      análise futura ou processamento em outro lote.
                    </span>
                  </li>
                  {resultadoProcessamento.revalidado > 0 && (
                    <li className="flex items-start gap-2">
                      <RefreshCw className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Revalidados:</strong> Pedidos anteriormente rejeitados que foram 
                        encontrados na planilha atual e passaram em todas as validações. 
                        Foram automaticamente aprovados pois a campanha ainda está ativa.
                      </span>
                    </li>
                  )}
                </ul>
              </motion.div>

              {/* Ações */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLimparDados}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold rounded-xl transition-all shadow-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Nova Validação</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg"
                  onClick={() => setModalDetalhesAberto(true)}
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver Detalhes</span>
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ABA 2: HISTÓRICO DE VALIDAÇÕES */}
      {tabAtiva === "historico" && (
        <AnimatePresence mode="wait">
          <motion.div
            key="historico"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Header com botão de atualizar */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="w-8 h-8 text-purple-500" />
                  <div>
                    <h2 className="text-2xl font-bold">Histórico de Validações</h2>
                    <p className="text-muted-foreground text-sm">
                      Últimas 50 validações realizadas
                    </p>
                  </div>
                </div>
                <button
                  onClick={buscarHistorico}
                  disabled={carregandoHistorico}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                >
                  {carregandoHistorico ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Atualizar
                </button>
              </div>
            </div>

            {/* Loading State */}
            {carregandoHistorico && historicos.length === 0 && (
              <div className="glass rounded-xl p-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                  <p className="text-muted-foreground">Carregando histórico...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {erroHistorico && (
              <div className="glass rounded-xl p-6 border-2 border-red-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-red-700 mb-1">
                      Erro ao carregar histórico
                    </h3>
                    <p className="text-red-600 text-sm">{erroHistorico}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!carregandoHistorico && !erroHistorico && historicos.length === 0 && (
              <div className="glass rounded-xl p-12">
                <div className="text-center">
                  <History className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhum histórico encontrado</h3>
                  <p className="text-muted-foreground">
                    Ainda não há validações registradas no sistema.
                  </p>
                </div>
              </div>
            )}

            {/* Lista de Históricos */}
            {!carregandoHistorico && !erroHistorico && historicos.length > 0 && (
              <div className="space-y-4">
                {historicos
                  .slice(
                    (paginaHistorico - 1) * itensPorPaginaHistorico,
                    paginaHistorico * itensPorPaginaHistorico
                  )
                  .map((historico: any) => (
                    <motion.div
                      key={historico.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass rounded-xl p-6 hover:shadow-lg transition-shadow"
                    >
                      {/* Header do Card */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {historico.admin?.nome?.charAt(0) || "A"}
                          </div>
                          <div>
                            <p className="font-semibold">{historico.admin?.nome || "Admin"}</p>
                            <p className="text-sm text-muted-foreground">
                              {historico.admin?.email || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {new Date(historico.dataHora).toLocaleDateString("pt-BR")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(historico.dataHora).toLocaleTimeString("pt-BR")}
                          </p>
                        </div>
                      </div>

                      {/* Estatísticas */}
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {historico.totalProcessados}
                          </p>
                          <p className="text-xs text-blue-600">Total</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {historico.validado}
                          </p>
                          <p className="text-xs text-green-600">Validado</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-red-600">
                            {historico.rejeitado}
                          </p>
                          <p className="text-xs text-red-600">Rejeitado</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-yellow-600">
                            {historico.conflito_manual}
                          </p>
                          <p className="text-xs text-yellow-600">Conflito</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-gray-600">
                            {historico.em_analise}
                          </p>
                          <p className="text-xs text-gray-600">Análise</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-slate-600">
                            {historico.revalidado}
                          </p>
                          <p className="text-xs text-slate-600">Revalidado</p>
                        </div>
                      </div>

                      {/* Campanha */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Tag className="w-4 h-4 text-purple-500" />
                          <span className="font-medium">Campanha:</span>
                          <span className="text-muted-foreground">
                            {historico.campanhaId === "TODAS" ? "Todas as Campanhas" : historico.campanhaId}
                          </span>
                        </div>
                        
                        {/* Botão Ver Detalhes */}
                        <button
                          onClick={() => {
                            // Preparar dados do histórico para o modal
                            setDadosModalDetalhes({
                              detalhes: historico.detalhesJson || [],
                              resumo: {
                                totalProcessados: historico.totalProcessados,
                                validado: historico.validado,
                                rejeitado: historico.rejeitado,
                                conflito_manual: historico.conflito_manual,
                                em_analise: historico.em_analise,
                                revalidado: historico.revalidado,
                              },
                            });
                            setModalDetalhesAberto(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Detalhes
                        </button>
                      </div>
                    </motion.div>
                  ))}

                {/* Paginação */}
                {historicos.length > itensPorPaginaHistorico && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setPaginaHistorico((p) => Math.max(1, p - 1))}
                      disabled={paginaHistorico === 1}
                      className="px-4 py-2 bg-white rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium px-4">
                      Página {paginaHistorico} de {Math.ceil(historicos.length / itensPorPaginaHistorico)}
                    </span>
                    <button
                      onClick={() =>
                        setPaginaHistorico((p) =>
                          Math.min(Math.ceil(historicos.length / itensPorPaginaHistorico), p + 1)
                        )
                      }
                      disabled={paginaHistorico >= Math.ceil(historicos.length / itensPorPaginaHistorico)}
                      className="px-4 py-2 bg-white rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ABA 3: DASHBOARD - Code Splitted */}
      {tabAtiva === "dashboard" && (
        <AnimatePresence mode="wait">
          <DashboardValidacao
            statsDashboard={statsDashboard}
            carregandoDashboard={carregandoDashboard}
            erroDashboard={erroDashboard}
            buscarStatsDashboard={buscarStatsDashboard}
          />
        </AnimatePresence>
      )}

      {/* Modal de Detalhes - FORA DAS ABAS para funcionar em todas */}
      <ModalDetalhesValidacao
        isOpen={modalDetalhesAberto}
        onClose={() => {
          setModalDetalhesAberto(false);
          setDadosModalDetalhes(null);
        }}
        detalhes={dadosModalDetalhes?.detalhes || resultadoProcessamento?.detalhes || []}
        resumo={
          dadosModalDetalhes?.resumo || 
          (resultadoProcessamento ? {
            totalProcessados: resultadoProcessamento.totalProcessados,
            validado: resultadoProcessamento.validado,
            rejeitado: resultadoProcessamento.rejeitado,
            conflito_manual: resultadoProcessamento.conflito_manual,
            em_analise: resultadoProcessamento.em_analise,
            revalidado: resultadoProcessamento.revalidado,
          } : {
            totalProcessados: 0,
            validado: 0,
            rejeitado: 0,
            conflito_manual: 0,
            em_analise: 0,
            revalidado: 0,
          })
        }
      />

      {/* Modal de Configuração de Formato de Data */}
      <ModalFormatoData
        isOpen={modalFormatoDataAberto}
        onClose={() => setModalFormatoDataAberto(false)}
        formatoAtual={formatoDataAtual}
        onSalvar={(novoFormato) => {
          setFormatoDataAtual(novoFormato);
          setModalFormatoDataAberto(false);
        }}
      />
    </div>
  );
}
