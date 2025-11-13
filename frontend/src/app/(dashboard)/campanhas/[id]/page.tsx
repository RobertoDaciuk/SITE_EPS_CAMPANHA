/**
 * ============================================================================
 * CAMPANHA DETALHES PAGE (CORRIGIDO - Lógica Crítica de Spillover)
 * ============================================================================
 *
 * Propósito:
 * Página de Detalhes da Campanha com Tabs de Cartelas
 *
 * CORREÇÃO (Q.I. 170 - Lógica de Spillover):
 * - Reescrito o cálculo de status para considerar apenas envios validados que
 * de fato foram atribuídos à cartela (`numeroCartelaAtendida`).
 * - Resultado: Uma cartela só fica COMPLETA quando os requisitos dela foram
 * preenchidos com envios destinados a ela, mantendo spillover consistente.
 *
 * CORREÇÃO (Estrutura/Importação):
 * - Corrigida a importação do Contexto de Autenticação.
 *
 * @module Campanhas
 * ============================================================================
 */
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Loader2, AlertCircle, Trophy, Target, ArrowLeft, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import RequisitoCard from "@/components/campanhas/RequisitoCard";
import TabsCampanhaComRegras from "@/components/campanhas/TabsCampanhaComRegras";
import AbaRegras from "@/components/campanhas/AbaRegras";
// CORRIGIDO: Usar alias e nome de contexto correto
import { useAuth } from "@/contexts/ContextoAutenticacao";
import { getImageUrl } from "@/lib/image-url";

/**
 * ============================================================================
 * TIPOS E INTERFACES
 * ============================================================================
 */

/**
 * Tipo para o status calculado de um requisito em uma cartela específica
 */
type StatusRequisito = "ATIVO" | "COMPLETO" | "BLOQUEADO";

/**
 * Interface para Condição de um Requisito
 */
interface Condicao {
  id: string;
  campo: string;
  operador: string;
  valor: string;
  requisitoId: string;
}

/**
 * Interface para Requisito de uma Cartela
 */
interface Requisito {
  id: string;
  descricao: string;
  quantidade: number;
  tipoUnidade: string;
  ordem: number;
  condicoes: Condicao[];
  regraCartela: {
    numeroCartela: number;
  };
}

/**
 * Interface para Cartela da Campanha
 */
interface Cartela {
  id: string;
  numeroCartela: number;
  descricao: string;
  requisitos: Requisito[];
}

/**
 * Interface para Campanha Completa
 */
interface EventoEspecial {
  id: string;
  nome: string;
  multiplicador: number;
  corDestaque: string;
  ativo: boolean;
  dataInicio: string;
  dataFim: string;
}

interface Campanha {
  id: string;
  titulo: string; // ✅ CORRIGIDO: Backend usa "titulo"
  descricao: string;
  dataInicio: string;
  dataFim: string;
  status: "RASCUNHO" | "ATIVA" | "ENCERRADA";
  cartelas: Cartela[];
  eventosAtivos?: EventoEspecial[];
  regras?: string; // HTML das regras da campanha (opcional)
  tipoPedido?: 'OS_OP_EPS' | 'OPTICLICK' | 'EPSWEB' | 'ENVELOPE_OTICA'; // Tipo de pedido da campanha
  imagemCampanha16x9Url?: string; // Imagem 16:9 para topo da página
  imagemCampanha1x1Url?: string; // Imagem 1:1 para aba de regras
  pontosReaisMaximo?: number; // Valor máximo de pontos
}

/**
 * Interface para Envio de Venda (Histórico do Vendedor)
 */
interface EnvioVenda {
  id: string;
  numeroPedido: string;
  status: "EM_ANALISE" | "VALIDADO" | "REJEITADO" | "CONFLITO_MANUAL";
  dataEnvio: string;
  dataValidacao: string | null;
  motivoRejeicao: string | null;
  motivoRejeicaoVendedor: string | null; // Mensagem formal para vendedor
  requisitoId: string;
  numeroCartelaAtendida: number | null;
  valorPontosReaisRecebido?: number | null;
  valorFinalComEvento?: number | null;
  multiplicadorAplicado?: number | null;
  pontosAdicionadosAoSaldo?: boolean;
  pontosLiquidados?: boolean;
}

