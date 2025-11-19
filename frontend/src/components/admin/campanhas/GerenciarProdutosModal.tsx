'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileSpreadsheet, Copy, Search, Check, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (produtos: Array<{ codigoRef: string; pontosReais: number }>, sessionId?: string, totalStaging?: number, maxPontos?: number) => void;
  produtosAtuais: Array<{ codigoRef: string; pontosReais: number }>;
  currentSessionId?: string;
  outrosRequisitos?: Array<{
    descricao: string;
    ordem: number;
    produtos: Array<{ codigoRef: string; pontosReais: number }>;
    importSessionId?: string;
    quantidadeStaging?: number;
  }>;
  cartelaNumero: number;
  requisitoOrdem: number;
}

export default function GerenciarProdutosModal({
  isOpen,
  onClose,
  onSave,
  produtosAtuais,
  currentSessionId,
  outrosRequisitos = [],
  cartelaNumero,
  requisitoOrdem,
}: Props) {
  // Estados
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [fileId, setFileId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [previewProdutos, setPreviewProdutos] = useState<Array<any>>([]);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [mappedCodeColumn, setMappedCodeColumn] = useState<string>('');
  const [mappedValueColumn, setMappedValueColumn] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Ao abrir o modal, verificar se já existem produtos
  useEffect(() => {
    if (isOpen) {
      if (produtosAtuais.length > 0) {
        // Exibir produtos existentes diretamente no preview
        setPreviewProdutos(produtosAtuais.map(p => ({
          codigoRef: p.codigoRef,
          pontos: p.pontosReais,
        })));
        setTotalProdutos(produtosAtuais.length);
        setStep('preview');
        setSearchTerm('');
      } else if (currentSessionId) {
        // Carregar produtos da sessão de staging
        setSessionId(currentSessionId);
        setStep('preview');
        setSearchTerm('');
        // Disparar busca inicial
        handleSearch('', currentSessionId);
      } else {
        // Resetar ao estado inicial
        setStep('upload');
        setPreviewProdutos([]);
        setTotalProdutos(0);
        setSearchTerm('');
        setFileId('');
        setSessionId('');
      }
    }
  }, [isOpen, produtosAtuais, currentSessionId]);

  // Dropzone para upload
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/imports/staging/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFileId(response.data.fileId);
      setAvailableColumns(response.data.headers || []);
      setStep('mapping');
      toast.success(`Arquivo "${file.name}" carregado com sucesso!`);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao carregar arquivo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  // Mapear colunas e gerar preview
  const handleMapping = async () => {
    if (!mappedCodeColumn || !mappedValueColumn) {
      toast.error('Selecione as colunas de código e valor');
      return;
    }

    setIsLoading(true);
    try {
      // Gerar sessionId único para este upload
      const newSessionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      const payload = {
        fileId,
        columnRef: mappedCodeColumn,
        columnPoints: mappedValueColumn,
        sessionId: newSessionId,
      };
      
      const response = await api.post('/imports/staging/map', payload);
      
      setSessionId(response.data.sessionId);
      setTotalProdutos(response.data.inserted || 0);

      // Carregar preview
      const previewResponse = await api.get('/imports/staging/search', {
        params: {
          sessionId: response.data.sessionId,
          limit: pageSize,
        },
      });

      setPreviewProdutos(previewResponse.data.products || []);
      setStep('preview');
      toast.success(`${response.data.inserted} produtos mapeados!`);
    } catch (error) {
      console.error('Erro ao mapear:', error);
      toast.error('Erro ao mapear colunas');
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar produtos via API (com debounce)
  const handleSearch = useCallback(async (term: string, currentSessionId: string) => {
    if (!currentSessionId) return;

    setIsSearching(true);
    try {
      const params: any = {
        sessionId: currentSessionId,
        limit: pageSize,
      };

      if (term.trim()) {
        params.q = term.trim();
      }

      const response = await api.get('/imports/staging/search', { params });
      setPreviewProdutos(response.data.products || []);
      setTotalProdutos(response.data.totalInSession || 0);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao buscar produtos');
    } finally {
      setIsSearching(false);
    }
  }, [pageSize]);

  // Debounce da busca
  useEffect(() => {
    if (step === 'preview' && sessionId) {
      // Limpar timeout anterior
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Agendar nova busca
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(searchTerm, sessionId);
      }, 300);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, sessionId, step, handleSearch]);

  // Copiar de outro requisito
  const handleCopiarDeOutroRequisito = async (requisito: any) => {
    if (requisito.importSessionId) {
      // Copiar via sessionId (Staging)
      onSave([], requisito.importSessionId, requisito.quantidadeStaging);
      onClose();
      toast.success(`Produtos copiados via Staging!`);
    } else if (requisito.produtos && requisito.produtos.length > 0) {
      // Copiar produtos diretamente
      onSave(requisito.produtos, undefined, requisito.produtos.length);
      onClose();
      toast.success(`${requisito.produtos.length} produtos copiados!`);
    } else {
      toast.error('Este requisito não tem produtos para copiar');
    }
  };

  // Salvar
  const handleSalvar = () => {
    // Calcular maxPontos
    let maxPontos = 0;
    if (previewProdutos.length > 0) {
      maxPontos = Math.max(...previewProdutos.map(p => Number(p.pontos || p.pontosReais || 0)));
    }

    if (sessionId) {
      // Salvar com sessionId (backend vai fazer INSERT SELECT)
      // Passar totalProdutos para atualizar a UI do card de resumo
      onSave([], sessionId, totalProdutos, maxPontos);
    } else if (previewProdutos.length > 0) {
      // Salvar com array direto (produtos existentes ou copiados)
      onSave(previewProdutos.map(p => ({
        codigoRef: p.codigoRef,
        pontosReais: Number(p.pontos || p.pontosReais),
      })), undefined, previewProdutos.length, maxPontos);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Gerenciar Produtos
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Cartela {cartelaNumero} - Requisito ordem {requisitoOrdem}
                  {produtosAtuais.length > 0 && (
                    <span className="ml-2 text-blue-500">
                      ({produtosAtuais.length} produto(s) atual)
                    </span>
                  )}
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content - renderizar baseado no step */}
          <div className="flex-1 overflow-y-auto p-6">
            {step === 'upload' && (
              <div className="space-y-6">
                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  {isLoading ? (
                    <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
                  ) : (
                    <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  )}
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    {isDragActive ? 'Solte o arquivo aqui' : 'Arraste uma planilha ou clique para selecionar'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Formatos aceitos: XLSX, XLS, CSV
                  </p>
                </div>

                {/* Opção: Copiar de outro requisito */}
                <div className="mt-8">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Ou copie de outro requisito:
                  </h4>
                  {outrosRequisitos.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {outrosRequisitos.map((req, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleCopiarDeOutroRequisito(req)}
                          className="w-full p-3 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <span className="font-medium">{req.descricao || `Requisito ${req.ordem}`}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              ({req.produtos?.length || req.quantidadeStaging || 0} produtos)
                            </span>
                          </div>
                          <Copy className="w-4 h-4 text-gray-400" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Nenhum requisito disponível para cópia. Configure o requisito anterior primeiro.
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 'mapping' && (
              <div className="space-y-6">
                <p className="text-gray-600 dark:text-gray-400">
                  Selecione as colunas da planilha:
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Código do Produto</label>
                    <select
                      value={mappedCodeColumn}
                      onChange={(e) => setMappedCodeColumn(e.target.value)}
                      className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    >
                      <option value="">Selecione...</option>
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Valor em Pontos (R$)</label>
                    <select
                      value={mappedValueColumn}
                      onChange={(e) => setMappedValueColumn(e.target.value)}
                      className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    >
                      <option value="">Selecione...</option>
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleMapping}
                  disabled={!mappedCodeColumn || !mappedValueColumn || isLoading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Mapear e Visualizar'
                  )}
                </button>
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {totalProdutos.toLocaleString()} produtos encontrados
                  </h4>
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar código..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>

                {/* Tabela de preview */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                          Código
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">
                          Pontos (R$)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-y-auto">
                      {isSearching ? (
                        <tr>
                          <td colSpan={2} className="px-4 py-8 text-center">
                            <Loader2 className="w-6 h-6 mx-auto text-blue-500 animate-spin" />
                            <p className="text-sm text-gray-500 mt-2">Buscando produtos...</p>
                          </td>
                        </tr>
                      ) : previewProdutos.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                            {searchTerm ? 'Nenhum produto encontrado com esse código' : 'Nenhum produto disponível'}
                          </td>
                        </tr>
                      ) : (
                        previewProdutos.map((produto, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-3 text-sm font-mono">
                              {produto.codigoRef}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              R$ {Number(produto.pontos || produto.pontosReais || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {!isSearching && previewProdutos.length > 0 && searchTerm && (
                  <p className="text-sm text-gray-500 text-center">
                    Mostrando até 50 resultados da busca
                  </p>
                )}
                
                {!isSearching && !searchTerm && totalProdutos > previewProdutos.length && (
                  <p className="text-sm text-gray-500 text-center">
                    Mostrando {previewProdutos.length} de {totalProdutos.toLocaleString()} produtos
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Cancelar
            </button>
            {step === 'preview' && (
              <>
                <button
                  onClick={() => {
                    setStep('upload');
                    setPreviewProdutos([]);
                    setTotalProdutos(0);
                    setSearchTerm('');
                    setFileId('');
                    setSessionId('');
                  }}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium mr-auto"
                >
                  Nova Importação
                </button>
                <button
                  onClick={handleSalvar}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Salvar {totalProdutos.toLocaleString()} produtos
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
