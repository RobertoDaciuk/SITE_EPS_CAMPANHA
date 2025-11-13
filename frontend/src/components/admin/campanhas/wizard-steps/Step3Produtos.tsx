'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  X,
  Table as TableIcon,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import type { WizardState } from '../CriarCampanhaWizard';

// Helper para gerar UUID simples
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

interface UploadResponse {
  fileId: string;
  headers: string[];
  rowCount: number;
}

interface ProcessResponse {
  inserted: number;
  sessionId: string;
  preview: Array<{
    codigoRef: string;
    pontos: number;
    nomeProduto?: string;
  }>;
}

export default function Step3Produtos({ state, setState }: Props) {
  // Estados do fluxo de upload e mapeamento
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Dados do arquivo
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState<number>(0);
  
  // Mapeamento de colunas
  const [columnRef, setColumnRef] = useState<string>('');
  const [columnPoints, setColumnPoints] = useState<string>('');
  const [columnName, setColumnName] = useState<string>('');
  
  // Preview dos dados processados
  const [preview, setPreview] = useState<ProcessResponse['preview']>([]);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string>('');
  
  // Status do wizard
  const [uploadComplete, setUploadComplete] = useState(false);
  const [mappingComplete, setMappingComplete] = useState(false);

  /**
   * Handler para drag & drop
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  /**
   * Handler para input de arquivo
   */
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  /**
   * STEP 1: Upload do arquivo para o backend
   */
  const handleFileUpload = async (file: File) => {
    // Validar extensão
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls') && !ext.endsWith('.csv')) {
      toast.error('Formato inválido! Use arquivos .xlsx, .xls ou .csv');
      return;
    }

    setIsUploading(true);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post<UploadResponse>('/imports/staging/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { fileId: uploadedFileId, headers: uploadedHeaders, rowCount: uploadedRowCount } = response.data;

      setFileId(uploadedFileId);
      setHeaders(uploadedHeaders);
      setRowCount(uploadedRowCount);
      setUploadComplete(true);

      // Auto-detectar colunas comuns
      autoDetectColumns(uploadedHeaders);

      toast.success(`Arquivo carregado! ${uploadedRowCount} linha(s) detectadas.`);
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error(error.response?.data?.message || 'Erro ao fazer upload do arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Auto-detectar colunas comuns
   */
  const autoDetectColumns = (cols: string[]) => {
    const lowerCols = cols.map(c => c.toLowerCase());

    // Detectar coluna de referência (código, ref, sku, etc.)
    const refKeywords = ['código', 'codigo', 'ref', 'referencia', 'referência', 'sku', 'produto'];
    const refCol = cols.find((c, i) => refKeywords.some(k => lowerCols[i].includes(k)));
    if (refCol) setColumnRef(refCol);

    // Detectar coluna de pontos (valor, pontos, preço, etc.)
    const pointsKeywords = ['ponto', 'pontos', 'valor', 'preço', 'preco', 'price'];
    const pointsCol = cols.find((c, i) => pointsKeywords.some(k => lowerCols[i].includes(k)));
    if (pointsCol) setColumnPoints(pointsCol);

    // Detectar coluna de nome (nome, descrição, etc.)
    const nameKeywords = ['nome', 'descrição', 'descricao', 'description', 'name', 'produto'];
    const nameCol = cols.find((c, i) => nameKeywords.some(k => lowerCols[i].includes(k)));
    if (nameCol) setColumnName(nameCol);
  };

  /**
   * STEP 2: Processar mapeamento de colunas
   */
  const handleProcessMapping = async () => {
    if (!fileId) {
      toast.error('Arquivo não encontrado');
      return;
    }

    if (!columnRef || !columnPoints) {
      toast.error('Selecione as colunas de Código e Pontos');
      return;
    }

    setIsProcessing(true);

    try {
      // Gerar sessionId único para esta importação
      const newSessionId = generateUUID();

      const response = await api.post<ProcessResponse>('/imports/staging/map', {
        fileId,
        columnRef,
        columnPoints,
        columnName: columnName || undefined,
        sessionId: newSessionId,
      });

      const { inserted, preview: processedPreview, sessionId: returnedSessionId } = response.data;

      setProcessedCount(inserted);
      setPreview(processedPreview);
      setSessionId(returnedSessionId);
      setMappingComplete(true);

      // Carregar TODOS os produtos do staging para salvar no wizard state
      const fullProductsResponse = await api.get('/imports/staging/search', {
        params: {
          sessionId: returnedSessionId,
          limit: 100000, // Carregar todos
        },
      });

      const allProducts = fullProductsResponse.data.products || [];

      // Salvar sessionId E TODOS os produtos no estado do wizard
      setState(prev => ({
        ...prev,
        importSessionId: returnedSessionId,
        produtosCampanha: allProducts.map((p: any) => ({
          codigoRef: p.codigoRef,
          pontosReais: p.pontos,
        })),
      }));

      toast.success(`${inserted} produtos processados com sucesso!`);
    } catch (error: any) {
      console.error('Erro no processamento:', error);
      toast.error(error.response?.data?.message || 'Erro ao processar mapeamento');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Resetar fluxo
   */
  const handleReset = () => {
    setFileId(null);
    setFileName('');
    setHeaders([]);
    setRowCount(0);
    setColumnRef('');
    setColumnPoints('');
    setColumnName('');
    setPreview([]);
    setProcessedCount(0);
    setSessionId('');
    setUploadComplete(false);
    setMappingComplete(false);
  };

  /**
   * Renderização
   */
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet className="w-7 h-7 text-indigo-600" />
          Importação de Produtos
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Faça upload da planilha com os produtos da campanha e mapeie as colunas
        </p>
      </div>

      {/* FASE 1: Upload de Arquivo */}
      {!uploadComplete && (
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-all
              ${isDragging 
                ? 'border-indigo-500 bg-indigo-50' 
                : 'border-gray-300 hover:border-indigo-400 bg-white'
              }
            `}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <p className="text-gray-700 font-medium">Fazendo upload de {fileName}...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Upload className="w-12 h-12 text-gray-400" />
                <div>
                  <p className="text-gray-700 font-medium">
                    Arraste seu arquivo aqui ou clique para selecionar
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Formatos suportados: .xlsx, .xls, .csv
                  </p>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    Selecionar Arquivo
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FASE 2: Mapeamento de Colunas */}
      {uploadComplete && !mappingComplete && (
        <div className="space-y-6">
          {/* Info do arquivo */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-green-900">{fileName}</p>
              <p className="text-sm text-green-700">{rowCount} linhas detectadas</p>
            </div>
            <button
              onClick={handleReset}
              className="text-green-700 hover:text-green-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mapeamento */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <TableIcon className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Mapeamento de Colunas</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Coluna de Código */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coluna de Código/Referência *
                </label>
                <select
                  value={columnRef}
                  onChange={(e) => setColumnRef(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione...</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Coluna de Pontos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coluna de Pontos/Valor *
                </label>
                <select
                  value={columnPoints}
                  onChange={(e) => setColumnPoints(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione...</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Coluna de Nome (Opcional) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coluna de Nome do Produto (Opcional)
                </label>
                <select
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Nenhuma</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessMapping}
                disabled={!columnRef || !columnPoints || isProcessing}
                className={`
                  px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all
                  ${!columnRef || !columnPoints || isProcessing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }
                `}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    Processar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FASE 3: Preview e Confirmação */}
      {mappingComplete && (
        <div className="space-y-6">
          {/* Info do processamento */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-green-900">
                Processamento concluído com sucesso!
              </p>
              <p className="text-sm text-green-700">
                {processedCount} produtos foram importados e estão prontos para uso
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-green-700 hover:text-green-900"
              title="Importar outro arquivo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Preview dos Produtos (primeiros 5)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Pontos
                    </th>
                    {preview.some(p => p.nomeProduto) && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Nome
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {preview.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {item.codigoRef}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        R$ {item.pontos.toFixed(2)}
                      </td>
                      {preview.some(p => p.nomeProduto) && (
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {item.nomeProduto || '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
