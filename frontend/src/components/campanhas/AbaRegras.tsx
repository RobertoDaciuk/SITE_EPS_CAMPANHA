"use client";

import { BookOpen, FileText, AlertCircle } from "lucide-react";
import { getImageUrl } from "@/lib/image-url";

/**
 * Tipo de Pedido com labels amigáveis
 */
const TIPO_PEDIDO_LABELS: Record<string, string> = {
  OS_OP_EPS: "OS/OP EPS",
  OPTICLICK: "OptiClick",
  EPSWEB: "EPSWEB",
  ENVELOPE_OTICA: "Envelope da Ótica",
};

/**
 * Props do componente AbaRegras
 */
interface AbaRegrasProps {
  /**
   * Regras da campanha em formato HTML/Markdown
   */
  regras?: string;
  
  /**
   * Tipo de pedido para validação
   */
  tipoPedido?: string;
  
  /**
   * URL da imagem 1:1 para exibir junto com as regras
   */
  imagemUrl?: string;
  
  /**
   * Título da campanha (para alt da imagem)
   */
  tituloCampanha: string;
}

/**
 * Componente de Aba de Regras da Campanha
 * 
 * Exibe as regras da campanha em formato rico, com imagem 1:1,
 * tipo de pedido e informações de validação.
 * 
 * Design:
 * - Layout em grade responsivo (imagem + conteúdo)
 * - Imagem 1:1 com bordas arredondadas e sombra
 * - Seção destacada para tipo de pedido
 * - Regras em HTML com formatação preservada
 * - Estados vazios elegantes
 * 
 * @example
 * <AbaRegras
 *   regras="<p>Regras da campanha...</p>"
 *   tipoPedido="OS_OP_EPS"
 *   imagemUrl="/uploads/campanha-regras.jpg"
 *   tituloCampanha="Campanha Q1 2025"
 * />
 */
export default function AbaRegras({
  regras,
  tipoPedido,
  imagemUrl,
  tituloCampanha,
}: AbaRegrasProps) {
  // ========================================
  // VALIDAÇÃO: Sem regras nem tipo de pedido
  // ========================================
  const temRegras = regras && regras.trim().length > 0 && regras !== '<p></p>';
  const temTipoPedido = tipoPedido && tipoPedido.trim().length > 0;

  if (!temRegras && !temTipoPedido) {
    return (
      <div className="glass rounded-xl border border-border/50 p-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">
          Esta campanha ainda não possui regras ou informações de validação cadastradas.
        </p>
      </div>
    );
  }

  // ========================================
  // RENDERIZAÇÃO PRINCIPAL
  // ========================================
  return (
    <div className="space-y-4 md:space-y-6">
      {/* ========================================
          GRID: Imagem + Conteúdo
          ======================================== */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* ========================================
            COLUNA 1: Imagem 1:1 (se houver)
            ======================================== */}
        {imagemUrl && (
          <div className="lg:col-span-1">
            <div className="glass rounded-xl overflow-hidden border border-border/50 shadow-lg lg:sticky lg:top-6">
              <img
                src={getImageUrl(imagemUrl)}
                alt={`Imagem da ${tituloCampanha}`}
                className="w-full aspect-square object-cover"
              />
            </div>
          </div>
        )}

        {/* ========================================
            COLUNA 2/3: Conteúdo (Tipo de Pedido + Regras)
            ======================================== */}
        <div className={imagemUrl ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="space-y-4 md:space-y-6">
            {/* ========================================
                SEÇÃO: Tipo de Pedido para Validação
                ======================================== */}
            {temTipoPedido && (
              <div className="glass rounded-xl border border-primary/30 p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold mb-2">
                      Informações de Validação
                    </h3>
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-xs md:text-sm text-muted-foreground">
                          Número do Pedido:
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 md:px-3 rounded-full text-xs md:text-sm font-semibold bg-primary/10 text-primary border border-primary/20 w-fit">
                          {TIPO_PEDIDO_LABELS[tipoPedido] || tipoPedido}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                        Ao enviar suas vendas, informe o número do pedido {" "}
                        <strong className="text-foreground">
                          {TIPO_PEDIDO_LABELS[tipoPedido] || tipoPedido}
                        </strong>
                        {" "}para validação.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================
                SEÇÃO: Regras da Campanha
                ======================================== */}
            {temRegras && (
              <div className="glass rounded-xl border border-border/50 p-4 md:p-6">
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-border/30">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                  <h3 className="text-base md:text-lg font-semibold">
                    Regras da Campanha
                  </h3>
                </div>

                {/* Conteúdo HTML/Markdown das regras */}
                <div
                  className="prose prose-sm dark:prose-invert max-w-none
                    prose-headings:text-sm prose-headings:md:text-base
                    prose-headings:text-foreground prose-headings:font-semibold
                    prose-p:text-xs prose-p:md:text-sm
                    prose-p:text-muted-foreground prose-p:leading-relaxed
                    prose-ul:text-xs prose-ul:md:text-sm
                    prose-ul:text-muted-foreground 
                    prose-ol:text-xs prose-ol:md:text-sm
                    prose-ol:text-muted-foreground
                    prose-li:text-muted-foreground
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  "
                  dangerouslySetInnerHTML={{ __html: regras }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
