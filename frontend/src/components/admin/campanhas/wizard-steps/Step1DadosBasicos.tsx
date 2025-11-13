'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Info, 
  Calendar,
  Percent, 
  Image as ImageIcon, 
  Tag, 
  Upload, 
  X,
  Crop as CropIcon,
  Check,
  FileText,
  AlertCircle,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReactCrop, { type Crop as CropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import type { WizardState } from '../CriarCampanhaWizard';
import api from '@/lib/axios';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  modoEdicao?: boolean;
}

export default function Step1DadosBasicos({ state, setState, modoEdicao = false }: Props) {
  // Estados locais - Imagem 16:9
  const [imagemUpload16x9, setImagemUpload16x9] = useState<string | null>(null);
  const [crop16x9, setCrop16x9] = useState<CropType>({ 
    unit: '%', 
    width: 90, 
    height: 50.625, 
    x: 5, 
    y: 24.6875 
  });
  const [showCropModal16x9, setShowCropModal16x9] = useState(false);
  const imgRef16x9 = useRef<HTMLImageElement>(null);

  // Handlers: Tags
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      e.preventDefault();
      const newTag = e.currentTarget.value.trim();
      if (!state.tags.includes(newTag)) {
        setState({ ...state, tags: [...state.tags, newTag] });
        e.currentTarget.value = '';
        toast.success(`Tag "${newTag}" adicionada!`);
      } else {
        toast.error('Esta tag já existe!');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setState({ ...state, tags: state.tags.filter(tag => tag !== tagToRemove) });
    toast.success('Tag removida!');
  };

  // Handlers: Imagem 16:9
  const handleImagemUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImagemUpload16x9(reader.result as string);
      setShowCropModal16x9(true);
    };
    reader.readAsDataURL(file);
  }, []);

  const getCroppedImg = useCallback((image: HTMLImageElement, crop: CropType): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    let cropX = crop.x;
    let cropY = crop.y;
    let cropWidth = crop.width;
    let cropHeight = crop.height;
    
    if (crop.unit === '%') {
      cropX = (crop.x / 100) * image.width;
      cropY = (crop.y / 100) * image.height;
      cropWidth = (crop.width / 100) * image.width;
      cropHeight = (crop.height / 100) * image.height;
    }
    
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Erro ao criar contexto do canvas');
    }

    ctx.drawImage(
      image,
      cropX * scaleX,
      cropY * scaleY,
      cropWidth * scaleX,
      cropHeight * scaleY,
      0,
      0,
      cropWidth,
      cropHeight
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Erro ao criar blob'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  }, []);

  const handleCropConfirm = useCallback(async () => {
    if (!imgRef16x9.current) {
      toast.error('Imagem não carregada corretamente');
      return;
    }

    const loadingToast = toast.loading('Processando imagem 16:9...');

    try {
      const croppedBlob = await getCroppedImg(imgRef16x9.current, crop16x9);
      // Converte o blob para DataURL para um preview estável (evita blob: revogado)
      const previewDataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onerror = () => reject(new Error('Falha ao ler imagem'));
        fr.onloadend = () => resolve(fr.result as string);
        fr.readAsDataURL(croppedBlob);
      });

      const formData = new FormData();
      formData.append('file', croppedBlob, 'campanha-16x9.jpg');

      const { data } = await api.post('/upload/imagem-campanha', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setState(prev => ({
        ...prev,
        imagemCampanha16x9Url: data.url,
        imagemCampanha16x9Preview: previewDataUrl,
      }));

      setShowCropModal16x9(false);
      setImagemUpload16x9(null);

      toast.success('Imagem 16:9 salva com sucesso!', { id: loadingToast });
    } catch (error: any) {
      console.error('Erro ao processar imagem:', error);
      toast.error('Erro ao processar imagem', { id: loadingToast });
    }
  }, [crop16x9, getCroppedImg, setState]);

  // Cleanup de previews: não necessário para DataURL; evita revogar blob: indevidamente
  useEffect(() => {
    return () => {};
  }, [state.imagemCampanha16x9Preview]);

  const preview16x9 = state.imagemCampanha16x9Preview || state.imagemCampanha16x9Url || '';


  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      {/* Header - COMPACTO */}
      <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
            <Info className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {modoEdicao ? 'Editar Campanha' : 'Informações Gerais'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {modoEdicao 
                ? '✅ Você pode alterar todos os campos abaixo' 
                : 'Configure as informações fundamentais da sua campanha'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de Modo Edição */}
      {modoEdicao && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">O que pode ser editado?</p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>✅ Pode alterar:</strong> Título, descrição, datas, percentual gerente, tags, regras, tipo de pedido, imagens, eventos especiais e óticas alvo</li>
              <li><strong>✅ Pode adicionar/editar:</strong> Produtos (novos códigos ou alterar valores não usados em validações)</li>
              <li><strong>❌ Não pode alterar:</strong> Estrutura das cartelas existentes (requisitos, condições, ordem)</li>
              <li><strong>❌ Não pode adicionar/remover:</strong> Cartelas (a estrutura de cartelas é fixa após criação)</li>
            </ul>
          </div>
        </div>
      )}

      {/* SEÇÃO 1: DADOS BÁSICOS */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900 dark:text-white">Informações da Campanha</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Dados que identificam sua campanha</p>
          </div>
        </div>

        {/* Título */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            Título da Campanha *
          </label>
          <input
            type="text"
            value={state.titulo}
            onChange={(e) => setState({ ...state, titulo: e.target.value })}
            placeholder="Ex: Campanha Lentes Premium Q1 2025"
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Use um nome claro que indique o objetivo e período
          </p>
        </div>

        {/* Descrição */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            Descrição *
          </label>
          <textarea
            value={state.descricao}
            onChange={(e) => setState({ ...state, descricao: e.target.value })}
            placeholder="Ex: Campanha focada em lentes premium com tratamento BlueProtect. Meta: aumentar vendas em 30%..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 resize-none transition-all"
            required
          />
        </div>

        {/* Datas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Data de Início *
            </label>
            <input
              type="date"
              value={state.dataInicio}
              onChange={(e) => setState({ ...state, dataInicio: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Data de Término *
            </label>
            <input
              type="date"
              value={state.dataFim}
              onChange={(e) => setState({ ...state, dataFim: e.target.value })}
              min={state.dataInicio}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
              required
            />
          </div>
        </div>

        {/* Datas e Tipo de Pedido - OTIMIZADO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Aceita apenas números de pedidos: *
            </label>
            <select
              value={state.tipoPedido}
              onChange={(e) => setState({ ...state, tipoPedido: e.target.value as any })}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
              required
            >
              <option value="" disabled>Selecione...</option>
              <option value="OS_OP_EPS">OS/OP EPS</option>
              <option value="OPTICLICK">OptiClick</option>
              <option value="EPSWEB">EPSWEB</option>
              <option value="ENVELOPE_OTICA">Envelope da Ótica</option>
            </select>
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Obrigatório
            </p>
          </div>

          {/* Comissão do Gerente - OTIMIZADO */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Percent className="w-4 h-4 text-purple-500" />
              Comissão do Gerente (%) *
            </label>
            <div className="relative">
              <input
                type="number"
                value={state.percentualGerente}
                onChange={(e) => setState({ ...state, percentualGerente: parseFloat(e.target.value) || 0 })}
                min="0"
                max="100"
                step="1"
                placeholder="Ex: 10"
                className="w-full px-4 py-2.5 pr-12 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
                required
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-purple-600 dark:text-purple-400">
                %
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Se vendedor ganha 100 pts → gerente {(state.percentualGerente || 0).toFixed(0)} pts
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: IMAGEM 16:9 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <ImageIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-base text-gray-900 dark:text-white">Imagem da Campanha</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Adicione identidade visual (opcional)</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            Imagem 16:9 (Horizontal)
          </label>
          
          {preview16x9 ? (
            <div className="relative group">
              <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                <img 
                  src={preview16x9} 
                  alt="Preview 16:9" 
                  className="w-full aspect-video object-cover" 
                />
              </div>
              <label 
                htmlFor="img-16x9-input" 
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-xl"
              >
                <div className="text-center space-y-2">
                  <Upload className="h-8 w-8 text-white mx-auto" />
                  <p className="text-white font-semibold text-sm">Alterar imagem</p>
                </div>
              </label>
            </div>
          ) : (
            <label 
              htmlFor="img-16x9-input" 
              className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-purple-500 transition-all group"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                  <ImageIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Adicionar imagem horizontal</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Recomendado: 1920x1080px</span>
              </div>
            </label>
          )}
          <input
            id="img-16x9-input"
            type="file"
            accept="image/*"
            onChange={handleImagemUpload}
            className="hidden"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Esta imagem aparecerá nos cards de listagem de campanhas
          </p>
        </div>
      </div>

      {/* SEÇÃO 3: TAGS */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="p-2 bg-pink-500/10 rounded-lg">
            <Tag className="h-5 w-5 text-pink-600 dark:text-pink-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-base text-gray-900 dark:text-white">Tags de Categorização</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Organize e filtre campanhas facilmente (opcional)</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            Adicionar Tags
          </label>
          <input
            type="text"
            onKeyDown={handleAddTag}
            placeholder="Digite uma tag e pressione Enter"
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ex: Lentes, Q1-2025, Premium, Promoção
          </p>

          {state.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {state.tags.map((tag, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full text-sm font-medium shadow-md"
                >
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CROP 16:9 */}
      <AnimatePresence>
        {showCropModal16x9 && imagemUpload16x9 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCropModal16x9(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-4 md:inset-20 z-[70] flex items-center justify-center"
            >
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-full overflow-auto p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <CropIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Ajustar Imagem 16:9
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Posicione e redimensione a área de corte
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCropModal16x9(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                <div className="my-6">
                  <ReactCrop
                    crop={crop16x9}
                    onChange={(c) => setCrop16x9(c)}
                    aspect={16 / 9}
                    className="max-h-[60vh]"
                  >
                    <img
                      ref={imgRef16x9}
                      src={imagemUpload16x9}
                      alt="Crop preview"
                      className="max-w-full"
                    />
                  </ReactCrop>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowCropModal16x9(false)}
                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCropConfirm}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
