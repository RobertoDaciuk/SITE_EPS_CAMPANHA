"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Tag, CalendarDays, TrendingUp, GiftIcon, ChevronRight } from "lucide-react";
import { formatarDataBR, estaEntreBR } from "@/lib/timezone";
import { getImageUrl } from "@/lib/image-url";
import { Badge } from "@/components/ui/badge";

/**
 * Interface da Campanha
 * Baseada na resposta da API GET /campanhas
 */
export interface Campanha {
  id: string;
  titulo: string;
  descricao: string;
  pontosReaisPorCartela?: number; // Campo legado (campanhas antigas)
  pontosReaisMaximo?: number; // Valor máximo possível (campanhas com valores variáveis)
  dataInicio: string; // ISO date string
  dataFim: string; // ISO date string
  status: string;
  regras?: string; // Regras da campanha em HTML/Markdown
  tipoPedido?: 'OS_OP_EPS' | 'OPTICLICK' | 'EPSWEB' | 'ENVELOPE_OTICA'; // Tipo de pedido para validação
  imagemCampanha16x9Url?: string; // Imagem 16:9 para cards e detalhes
  imagemCampanha1x1Url?: string; // Imagem 1:1 para aba de regras
  planilhaProdutosUrl?: string; // URL da planilha de produtos (admin)
  tags?: string[]; // Tags da campanha para categorização
  eventosEspeciais?: Array<{
    id: string;
    nome: string;
    multiplicador: number;
    corDestaque: string;
    dataInicio: string;
    dataFim: string;
    ativo: boolean;
  }>;
}

/**
 * Props do CampaignCard
 */
interface CampaignCardProps {
  campanha: Campanha;
}

/**
 * Badge de Status da Campanha
 */
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string,{ label: string; color: string; bg: string }> = {
    ATIVA: {
      label: "Ativa",
      color: "text-success",
      bg: "bg-success/10 border-success/20",
    },
    CONCLUIDA: {
      label: "Concluída",
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
    },
    EXPIRADA: {
      label: "Expirada",
      color: "text-muted-foreground",
      bg: "bg-muted/10 border-muted/20",
    },
  };

  const config = statusConfig[status] || statusConfig.ATIVA;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.color}`}
    >
      {config.label}
    </span>
  );
}

/**
 * Card de Campanha - Premium com Glassmorphism
 * 
 * Card clicável que exibe as informações principais de uma campanha
 * e redireciona para a página de detalhes ao ser clicado
 * 
 * Características:
 * - Design glassmorphism elegante
 * - Hover effect sutil com elevação
 * - Informações de pontos, valor e datas
 * - Badge de status colorido
 * - Link para página de detalhes
 */
export default function CampaignCard({ campanha }: CampaignCardProps) {
  // Usa utilitários centralizados de timezone para garantir sincronia temporal universal
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

  const eventosAtivos = (campanha.eventosEspeciais || []).filter((e) => e.ativo && estaEntreBR(new Date(), e.dataInicio, e.dataFim));
  const eventoPrincipal = eventosAtivos.slice().sort((a, b) => (b.multiplicador || 1) - (a.multiplicador || 1))[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28, // Reduzido de 0.4 → 0.28 (30% mais rápido, abaixo do limiar crítico)
        ease: [0.25, 0.1, 0.25, 1.0] // Cubic-bezier customizado
      }}
      whileHover={{
        y: -6, // Aumentado levemente para compensar o easing mais suave
        transition: {
          duration: 0.22,
          ease: [0.34, 1.56, 0.64, 1] // easeOutBack - micro-bounce elegante
        }
      }}
      className="h-full"
    >
      <Link
        href={`/campanhas/${campanha.id}`}
        className="block h-full glass rounded-xl overflow-hidden border border-border/50 hover:shadow-glass-lg hover:border-primary/30 transition-[box-shadow,border-color] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] group"
      >
        {/* Imagem 16:9 ou Gradiente de Fallback */}
        <div className="relative w-full h-40 overflow-hidden">
          {campanha.imagemCampanha16x9Url ? (
            <img
              src={getImageUrl(campanha.imagemCampanha16x9Url)}
              alt={campanha.titulo}
              className="w-full h-full object-cover transition-transform duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] group-hover:scale-103"
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
              <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] line-clamp-1">
                {campanha.titulo}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {campanha.descricao}
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
            <StatusBadge status={campanha.status} />
          </div>
        </div>

          {/* Pontos */}
          <div className="flex items-center space-x-4 mb-3 pb-3 border-b border-border/30">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <GiftIcon className="w-5 h-5 text-sm font-bold text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pontos</p>
                <p className="text-sm font-bold text-success">
                  {campanha.pontosReaisMaximo 
                    ? `Até ${Math.floor(campanha.pontosReaisMaximo)} pts`
                    : `${Math.floor(campanha.pontosReaisPorCartela || 0)} pts`}
                </p>
              </div>
            </div>
          </div>

          {/* Período da Campanha */}
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-3">
            <CalendarDays className="w-4 h-4" />
            <span>
              {formatarDataBR(campanha.dataInicio, 'dd MMM yyyy')} até{" "}
              {formatarDataBR(campanha.dataFim, 'dd MMM yyyy')}
            </span>
          </div>

          {/* Tags da Campanha */}
          {campanha.tags && campanha.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {campanha.tags.map((tag, index) => (
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

          {/* Indicador de Link (aparece no hover) */}
          <div className="mt-3 pt-3 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Ver detalhes</span>
              <ChevronRight className="w-4 h-4 text-primary transform group-hover:translate-x-1 transition-transform duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}