/**
 * ============================================================================
 * COMPONENTE PRINCIPAL: CampanhaDetalhesPage
 * ============================================================================
 */
export default function CampanhaDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const campanhaId = params.id as string;

  // ========================================
  // CONTEXTO: Autenticação
  // ========================================
  const { estaAutenticado, carregando: isAuthLoading, usuario } = useAuth(); // Inclui 'usuario' para RBAC

  // ========================================
  // ESTADO: Dados e Loading
  // ========================================
  const [campanha, setCampanha] = useState<Campanha | null>(null);
  const [meusEnvios, setMeusEnvios] = useState<EnvioVenda[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abaSelecionadaId, setAbaSelecionadaId] = useState<string | null>(null);

  // ========================================
  // FUNÇÃO: Buscar Dados da Campanha
  // ========================================
  const buscarDadosCampanha = useCallback(async () => {
    // GUARD: Não faz chamadas se não estiver autenticado
    if (!estaAutenticado) {
      console.warn("buscarDadosCampanha: Usuário não autenticado. Abortando chamada API.");
      return;
    }

    try {
      setIsLoadingData(true);
      setError(null);

      // Buscar dados da campanha (vendedor-view inclui eventosAtivos)
      const responseCampanha = await api.get(`/campanhas/${campanhaId}/vendedor-view`);
      const dadosCampanha = responseCampanha.data;

      // Buscar envios apenas se papel for VENDEDOR (rota exige RBAC)
      const normalizarNumero = (valor: unknown): number | null => {
        if (valor === null || valor === undefined) {
          return null;
        }
        if (typeof valor === "number") {
          return valor;
        }
        if (typeof valor === "string") {
          const parsed = Number(valor);
          return Number.isNaN(parsed) ? null : parsed;
        }
        if (typeof valor === "object" && valor !== null && "toNumber" in valor && typeof (valor as any).toNumber === "function") {
          return (valor as any).toNumber();
        }
        const coerced = Number(valor);
        return Number.isNaN(coerced) ? null : coerced;
      };

      let dadosEnvios: EnvioVenda[] = [];
      if (usuario?.papel === "VENDEDOR") {
        const responseEnvios = await api.get(
          `/envios-venda/minhas?campanhaId=${campanhaId}`
        );
        dadosEnvios = (responseEnvios.data || []).map((envio: EnvioVenda & Record<string, unknown>) => ({
          ...envio,
          valorPontosReaisRecebido: normalizarNumero(envio.valorPontosReaisRecebido),
          valorFinalComEvento: normalizarNumero(envio.valorFinalComEvento),
          multiplicadorAplicado: normalizarNumero(envio.multiplicadorAplicado) ?? 1,
          pontosAdicionadosAoSaldo: Boolean(envio.pontosAdicionadosAoSaldo),
          pontosLiquidados: Boolean(envio.pontosLiquidados),
        }));
      }

      // Atualizar estados
      setCampanha(dadosCampanha);
      setMeusEnvios(dadosEnvios);
    } catch (err: any) {
      console.error("Erro ao buscar dados da campanha:", err);

      // Tratamento de erro de autenticação
      if (err.response?.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        router.push("/login");
        return;
      }

      // Tratamento de outros erros
      const mensagemErro =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Erro ao carregar dados da campanha.";
      setError(mensagemErro);
      toast.error(mensagemErro);
    } finally {
      setIsLoadingData(false);
    }
  }, [estaAutenticado, usuario?.papel, campanhaId, router]);

  // ========================================
  // EFEITO: Buscar Dados ao Montar
  // ========================================
  useEffect(() => {
    // Aguarda AuthProvider terminar de carregar
    if (isAuthLoading) {
      console.log("useEffect: Aguardando AuthProvider terminar de carregar...");
      return;
    }

    // Se não está autenticado após loading, redireciona
    if (!estaAutenticado) {
      console.warn("useEffect: Usuário não autenticado. Redirecionando para login...");
      toast.error("Você precisa estar autenticado para acessar esta página.");
      router.push("/login");
      return;
    }

    // Se está autenticado e tem campanhaId, busca dados
    if (estaAutenticado && campanhaId) {
      console.log("useEffect: Usuário autenticado. Buscando dados da campanha...");
      buscarDadosCampanha();
    }
  }, [isAuthLoading, estaAutenticado, campanhaId, buscarDadosCampanha, router]);

  // ========================================
  // CALLBACK: Refetch Após Submissão
  // ========================================
  const handleSubmissaoSucesso = () => {
    buscarDadosCampanha();
  };

  // ========================================
  // MEMO: Mapa de Requisitos Relacionados por Ordem (CRÍTICO SPILLOVER)
  // ========================================
  /**
   * Cria mapa que agrupa todos os IDs de requisitos pela mesma ordem.
   * Chave: `ordem` (number)
   * Valor: Array de IDs de requisitos com essa ordem
   * (Usado para contar o progresso total e filtrar envios).
   */
  const mapaRequisitosRelacionados = useMemo(() => {
    if (!campanha) return new Map<number, string[]>();

    const mapa = new Map<number, string[]>();

    for (const cartela of campanha.cartelas) {
      for (const requisito of cartela.requisitos) {
        const idsExistentes = mapa.get(requisito.ordem) || [];
        mapa.set(requisito.ordem, [...idsExistentes, requisito.id]);
      }
    }

    return mapa;
  }, [campanha]);

  const mapaRequisitosDetalhados = useMemo(() => {
    if (!campanha) return new Map<number, { id: string; numeroCartela: number }[]>();

    const mapa = new Map<number, { id: string; numeroCartela: number }[]>();

    for (const cartela of campanha.cartelas) {
      for (const requisito of cartela.requisitos) {
        const itens = mapa.get(requisito.ordem) ?? [];
        itens.push({ id: requisito.id, numeroCartela: cartela.numeroCartela });
        mapa.set(requisito.ordem, itens);
      }
    }

    for (const [ordem, itens] of mapa.entries()) {
      itens.sort((a, b) => a.numeroCartela - b.numeroCartela);
      mapa.set(ordem, itens);
    }

    return mapa;
  }, [campanha]);

  // ========================================
  // MEMO: Cartelas Expandidas com N+1 (GOLDEN RULE)
  // ========================================
  /**
   * Gera lista de cartelas incluindo uma cartela futura (N+1) se necessário.
   * 
   * REGRA DE OURO:
   * - Se Cartela[N] tem QUALQUER requisito ATIVO ou COMPLETO, renderizar Cartela[N+1]
   * - Cartela[N+1] será automaticamente bloqueada até que requisitos sejam completados
   * 
   * GUARD: Não gera cartela virtual se campanha está ENCERRADA
   */
  const cartelasExpandidas = useMemo(() => {
    if (!campanha || campanha.cartelas.length === 0) {
      return [];
    }

    // GUARD: Não cria cartela virtual para campanhas encerradas
    if (campanha.status === 'ENCERRADA') {
      return campanha.cartelas;
    }

    // Passo 1: Obter a cartela com maior número
    const maxNumeroCartela = Math.max(...campanha.cartelas.map(c => c.numeroCartela));
    
    // Passo 2: Pegar requisitos base da primeira cartela para clonar
    const primeiraCartela = campanha.cartelas.find(c => c.numeroCartela === 1);
    if (!primeiraCartela || primeiraCartela.requisitos.length === 0) {
      return campanha.cartelas; // Sem requisitos, não faz sentido criar cartela virtual
    }

    // Passo 3: Criar cartela virtual N+1
    const proximoNumero = maxNumeroCartela + 1;
    const cartelaVirtual: Cartela = {
      id: `virtual-cartela-${proximoNumero}`,
      numeroCartela: proximoNumero,
      descricao: `Cartela ${proximoNumero} (Bloqueada até completar requisitos anteriores)`,
      requisitos: primeiraCartela.requisitos.map(req => ({
        ...req,
        id: `virtual-req-${req.ordem}-cartela-${proximoNumero}`,
        regraCartela: {
          numeroCartela: proximoNumero
        }
      }))
    };

    // Passo 4: Retornar cartelas originais + cartela virtual
    return [...campanha.cartelas, cartelaVirtual];
  }, [campanha]);

  // ========================================
  // MEMO: Cálculo de Status (ATIVO, COMPLETO, BLOQUEADO)
  // ========================================
  /**
   * Calcula o status preciso de cada instância de requisito em cada cartela.
   *
   * Estrutura do Mapa:
   * - Chave: `${requisitoId}-${numeroCartela}`
   * - Valor: 'ATIVO' | 'COMPLETO' | 'BLOQUEADO'
   */
  const mapaStatusRequisitos = useMemo(() => {
    if (!campanha || !meusEnvios) {
      return new Map<string, StatusRequisito>();
    }

    const mapaStatus = new Map<string, StatusRequisito>();

  // -----------------------------------------------------------------------
  // HELPER: Contagem de Envios Validados por Cartela (SPILLOVER CORRIGIDO)
  // -----------------------------------------------------------------------
  /**
   * Retorna a contagem de envios VALIDADO destinados a uma cartela
   * específica. Considera todos os requisitos com a mesma ordem e garante
   * que apenas registros com numeroCartelaAtendida igual ao alvo entrem na
   * conta, preservando a regra de spillover cartela a cartela.
   */
    const getEnviosValidadosNaCartela = (requisito: Requisito, numeroCartela: number): number => {
      const idsRelacionados = mapaRequisitosRelacionados.get(requisito.ordem) || [requisito.id];

      return meusEnvios.filter((envio) => {
        if (envio.status !== "VALIDADO") {
          return false;
        }

        if (!idsRelacionados.includes(envio.requisitoId)) {
          return false;
        }

        const numeroAtendidoNormalizado = (() => {
          if (typeof envio.numeroCartelaAtendida === "number" && Number.isFinite(envio.numeroCartelaAtendida)) {
            return envio.numeroCartelaAtendida;
          }

          const parsed = Number(envio.numeroCartelaAtendida ?? 1);
          return Number.isNaN(parsed) ? 1 : parsed;
        })();

        return numeroAtendidoNormalizado === numeroCartela;
      }).length;
    };

    // -----------------------------------------------------------------------
    // LOOP 1: Calcular Requisitos COMPLETOS (usa cartelasExpandidas)
    // -----------------------------------------------------------------------
    for (const cartela of cartelasExpandidas) {
      for (const requisito of cartela.requisitos) {
        // Usa a contagem TOTAL para determinar se o requisito lógico está COMPLETO
        const countValidadosCartela = getEnviosValidadosNaCartela(
          requisito,
          cartela.numeroCartela
        );
        const isCompleto = countValidadosCartela >= requisito.quantidade;

        if (isCompleto) {
          mapaStatus.set(
            `${requisito.id}-${cartela.numeroCartela}`,
            "COMPLETO"
          );
        }
      }
    }

    // -----------------------------------------------------------------------
    // LOOP 2: Calcular Requisitos BLOQUEADOS (Spillover) (usa cartelasExpandidas)
    // -----------------------------------------------------------------------
    /**
     * Lógica de Bloqueio:
     * - Cartela N Req A é bloqueado se Cartela N-1 Req A não estiver COMPLETO
     */
    for (const cartela of cartelasExpandidas) {
      if (cartela.numeroCartela <= 1) continue;

      const cartelaAnterior = cartelasExpandidas.find(
        (c) => c.numeroCartela === cartela.numeroCartela - 1
      );

      if (!cartelaAnterior) continue; // Safety check

      for (const requisito of cartela.requisitos) {
        // Se já está COMPLETO, não precisa verificar bloqueio
        const chaveAtual = `${requisito.id}-${cartela.numeroCartela}`;
        if (mapaStatus.get(chaveAtual) === "COMPLETO") continue;

        // Encontrar requisito equivalente na cartela anterior pela ORDEM
        const requisitoAnterior = cartelaAnterior.requisitos.find(
          (r) => r.ordem === requisito.ordem
        );

        if (!requisitoAnterior) continue; // Safety check

        // Verificar se o requisito anterior está COMPLETO
        const chaveAnterior = `${requisitoAnterior.id}-${cartelaAnterior.numeroCartela}`;
        const isAnteriorCompleto = mapaStatus.get(chaveAnterior) === "COMPLETO";

        // Se não estiver completo, marca BLOQUEADO
        if (!isAnteriorCompleto) {
          mapaStatus.set(chaveAtual, "BLOQUEADO");
        }
      }
    }
    // Status implícito: Qualquer requisito não marcado é ATIVO
    return mapaStatus;
  }, [meusEnvios, campanha, cartelasExpandidas, mapaRequisitosRelacionados]);

  // ========================================
  // MEMO: Mapa de Cartelas Completas
  // ========================================
  /**
   * Calcula quais cartelas estão 100% completas (todos os requisitos COMPLETO)
   */
  const mapaCartelasCompletas = useMemo(() => {
    const mapa = new Map<number, boolean>();
    
    if (!campanha) return mapa;

    for (const cartela of cartelasExpandidas) {
      // Verifica se TODOS os requisitos da cartela estão COMPLETOS
      const todosCompletos = cartela.requisitos.every((req) => {
        const chave = `${req.id}-${cartela.numeroCartela}`;
        return mapaStatusRequisitos.get(chave) === "COMPLETO";
      });

      mapa.set(cartela.numeroCartela, todosCompletos && cartela.requisitos.length > 0);
    }

    return mapa;
  }, [campanha, cartelasExpandidas, mapaStatusRequisitos]);

  const incluiAbaRegras = useMemo(() => {
    if (!campanha) {
      return false;
    }

    if (!campanha.regras) {
      return false;
    }

    const regrasSanitizadas = campanha.regras.trim();
    if (regrasSanitizadas.length === 0) {
      return false;
    }

    return regrasSanitizadas !== "<p></p>";
  }, [campanha]);

  useEffect(() => {
    if (!campanha) {
      setAbaSelecionadaId(null);
      return;
    }

    setAbaSelecionadaId((abaAnterior) => {
      const existeAbaAnterior = abaAnterior
        ? abaAnterior === "regras"
          ? incluiAbaRegras
          : cartelasExpandidas.some((cartela) => cartela.id === abaAnterior)
        : false;

      if (abaAnterior && existeAbaAnterior) {
        return abaAnterior;
      }

      let abaIdeal: string | null = null;

      const primeiraIncompleta = cartelasExpandidas.find(
        (cartela) => !mapaCartelasCompletas.get(cartela.numeroCartela)
      );

      if (primeiraIncompleta) {
        abaIdeal = primeiraIncompleta.id;
      } else if (cartelasExpandidas.length > 0) {
        abaIdeal = cartelasExpandidas[0].id;
      } else if (incluiAbaRegras) {
        abaIdeal = "regras";
      }

      if (!abaIdeal || abaIdeal === abaAnterior) {
        return abaAnterior ?? null;
      }

      return abaIdeal;
    });
  }, [campanha, cartelasExpandidas, mapaCartelasCompletas, incluiAbaRegras]);

  // ========================================
  // RENDERIZAÇÃO: Estados de Loading e Erro
  // ========================================

  /**
   * Loading State
   */
  if (isAuthLoading || isLoadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">
            {isAuthLoading ? "Verificando autenticação..." : "Carregando dados da campanha..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !campanha) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold text-destructive">
            Erro ao Carregar Campanha
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ||
              "A campanha que você está procurando não existe ou foi removida."}
          </p>
          <button
            onClick={() => router.push("/campanhas")}
            className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar para Campanhas
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDERIZAÇÃO PRINCIPAL
  // ========================================
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* ========================================
          IMAGEM 16:9 NO TOPO (se houver)
          ======================================== */}
      {campanha.imagemCampanha16x9Url && (
        <div className="mb-6 md:mb-8 -mx-4 sm:-mx-6 -mt-6">
          <div className="relative w-full h-48 sm:h-56 md:h-72 lg:h-96 overflow-hidden md:rounded-t-2xl">
            <img
              src={getImageUrl(campanha.imagemCampanha16x9Url)}
              alt={campanha.titulo}
              className="w-full h-full object-cover"
            />
            {/* Overlay gradiente para melhor legibilidade */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            
            {/* Título sobreposto à imagem */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 md:mb-2">
                <Trophy className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary drop-shadow-lg flex-shrink-0" />
                <h1 className="text-balance text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white drop-shadow-lg line-clamp-2">
                  {campanha.titulo}
                </h1>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          HEADER: Título e Descrição da Campanha (sem imagem)
          ======================================== */}
      <div className="mb-8">
        {/* Botão Voltar */}
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        {/* Título e Ícone (apenas se não houver imagem) */}
        {!campanha.imagemCampanha16x9Url && (
          <div className="mb-2 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-balance text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{campanha.titulo}</h1>
          </div>
        )}

        {/* Banner Evento Ativo (marketing) */}
        {campanha.eventosAtivos && campanha.eventosAtivos.length > 0 && (
          <div
            className="mb-3 md:mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border p-3 md:p-4"
            style={{ borderColor: (campanha.eventosAtivos[0].corDestaque || "#7c3aed") + "55" }}
          >
            <div className="flex items-center gap-2 md:gap-3">
              <div
                className="rounded-lg p-1.5 md:p-2 flex-shrink-0"
                style={{ backgroundColor: (campanha.eventosAtivos[0].corDestaque || "#7c3aed") + "20" }}
              >
                <Sparkles className="h-5 w-5 md:h-6 md:w-6" color={campanha.eventosAtivos[0].corDestaque || "#7c3aed"} />
              </div>
              <div>
                <p className="text-[10px] md:text-xs uppercase text-muted-foreground">Evento Especial</p>
                <p className="text-xs md:text-sm font-semibold">
                  {campanha.eventosAtivos[0].nome} • Prêmios x{campanha.eventosAtivos[0].multiplicador}
                </p>
              </div>
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground sm:text-right">
              Vigência: {new Date(campanha.eventosAtivos[0].dataInicio).toLocaleDateString()} a {new Date(campanha.eventosAtivos[0].dataFim).toLocaleDateString()}
            </div>
          </div>
        )}

        {/* Descrição */}
        <p className="text-muted-foreground">{campanha.descricao}</p>
      </div>

      {/* ========================================
          VALIDAÇÃO: Campanha sem Cartelas e sem Regras
          ======================================== */}
      {cartelasExpandidas.length === 0 && (!campanha.regras || campanha.regras.trim().length === 0) && (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-12 text-center">
          <Target className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">
            Esta campanha ainda não possui cartelas nem regras cadastradas.
          </p>
        </div>
      )}

      {/* ========================================
          TABS: Navegação entre Regras e Cartelas
          ======================================== */}
      {(cartelasExpandidas.length > 0 || incluiAbaRegras) && (
        <TabsCampanhaComRegras 
          cartelas={cartelasExpandidas}
          incluirAbaRegras={incluiAbaRegras}
          cartelasCompletas={mapaCartelasCompletas}
          abaAtivaId={abaSelecionadaId ?? undefined}
          onAbaChange={(aba) => setAbaSelecionadaId(aba.id)}
        >
          {({ tipo, id }) => {
            // -----------------------------------------------------------------------
            // RENDERIZAÇÃO: Aba de Regras
            // -----------------------------------------------------------------------
            if (tipo === "regras") {
              return (
                <AbaRegras
                  regras={campanha.regras}
                  tipoPedido={campanha.tipoPedido}
                  imagemUrl={campanha.imagemCampanha1x1Url}
                  tituloCampanha={campanha.titulo}
                />
              );
            }
            // -----------------------------------------------------------------------
            // RENDERIZAÇÃO: Aba de Cartela
            // -----------------------------------------------------------------------
            // LÓGICA: Encontrar Cartela Ativa pelo ID (usa cartelasExpandidas)
            const cartelaAtual = cartelasExpandidas.find(
              (c) => c.id === id
            );

            // -----------------------------------------------------------------------
            // VALIDAÇÃO: Cartela Não Encontrada
            // -----------------------------------------------------------------------
            if (!cartelaAtual) {
              return (
                <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-12 text-center">
                  <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    Cartela não encontrada.
                  </p>
                </div>
              );
            }

            // -----------------------------------------------------------------------
            // RENDERIZAÇÃO: Conteúdo da Cartela Ativa
            // -----------------------------------------------------------------------
            return (
              <div className="space-y-6">
                {/* ========================================
                    VALIDAÇÃO: Cartela sem Requisitos
                    ======================================== */}
                {cartelaAtual.requisitos.length === 0 && (
                  <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-12 text-center">
                    <Target className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">
                      Esta cartela ainda não possui requisitos cadastrados.
                    </p>
                  </div>
                )}

                {/* ========================================
                    LISTA DE REQUISITOS (CARDS)
                    ======================================== */}
                {cartelaAtual.requisitos.length > 0 && (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {cartelaAtual.requisitos.map((requisito) => {
                      // -----------------------------------------------------------------------
                      // CÁLCULO: Obter Status do Requisito (ATIVO, COMPLETO, BLOQUEADO)
                      // -----------------------------------------------------------------------
                      const chave = `${requisito.id}-${cartelaAtual.numeroCartela}`;
                      const status =
                        mapaStatusRequisitos.get(chave) ?? "ATIVO";

                      const candidatosRequisito =
                        mapaRequisitosDetalhados.get(requisito.ordem) ?? [];

                      const requisitoCorrespondente = candidatosRequisito.find(
                        (item) => item.numeroCartela === cartelaAtual.numeroCartela,
                      );

                      const requisitoDestinoId = requisitoCorrespondente
                        ? requisitoCorrespondente.id
                        : candidatosRequisito.length > 0
                          ? candidatosRequisito[candidatosRequisito.length - 1].id
                          : requisito.id;

                      const eventoAtivo = campanha.eventosAtivos && campanha.eventosAtivos.length > 0
                        ? {
                            nome: campanha.eventosAtivos[0].nome,
                            multiplicador: campanha.eventosAtivos[0].multiplicador,
                            corDestaque: campanha.eventosAtivos[0].corDestaque,
                          }
                        : null;

                      return (
                        <RequisitoCard
                          key={requisito.id}
                          requisito={requisito}
                          campanhaId={campanhaId}
                          tipoPedido={campanha.tipoPedido}
                          meusEnvios={meusEnvios}
                          onSubmissaoSucesso={handleSubmissaoSucesso}
                          status={status}
                          numeroCartelaAtual={cartelaAtual.numeroCartela}
                          idsRequisitosRelacionados={mapaRequisitosRelacionados.get(requisito.ordem) || [requisito.id]}
                          eventoAtivo={eventoAtivo}
                          requisitoDestinoId={requisitoDestinoId}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }}
        </TabsCampanhaComRegras>
      )}
    </div>
  );
}