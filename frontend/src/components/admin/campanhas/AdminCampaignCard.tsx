"use client";

import { motion } from "framer-motion";
import { Tag, CalendarDays, TrendingUp, DollarSign, Edit, Eye, Target, Percent, GiftIcon, Clock } from "lucide-react";
import { formatarDataBR, formatarMoeda, formatarNumero, estaEntreBR } from "@/lib/timezone";
import { getImageUrl } from "@/lib/image-url";
import { Badge } from "@/components/ui/badge";

/**
 * Interface da Campanha (Admin View)
 */
export interface CampanhaAdmin {
  id: string;
  titulo: string;
  descricao: string;
  pontosReaisPorCartela: number;
  percentualGerente: number;
  dataInicio: string;
  dataFim: string;
  status: string;
  paraTodasOticas?: boolean;
  imagemCampanha16x9Url?: string;
  imagemCampanha1x1Url?: string;
  imagemCampanha?: string; // Deprecated
  tags?: string[]; // Tags da campanha
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
 * Props do AdminCampaignCard
 */
interface AdminCampaignCardProps {
  campanha: CampanhaAdmin;
  onEdit: (campanha: CampanhaAdmin) => void;
  onView: (campanhaId: string) => void;
  onViewHistory?: (campanhaId: string, titulo: string) => void;
}

/**
 * Badge de Status da Campanha
 */
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
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
 * Card de Campanha para Admin
 *
 * Diferenças do CampaignCard normal:
 * - Mostra informações admin (percentual gerente, targeting)
 * - Botões de ação (Editar, Visualizar) em vez de link
 * - Design otimizado para gestão
 */
export default function AdminCampaignCard({
  campanha,
  onEdit,
  onView,
  onViewHistory,
}: AdminCampaignCardProps) {
  // Formata percentual
  const formatarPercentual = (decimal: number): string => {
    return `${(decimal * 100).toFixed(0)}%`;
  };

  // Utilitário para cor com alpha
  const hexToRgba = (hex: string, alpha: number) => {
    try {
      let c = hex.replace('#', '');
      if (c.length === 3) {
        c = c.split('').map((ch) => ch + ch).join('');
      }
      const bigint = parseInt(c, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch {
      return `rgba(0,0,0,${alpha})`;
    }
  };

  // Determina evento ativo agora em SP
  const eventosAtivos = (campanha.eventosEspeciais || []).filter((e) => {
    if (!e.ativo) return false;
    return estaEntreBR(new Date(), e.dataInicio, e.dataFim);
  });

  const eventoPrincipal = eventosAtivos
    .slice()
    .sort((a, b) => (b.multiplicador || 1) - (a.multiplicador || 1))[0];

  // @ts-ignore - imagemCampanha16x9Url pode existir
  const imagemPath = campanha.imagemCampanha16x9Url || campanha.imagemCampanha;
  const imagemUrl = getImageUrl(imagemPath);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full"
    >
      <div className="h-full glass-card rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group">
        {/* Imagem da Campanha */}
        {imagemUrl && (
          <div className="relative w-full aspect-video overflow-hidden">
            <img 
              src={imagemUrl} 
              alt={campanha.titulo}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Badges sobre a imagem */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              {eventoPrincipal && (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md"
                  style={{
                    color: eventoPrincipal.corDestaque,
                    backgroundColor: hexToRgba(eventoPrincipal.corDestaque, 0.2),
                    borderColor: hexToRgba(eventoPrincipal.corDestaque, 0.4),
                  }}
                >
                  <Tag className="w-3 h-3 mr-1" /> x{eventoPrincipal.multiplicador}
                  {eventosAtivos.length > 1 && (
                    <span className="ml-1 text-[10px]">+{eventosAtivos.length - 1}</span>
                  )}
                </span>
              )}
              <StatusBadge status={campanha.status} />
            </div>
          </div>
        )}
        
        {/* Conteúdo */}
        <div className="p-5 space-y-4">
          {/* Header - Título e Descrição */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-blue-400 transition-colors">
              {campanha.titulo}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {campanha.descricao}
            </p>
          </div>
          
          {/* Se não tem imagem, mostra badge aqui */}
          {!imagemUrl && (
            <div className="flex items-center gap-2">
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
          )}

          {/* Métricas - Pontos e Percentual Gerente */}
          <div className="grid grid-cols-2 gap-3">
            {/* Pontos (R$) */}
            <div className="glass-card rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-green-500/20 rounded">
                  <GiftIcon className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-xs text-muted-foreground">Pontos Máx</p>
              </div>
              <p className="text-base font-bold text-green-400">{formatarMoeda(campanha.pontosReaisPorCartela)}</p>
            </div>

            {/* Percentual Gerente */}
            <div className="glass-card rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-purple-500/20 rounded">
                  <Percent className="w-3 h-3 text-purple-400" />
                </div>
                <p className="text-xs text-muted-foreground">Comissão</p>
              </div>
              <p className="text-base font-bold text-purple-400">{formatarPercentual(campanha.percentualGerente)}</p>
            </div>
          </div>

          {/* Targeting */}
          {campanha.paraTodasOticas !== undefined && (
            <div className="glass-card rounded-lg p-2.5 border border-white/10">
              <div className="flex items-center gap-2 text-xs">
                <Target className="w-4 h-4 text-blue-400" />
                <span className={`font-medium ${campanha.paraTodasOticas ? 'text-blue-400' : 'text-amber-400'}`}>
                  {campanha.paraTodasOticas ? '🌍 Todas as óticas' : '🎯 Óticas específicas'}
                </span>
              </div>
            </div>
          )}

          {/* Tags da Campanha */}
          {campanha.tags && campanha.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
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

          {/* Período da Campanha */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-white/5">
            <CalendarDays className="w-4 h-4 text-blue-400" />
            <span>
              {formatarDataBR(campanha.dataInicio, 'dd MMM yyyy')} até {formatarDataBR(campanha.dataFim, 'dd MMM yyyy')}
            </span>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 pt-3 border-t border-white/10">
            <button
              onClick={() => onEdit(campanha)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all backdrop-blur-sm"
            >
              <Edit className="w-4 h-4" />
              Editar
            </button>
            <button
              onClick={() => onView(campanha.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all backdrop-blur-sm"
            >
              <Eye className="w-4 h-4" />
              Ver Detalhes
            </button>
            {onViewHistory && (
              <button
                onClick={() => onViewHistory(campanha.id, campanha.titulo)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 rounded-xl transition-all backdrop-blur-sm"
                title="Ver histórico de alterações"
              >
                <Clock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
