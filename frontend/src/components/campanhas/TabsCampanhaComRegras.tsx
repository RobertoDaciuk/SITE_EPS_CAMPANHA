"use client";

import { useState, ReactNode, useMemo, useEffect } from "react";
import { BookOpen, Grid3x3, CheckCircle } from "lucide-react";

/**
 * Interface para os dados de uma Cartela
 */
interface Cartela {
  id: string;
  numeroCartela: number;
  descricao: string;
}

/**
 * Tipo de aba disponível
 */
type TipoAba = "regras" | "cartela";

/**
 * Interface para definição de aba
 */
interface AbaDefinicao {
  id: string;
  tipo: TipoAba;
  label: string;
  icone?: ReactNode;
  numeroCartela?: number;
  isCompleta?: boolean;
}

/**
 * Props do componente TabsCampanhaComRegras
 */
interface TabsCampanhaComRegrasProps {
  /**
   * Lista de cartelas disponíveis na campanha
   */
  cartelas: Cartela[];
  
  /**
   * Se true, adiciona aba de Regras como primeira aba
   */
  incluirAbaRegras?: boolean;
  
  /**
   * Mapa de cartelas completas (numeroCartela -> boolean)
   */
  cartelasCompletas?: Map<number, boolean>;
  
  /**
   * Função render prop que recebe o tipo e ID da aba ativa
   * e retorna o conteúdo a ser exibido
   */
  children: (abaAtiva: { tipo: TipoAba; id: string }) => ReactNode;

  /**
   * Identificador da aba ativa (modo controlado). Quando informado, o componente
   * apenas reflete o valor recebido sem alterar o estado interno.
   */
  abaAtivaId?: string | null;

  /**
   * Callback disparado sempre que o usuário troca de aba.
   */
  onAbaChange?: (aba: { id: string; tipo: TipoAba; numeroCartela?: number; isCompleta?: boolean }) => void;
}

/**
 * Componente de Abas para Cartelas de Campanha com Suporte a Aba de Regras
 * 
 * Permite navegação entre diferentes cartelas de uma campanha e uma aba de regras.
 * 
 * Funcionalidades:
 * - Aba de Regras (opcional, primeira posição)
 * - Navegação por abas de cartelas
 * - Estado ativo visual claro com ícones
 * - Render props pattern para flexibilidade de conteúdo
 * - Acessibilidade (ARIA roles e labels)
 * - Design glassmorphism elegante
 * 
 * @example
 * <TabsCampanhaComRegras 
 *   cartelas={campanha.cartelas}
 *   incluirAbaRegras={true}
 * >
 *   {({ tipo, id }) => (
 *     tipo === 'regras' 
 *       ? <AbaRegras {...props} />
 *       : <ConteudoCartela cartelaId={id} />
 *   )}
 * </TabsCampanhaComRegras>
 */
