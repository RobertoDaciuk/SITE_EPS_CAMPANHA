'use client';

/**
 * ============================================================================
 * MODAL: Editar Campanha (Admin)
 * ============================================================================
 *
 * Modal para edição de campos básicos de campanhas existentes.
 *
 * LIMITAÇÃO INTENCIONAL:
 * - Permite editar apenas campos base (título, datas, valores, targeting)
 * - NÃO permite editar cartelas/requisitos/condições (complexidade)
 * - Para criar campanhas completas, usar interface dedicada (feature futura)
 *
 * Campos Editáveis:
 * - titulo, descricao
 * - dataInicio, dataFim
 * - pontosReaisPorCartela, percentualGerente
 * - paraTodasOticas
 *
 * @module AdminCampanhasModal
 * ============================================================================
 */

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Loader2, Trophy, Calendar, Target } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

// ============================================================================
// INTERFACES
// ============================================================================

interface Campanha {
  id: string;
  titulo: string;
  descricao: string;
  dataInicio: string; // ISO
  dataFim: string; // ISO
  pontosReaisPorCartela: number;
  percentualGerente: number;
  paraTodasOticas?: boolean;
}

interface EditarCampanhaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campanhaToEdit: Campanha | null;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function EditarCampanhaModal({
  isOpen,
  onClose,
  onSuccess,
  campanhaToEdit,
}: EditarCampanhaModalProps) {
  // ==========================================================================
  // ESTADOS DO FORMULÁRIO
  // ==========================================================================

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [pontosReaisPorCartela, setPontosReaisPorCartela] = useState(0);
  const [percentualGerente, setPercentualGerente] = useState(0.1);
  const [paraTodasOticas, setParaTodasOticas] = useState(true);

  const [isLoading, setIsLoading] = useState(false);

  // ==========================================================================
  // EFFECT: Preencher Formulário ao Editar
  // ==========================================================================

  useEffect(() => {
    if (campanhaToEdit) {
      setTitulo(campanhaToEdit.titulo);
      setDescricao(campanhaToEdit.descricao);

      // Converter ISO para YYYY-MM-DD (formato do input date)
      const dataInicioFormatted = campanhaToEdit.dataInicio.split('T')[0];
      const dataFimFormatted = campanhaToEdit.dataFim.split('T')[0];

      setDataInicio(dataInicioFormatted);
      setDataFim(dataFimFormatted);
      setPontosReaisPorCartela(campanhaToEdit.pontosReaisPorCartela);
      setPercentualGerente(campanhaToEdit.percentualGerente);
      setParaTodasOticas(campanhaToEdit.paraTodasOticas ?? true);
    }
  }, [campanhaToEdit]);

  // ==========================================================================
  // HANDLER: Submit
  // ==========================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        titulo,
        descricao,
        dataInicio,
        dataFim,
        pontosReaisPorCartela: Number(pontosReaisPorCartela),
        percentualGerente: Number(percentualGerente),
        paraTodasOticas,
      };

      await toast.promise(
        api.patch(`/campanhas/${campanhaToEdit!.id}`, payload),
        {
          loading: 'Atualizando campanha...',
          success: 'Campanha atualizada com sucesso!',
          error: (err) => {
            console.error('Erro ao atualizar campanha:', err);
            return err.response?.data?.message || 'Erro ao atualizar campanha';
          },
        }
      );

      onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar campanha:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // HANDLER: Fechar Modal
  // ==========================================================================

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-white/20 p-2">
                        <Trophy className="h-6 w-6 text-white" />
                      </div>
                      <Dialog.Title className="text-xl font-bold text-white">
                        Editar Campanha
                      </Dialog.Title>
                    </div>
                    <button
                      onClick={handleClose}
                      disabled={isLoading}
                      className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="space-y-4">
                    {/* Título */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Título da Campanha <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        required
                        disabled={isLoading}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        placeholder="Ex: Campanha Lentes Q1 2025"
                      />
                    </div>

                    {/* Descrição */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descrição <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        required
                        disabled={isLoading}
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        placeholder="Descreva os objetivos e regras da campanha..."
                      />
                    </div>

                    {/* Datas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data de Início <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={dataInicio}
                          onChange={(e) => setDataInicio(e.target.value)}
                          required
                          disabled={isLoading}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data de Término <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={dataFim}
                          onChange={(e) => setDataFim(e.target.value)}
                          required
                          disabled={isLoading}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        />
                      </div>
                    </div>

                    {/* Valores */}
                    <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pontos (R$) por Cartela <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={pontosReaisPorCartela}
                          onChange={(e) => setPontosReaisPorCartela(Number(e.target.value))}
                          required
                          min="0"
                          disabled={isLoading}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        />
                      </div>
                    </div>

                    {/* Percentual Gerente */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Percentual do Gerente (0.0 a 1.0) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={percentualGerente}
                        onChange={(e) => setPercentualGerente(Number(e.target.value))}
                        required
                        min="0"
                        max="1"
                        disabled={isLoading}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        placeholder="Ex: 0.10 para 10%"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Ex: 0.10 = 10%, 0.15 = 15%
                      </p>
                    </div>

                    {/* Targeting */}
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <input
                        type="checkbox"
                        id="paraTodasOticas"
                        checked={paraTodasOticas}
                        onChange={(e) => setParaTodasOticas(e.target.checked)}
                        disabled={isLoading}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="paraTodasOticas" className="text-sm font-medium text-gray-900 cursor-pointer">
                        Campanha válida para todas as óticas
                      </label>
                    </div>

                    {/* Alerta de Limitação */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Target className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-900">Limitação de Edição</p>
                          <p className="text-xs text-amber-700 mt-1">
                            Este modal permite editar apenas os campos básicos da campanha.
                            Para alterar cartelas, requisitos ou condições, você precisará criar uma nova campanha.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar Alterações'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
