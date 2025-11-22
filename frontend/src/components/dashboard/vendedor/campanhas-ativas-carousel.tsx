"use client";

import { motion } from "framer-motion";
import { Target, Zap, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/lib/image-url";

interface CartelaProgresso {
  id: string;
  numeroCartela: number;
  descricao: string | null;
  completa: boolean;
  progresso: number;
  requisitosProgresso: Array<{
    id: string;
    descricao: string;
    quantidade: number;
    quantidadeAtual: number;
    completo: boolean;
  }>;
}

interface EventoEspecial {
  id: string;
  nome: string;
  multiplicador: number;
  corDestaque: string;
  dataInicio: Date;
  dataFim: Date;
}

interface Campanha {
  id: string;
  titulo: string;
  descricao: string;
  dataInicio: Date;
  dataFim: Date;
  imagemCampanha16x9Url: string | null;
  pontosReaisMaximo: number;
  tags: string[];
  cartelas: CartelaProgresso[];
  eventosEspeciais: EventoEspecial[];
}

interface CampanhasAtivasCarouselProps {
  campanhas: Campanha[];
}

export function CampanhasAtivasCarousel({ campanhas }: CampanhasAtivasCarouselProps) {
  const [campanhaAtiva, setCampanhaAtiva] = useState(0);

  // Autoplay: avança para o próximo slide a cada 10 segundos
  useEffect(() => {
    if (!campanhas || campanhas.length <= 1) return;

    const interval = setInterval(() => {
      setCampanhaAtiva((prev) => (prev + 1) % campanhas.length);
    }, 10000); // 10000ms = 10s

    return () => clearInterval(interval);
  }, [campanhas]);
  if (!campanhas || campanhas.length === 0) {
    return (
      <div className="rounded-3xl bg-card/50 backdrop-blur-sm border border-border/50 p-8 text-center">
        <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <h3 className="text-xl font-semibold mb-2">Nenhuma campanha ativa</h3>
        <p className="text-muted-foreground">
          Aguarde novas campanhas ou entre em contato com seu gerente.
        </p>
      </div>
    );
  }

  const campanha = campanhas[campanhaAtiva];
  const eventoAtivo = campanha.eventosEspeciais[0];
  const cartelasCompletas = campanha.cartelas.filter((c) => c.completa).length;
  const totalCartelas = campanha.cartelas.length;
  const progressoGeral = totalCartelas > 0 ? Math.round((cartelasCompletas / totalCartelas) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          Campanhas Ativas
        </h2>
        <Link href="/campanhas">
          <motion.button
            whileHover={{
              scale: 1.05,
              transition: { duration: 0.18, ease: [0.34, 1.25, 0.64, 1] }
            }}
            whileTap={{ scale: 0.95 }}
            className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
          >
            Ver todas
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </Link>
      </div>

      {/* Carousel */}
      <div className="relative">
        <motion.div
          key={campanhaAtiva}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{
            duration: 0.26, // Reduzido de 0.4 → 0.26 (35% mais rápido)
            ease: [0.25, 0.1, 0.25, 1.0] // Cubic-bezier customizado
          }}
          className="rounded-3xl overflow-hidden bg-card border border-border/50 shadow-2xl"
        >
          {/* Imagem da Campanha */}
          <div className="relative h-64 w-full bg-gradient-to-br from-primary/20 to-primary/5">
            {campanha.imagemCampanha16x9Url ? (
              <Image
                src={getImageUrl(campanha.imagemCampanha16x9Url)}
                alt={campanha.titulo}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-20 h-20 text-primary/30" />
              </div>
            )}
            
            {/* Badge de Evento Especial */}
            {eventoAtivo && (
              <div
                className="absolute top-4 right-4 px-4 py-2 rounded-full backdrop-blur-md
                           font-bold text-sm shadow-lg flex items-center gap-2"
                style={{ backgroundColor: `${eventoAtivo.corDestaque}33`, color: eventoAtivo.corDestaque }}
              >
                <Zap className="w-4 h-4" fill="currentColor" />
                {eventoAtivo.multiplicador}x PONTOS
              </div>
            )}

            {/* Overlay gradiente */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Progresso geral */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold text-sm">
                  Progresso Geral
                </span>
                <span className="text-white font-bold text-sm" style={{ fontFeatureSettings: '"tnum"' }}>
                  {cartelasCompletas}/{totalCartelas} Cartelas
                </span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressoGeral}%` }}
                  transition={{
                    duration: 0.5, // Reduzido de 1 → 0.5 (50% mais rápido)
                    delay: 0.15, // Reduzido de 0.3 → 0.15 (50% mais rápido)
                    ease: [0.34, 1.35, 0.64, 1] // easeOutBack para bounce sutil no final
                  }}
                  className="h-full bg-gradient-to-r from-success to-primary rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-2xl font-bold mb-2">{campanha.titulo}</h3>
              <p className="text-muted-foreground text-sm line-clamp-2">
                {campanha.descricao}
              </p>
            </div>

            {/* Tags */}
            {campanha.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {campanha.tags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Cartelas */}
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-semibold text-muted-foreground">Suas Cartelas</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {campanha.cartelas.slice(0, 4).map((cartela) => (
                  <div
                    key={cartela.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-colors duration-200",
                      cartela.completa
                        ? "bg-success/10 border-success/30"
                        : "bg-card/50 border-border/30 hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">
                        Cartela {cartela.numeroCartela}
                      </span>
                      <span className={cn(
                        "text-xs font-bold",
                        cartela.completa ? "text-success" : "text-muted-foreground"
                      )}
                      style={{ fontFeatureSettings: '"tnum"' }}>
                        {cartela.progresso}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cartela.progresso}%` }}
                        transition={{
                          duration: 0.42, // Reduzido de 0.8 → 0.42 (47% mais rápido)
                          delay: 0.12, // Reduzido de 0.2 → 0.12 (40% mais rápido)
                          ease: [0.34, 1.25, 0.64, 1] // easeOutBack sutil
                        }}
                        className={cn(
                          "h-full rounded-full",
                          cartela.completa
                            ? "bg-success"
                            : "bg-primary"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Link href={`/campanhas/${campanha.id}`}>
              <motion.button
                whileHover={{
                  scale: 1.02,
                  transition: { duration: 0.2, ease: [0.34, 1.25, 0.64, 1] }
                }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl
                         bg-primary text-primary-foreground font-semibold
                         hover:bg-primary/90 transition-colors duration-200
                         shadow-lg shadow-primary/20"
              >
                Ver Detalhes da Campanha
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Navegação */}
        {campanhas.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {campanhas.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCampanhaAtiva(idx)}
                className={cn(
                  "h-2 rounded-full transition-[width,background-color] duration-200 ease-out",
                  idx === campanhaAtiva
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
