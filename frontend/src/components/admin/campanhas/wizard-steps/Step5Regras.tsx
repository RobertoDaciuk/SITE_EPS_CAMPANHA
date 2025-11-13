'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Info, 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2,
  Image as ImageIcon,
  Upload,
  Crop as CropIcon,
  Check,
  X
} from 'lucide-react';
import type { WizardState } from '../CriarCampanhaWizard';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import ReactCrop, { type Crop as CropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

interface Props {
  state: WizardState;
  setState: (state: WizardState) => void;
}

/**
 * Step 5: Regras da Campanha
 *
 * Editor WYSIWYG para o Admin escrever regras detalhadas da campanha.
 * Usa Tiptap (moderno e compatível com React 19) para formatação rica (HTML).
 */
export default function Step5Regras({ state, setState }: Props) {
  // ========================================
  // ESTADOS LOCAIS - IMAGEM 1:1
  // ========================================
  const [imagemUpload1x1, setImagemUpload1x1] = useState<string | null>(null);
  const [crop1x1, setCrop1x1] = useState<CropType>({ 
    unit: '%', 
    width: 80, 
    height: 80, 
    x: 10, 
    y: 10 
  });
  const [showCropModal1x1, setShowCropModal1x1] = useState(false);
  const imgRef1x1 = useRef<HTMLImageElement>(null);

  // ========================================
  // HANDLERS: IMAGEM 1:1
  // ========================================
  const handleImagemUpload1x1 = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImagemUpload1x1(reader.result as string);
      setShowCropModal1x1(true);
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

  const handleCropConfirm1x1 = useCallback(async () => {
    if (!imgRef1x1.current) {
      toast.error('Imagem não carregada corretamente');
      return;
    }

    const loadingToast = toast.loading('Processando imagem 1:1...');

    try {
      const croppedBlob = await getCroppedImg(imgRef1x1.current, crop1x1);
      const previewUrl = URL.createObjectURL(croppedBlob);
      
      const formData = new FormData();
      formData.append('file', croppedBlob, 'campanha-1x1.jpg');
      
      const { data } = await api.post('/upload/imagem-campanha', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setState({
        ...state,
        imagemCampanha1x1Url: data.url,
        imagemCampanha1x1Preview: previewUrl,
      });

      setShowCropModal1x1(false);
      setImagemUpload1x1(null);
      
      toast.success('Imagem 1:1 salva com sucesso!', { id: loadingToast });
    } catch (error: any) {
      console.error('Erro ao processar imagem:', error);
      toast.error('Erro ao processar imagem', { id: loadingToast });
    }
  }, [crop1x1, getCroppedImg, setState, state]);

  // Cleanup de previews
  useEffect(() => {
    return () => {
      if (state.imagemCampanha1x1Preview) {
        URL.revokeObjectURL(state.imagemCampanha1x1Preview);
      }
    };
  }, [state.imagemCampanha1x1Preview]);

  const preview1x1 = state.imagemCampanha1x1Preview || state.imagemCampanha1x1Url || '';

  // ========================================
  // EDITOR TIPTAP
  // ========================================
  // Configuração do editor Tiptap
  const editor = useEditor({
    extensions: [StarterKit],
    content: state.regras || '',
    immediatelyRender: false, // IMPORTANTE: Evita erros de hidratação com SSR do Next.js
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[250px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      setState({ ...state, regras: editor.getHTML() });
    },
  });

  // Sincronizar conteúdo quando state.regras mudar externamente
  useEffect(() => {
    if (editor && state.regras && editor.getHTML() !== state.regras) {
      editor.commands.setContent(state.regras);
    }
  }, [state.regras, editor]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    isActive,
    icon: Icon,
    label,
  }: {
    onClick: () => void;
    isActive: boolean;
    icon: any;
    label: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-accent text-muted-foreground hover:text-foreground'
      }`}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Regras da Campanha</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Escreva as regras completas que os vendedores devem seguir para participar desta campanha.
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-semibold mb-1">Dica: Seja claro e detalhado</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Defina quais produtos são elegíveis</li>
            <li>Explique como funciona o spillover entre cartelas</li>
            <li>Mencione prazos de validação e pagamento</li>
            <li>Inclua exemplos práticos se necessário</li>
          </ul>
        </div>
      </div>

      {/* Editor de Regras */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-foreground">
          Regras da Campanha
          <span className="text-muted-foreground font-normal ml-2">(Opcional)</span>
        </label>

        {/* Toolbar */}
        <div className="rounded-t-xl border border-border bg-muted/30 p-2 flex items-center gap-1 flex-wrap">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            icon={Heading1}
            label="Título 1"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            icon={Heading2}
            label="Título 2"
          />
          <div className="w-px h-6 bg-border mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            icon={Bold}
            label="Negrito"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            icon={Italic}
            label="Itálico"
          />
          <div className="w-px h-6 bg-border mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon={List}
            label="Lista"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon={ListOrdered}
            label="Lista Numerada"
          />
        </div>

        {/* Editor */}
        <div className="rounded-b-xl border border-t-0 border-border overflow-hidden bg-card">
          <EditorContent editor={editor} />
        </div>

        {/* Preview das Regras */}
        {state.regras && state.regras !== '<p></p>' && state.regras.trim().length > 0 && (
          <div className="mt-6 space-y-2">
            <label className="block text-sm font-semibold text-foreground">
              Preview das Regras
            </label>
            <div className="rounded-xl border border-border p-4 bg-muted/30">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: state.regras }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ============== SEÇÃO: IMAGEM 1:1 ============== */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <ImageIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-lg text-gray-900 dark:text-white">Imagem Quadrada (1:1)</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Para perfis e visualizações compactas (opcional)</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            🟦 Imagem 1:1 (Quadrada)
          </label>
          
          {preview1x1 ? (
            <div className="relative group w-48 mx-auto">
              <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-lg aspect-square">
                <img 
                  src={preview1x1} 
                  alt="Preview 1:1" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <label 
                htmlFor="img-1x1-input" 
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
              htmlFor="img-1x1-input" 
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-cyan-500 transition-all group"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                  <ImageIcon className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Adicionar imagem quadrada</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Recomendado: 1000x1000px</span>
              </div>
            </label>
          )}
          <input
            id="img-1x1-input"
            type="file"
            accept="image/*"
            onChange={handleImagemUpload1x1}
            className="hidden"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Esta imagem aparecerá em perfis e visualizações compactas
          </p>
        </div>
      </div>

      {/* Exemplo de Regras (Sugestão) */}
      {(!state.regras || state.regras === '<p></p>' || state.regras.trim().length === 0) && (
        <div className="rounded-xl bg-accent/50 border border-border p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">Exemplo de Regras:</p>
          <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>1. Produtos Elegíveis:</strong> Apenas lentes da linha BlueProtect e PhotoSens são válidas.</p>
              <p><strong>2. Período de Validade:</strong> Vendas realizadas entre 01/01/2025 e 31/03/2025.</p>
              <p><strong>3. Spillover:</strong> Vendas que ultrapassarem a quantidade da Cartela 1 serão automaticamente contabilizadas na Cartela 2.</p>
              <p><strong>4. Pagamento:</strong> Os pontos serão creditados em até 72h após a validação.</p>
          </div>
        </div>
      )}

      {/* Estilos customizados para o Tiptap Editor */}
      <style jsx global>{`
        .ProseMirror {
          min-height: 250px;
          outline: none;
        }

        .ProseMirror p {
          margin: 0.75em 0;
        }

        .ProseMirror h1 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 1em 0 0.5em;
        }

        .ProseMirror h2 {
          font-size: 1.25em;
          font-weight: bold;
          margin: 1em 0 0.5em;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.75em 0;
        }

        .ProseMirror li {
          margin: 0.25em 0;
        }

        .ProseMirror strong {
          font-weight: bold;
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          color: hsl(var(--muted-foreground));
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>

      {/* ============== MODAL DE CROP 1:1 ============== */}
      <AnimatePresence>
        {showCropModal1x1 && imagemUpload1x1 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCropModal1x1(false)}
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
                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                      <CropIcon className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Ajustar Imagem 1:1
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Posicione e redimensione a área de corte quadrada
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCropModal1x1(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                <div className="my-6">
                  <ReactCrop
                    crop={crop1x1}
                    onChange={(c) => setCrop1x1(c)}
                    aspect={1}
                    className="max-h-[60vh]"
                  >
                    <img
                      ref={imgRef1x1}
                      src={imagemUpload1x1}
                      alt="Crop preview"
                      className="max-w-full"
                    />
                  </ReactCrop>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowCropModal1x1(false)}
                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCropConfirm1x1}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg flex items-center gap-2"
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
