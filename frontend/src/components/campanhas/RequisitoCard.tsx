"use client";

import { useState, useMemo, FormEvent } from "react";
import { Send, Loader2, Target, Clock, CheckCircle, XCircle, Check, Lock, AlertTriangle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/axios";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * TIPOS E INTERFACES
 * ============================================================================
 */

/**
 * Tipo para o status calculado de um requisito em uma cartela específica
 * (Sprint 16.5 - Tarefa 38.5)
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
 * (ATUALIZADO Sprint 16.5: Agora inclui regraCartela)
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
 * Interface de envio de venda (simplificada para este componente)
 * (ATUALIZADO Sprint 16.5: Novo status CONFLITO_MANUAL)
 * (ATUALIZADO Sprint 18: Campo pontosLiquidados)
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
  pontosLiquidados?: boolean; // Sprint 18: indica se os pontos já foram pagos
  valorPontosReaisRecebido?: number | null; // Sprint 18: valor em R$ do envio
  valorFinalComEvento?: number | null;
  multiplicadorAplicado?: number | null;
  pontosAdicionadosAoSaldo?: boolean;
}

/**
 * Props do componente RequisitoCard
 * (ATUALIZADO Sprint 16.5: Nova prop status, numeroCartelaAtual e idsRequisitosRelacionados)
 */
interface RequisitoCardProps {
  /**
   * Dados completos do requisito a ser exibido
   */
  requisito: Requisito;

  /**
   * ID da campanha (necessário para envio da venda)
   */
  campanhaId: string;

  /**
   * Tipo de pedido da campanha (define label do campo)
   */
  tipoPedido?: string;

  /**
   * Lista de envios do vendedor autenticado (para esta campanha)
   * Usada para calcular progresso e exibir histórico
   */
  meusEnvios: EnvioVenda[];

  /**
   * Callback chamado após submissão bem-sucedida
   * Dispara refetch dos envios na página pai
   */
  onSubmissaoSucesso: () => void;

  /**
   * Status calculado do requisito (ATIVO, COMPLETO, BLOQUEADO)
   * (Sprint 16.5 - Tarefa 38.5)
   */
  status: StatusRequisito;

  /**
   * Número da cartela atual a qual este requisito pertence
   * (Sprint 16.5 - Correção de Bug: numeroCartelaAtual)
   * OBRIGATÓRIO: Usado para filtrar envios corretos (previne spillover)
   */
  numeroCartelaAtual: number;

  /**
   * Array de IDs de todos os requisitos relacionados (mesma ordem, cartelas diferentes)
   * (Sprint 16.5 - CORREÇÃO CRÍTICA DE SPILLOVER)
   *
   * PROBLEMA:
   * - Requisitos de cartelas diferentes têm IDs diferentes (uuid-1a, uuid-2a, uuid-3a)
   * - Envios apontam para o requisitoId da primeira cartela
   * - Filtro por requisitoId único não encontra spillover
   *
   * SOLUÇÃO:
   * - Page.tsx cria mapa de requisitos agrupados por ordem
   * - Passa array de TODOS os IDs relacionados [uuid-1a, uuid-2a, uuid-3a]
   * - RequisitoCard filtra envios usando .includes() em vez de ===
   *
   * Exemplo:
   * - Requisito "Lentes BlueProtect" (ordem 1) nas 3 cartelas
   * - idsRequisitosRelacionados = [uuid-cartela1-req1, uuid-cartela2-req1, uuid-cartela3-req1]
   */
  idsRequisitosRelacionados: string[];

  /** Evento ativo (opcional) para destacar o requisito no período do evento */
  eventoAtivo?: {
    nome: string;
    multiplicador: number;
    corDestaque: string;
  } | null;

  /**
   * ID real do requisito que deve ser enviado para o backend.
   * Necessário para cartelas virtuais (N+1), onde o ID exibido é sintético.
   */
  requisitoDestinoId: string;
}

/**
 * ============================================================================
 * COMPONENTE: RequisitoCard
 * ============================================================================
 *
 * Card Interativo de Requisito com Formulário de Submissão
 *
 * Exibe um requisito da campanha e permite ao vendedor
 * submeter números de pedido para validação e gamificação.
 *
 * Funcionalidades:
 * - Exibe descrição, meta (quantidade) e tipo de unidade
 * - Calcula e exibe progresso REAL baseado em envios validados
 * - Barra de progresso visual com percentual
 * - Formulário de submissão de número de pedido
 * - Lista de histórico de envios (status, ícones, cores, motivo)
 * - Estados de loading durante submissão
 * - Feedback visual com toast (sucesso/erro)
 * - Refetch automático após submissão bem-sucedida
 * - Validação básica de input
 * - Integração com API POST /api/envios-venda
 *
 * Refatorações Implementadas (Sprint 16.2):
 * - Filtro de envios por requisito (useMemo)
 * - Cálculo de progresso real (count de VALIDADO)
 * - Renderização de lista de histórico com status visual
 * - Callback de refetch após submissão
 *
 * Refatorações Implementadas (Sprint 16.5 - Tarefa 38.5):
 * - Carimbos visuais (COMPLETO, BLOQUEADO)
 * - Formulário desabilitado para status !== ATIVO
 * - Histórico filtrado (Spillover) baseado no status
 * - Suporte para status CONFLITO_MANUAL
 */
export default function RequisitoCard({
  requisito,
  campanhaId,
  tipoPedido,
  meusEnvios,
  onSubmissaoSucesso,
  status, // NOVA PROP (Sprint 16.5 - Tarefa 38.5)
  numeroCartelaAtual, // NOVA PROP (Sprint 16.5 - Correção Bug)
  idsRequisitosRelacionados, // NOVA PROP (Sprint 16.5 - CORREÇÃO CRÍTICA SPILLOVER)
  eventoAtivo,
  requisitoDestinoId,
}: RequisitoCardProps) {
  // ========================================
  // ESTADO: Formulário e Loading
  // ========================================
  const [numeroPedido, setNumeroPedido] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Formata valores numéricos como pontos inteiros (sem casas decimais)
   * Uso: Exibir pontos recebidos em envios validados
   * HOTFIX: Sempre exibe como inteiro para evitar confusão visual
   */
  const formatPoints = (valor?: number | null) => {
    if (valor === null || valor === undefined) {
      return null;
    }
    return Math.floor(valor).toLocaleString("pt-BR");
  };

  // ========================================
  // LABEL DINÂMICA BASEADA NO TIPO DE PEDIDO
  // ========================================
  const getLabelPedido = () => {
    const labels: Record<string, string> = {
      'OS_OP_EPS': 'Número do Pedido (OS ou OP EPS)',
      'OPTICLICK': 'Número do Pedido (OPTICLICK)',
      'EPSWEB': 'Número do Pedido (EPSWEB)',
      'ENVELOPE_OTICA': 'Número do Pedido (ENVELOPE DA ÓTICA)',
    };
    return tipoPedido && labels[tipoPedido] ? labels[tipoPedido] : 'Número do Pedido';
  };

  // ========================================
  // MEMO: Filtro de Envios deste Requisito (CORREÇÃO CRÍTICA SPILLOVER)
  // ========================================
  /**
   * Filtra a lista completa de envios (meusEnvios) para obter
   * apenas os envios relacionados a ESTE requisito específico.
   *
   * CORREÇÃO SPILLOVER (Sprint 16.5):
   * - ANTES: Filtrava apenas por requisito.id (não encontrava spillover)
   * - DEPOIS: Filtra por QUALQUER ID da lista idsRequisitosRelacionados
   *
   * Exemplo:
   * - Requisito "Lentes" (ordem 1) tem IDs [uuid-1a, uuid-2a, uuid-3a]
   * - Envio #1 tem requisitoId = uuid-1a (Cartela 1)
   * - Envio #3 (spillover) tem requisitoId = uuid-1a (mas numeroCartelaAtendida = 2)
   * - Card da Cartela 2 (uuid-2a) agora ENCONTRA o envio #3 porque uuid-1a está na lista!
   *
   * Usa useMemo para evitar recálculo em cada render.
   * Recalcula quando meusEnvios ou idsRequisitosRelacionados mudam.
   */
  const enviosDoRequisito = useMemo(() => {
    return meusEnvios.filter((envio) =>
      idsRequisitosRelacionados.includes(envio.requisitoId) // ✅ CORRIGIDO!
    );
  }, [meusEnvios, idsRequisitosRelacionados]);

  // ========================================
  // MEMO: Cálculo de Progresso Real (Refinado - Sprint 16.5)
  // ========================================
  /**
   * Conta quantos envios deste requisito estão com status VALIDADO
   * E com numeroCartelaAtendida correspondente à cartela ATUAL.
   * Este é o progresso REAL (não placeholder).
   *
   * IMPORTANTE (Sprint 16.5):
   * - Só conta validados DESTA cartela específica (previne spillover)
   * - Usa numeroCartelaAtual passado como prop (correção de bug)
   *
   * Usa useMemo para performance.
   */
  const progressoAtual = useMemo(() => {
    return enviosDoRequisito.filter(
      (envio) =>
        envio.status === "VALIDADO" &&
        envio.numeroCartelaAtendida === numeroCartelaAtual
    ).length;
  }, [enviosDoRequisito, numeroCartelaAtual]);

  /**
   * Calcula o percentual de progresso para a barra visual.
   * Ex: 1 validado de 2 requisitados = 50%
   */
  const progressoPercentual = (progressoAtual / requisito.quantidade) * 100;

  // ========================================
  // MEMO: Calcular "Cartela Destino" para Pedidos Não-Validados (CORREÇÃO CRÍTICA)
  // ========================================
  /**
   * Determina para qual cartela os pedidos não-validados devem "transbordar".
   *
   * Lógica:
   * 1. Contar quantos envios VALIDADOS existem no TOTAL (todas as cartelas)
   * 2. Calcular quantas cartelas estão "completas": Math.floor(countValidados / quantidade)
   * 3. Próxima cartela a ser preenchida = cartelasCompletas + 1
   * 4. Pedidos não-validados (EM_ANALISE, REJEITADO, CONFLITO) aparecem APENAS nessa cartela
   *
   * Exemplo:
   * - Requisito precisa de 2 VALIDADOS por cartela
   * - Vendedor tem 5 envios: #1 VALIDADO, #2 VALIDADO, #3 REJEITADO, #4 VALIDADO, #5 VALIDADO
   * - countValidados = 4
   * - cartelasCompletas = Math.floor(4/2) = 2
   * - cartelaDestinoNaoValidados = 2 + 1 = 3
   * - Então #3 (REJEITADO) deve aparecer APENAS na Cartela 3
   *
   * Recalcula quando enviosDoRequisito ou requisito.quantidade mudam.
   */
  const cartelaDestinoParaNaoValidados = useMemo(() => {
    // Contar TODOS os envios validados (independente da cartela)
    const countValidadosTotal = enviosDoRequisito.filter(
      (envio) => envio.status === "VALIDADO"
    ).length;

    // Calcular quantas cartelas já estão "completas"
    const cartelasCompletas = Math.floor(countValidadosTotal / requisito.quantidade);

    // Próxima cartela a ser preenchida (onde os não-validados devem ir)
    return cartelasCompletas + 1;
  }, [enviosDoRequisito, requisito.quantidade]);

  // ========================================
  // MEMO: Envios Exibidos (Filtro de Spillover - CORREÇÃO CRÍTICA)
  // ========================================
  /**
   * Filtra os envios a serem exibidos no histórico baseado no status.
   *
   * LÓGICA CORRIGIDA (Sprint 19.5 - Correção do Spillover):
   *
   * Se COMPLETO:
   * - Mostra APENAS os validados que completaram ESTA cartela exata
   * - Filtro: status === VALIDADO && numeroCartelaAtendida === numeroCartelaAtual
   * - Ordena por data de validação (mais recentes primeiro)
   *
   * Se ATIVO ou BLOQUEADO:
   * - Mostra validados DESTA cartela: status === VALIDADO && numeroCartelaAtendida === numeroCartelaAtual
   * - + Mostra não-validados APENAS se esta é a "cartela destino":
   *   - status === EM_ANALISE || REJEITADO || CONFLITO_MANUAL
   *   - numeroCartelaAtendida === null
   *   - numeroCartelaAtual === cartelaDestinoParaNaoValidados
   * - Ordena por data de envio (mais recentes primeiro)
   *
   * Exemplo Prático (Requisito precisa de 2 VALIDADOS):
   * Vendedor envia 5 pedidos:
   * - #1 VALIDADO (numeroCartelaAtendida = 1)
   * - #2 VALIDADO (numeroCartelaAtendida = 1) ← Cartela 1 COMPLETA!
   * - #3 REJEITADO (numeroCartelaAtendida = null)
   * - #4 VALIDADO (numeroCartelaAtendida = 2)
   * - #5 VALIDADO (numeroCartelaAtendida = 2) ← Cartela 2 COMPLETA!
   *
   * UI Resultante:
   * - Cartela 1 (COMPLETO): Mostra APENAS #1 e #2
   * - Cartela 2 (COMPLETO): Mostra APENAS #4 e #5
   * - Cartela 3 (ATIVO, cartelaDestino = 3): Mostra #3 (REJEITADO transbordado)
   *
   * Recalcula quando enviosDoRequisito, status, numeroCartelaAtual ou cartelaDestinoParaNaoValidados mudam.
   */
  const enviosExibidos = useMemo(() => {
    // Log para depuração
    console.log(
      `[RequisitoCard] ${requisito.descricao} - Cartela ${numeroCartelaAtual}:`,
      `Status=${status}, Total=${enviosDoRequisito.length}, CartelaDestino=${cartelaDestinoParaNaoValidados}`
    );

    if (status === "COMPLETO") {
      // -----------------------------------------------------------------------
      // COMPLETO: Mostra APENAS validados que completaram ESTA cartela
      // -----------------------------------------------------------------------
      const filtrados = enviosDoRequisito.filter(
        (e) =>
          e.status === "VALIDADO" &&
          e.numeroCartelaAtendida === numeroCartelaAtual
      );

      console.log(`[COMPLETO] Filtrados: ${filtrados.length} pedidos`, filtrados.map(e => e.numeroPedido));

      // Ordena por data de validação (mais recentes primeiro)
      return filtrados.sort(
        (a, b) =>
          new Date(b.dataValidacao || b.dataEnvio).getTime() -
          new Date(a.dataValidacao || a.dataEnvio).getTime()
      );
    } else {
      // -----------------------------------------------------------------------
      // ATIVO ou BLOQUEADO: Validados desta cartela + Não-validados da cartela destino
      // -----------------------------------------------------------------------
      const filtrados = enviosDoRequisito.filter((e) => {
        // Caso 1: Validados desta cartela
        if (e.status === "VALIDADO" && e.numeroCartelaAtendida === numeroCartelaAtual) {
          return true;
        }

        // Caso 2: Não-validados APENAS se esta for a cartela destino
        const isNaoValidado =
          e.status === "EM_ANALISE" ||
          e.status === "REJEITADO" ||
          e.status === "CONFLITO_MANUAL";

        const isCartelaDestino = numeroCartelaAtual === cartelaDestinoParaNaoValidados;

        if (isNaoValidado && e.numeroCartelaAtendida === null && isCartelaDestino) {
          return true;
        }

        return false;
      });

      console.log(
        `[ATIVO/BLOQ] Filtrados: ${filtrados.length} pedidos`,
        filtrados.map(e => `${e.numeroPedido}(${e.status})`)
      );

      // Ordena por data de envio (mais recentes primeiro)
      return filtrados.sort(
        (a, b) =>
          new Date(b.dataEnvio).getTime() - new Date(a.dataEnvio).getTime()
      );
    }
  }, [enviosDoRequisito, status, numeroCartelaAtual, requisito.descricao, cartelaDestinoParaNaoValidados]);

  // ========================================
  // HANDLER: Submissão do Formulário
  // ========================================
  /**
   * Envia o número do pedido para validação no backend.
   *
   * Fluxo:
   * 1. Valida input (não vazio)
   * 2. Ativa loading
   * 3. Faz POST /api/envios-venda
   * 4. Exibe toast de sucesso
   * 5. Limpa input
   * 6. **CHAMA CALLBACK onSubmissaoSucesso()** para refetch
   * 7. Desativa loading
   * 8. Tratamento de erros com toast
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!numeroPedido.trim()) {
      toast.error("Por favor, informe o número do pedido.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Chamada à API de envio de vendas
      const requisitoIdParaEnvio = requisitoDestinoId || requisito.id;

      await api.post("/envios-venda", {
        numeroPedido: numeroPedido.trim(),
        campanhaId,
        requisitoId: requisitoIdParaEnvio,
      });

      // Feedback de sucesso
      toast.success(`Pedido '${numeroPedido}' submetido para validação! 🎯`);

      // Limpa o input após sucesso
      setNumeroPedido("");

      // **REFETCH**: Chama callback para atualizar lista de envios na página pai
      onSubmissaoSucesso();
    } catch (error: any) {
      // Tratamento de erros da API
      const mensagemErro =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Erro ao submeter pedido. Tente novamente.";
      toast.error(mensagemErro);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================
  // HELPER: Ícone de Status do Envio (Atualizado - Sprint 16.5)
  // ========================================
  /**
   * Retorna o ícone apropriado para cada status de envio.
   * (ATUALIZADO Sprint 16.5: Adicionado CONFLITO_MANUAL)
   */
  const getIconeStatus = (status: EnvioVenda["status"]) => {
    switch (status) {
      case "EM_ANALISE":
        return <Clock className="h-4 w-4" />;
      case "VALIDADO":
        return <CheckCircle className="h-4 w-4" />;
      case "REJEITADO":
        return <XCircle className="h-4 w-4" />;
      case "CONFLITO_MANUAL":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // ========================================
  // HELPER: Estilo de Status do Envio (Atualizado - Sprint 16.5)
  // ========================================
  /**
   * Retorna as classes CSS apropriadas para cada status de envio.
   * (ATUALIZADO Sprint 16.5: Adicionado CONFLITO_MANUAL)
   */
  const getEstiloStatus = (status: EnvioVenda["status"]) => {
    switch (status) {
      case "EM_ANALISE":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800";
      case "VALIDADO":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
      case "REJEITADO":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
      case "CONFLITO_MANUAL":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
      default:
        return "";
    }
  };

  // ========================================
  // HELPER: Texto de Status do Envio (Atualizado - Sprint 16.5)
  // ========================================
  /**
   * Retorna o texto legível para cada status de envio.
   * (ATUALIZADO Sprint 16.5: Adicionado CONFLITO_MANUAL)
   */
  const getTextoStatus = (status: EnvioVenda["status"]) => {
    switch (status) {
      case "EM_ANALISE":
        return "Em Análise";
      case "VALIDADO":
        return "Validado";
      case "REJEITADO":
        return "Rejeitado";
      case "CONFLITO_MANUAL":
        return "Conflito";
      default:
        return status;
    }
  };

  // ========================================
  // RENDERIZAÇÃO (REFATORADO - FASE 2)
  // ========================================
  /**
   * REFATORAÇÃO (Fase 2 - Princípio 4: Design Magnífico):
   * - MELHORADO: Aplicado efeito glassmorphism para consistência com design system
   * - ADICIONADO: backdrop-blur-md para blur de fundo
   * - ADICIONADO: bg-card/40 para transparência (em vez de bg-card sólido)
   * - MANTIDO: Todos os efeitos visuais existentes (hover, gradientes, animações)
   */
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card/40 backdrop-blur-md shadow-sm transition-all hover:shadow-md">
      {/* ========================================
          CARIMBOS VISUAIS (COMPLETO, BLOQUEADO) - COM ANIMAÇÃO
          (Sprint 16.5 - Tarefa 38.5 - REFINADO)
          ======================================== */}
      <AnimatePresence>
        {status !== "ATIVO" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.22, // Reduzido de 0.3 → 0.22 (27% mais rápido)
              ease: [0.25, 0.1, 0.25, 1.0]
            }}
            className="absolute inset-0 z-10 flex items-center justify-center"
          >
            {status === "COMPLETO" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{
                  duration: 0.28, // Spring → Cubic-bezier (mais rápido e previsível)
                  ease: [0.34, 1.45, 0.64, 1] // easeOutBack com bounce sutil
                }}
                className="flex flex-col items-center gap-2 rounded-lg bg-green-500/90 px-8 py-6 text-white shadow-lg"
              >
                <Check className="h-12 w-12" />
                <span className="text-lg font-bold">Completo</span>
              </motion.div>
            )}
            {status === "BLOQUEADO" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{
                  duration: 0.28, // Spring → Cubic-bezier (mais rápido e previsível)
                  ease: [0.34, 1.45, 0.64, 1] // easeOutBack com bounce sutil
                }}
                className="flex flex-col items-center gap-2 rounded-lg bg-gray-500/90 px-8 py-6 text-white shadow-lg"
              >
                <Lock className="h-12 w-12" />
                <span className="text-lg font-bold">Bloqueado</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6">
        {/* ========================================
            HEADER: Título e Ordem do Requisito
            ======================================== */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-balance text-lg font-semibold leading-tight text-foreground">
              {requisito.descricao}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Requisito #{requisito.ordem}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {eventoAtivo && (
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
                style={{
                  color: eventoAtivo.corDestaque,
                  backgroundColor: `${eventoAtivo.corDestaque}20`,
                  borderColor: `${eventoAtivo.corDestaque}55`,
                }}
                title={`${eventoAtivo.nome} ativo`}
              >
                {/* ícone */}
                <svg className="mr-1 h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.546 4.758h4.997l-4.042 2.938 1.546 4.758L12 12.516l-4.047 2.938 1.546-4.758L5.453 6.758h4.997L12 2z"/></svg>
                Evento x{eventoAtivo.multiplicador}
              </span>
            )}
            {/* Ícone decorativo */}
            <Target className="h-5 w-5 flex-shrink-0 text-primary opacity-70" />
          </div>
        </div>

        {/* ========================================
            PROGRESSO: Barra e Meta (REAL)
            ======================================== */}
        <div className="mb-4 space-y-2">
          {/* Barra de progresso */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-width duration-300"
              style={{ width: `${Math.min(progressoPercentual, 100)}%` }}
            />
          </div>

          {/* Meta e Unidade */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground" style={{ fontFeatureSettings: '"tnum"' }}>
              {progressoAtual} / {requisito.quantidade}
            </span>
            <span className="text-muted-foreground">
              {requisito.tipoUnidade}
            </span>
          </div>
        </div>

        {/* ========================================
            FORMULÁRIO: Submissão de Número de Pedido
            (Desabilitado se status !== ATIVO ou se já está COMPLETO)
            (Sprint 16.5 - Tarefa 38.5)
            ======================================== */}
        {status !== "COMPLETO" && (
          <form onSubmit={handleSubmit} className="mb-4 space-y-3">
            {/* Input de número do pedido */}
            <div>
              <label
                htmlFor={`pedido-${requisito.id}`}
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                {getLabelPedido()}
              </label>
              <input
                id={`pedido-${requisito.id}`}
                type="text"
                placeholder={`Ex: ${tipoPedido === 'OPTICLICK' ? '123456' : '12345'}`}
                value={numeroPedido}
                onChange={(e) => setNumeroPedido(e.target.value)}
                disabled={status !== "ATIVO" || isSubmitting}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Botão de submissão */}
            <button
              type="submit"
              disabled={status !== "ATIVO" || isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submeter
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================
            HISTÓRICO: Lista de Envios do Requisito
            (Filtrado - Sprint 16.5 - Tarefa 38.5)
            ======================================== */}
        {enviosExibidos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Histórico de Envios
            </h4>
            <div className="space-y-2">
              {enviosExibidos.map((envio) => (
                <div
                  key={envio.id}
                  className={`rounded-lg border p-3 transition-colors duration-200 ${getEstiloStatus(
                    envio.status
                  )}`}
                >
                  <div className="space-y-2">
                    {/* Linha 1: Número do Pedido + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium flex-1 min-w-0">
                        {envio.numeroPedido}
                      </p>
                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        {getIconeStatus(envio.status)}
                        <span className="text-xs font-medium whitespace-nowrap">
                          {getTextoStatus(envio.status)}
                        </span>
                      </div>
                    </div>

                    {/* Motivo de Rejeição (se houver) */}
                    {envio.status === "REJEITADO" && envio.motivoRejeicaoVendedor && (
                      <p className="text-xs opacity-90">
                        {envio.motivoRejeicaoVendedor}
                      </p>
                    )}

                    {/* Motivo de Conflito (se houver) */}
                    {envio.status === "CONFLITO_MANUAL" && envio.motivoRejeicaoVendedor && (
                      <p className="text-xs opacity-90">
                        {envio.motivoRejeicaoVendedor}
                      </p>
                    )}

                    {envio.status === "VALIDADO" && (
                      (() => {
                        const valorOriginal = envio.valorPontosReaisRecebido ?? null;
                        const valorFinal = envio.valorFinalComEvento ?? valorOriginal;
                        const multiplicador = envio.multiplicadorAplicado ?? 1;
                        const possuiBonus =
                          valorFinal !== null &&
                          valorOriginal !== null &&
                          Number(valorFinal.toFixed(2)) > Number(valorOriginal.toFixed(2));

                        return (
                          <>
                            {/* Linha 2: Base pts + Bônus */}
                            {(valorOriginal !== null || possuiBonus) && (
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                {valorOriginal !== null && possuiBonus && (
                                  <span className="inline-flex items-center whitespace-nowrap rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground border border-border" style={{ fontFeatureSettings: '"tnum"' }}>
                                    Base: {formatPoints(valorOriginal)} pts
                                  </span>
                                )}
                                {possuiBonus && (
                                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-purple-500/10 px-2 py-0.5 font-semibold text-purple-600 dark:text-purple-300 border border-purple-500/20" style={{ fontFeatureSettings: '"tnum"' }}>
                                    <Sparkles className="h-3 w-3" />
                                    Bônus x{multiplicador.toLocaleString("pt-BR", {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Linha 3: Pontos Finais + Status (Liberados/Pendentes) + Pago */}
                            <div className="flex flex-wrap items-center gap-2">
                              {valorFinal !== null && envio.pontosAdicionadosAoSaldo !== undefined && (
                                <span
                                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    envio.pontosAdicionadosAoSaldo
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20"
                                      : "bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20"
                                  }`}
                                  style={{ fontFeatureSettings: '"tnum"' }}
                                >
                                  <span className="font-bold">{formatPoints(valorFinal)}</span>
                                  {envio.pontosAdicionadosAoSaldo ? "Pontos Liberados" : "Pontos Pendentes"}
                                </span>
                              )}

                              {envio.pontosLiquidados && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-600 dark:text-green-400 border border-green-500/20">
                                  💰 Pago
                                </span>
                              )}
                            </div>
                          </>
                        );
                      })()
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================
          EFEITO VISUAL: Gradient Hover Glassmorphism
          ======================================== */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
    </div>
  );
}
