'use client';

/**
 * ============================================================================
 * MODAL: Importar Óticas via Planilha
 * ============================================================================
 *
 * Modal para importação em massa de óticas através de planilha Excel/CSV.
 * Permite upload, mapeamento de colunas e importação de múltiplas óticas.
 *
 * Features:
 * - Upload de planilha (.xlsx, .xls, .csv)
 * - Mapeamento de colunas customizável
 * - Preview dos dados antes da importação
 * - Validação de dados
 * - Feedback de progresso
 *
 * @module ImportarOticasModal
 * ============================================================================
 */

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import UploadPlanilha from '@/components/validacao/UploadPlanilha';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

// ============================================================================
// INTERFACES
// ============================================================================

interface ImportarOticasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface MapeamentoCampos {
  nome: string;
  cnpj: string;
  codigoOtica: string;
  endereco: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
  ehMatriz: string;
}

interface ResultadoImportacao {
  sucesso: number;
  erros: number;
  detalhes: {
    linha: number;
    sucesso: boolean;
    erro?: string;
  }[];
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function ImportarOticasModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportarOticasModalProps) {
  // ==========================================================================
  // ESTADOS
  // ==========================================================================

  const [etapa, setEtapa] = useState<'upload' | 'mapeamento' | 'processando' | 'resultado'>('upload');
  const [cabecalhos, setCabecalhos] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<any[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mapeamento, setMapeamento] = useState<Partial<MapeamentoCampos>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handlePlanilhaCarregada = (headers: string[], rows: any[], file: File) => {
    setCabecalhos(headers);
    setLinhas(rows);
    setArquivo(file);
    setEtapa('mapeamento');

    // Tentar mapear automaticamente campos comuns
    const mapeamentoAuto: Partial<MapeamentoCampos> = {};

    headers.forEach((header) => {
      const headerLower = header.toLowerCase();
      if (headerLower.includes('nome')) mapeamentoAuto.nome = header;
      if (headerLower.includes('cnpj')) mapeamentoAuto.cnpj = header;
      if (headerLower.includes('codigo') || headerLower.includes('código')) mapeamentoAuto.codigoOtica = header;
      if (headerLower.includes('endereco') || headerLower.includes('endereço')) mapeamentoAuto.endereco = header;
      if (headerLower.includes('cidade')) mapeamentoAuto.cidade = header;
      if (headerLower.includes('estado') || headerLower.includes('uf')) mapeamentoAuto.estado = header;
      if (headerLower.includes('telefone') || headerLower.includes('fone')) mapeamentoAuto.telefone = header;
      if (headerLower.includes('email') || headerLower.includes('e-mail')) mapeamentoAuto.email = header;
      if (headerLower.includes('matriz')) mapeamentoAuto.ehMatriz = header;
    });

    setMapeamento(mapeamentoAuto);
  };

  const handleImportar = async () => {
    if (!mapeamento.nome || !mapeamento.cnpj) {
      toast.error('Nome e CNPJ são campos obrigatórios!');
      return;
    }

    setIsProcessing(true);
    setEtapa('processando');

    try {
      // Montar array de óticas a partir das linhas
      const oticasParaImportar = linhas.map((linha, index) => {
        const otica: any = {};

        // Mapear campos obrigatórios
        if (mapeamento.nome) otica.nome = linha[mapeamento.nome];
        if (mapeamento.cnpj) otica.cnpj = String(linha[mapeamento.cnpj]).replace(/\D/g, '');

        // Mapear campos opcionais
        if (mapeamento.codigoOtica && linha[mapeamento.codigoOtica]) {
          otica.codigoOtica = String(linha[mapeamento.codigoOtica]);
        }
        if (mapeamento.endereco && linha[mapeamento.endereco]) {
          otica.endereco = String(linha[mapeamento.endereco]);
        }
        if (mapeamento.cidade && linha[mapeamento.cidade]) {
          otica.cidade = String(linha[mapeamento.cidade]);
        }
        if (mapeamento.estado && linha[mapeamento.estado]) {
          otica.estado = String(linha[mapeamento.estado]).toUpperCase().substring(0, 2);
        }
        if (mapeamento.telefone && linha[mapeamento.telefone]) {
          otica.telefone = String(linha[mapeamento.telefone]);
        }
        if (mapeamento.email && linha[mapeamento.email]) {
          otica.email = String(linha[mapeamento.email]);
        }

        // Mapear ehMatriz (aceita: "Sim", "S", "True", "1", "Matriz")
        if (mapeamento.ehMatriz && linha[mapeamento.ehMatriz]) {
          const valor = String(linha[mapeamento.ehMatriz]).toLowerCase();
          otica.ehMatriz = ['sim', 's', 'true', '1', 'matriz'].includes(valor);
        } else {
          otica.ehMatriz = false;
        }

        return otica;
      });

      // Enviar para o backend
      const response = await api.post('/oticas/importar', {
        oticas: oticasParaImportar,
      });

      setResultado(response.data);
      setEtapa('resultado');

      if (response.data.erros === 0) {
        toast.success(`${response.data.sucesso} óticas importadas com sucesso!`);
      } else {
        toast.warning(`${response.data.sucesso} óticas importadas, ${response.data.erros} com erros`);
      }
    } catch (error: any) {
      console.error('Erro ao importar óticas:', error);
      toast.error(error.response?.data?.message || 'Erro ao importar óticas');
      setEtapa('mapeamento');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFechar = () => {
    if (!isProcessing) {
      resetModal();
      onClose();
    }
  };

  const handleConcluir = () => {
    onSuccess();
    resetModal();
    onClose();
  };

  const resetModal = () => {
    setEtapa('upload');
    setCabecalhos([]);
    setLinhas([]);
    setArquivo(null);
    setMapeamento({});
    setResultado(null);
  };

  // ==========================================================================
  // RENDER: Campos para Mapeamento
  // ==========================================================================

  const camposMapeamento = [
    { key: 'nome', label: 'Nome da Ótica', obrigatorio: true },
    { key: 'cnpj', label: 'CNPJ', obrigatorio: true },
    { key: 'codigoOtica', label: 'Código da Ótica', obrigatorio: false },
    { key: 'endereco', label: 'Endereço', obrigatorio: false },
    { key: 'cidade', label: 'Cidade', obrigatorio: false },
    { key: 'estado', label: 'Estado (UF)', obrigatorio: false },
    { key: 'telefone', label: 'Telefone', obrigatorio: false },
    { key: 'email', label: 'Email', obrigatorio: false },
    { key: 'ehMatriz', label: 'É Matriz? (Sim/Não)', obrigatorio: false },
  ];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleFechar}>
        {/* Overlay */}
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

        {/* Container do Modal */}
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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white/20 p-2">
                      <FileSpreadsheet className="h-6 w-6 text-white" />
                    </div>
                    <Dialog.Title className="text-xl font-bold text-white">
                      Importar Óticas
                    </Dialog.Title>
                  </div>
                  <button
                    type="button"
                    onClick={handleFechar}
                    disabled={isProcessing}
                    className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6">
                  {/* Etapa: Upload */}
                  {etapa === 'upload' && (
                    <div>
                      <p className="text-sm text-gray-600 mb-6">
                        Faça o upload de uma planilha Excel (.xlsx, .xls) ou CSV contendo as informações das óticas que deseja importar.
                      </p>
                      <UploadPlanilha onPlanilhaCarregada={handlePlanilhaCarregada} />
                    </div>
                  )}

                  {/* Etapa: Mapeamento */}
                  {etapa === 'mapeamento' && (
                    <div>
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Mapeamento de Colunas
                        </h3>
                        <p className="text-sm text-gray-600">
                          Relacione as colunas da sua planilha com os campos do sistema. {linhas.length} linhas encontradas.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {camposMapeamento.map((campo) => (
                          <div key={campo.key}>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}
                            </label>
                            <select
                              value={mapeamento[campo.key as keyof MapeamentoCampos] || ''}
                              onChange={(e) => setMapeamento({ ...mapeamento, [campo.key]: e.target.value })}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Não mapear</option>
                              {cabecalhos
                                .filter((header) => header && header.trim() !== '')
                                .filter((header, index, self) => self.indexOf(header) === index)
                                .map((header, index) => (
                                  <option key={`${header}-${index}`} value={header}>
                                    {header}
                                  </option>
                                ))}
                            </select>
                          </div>
                        ))}
                      </div>

                      {/* Preview */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Preview (primeira linha)</h4>
                        <div className="space-y-2">
                          {linhas[0] && Object.entries(mapeamento).map(([key, coluna]) => {
                            if (!coluna) return null;
                            return (
                              <div key={key} className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-700 min-w-[120px]">
                                  {camposMapeamento.find(c => c.key === key)?.label}:
                                </span>
                                <span className="text-gray-900 font-mono bg-white px-2 py-1 rounded">
                                  {linhas[0][coluna] || '(vazio)'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setEtapa('upload')}
                          className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Voltar
                        </button>
                        <button
                          type="button"
                          onClick={handleImportar}
                          disabled={!mapeamento.nome || !mapeamento.cnpj}
                          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Importar {linhas.length} Óticas
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Etapa: Processando */}
                  {etapa === 'processando' && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-16 w-16 text-blue-600 animate-spin mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Importando óticas...
                      </h3>
                      <p className="text-sm text-gray-600">
                        Por favor, aguarde enquanto processamos os dados
                      </p>
                    </div>
                  )}

                  {/* Etapa: Resultado */}
                  {etapa === 'resultado' && resultado && (
                    <div>
                      <div className="text-center mb-6">
                        {resultado.erros === 0 ? (
                          <>
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              Importação Concluída!
                            </h3>
                            <p className="text-gray-600">
                              {resultado.sucesso} óticas importadas com sucesso
                            </p>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              Importação Parcial
                            </h3>
                            <p className="text-gray-600">
                              {resultado.sucesso} óticas importadas, {resultado.erros} com erros
                            </p>
                          </>
                        )}
                      </div>

                      {/* Detalhes de erros */}
                      {resultado.erros > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-h-64 overflow-y-auto">
                          <h4 className="text-sm font-semibold text-red-900 mb-3">Erros Encontrados:</h4>
                          <div className="space-y-2">
                            {resultado.detalhes.filter(d => !d.sucesso).map((detalhe, index) => (
                              <div key={index} className="text-sm text-red-800">
                                <span className="font-medium">Linha {detalhe.linha}:</span> {detalhe.erro}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleConcluir}
                          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all"
                        >
                          Concluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