export default function TabsCampanhaComRegras({
  cartelas,
  incluirAbaRegras = false,
  cartelasCompletas,
  children,
  abaAtivaId,
  onAbaChange,
}: TabsCampanhaComRegrasProps) {
  // ========================================
  // PREPARAR: Lista de abas disponíveis (memoizada)
  // ========================================
  const abas = useMemo<AbaDefinicao[]>(() => {
    const definicoes: AbaDefinicao[] = [];

    for (const cartela of cartelas) {
      const isCompleta = cartelasCompletas?.get(cartela.numeroCartela) ?? false;

      definicoes.push({
        id: cartela.id,
        tipo: "cartela",
        label: `Cartela ${cartela.numeroCartela}`,
        icone: <Grid3x3 className="w-4 h-4" />,
        numeroCartela: cartela.numeroCartela,
        isCompleta,
      });
    }

    if (incluirAbaRegras) {
      definicoes.push({
        id: "regras",
        tipo: "regras",
        label: "Regras",
        icone: <BookOpen className="w-4 h-4" />,
      });
    }

    return definicoes;
  }, [cartelas, incluirAbaRegras, cartelasCompletas]);

  const primeiraAbaId = abas.length > 0 ? abas[0].id : "";

  // ========================================
  // ESTADO: Controle interno (modo não controlado)
  // ========================================
  const [abaAtivaInterna, setAbaAtivaInterna] = useState<string>(primeiraAbaId);

  // Mantém coerência do estado interno quando a lista de abas muda
  useEffect(() => {
    const abaAtualExiste = abas.some((aba) => aba.id === abaAtivaInterna);
    if (!abaAtivaId && !abaAtualExiste) {
      setAbaAtivaInterna(primeiraAbaId);
    }
  }, [abas, abaAtivaInterna, abaAtivaId, primeiraAbaId]);

  const estaControlado = abaAtivaId !== undefined && abaAtivaId !== null;
  const abaControladaValida = estaControlado && abas.some((aba) => aba.id === abaAtivaId);
  const abaAtivaAtualId = abaControladaValida
    ? (abaAtivaId as string)
    : abaAtivaInterna || primeiraAbaId;

  // ========================================
  // VALIDAÇÃO: Nenhuma aba disponível
  // ========================================
  if (abas.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-8 text-center">
        <p className="text-muted-foreground">
          Esta campanha não possui cartelas nem regras cadastradas.
        </p>
      </div>
    );
  }

  // Encontrar aba ativa
  const abaAtiva = abas.find((aba) => aba.id === abaAtivaAtualId) || abas[0];

  const handleTabClick = (aba: AbaDefinicao) => {
    if (!estaControlado) {
      setAbaAtivaInterna(aba.id);
    }
    onAbaChange?.({
      id: aba.id,
      tipo: aba.tipo,
      numeroCartela: aba.numeroCartela,
      isCompleta: aba.isCompleta,
    });
  };

  // ========================================
  // RENDERIZAÇÃO
  // ========================================
  return (
    <div className="space-y-6">
      {/* ========================================
          HEADER: Lista de Abas (Tab Buttons)
          ======================================== */}
      <div
        role="tablist"
        aria-label="Abas da campanha"
        className="overflow-x-auto pb-2 no-scrollbar"
      >
        <div className="flex items-center gap-2 min-w-max md:min-w-0 md:flex-wrap min-h-[52px]">
          {abas.map((aba) => {
            const isAtiva = abaAtivaAtualId === aba.id;
            
            return (
              <button
                key={aba.id}
                role="tab"
                aria-selected={isAtiva}
                aria-controls={`tabpanel-${aba.id}`}
                id={`tab-${aba.id}`}
                onClick={() => handleTabClick(aba)}
                className={`
                  group relative px-2.5 py-2 md:px-3 md:py-2 rounded-lg font-medium 
                  transition-all duration-200 focus:outline-none focus:ring-2 
                  focus:ring-primary
                  flex items-center gap-1 whitespace-nowrap
                  ${
                    isAtiva
                      ? "bg-primary text-primary-foreground dark:text-primary-foreground shadow-md"
                      : "glass border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:shadow-md"
                  }
                `}
              >
                {/* Ícone */}
                {aba.icone && (
                  <span className={isAtiva ? "opacity-100" : "opacity-60 group-hover:opacity-100 transition-opacity"}>
                    {aba.icone}
                  </span>
                )}
                
                {/* Texto da aba */}
                <span className="text-xs md:text-sm font-semibold">
                  {aba.label}
                </span>

                {/* Ícone de Check para cartelas completas */}
                {aba.isCompleta && aba.tipo === "cartela" && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}

                {/* Indicador visual de aba ativa (pulso sutil) */}
                {isAtiva && (
                  <span className="absolute inset-0 rounded-lg bg-primary/20 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================
          CONTEÚDO: Painel da Aba Ativa (Tab Panel)
          ======================================== */}
      <div
        role="tabpanel"
        id={`tabpanel-${abaAtivaAtualId}`}
        aria-labelledby={`tab-${abaAtivaAtualId}`}
        className="animate-in fade-in-50 duration-300"
      >
        {/* Conteúdo renderizado via render prop */}
        {children({ tipo: abaAtiva.tipo, id: abaAtiva.id })}
      </div>
    </div>
  );
}
