/**
 * ============================================================================
 * CARD: INFORMAÇÕES DA ÓTICA (Somente Leitura) - UX Magnífico
 * ============================================================================
 *
 * Propósito:
 * Exibe informações da ótica vinculada ao usuário (VENDEDOR ou GERENTE).
 * Campos são somente leitura - não podem ser alterados pelo usuário.
 *
 * Design:
 * - Card informativo com visual distinto
 * - Campos bloqueados visualmente
 * - Totalmente compatível com tema dark e light
 * - Ícones e cores temáticas
 *
 * @module Perfil
 * ============================================================================
 */
"use client";

import { useAuth } from "@/contexts/ContextoAutenticacao";
import useSWR from "swr";
import api from "@/lib/axios";
import { Store, FileText, Lock, Info } from "lucide-react";

/**
 * Interface para os dados do perfil retornados pelo backend
 */
interface DadosPerfilCompleto {
  id: string;
  nome: string;
  email: string;
  papel: "ADMIN" | "GERENTE" | "VENDEDOR";
  whatsapp?: string;
  optica?: {
    nome: string;
    cnpj: string;
  };
}

/**
 * Fetcher SWR para buscar dados do perfil.
 */
const fetcherPerfil = async (url: string): Promise<DadosPerfilCompleto> => {
  const res = await api.get(url);
  return res.data;
};

/**
 * Formata CNPJ no padrão XX.XXX.XXX/XXXX-XX
 */
function formatarCNPJ(cnpj: string | undefined): string {
  if (!cnpj) return "N/A";
  
  const apenasNumeros = cnpj.replace(/\D/g, "");
  if (apenasNumeros.length !== 14) return cnpj;
  
  return apenasNumeros.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    "$1.$2.$3/$4-$5"
  );
}

/**
 * Card de Informações da Ótica Vinculada.
 */
export function InfoOticaCard() {
  const { usuario } = useAuth();

  // Busca dados atualizados do backend com SWR
  const { data: dadosPerfil, error } = useSWR<DadosPerfilCompleto>(
    "/perfil/meu",
    fetcherPerfil,
    {
      fallbackData: usuario as DadosPerfilCompleto | undefined,
      revalidateOnFocus: true,
    }
  );

  // Só exibe para VENDEDOR e GERENTE que têm ótica vinculada
  if (!dadosPerfil?.optica || dadosPerfil.papel === "ADMIN") {
    return null;
  }

  // Estado de erro
  if (error) {
    return null; // Silenciosamente oculta o card em caso de erro
  }

  // Skeleton enquanto carrega
  if (!dadosPerfil) {
    return (
      <div className="bg-card/70 backdrop-blur-lg border border-border/20 rounded-3xl p-6 shadow-lg shadow-black/5 animate-pulse">
        <div className="h-6 bg-muted-foreground/20 rounded-md w-1/2 mb-4"></div>
        <div className="space-y-4">
          <div className="h-14 bg-muted-foreground/20 rounded-md w-full"></div>
          <div className="h-14 bg-muted-foreground/20 rounded-md w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-gradient-to-br from-card/95 via-card/90 to-card/95 
                 backdrop-blur-xl border border-border/30 rounded-3xl 
                 shadow-2xl shadow-success/5 hover:shadow-success/10
                 transition-all duration-500 overflow-hidden h-fit"
    >
      {/* Cabeçalho do Card com gradiente sutil */}
      <div className="relative p-6 md:p-8 border-b border-border/30 bg-gradient-to-r from-success/5 via-transparent to-success/5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-success/10 border border-success/20 backdrop-blur-sm">
            <Store className="w-6 h-6 text-success" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-foreground tracking-tight">
              Ótica Vinculada
            </h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Informações da sua ótica de atuação
            </p>
          </div>
        </div>
      </div>

      {/* Corpo do Card */}
      <div className="p-6 md:p-8 space-y-6">
        {/* Campo Nome da Ótica */}
        <div className="space-y-2.5">
          <label className="block text-sm font-bold text-foreground tracking-wide uppercase">
            Nome da Ótica
          </label>
          <div className="relative">
            <Store className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-success z-10" />
            <div
              className="relative w-full h-14 pl-14 pr-4 
                         flex items-center
                         text-base font-semibold
                         bg-success/5 dark:bg-success/10
                         border-2 border-success/30 rounded-xl
                         text-foreground"
            >
              {dadosPerfil.optica.nome}
            </div>
          </div>
        </div>

        {/* Campo CNPJ da Ótica */}
        <div className="space-y-2.5">
          <label className="block text-sm font-bold text-foreground tracking-wide uppercase">
            CNPJ
          </label>
          <div className="relative">
            <FileText className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-success z-10" />
            <div
              className="relative w-full h-14 pl-14 pr-4 
                         flex items-center
                         text-base font-mono font-semibold
                         bg-success/5 dark:bg-success/10
                         border-2 border-success/30 rounded-xl
                         text-foreground"
            >
              {formatarCNPJ(dadosPerfil.optica.cnpj)}
            </div>
          </div>
        </div>

        {/* Aviso Informativo */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/40">
          <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Informações bloqueadas
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Estes dados são definidos pelo administrador e não podem ser alterados por você.
            </p>
          </div>
        </div>
      </div>

      {/* Rodapé do Card */}
      <div className="p-6 md:p-8 pt-6 border-t border-border/30 bg-gradient-to-r from-success/5 via-transparent to-success/5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-success" />
          <p>
            Vinculado como <span className="font-bold text-foreground">{dadosPerfil.papel}</span> desta ótica
          </p>
        </div>
      </div>
    </div>
  );
}
