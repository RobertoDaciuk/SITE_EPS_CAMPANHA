"use client";

/**
 * ============================================================================
 * MODAL: Configuração de Formato de Datas
 * ============================================================================
 *
 * Modal para o admin configurar o formato de data das planilhas importadas.
 * Permite escolher entre múltiplos formatos (DD/MM/YYYY, MM/DD/YYYY, etc.)
 * e visualizar um preview da interpretação.
 *
 * A configuração é salva no perfil do usuário para uso futuro.
 *
 * @module ValidacaoModule
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Check,
  AlertCircle,
  Info,
  Settings,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";

/**
 * Formatos de data disponíveis
 */
const FORMATOS_DISPONIVEIS = [
  {
    value: "DD/MM/YYYY",
    label: "DD/MM/YYYY - Brasileiro (padrão)",
    exemplo: "07/11/2025",
    descricao: "Dia/Mês/Ano - Formato brasileiro",
  },
  {
    value: "MM/DD/YYYY",
    label: "MM/DD/YYYY - Americano",
    exemplo: "11/07/2025",
    descricao: "Mês/Dia/Ano - Formato americano",
  },
  {
    value: "YYYY-MM-DD",
    label: "YYYY-MM-DD - ISO 8601",
    exemplo: "2025-11-07",
    descricao: "Ano-Mês-Dia - Padrão internacional",
  },
  {
    value: "DD.MM.YYYY",
    label: "DD.MM.YYYY - Europeu (pontos)",
    exemplo: "07.11.2025",
    descricao: "Dia.Mês.Ano - Formato europeu",
  },
  {
    value: "DD-MM-YYYY",
    label: "DD-MM-YYYY - Com traços",
    exemplo: "07-11-2025",
    descricao: "Dia-Mês-Ano - Separador: traço",
  },
];

/**
 * Props do modal
 */
interface ModalFormatoDataProps {
  isOpen: boolean;
  onClose: () => void;
  formatoAtual?: string;
  onSalvar: (formato: string) => void | Promise<void>;
}

/**
 * Componente principal do modal
 */
export default function ModalFormatoData({
  isOpen,
  onClose,
  formatoAtual = "DD/MM/YYYY",
  onSalvar,
}: ModalFormatoDataProps) {
  const [formatoSelecionado, setFormatoSelecionado] = useState(formatoAtual);
  const [salvando, setSalvando] = useState(false);

  // Atualizar formato quando modal abre
  useEffect(() => {
    if (isOpen) {
      setFormatoSelecionado(formatoAtual);
    }
  }, [isOpen, formatoAtual]);

  // Handler de salvar
  const handleSalvar = async () => {
    setSalvando(true);

    try {
      await onSalvar(formatoSelecionado);
      toast.success(`Formato de data atualizado para ${formatoSelecionado}`);
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar formato:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSalvando(false);
    }
  };

  // Formato selecionado completo
  const formatoCompleto = FORMATOS_DISPONIVEIS.find(
    (f) => f.value === formatoSelecionado
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="relative p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Configurar Formato de Datas
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Defina como as datas da planilha serão interpretadas
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Info Box */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                      Esta configuração será salva no seu perfil
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      O formato selecionado será usado automaticamente para interpretar
                      as datas das próximas planilhas que você importar.
                    </p>
                  </div>
                </div>

                {/* Formatos Disponíveis */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Selecione o formato da planilha:
                  </h3>

                  <div className="grid grid-cols-1 gap-3">
                    {FORMATOS_DISPONIVEIS.map((formato) => {
                      const isSelected = formatoSelecionado === formato.value;

                      return (
                        <motion.button
                          key={formato.value}
                          onClick={() => setFormatoSelecionado(formato.value)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                            ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
                            }
                          `}
                        >
                          {/* Radio Button */}
                          <div
                            className={`
                              flex items-center justify-center w-6 h-6 rounded-full border-2 flex-shrink-0
                              ${
                                isSelected
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-gray-300 dark:border-gray-600"
                              }
                            `}
                          >
                            {isSelected && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {formato.label}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                              {formato.descricao}
                            </p>
                          </div>

                          {/* Exemplo */}
                          <div className="flex-shrink-0">
                            <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                              <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                                Exemplo:
                              </p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                                {formato.exemplo}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Preview */}
                {formatoCompleto && (
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                        Preview do Formato Selecionado
                      </h4>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-purple-700 dark:text-purple-300">
                          Formato:
                        </p>
                        <p className="text-lg font-bold text-purple-900 dark:text-purple-100 font-mono">
                          {formatoCompleto.value}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-purple-700 dark:text-purple-300">
                          Exemplo de data:
                        </p>
                        <p className="text-lg font-bold text-purple-900 dark:text-purple-100 font-mono">
                          {formatoCompleto.exemplo}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 italic">
                      → Esta data será interpretada como: <strong>7 de Novembro de 2025</strong>
                    </p>
                  </div>
                )}

                {/* Warning para formatos ambíguos */}
                {(formatoSelecionado === "DD/MM/YYYY" ||
                  formatoSelecionado === "MM/DD/YYYY") && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-amber-900 dark:text-amber-100 font-medium">
                        Atenção: Formato ambíguo
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Certifique-se de que todas as datas na planilha seguem exatamente
                        o formato selecionado. Datas como "05/06/2025" podem ser interpretadas
                        de forma diferente em formatos brasileiro e americano.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  disabled={salvando}
                  className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <motion.button
                  onClick={handleSalvar}
                  disabled={salvando}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {salvando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Salvar Configuração
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
