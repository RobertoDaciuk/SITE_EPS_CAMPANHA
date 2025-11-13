"use client";

/**
 * ============================================================================
 * MODAL: Detalhes da Validação
 * ============================================================================
 * 
 * Modal premium que exibe os detalhes completos de todos os envios processados:
 * - Validados (verde)
 * - Rejeitados (vermelho)
 * - Conflitos Manuais (amarelo)
 * 
 * Features:
 * - Tabs para filtrar por status
 * - Cards individuais para cada envio
 * - Informações completas (vendedor, ótica, produto, motivo)
 * - Animações Framer Motion
 * - Design glassmorphism
 * 
 * @module ModalDetalhesValidacao
 * ============================================================================
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Building2,
  Package,
  Calendar,
  FileText,
  Target,
  TrendingUp,
  Hash,
  Search,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useState, useMemo } from "react";

/**
 * Interface para um envio processado
 */
interface EnvioDetalhe {
  id: string;
  numeroPedido: string;
  status: "VALIDADO" | "REJEITADO" | "CONFLITO_MANUAL" | "EM_ANALISE" | "REVALIDADO";
  motivo?: string;
  motivoVendedor?: string; // Mensagem formal enviada ao vendedor
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

interface ModalDetalhesValidacaoProps {
  isOpen: boolean;
  onClose: () => void;
  detalhes: EnvioDetalhe[];
  resumo: {
    totalProcessados: number;
    validado: number;
    rejeitado: number;
    conflito_manual: number;
    em_analise: number;
    revalidado?: number;
  };
}

type TabStatus = "TODOS" | "VALIDADO" | "REJEITADO" | "CONFLITO_MANUAL" | "EM_ANALISE" | "REVALIDADO";

export default function ModalDetalhesValidacao({
  isOpen,
  onClose,
  detalhes,
  resumo,
}: ModalDetalhesValidacaoProps) {
  const [tabAtiva, setTabAtiva] = useState<TabStatus>("TODOS");
  const [buscaTexto, setBuscaTexto] = useState("");

  // Filtrar envios por tab e busca
  const enviosFiltrados = useMemo(() => {
    let filtrados = tabAtiva === "TODOS"
      ? detalhes
      : detalhes.filter((e) => e.status === tabAtiva);

    // Aplicar busca
    if (buscaTexto.trim()) {
      const busca = buscaTexto.toLowerCase();
      filtrados = filtrados.filter((envio) =>
        envio.numeroPedido.toLowerCase().includes(busca) ||
        envio.vendedor.nome.toLowerCase().includes(busca) ||
        envio.vendedor.email.toLowerCase().includes(busca) ||
        envio.optica.nome.toLowerCase().includes(busca) ||
        envio.optica.cnpj.includes(busca) ||
        envio.campanha.titulo.toLowerCase().includes(busca)
      );
    }

    return filtrados;
  }, [detalhes, tabAtiva, buscaTexto]);

  // Configurações de cor por status
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "VALIDADO":
        return {
          color: "green",
          icon: CheckCircle2,
          bg: "from-green-50 to-emerald-50",
          border: "border-green-200/50",
          text: "text-green-900",
          badge: "bg-green-100 text-green-800",
        };
      case "REJEITADO":
        return {
          color: "red",
          icon: XCircle,
          bg: "from-red-50 to-rose-50",
          border: "border-red-200/50",
          text: "text-red-900",
          badge: "bg-red-100 text-red-800",
        };
      case "CONFLITO_MANUAL":
        return {
          color: "yellow",
          icon: AlertTriangle,
          bg: "from-yellow-50 to-amber-50",
          border: "border-yellow-200/50",
          text: "text-yellow-900",
          badge: "bg-yellow-100 text-yellow-800",
        };
      case "EM_ANALISE":
        return {
          color: "gray",
          icon: Clock,
          bg: "from-gray-50 to-slate-50",
          border: "border-gray-200/50",
          text: "text-gray-900",
          badge: "bg-gray-100 text-gray-800",
        };
      case "REVALIDADO":
        return {
          color: "slate",
          icon: RefreshCw,
          bg: "from-slate-50 to-zinc-50",
          border: "border-slate-300/50",
          text: "text-slate-900",
          badge: "bg-slate-100 text-slate-800",
        };
      default:
        return {
          color: "gray",
          icon: FileText,
          bg: "from-gray-50 to-gray-100",
          border: "border-gray-200/50",
          text: "text-gray-900",
          badge: "bg-gray-100 text-gray-800",
        };
    }
  };

  if (!isOpen) return null;

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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-4 md:inset-10 z-50 overflow-hidden"
          >
            <div className="w-full h-full bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl shadow-2xl flex flex-col">
              {/* Header */}
              <div className="relative p-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border-b border-gray-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-blue-500" />
                      Detalhes da Validação
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {resumo.totalProcessados} envios processados
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-600" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  <TabButton
                    active={tabAtiva === "TODOS"}
                    onClick={() => setTabAtiva("TODOS")}
                    count={resumo.totalProcessados}
                    label="Todos"
                    color="blue"
                  />
                  <TabButton
                    active={tabAtiva === "VALIDADO"}
                    onClick={() => setTabAtiva("VALIDADO")}
                    count={resumo.validado}
                    label="Validados"
                    color="green"
                  />
                  <TabButton
                    active={tabAtiva === "REJEITADO"}
                    onClick={() => setTabAtiva("REJEITADO")}
                    count={resumo.rejeitado}
                    label="Rejeitados"
                    color="red"
                  />
                  <TabButton
                    active={tabAtiva === "CONFLITO_MANUAL"}
                    onClick={() => setTabAtiva("CONFLITO_MANUAL")}
                    count={resumo.conflito_manual}
                    label="Conflitos"
                    color="yellow"
                  />
                  <TabButton
                    active={tabAtiva === "EM_ANALISE"}
                    onClick={() => setTabAtiva("EM_ANALISE")}
                    count={resumo.em_analise}
                    label="Em Análise"
                    color="gray"
                  />
                  {/* Tab Revalidados - NOVO (Sprint 19) */}
                  {resumo.revalidado && resumo.revalidado > 0 && (
                    <TabButton
                      active={tabAtiva === "REVALIDADO"}
                      onClick={() => setTabAtiva("REVALIDADO")}
                      count={resumo.revalidado}
                      label="Revalidados"
                      color="slate"
                    />
                  )}
                </div>

                {/* Campo de Busca */}
                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por pedido, vendedor, ótica ou campanha..."
                      value={buscaTexto}
                      onChange={(e) => setBuscaTexto(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {enviosFiltrados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <FileText className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhum envio nesta categoria</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {enviosFiltrados.map((envio, index) => (
                      <EnvioCard key={envio.id} envio={envio} index={index} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Componente de Tab
function TabButton({
  active,
  onClick,
  count,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  label: string;
  color: string;
}) {
  const colorClasses = {
    blue: "bg-blue-500 text-white",
    green: "bg-green-500 text-white",
    red: "bg-red-500 text-white",
    yellow: "bg-yellow-500 text-white",
    gray: "bg-gray-500 text-white",
  }[color];

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
        active
          ? colorClasses
          : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
      }`}
    >
      {label} <span className="ml-1">({count})</span>
    </button>
  );
}

// Componente de Card de Envio
function EnvioCard({ envio, index }: { envio: EnvioDetalhe; index: number }) {
  const config = getStatusConfig(envio.status);
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative overflow-hidden bg-gradient-to-br ${config.bg} border ${config.border} rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* Header do Card */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${config.badge} rounded-lg`}>
            <StatusIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`font-bold ${config.text} flex items-center gap-2`}>
              <Hash className="w-4 h-4" />
              {envio.numeroPedido}
            </h3>
            <span className={`text-xs px-2 py-0.5 ${config.badge} rounded-full font-medium`}>
              {envio.status === "CONFLITO_MANUAL" ? "Conflito Manual" : envio.status}
            </span>
          </div>
        </div>
        {envio.valorPontos > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-600">Pontos</p>
            <p className={`text-lg font-bold ${config.text}`}>
              {Number(envio.valorPontos).toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Grid de Informações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Vendedor */}
        <div className="flex items-start gap-2">
          <User className={`w-4 h-4 ${config.text} mt-0.5`} />
          <div className="flex-1">
            <p className="text-xs text-gray-600 font-medium">Vendedor</p>
            <p className={`text-sm font-semibold ${config.text}`}>{envio.vendedor.nome}</p>
            <p className="text-xs text-gray-500">{envio.vendedor.email}</p>
          </div>
        </div>

        {/* Ótica */}
        <div className="flex items-start gap-2">
          <Building2 className={`w-4 h-4 ${config.text} mt-0.5`} />
          <div className="flex-1">
            <p className="text-xs text-gray-600 font-medium">Ótica</p>
            <p className={`text-sm font-semibold ${config.text}`}>{envio.optica.nome}</p>
            <p className="text-xs text-gray-500">CNPJ: {envio.optica.cnpj}</p>
          </div>
        </div>

        {/* Campanha */}
        <div className="flex items-start gap-2">
          <Target className={`w-4 h-4 ${config.text} mt-0.5`} />
          <div className="flex-1">
            <p className="text-xs text-gray-600 font-medium">Campanha</p>
            <p className={`text-sm font-semibold ${config.text}`}>{envio.campanha.titulo}</p>
          </div>
        </div>

        {/* Produto/Requisito */}
        <div className="flex items-start gap-2">
          <Package className={`w-4 h-4 ${config.text} mt-0.5`} />
          <div className="flex-1">
            <p className="text-xs text-gray-600 font-medium">Requisito</p>
            <p className={`text-sm font-semibold ${config.text}`}>{envio.requisito.descricao}</p>
            <p className="text-xs text-gray-500">Cód: {envio.codigoReferencia}</p>
          </div>
        </div>
      </div>

      {/* Datas */}
      <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>Envio: {new Date(envio.dataEnvio).toLocaleDateString("pt-BR")}</span>
        </div>
        {envio.dataValidacao && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Validação: {new Date(envio.dataValidacao).toLocaleDateString("pt-BR")}</span>
          </div>
        )}
      </div>

      {/* Motivo/Info Conflito */}
      {(envio.motivo || envio.infoConflito || envio.motivoVendedor) && (
        <div className={`p-3 ${config.badge} rounded-lg space-y-2`}>
          {/* Mensagem enviada ao vendedor (se houver) */}
          {envio.motivoVendedor && (
            <div>
              <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                <User className="h-3 w-3" />
                Mensagem Enviada ao Vendedor:
              </p>
              <p className="text-xs bg-white/50 dark:bg-black/20 p-2 rounded border border-current/10">
                {envio.motivoVendedor}
              </p>
            </div>
          )}

          {/* Motivo técnico para admin (se houver) */}
          {envio.motivo && (
            <div>
              <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Motivo Técnico:
              </p>
              <p className="text-xs bg-white/50 dark:bg-black/20 p-2 rounded border border-current/10 font-mono">
                {envio.motivo}
              </p>
            </div>
          )}

          {/* Info de conflito (se houver) */}
          {envio.infoConflito && !envio.motivo && (
            <div>
              <p className="text-xs font-semibold mb-1">Informação do Conflito:</p>
              <p className="text-xs">{envio.infoConflito}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Função helper para obter configuração de status (duplicada para usar no componente)
function getStatusConfig(status: string) {
  switch (status) {
    case "VALIDADO":
      return {
        color: "green",
        icon: CheckCircle2,
        bg: "from-green-50 to-emerald-50",
        border: "border-green-200/50",
        text: "text-green-900",
        badge: "bg-green-100 text-green-800",
      };
    case "REJEITADO":
      return {
        color: "red",
        icon: XCircle,
        bg: "from-red-50 to-rose-50",
        border: "border-red-200/50",
        text: "text-red-900",
        badge: "bg-red-100 text-red-800",
      };
    case "CONFLITO_MANUAL":
      return {
        color: "yellow",
        icon: AlertTriangle,
        bg: "from-yellow-50 to-amber-50",
        border: "border-yellow-200/50",
        text: "text-yellow-900",
        badge: "bg-yellow-100 text-yellow-800",
      };
    default:
      return {
        color: "gray",
        icon: FileText,
        bg: "from-gray-50 to-gray-100",
        border: "border-gray-200/50",
        text: "text-gray-900",
        badge: "bg-gray-100 text-gray-800",
      };
  }
}
