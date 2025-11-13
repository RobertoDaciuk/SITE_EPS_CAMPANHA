'use client';

/**
 * ============================================================================
 * PREVIEW AO VIVO - Campanha em Criação
 * ============================================================================
 * 
 * Componente que mostra preview em tempo real da campanha sendo criada.
 * Exibe como os vendedores verão: card da campanha, cartelas e regras.
 * Usa o mesmo design do CampaignCard do vendedor.
 * 
 * Features:
 * - Preview do card 16:9 (design do vendedor)
 * - Mostra Pontos (não R$) - 1 ponto = R$1
 * - Preview das cartelas com requisitos
 * - Preview das regras com imagem 1:1
 * - Atualização em tempo real
 * - Design glassmorphism
 * 
 * @module PreviewCampanha
 * ============================================================================
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Target,
  Zap,
  FileText,
  Package,
  Building2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Tag,
  TrendingUp,
  CalendarDays,
  Gift,
  GiftIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WizardState } from './CriarCampanhaWizard';
import { getImageUrl } from '@/lib/image-url';
import { Badge } from '@/components/ui/badge';

interface PreviewCampanhaProps {
  state: WizardState;
  currentStep: number;
}

export default function PreviewCampanha({ state, currentStep }: PreviewCampanhaProps) {
  // ========================================
  // HELPER: Converter hex para rgba
  // ========================================
  const hexToRgba = (hex: string, alpha: number) => {
    try {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
      const bigint = parseInt(c, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch {
      return `rgba(0,0,0,${alpha})`;
    }
  };

  // ========================================
  // PREVIEW DO CARD DA CAMPANHA (Mesmo design do vendedor)
  // ========================================
  const renderCardCampanha = () => {
    const imagemPreviewLocal = state.imagemCampanha16x9Preview;
    const imagemPreviewUrl = imagemPreviewLocal || getImageUrl(state.imagemCampanha16x9Url);
    const eventosAtivos = (state.eventosEspeciais || []).filter(e => e.ativo);
    const eventoPrincipal = eventosAtivos.slice().sort((a, b) => (b.multiplicador || 1) - (a.multiplicador || 1))[0];
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="h-full relative"
      >
        {/* Card Container - MESMO DESIGN DO VENDEDOR */}
        <div className="block h-full glass rounded-xl overflow-hidden border border-border/50 transition-all duration-300">
          {/* Imagem 16:9 ou Gradiente de Fallback */}
          <div className="relative w-full h-40 overflow-hidden">
            {imagemPreviewUrl ? (
              <img
                src={imagemPreviewUrl}
                alt={state.titulo || 'Preview'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <TrendingUp className="w-16 h-16 text-primary/30" />
              </div>
            )}
            {/* Overlay sutil */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
          </div>

          {/* Conteúdo do Card */}
          <div className="p-5">
            {/* Header - Título e Badges */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 mr-3">
                <h3 className="text-lg font-semibold mb-1 transition-colors line-clamp-1">
                  {state.titulo || 'Título da Campanha'}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {state.descricao || 'Descrição da campanha...'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {eventoPrincipal && (
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={{
                      color: eventoPrincipal.corDestaque,
                      backgroundColor: hexToRgba(eventoPrincipal.corDestaque, 0.12),
                      borderColor: hexToRgba(eventoPrincipal.corDestaque, 0.3),
                    }}
                    title={`${eventoPrincipal.nome} ativo`}
                  >
                    <Tag className="w-3 h-3 mr-1" /> Evento x{eventoPrincipal.multiplicador}
                    {eventosAtivos.length > 1 && (
                      <span className="ml-1 text-[10px] opacity-80">+{eventosAtivos.length - 1}</span>
                    )}
                  </span>
                )}
                {/* Badge Status (sempre ATIVA no preview) */}
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-success/10 border-success/20 text-success">
                  Ativa
                </span>
              </div>
            </div>

            {/* Pontos (NÃO R$, mas PONTOS) */}
            <div className="flex items-center space-x-4 mb-3 pb-3 border-b border-border/30">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <span aria-hidden><GiftIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pontos</p>
                  <p className="text-sm font-bold text-success">
                    {state.pontosReaisMaximo > 0
                      ? `Até ${Math.floor(state.pontosReaisMaximo)} pts`
                      : '-- pts'}
                  </p>
                </div>
              </div>
            </div>

            {/* Período da Campanha */}
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-3">
              <CalendarDays className="w-4 h-4" />
              <span>
                {state.dataInicio && state.dataFim
                  ? `${format(new Date(state.dataInicio), 'dd MMM yyyy', { locale: ptBR })} até ${format(new Date(state.dataFim), 'dd MMM yyyy', { locale: ptBR })}`
                  : 'Período não definido'}
              </span>
            </div>

            {/* Tags da Campanha */}
            {state.tags && state.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {state.tags.map((tag, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-[10px] px-2 py-0.5"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Badge "PREVIEW" no canto */}
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-10">
          PREVIEW
        </div>
      </motion.div>
    );
  };

  // ========================================
  // PREVIEW DAS CARTELAS
  // ========================================
  const renderCartelas = () => {
    if (state.cartelas.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma cartela configurada</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {state.cartelas.map((cartela, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Header da Cartela */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                    {cartela.numeroCartela}
                  </div>
                  <div>
                    <h4 className="font-bold">{cartela.descricao || `Cartela ${cartela.numeroCartela}`}</h4>
                    <p className="text-xs opacity-90">{cartela.requisitos.length} requisito(s)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Requisitos */}
            <div className="p-4 space-y-3">
              {cartela.requisitos.map((requisito, reqIndex) => (
                <div
                  key={reqIndex}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                      {requisito.ordem}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {requisito.descricao || `Requisito ${reqIndex + 1}`}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {requisito.quantidade} {requisito.tipoUnidade === 'PAR' ? 'par(es)' : 'unidade(s)'}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {requisito.condicoes.length} condição(ões)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // ========================================
  // PREVIEW DOS EVENTOS ESPECIAIS
  // ========================================
  const renderEventos = () => {
    if (state.eventosEspeciais.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum evento configurado</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {state.eventosEspeciais.map((evento, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-xl overflow-hidden shadow-md"
            style={{ backgroundColor: evento.corDestaque }}
          >
            <div className="p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  <span className="font-bold text-lg">{evento.multiplicador}X</span>
                </div>
                {evento.ativo && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    ATIVO
                  </span>
                )}
              </div>
              <h4 className="font-bold">{evento.nome || 'Nome do Evento'}</h4>
              {evento.descricao && (
                <p className="text-sm opacity-90 mt-1">{evento.descricao}</p>
              )}
              {evento.dataInicio && evento.dataFim && (
                <div className="flex items-center gap-1 mt-2 text-xs opacity-90">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {format(new Date(evento.dataInicio), 'dd/MM', { locale: ptBR })} até{' '}
                    {format(new Date(evento.dataFim), 'dd/MM/yy', { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // ========================================
  // PREVIEW DAS REGRAS (COM IMAGEM 1:1)
  // ========================================
  const renderRegras = () => {
    const imagemPreviewLocal = state.imagemCampanha1x1Preview;
    const imagemPreviewUrl = imagemPreviewLocal || getImageUrl(state.imagemCampanha1x1Url);

    return (
      <div className="space-y-4">
        {/* Imagem 1:1 */}
        {imagemPreviewUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full aspect-square bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl overflow-hidden shadow-xl"
          >
            <img
              src={imagemPreviewUrl}
              alt="Imagem das regras"
              className="w-full h-full object-cover"
            />
          </motion.div>
        )}

        {/* Texto das Regras */}
        {state.regras ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
              <FileText className="w-5 h-5 text-purple-500" />
              <h4 className="font-bold text-gray-900">Regras da Campanha</h4>
            </div>
            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: state.regras }}
            />
          </motion.div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma regra definida</p>
          </div>
        )}
      </div>
    );
  };

  // ========================================
  // PREVIEW DOS PRODUTOS
  // ========================================
  const renderProdutos = () => {
    if (state.produtosCampanha.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum produto vinculado</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            <h4 className="font-bold text-gray-900">Produtos da Campanha</h4>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
            {state.produtosCampanha.length} produto(s)
          </span>
        </div>
        <div className="max-h-32 overflow-y-auto space-y-2">
          {state.produtosCampanha.slice(0, 5).map((produto, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2"
            >
              <span className="font-mono text-gray-700">{produto.codigoRef}</span>
              <span className="font-bold text-green-600">{Math.floor(produto.pontosReais)} pts</span>
            </div>
          ))}
          {state.produtosCampanha.length > 5 && (
            <p className="text-xs text-gray-500 text-center pt-2">
              +{state.produtosCampanha.length - 5} produtos...
            </p>
          )}
        </div>
      </div>
    );
  };

  // ========================================
  // PREVIEW DAS ÓTICAS
  // ========================================
  const renderOticas = () => {
    if (state.paraTodasOticas) {
      return (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-green-700">Para Todas as Óticas</h4>
              <p className="text-sm text-green-600">
                Todas as óticas cadastradas poderão participar
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (state.oticasAlvoIds.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma ótica selecionada</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-5 h-5 text-purple-500" />
          <h4 className="font-bold text-gray-900">Óticas Selecionadas</h4>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium ml-auto">
            {state.oticasAlvoIds.length} ótica(s)
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {state.matrizesSelecionadasIds.length} matriz(es) selecionada(s)
        </p>
      </div>
    );
  };

  // ========================================
  // RENDER PRINCIPAL
  // ========================================
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200/50 overflow-hidden">
      {/* Header do Preview */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Preview ao Vivo</h3>
            <p className="text-xs text-gray-600">
              Veja como sua campanha está ficando
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo do Preview */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Card da Campanha */}
          {currentStep >= 1 && (
            <motion.div
              key="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  📺 Card da Campanha
                </h4>
              </div>
              {renderCardCampanha()}
            </motion.div>
          )}

          {/* Step 2: Óticas */}
          {currentStep >= 2 && (
            <motion.div
              key="oticas"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  🏢 Óticas Vinculadas
                </h4>
              </div>
              {renderOticas()}
            </motion.div>
          )}

          {/* Step 3: Cartelas e Produtos */}
          {currentStep >= 3 && (
            <motion.div
              key="cartelas"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">
                  📦 Produtos da Campanha
                </h4>
                {renderProdutos()}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">
                  🎯 Cartelas e Requisitos
                </h4>
                {renderCartelas()}
              </div>
            </motion.div>
          )}

          {/* Step 4: Eventos */}
          {currentStep >= 4 && state.eventosEspeciais.length > 0 && (
            <motion.div
              key="eventos"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  ⚡ Eventos Multiplicadores
                </h4>
              </div>
              {renderEventos()}
            </motion.div>
          )}

          {/* Step 5: Regras */}
          {currentStep >= 5 && (
            <motion.div
              key="regras"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  📋 Regras da Campanha
                </h4>
              </div>
              {renderRegras()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
