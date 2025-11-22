"use client";

import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Loader2,
  LucideIcon,
  Mail,
  MessageCircle,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  User,
  UserCheck,
  Users,
  UserX,
  Wallet,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/contexts/ContextoAutenticacao";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";
import { KpiCard } from "@/components/dashboard/KpiCard";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

type StatusUsuario = "ATIVO" | "PENDENTE" | "BLOQUEADO";
type StatusFiltro = "TODOS" | StatusUsuario;
type OrdenacaoTipo = "nome" | "pontos" | "vendas" | "cartelas" | "ultimaVenda";

interface OpticaResumo {
  id: string;
  nome: string;
  cidade?: string | null;
  estado?: string | null;
}

interface MembroEquipe {
  id: string;
  nome: string;
  email: string;
  whatsapp?: string | null;
  status: StatusUsuario;
  nivel: string;
  avatarUrl?: string | null;
  saldoPontos: number;
  totalPontosReais: number;
  cartelasConcluidas: number;
  vendasUltimos30Dias: number;
  ultimaVenda?: Date | string | null;
  optica?: OpticaResumo | null;
  criadoEm: Date | string;
}

interface OverviewEquipe {
  totalVendedores: number;
  ativos: number;
  pendentes: number;
  bloqueados: number;
  vendasEmAnalise: number;
  cartelasConcluidas: number;
  totalPontosEquipe: number;
  saldoEquipe: number;
  comissaoPendente: number;
}

interface MinhaEquipeResponse {
  gerente: {
    id: string;
    nome: string;
    email: string;
    papel: string;
    status: StatusUsuario;
    saldoPontos: number;
    optica?: OpticaResumo | null;
  };
  overview: OverviewEquipe;
  destaques: {
    topPerformer: MembroEquipe | null;
    precisaAtencao: MembroEquipe | null;
  };
  equipe: MembroEquipe[];
}

// ============================================================================
// CONSTANTES E HELPERS
// ============================================================================

const filtrosStatus: { label: string; value: StatusFiltro }[] = [
  { label: "Todos", value: "TODOS" },
  { label: "Ativos", value: "ATIVO" },
  { label: "Pendentes", value: "PENDENTE" },
  { label: "Bloqueados", value: "BLOQUEADO" },
];

const opcoesOrdenacao: { label: string; value: OrdenacaoTipo }[] = [
  { label: "Nome (A-Z)", value: "nome" },
  { label: "Pontos (maior)", value: "pontos" },
  { label: "Vendas 30d (maior)", value: "vendas" },
  { label: "Cartelas (maior)", value: "cartelas" },
  { label: "Última venda (recente)", value: "ultimaVenda" },
];

const statusStyles: Record<StatusUsuario, string> = {
  ATIVO: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  PENDENTE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  BLOQUEADO: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const numberFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const formatarPontos = (valor?: number) => `${numberFormatter.format(valor ?? 0)} pts`;
const formatarMoeda = (valor?: number) => currencyFormatter.format(valor ?? 0);

function formatarData(data?: Date | null | string): string {
  if (!data) return "Nunca";
  const dateObj = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(dateObj.getTime())) return "—";
  return format(dateObj, "dd/MM/yy", { locale: ptBR });
}

function formatarDataRelativa(data?: Date | null | string): string {
  if (!data) return "Nunca";
  const dateObj = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(dateObj.getTime())) return "—";
  return formatDistanceToNow(dateObj, { locale: ptBR, addSuffix: true });
}

const fetcher = (url: string) => api.get<MinhaEquipeResponse>(url).then((res) => res.data);

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Hook personalizado para debounce
 * Retarda a atualização do valor até que o usuário pare de digitar
 */
function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

function LoadingState() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-full bg-muted/60 animate-pulse" />
        <div className="h-4 w-96 rounded-full bg-muted/40 animate-pulse" />
      </div>

      {/* Info do Gerente Skeleton */}
      <div className="relative overflow-hidden rounded-2xl border border-border/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/20" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded-full bg-muted/40" />
            <div className="h-6 w-48 rounded-full bg-muted/60" />
            <div className="h-3 w-40 rounded-full bg-muted/40" />
          </div>
        </div>
      </div>

      {/* Filtros Skeleton */}
      <div className="rounded-2xl border border-border/20 bg-card/70 p-5">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.1s] bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
          <div className="h-10 w-full max-w-sm rounded-full bg-muted/40" />
        </div>
      </div>

      {/* Grid de Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl border border-border/20 bg-card/70 p-6"
          >
            {/* Shimmer effect escalonado */}
            <div
              className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
              style={{ animationDelay: `${i * 0.1}s` }}
            />

            {/* Header com Avatar */}
            <div className="flex items-start gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-muted/60" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-32 rounded-full bg-muted/60" />
                  <div className="h-6 w-16 rounded-full bg-muted/40" />
                </div>
                <div className="h-3 w-48 rounded-full bg-muted/40" />
                <div className="h-3 w-40 rounded-full bg-muted/30" />
              </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="rounded-xl bg-background/40 p-3">
                  <div className="h-3 w-12 rounded-full bg-muted/40 mx-auto mb-2" />
                  <div className="h-6 w-16 rounded-full bg-muted/60 mx-auto" />
                </div>
              ))}
            </div>

            {/* Info Adicional */}
            <div className="space-y-2 border-t border-border/20 pt-4">
              <div className="h-3 w-full rounded-full bg-muted/30" />
              <div className="h-3 w-3/4 rounded-full bg-muted/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="py-12 text-center col-span-full">
      <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
      <h3 className="text-lg font-semibold text-foreground">Nenhum vendedor encontrado</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Ajuste os filtros para encontrar membros da equipe.
      </p>
      <button
        onClick={onClear}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/50 px-4 py-2 text-sm font-semibold hover:bg-foreground/5"
      >
        Limpar filtros
      </button>
    </div>
  );
}

function DestaqueCard({
  titulo,
  subtitulo,
  membro,
  icon: Icon,
  color,
}: {
  titulo: string;
  subtitulo: string;
  membro: MembroEquipe | null;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="flex-1 rounded-2xl border border-border/40 bg-card/80 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className={cn("rounded-2xl p-2", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{subtitulo}</p>
          <h4 className="text-lg font-semibold">{titulo}</h4>
        </div>
      </div>

      {membro ? (
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {membro.nome
              .split(" ")
              .slice(0, 2)
              .map((p) => p[0])
              .join("")}
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">{membro.nome}</p>
            <p className="text-sm text-muted-foreground">
              {membro.optica?.nome ?? "Ótica não informada"}
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>{formatarPontos(membro.totalPontosReais)}</span>
              <span>•</span>
              <span>{membro.cartelasConcluidas} cartelas</span>
              <span>•</span>
              <span>{membro.vendasUltimos30Dias} vendas / 30d</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum colaborador se enquadra neste destaque.
        </p>
      )}
    </div>
  );
}

function MembroCard({ membro, index }: { membro: MembroEquipe; index: number }) {
  const diasDesdeUltimaVenda = useMemo(() => {
    if (!membro.ultimaVenda) return null;
    const date = typeof membro.ultimaVenda === "string" ? new Date(membro.ultimaVenda) : membro.ultimaVenda;
    if (Number.isNaN(date.getTime())) return null;
    const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [membro.ultimaVenda]);

  const alertaInatividade = diasDesdeUltimaVenda !== null && diasDesdeUltimaVenda > 7;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05, // Delay escalonado: 50ms entre cada card
        ease: "easeOut",
      }}
      className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 p-6 shadow-sm hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:bg-card transition-all cursor-pointer">
      {/* Glow effect ao hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:via-primary/3 group-hover:to-transparent transition-all duration-500" />

      {/* Header com Avatar e Info Básica */}
      <div className="relative flex items-start gap-4">
        <div className="relative shrink-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-2xl font-bold text-primary ring-2 ring-primary/20 group-hover:ring-4 group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-300">
            {membro.nome
              .split(" ")
              .slice(0, 2)
              .map((parte) => parte[0])
              .join("")}
          </div>
          {alertaInatividade && (
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/50"
              title="Inativo há mais de 7 dias"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </motion.div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-lg font-bold text-foreground">{membro.nome}</h3>
            <Badge className={cn("shrink-0 border-none", statusStyles[membro.status])}>
              {membro.status === "ATIVO" ? "Ativo" : membro.status === "PENDENTE" ? "Pendente" : "Bloqueado"}
            </Badge>
          </div>
          <div className="mt-1 space-y-1 text-sm text-muted-foreground">
            {membro.optica && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span className="truncate">
                  {membro.optica.nome}
                  {membro.optica.cidade && membro.optica.estado && ` · ${membro.optica.cidade}/${membro.optica.estado}`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Desde {formatarData(membro.criadoEm)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="relative mt-6 grid grid-cols-3 gap-3">
        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl bg-background/60 p-3 text-center hover:bg-background/80 hover:shadow-md transition-all cursor-pointer"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pontos</p>
          <p className="mt-1 text-lg font-bold text-foreground">{membro.totalPontosReais.toLocaleString("pt-BR")}</p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl bg-background/60 p-3 text-center hover:bg-background/80 hover:shadow-md transition-all cursor-pointer"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cartelas</p>
          <p className="mt-1 text-lg font-bold text-foreground">{membro.cartelasConcluidas}</p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl bg-background/60 p-3 text-center hover:bg-background/80 hover:shadow-md transition-all cursor-pointer"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendas 30d</p>
          <p className="mt-1 text-lg font-bold text-foreground">{membro.vendasUltimos30Dias}</p>
        </motion.div>
      </div>

      {/* Info Adicional */}
      <div className="mt-4 space-y-2 border-t border-border/30 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Saldo disponível:</span>
          <span className="font-semibold text-foreground">{formatarPontos(membro.saldoPontos)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Última venda:</span>
          <span className={cn("font-medium", alertaInatividade ? "text-red-500" : "text-foreground")}>
            {formatarDataRelativa(membro.ultimaVenda)}
          </span>
        </div>
      </div>

      {/* Ações */}
      {/* Bloco de ações removido conforme solicitado */}

      {/* Status Badges Adicionais */}
      {alertaInatividade && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50">
          <p className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            Inativo há {diasDesdeUltimaVenda} dias
          </p>
        </div>
      )}
      {membro.status === "PENDENTE" && (
        <div className="mt-4 flex gap-2">
          <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Aprovar
          </button>
          <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-600 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/50">
            <XCircle className="h-4 w-4" />
            Rejeitar
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// COMPONENTE PÁGINA PRINCIPAL
// ============================================================================

export default function MinhaEquipePage() {
  const { usuario, carregando } = useAuth();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>("TODOS");
  const [ordenacao, setOrdenacao] = useState<OrdenacaoTipo>("nome");

  // ✨ Debounce na busca para otimizar performance (300ms de delay)
  const buscaDebounced = useDebounce(busca, 300);

  const podeCarregar = usuario?.papel === "GERENTE";

  const { data, error, isLoading, mutate } = useSWR<MinhaEquipeResponse>(
    podeCarregar ? "/perfil/minha-equipe" : null,
    fetcher,
    {
      refreshInterval: 120000, // 2 minutos
      revalidateOnFocus: true,
    }
  );

  const carregandoDados = podeCarregar && (isLoading || (!data && !error));

  const equipeOrdenada = useMemo(() => {
    if (!data?.equipe) return [];
    return [...data.equipe];
  }, [data]);

  const equipeFiltrada = useMemo(() => {
    let resultado = [...equipeOrdenada];

    // Filtro de status
    if (filtroStatus !== "TODOS") {
      resultado = resultado.filter((membro) => membro.status === filtroStatus);
    }

    // Filtro de busca (usando valor debounced para performance)
    if (buscaDebounced.trim()) {
      const termo = buscaDebounced.toLowerCase().trim();
      resultado = resultado.filter(
        (membro) =>
          membro.nome.toLowerCase().includes(termo) ||
          membro.email.toLowerCase().includes(termo) ||
          membro.optica?.nome?.toLowerCase().includes(termo)
      );
    }

    // Ordenação
    resultado.sort((a, b) => {
      switch (ordenacao) {
        case "nome":
          return a.nome.localeCompare(b.nome);
        case "pontos":
          return b.totalPontosReais - a.totalPontosReais;
        case "vendas":
          return b.vendasUltimos30Dias - a.vendasUltimos30Dias;
        case "cartelas":
          return b.cartelasConcluidas - a.cartelasConcluidas;
        case "ultimaVenda": {
          const dateA = a.ultimaVenda ? new Date(a.ultimaVenda).getTime() : 0;
          const dateB = b.ultimaVenda ? new Date(b.ultimaVenda).getTime() : 0;
          return dateB - dateA;
        }
        default:
          return 0;
      }
    });

    return resultado;
  }, [equipeOrdenada, filtroStatus, buscaDebounced, ordenacao]);

  const limparFiltros = () => {
    setBusca("");
    setFiltroStatus("TODOS");
    setOrdenacao("nome");
  };

  const exportarCSV = () => {
    if (!equipeFiltrada.length) return;

    const cabecalho = [
      "Nome",
      "Email",
      "WhatsApp",
      "Status",
      "Ótica",
      "Pontos Totais",
      "Saldo",
      "Cartelas",
      "Vendas 30d",
      "Última Venda",
    ];

    const linhas = equipeFiltrada.map((m) => [
      m.nome,
      m.email,
      m.whatsapp || "",
      m.status,
      m.optica?.nome || "",
      m.totalPontosReais,
      m.saldoPontos,
      m.cartelasConcluidas,
      m.vendasUltimos30Dias,
      formatarData(m.ultimaVenda),
    ]);

    const csv = [cabecalho, ...linhas].map((linha) => linha.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `equipe_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  if (carregando) {
    return <LoadingState />;
  }

  if (!usuario) {
    return null;
  }

  if (usuario.papel !== "GERENTE") {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="rounded-2xl border border-border/40 bg-card/80 p-8 text-center shadow-sm max-w-md">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          <h2 className="text-2xl font-semibold">Acesso restrito</h2>
          <p className="mt-2 text-muted-foreground">
            Esta área foi desenhada exclusivamente para gerentes. Entre em contato com o suporte caso precise de acesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <header className="space-y-2">
        {/* Elemento 'Gestão de equipe' removido conforme solicitado */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minha equipe</h1>
            <p className="mt-1 text-muted-foreground">
              Gerencie, acompanhe e apoie o desenvolvimento de cada vendedor.
            </p>
          </div>
          {/* Botão Exportar CSV removido conforme solicitado */}
        </div>
      </header>

      {/* Info do Gerente */}
      <section className="rounded-2xl border border-border/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground ring-4 ring-primary/20">
              {(data?.gerente?.nome || usuario.nome)
                .split(" ")
                .slice(0, 2)
                .map((parte) => parte[0])
                .join("")}
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Responsável pela equipe</p>
              <h3 className="text-xl font-semibold text-foreground">{data?.gerente?.nome ?? usuario.nome}</h3>
              <p className="text-sm text-muted-foreground">
                {data?.gerente?.optica?.nome ?? usuario.optica?.nome ?? "Ótica não vinculada"}
              </p>
            </div>
          </div>
          <div className="grid gap-3 text-sm md:text-right">
            <p className="text-muted-foreground">
              {data?.gerente?.optica?.cidade && data?.gerente?.optica?.estado
                ? `${data.gerente.optica.cidade} / ${data.gerente.optica.estado}`
                : "Localização não informada"}
            </p>
            <div className="flex items-center gap-2 md:justify-end">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">
                {equipeFiltrada.length} {equipeFiltrada.length === 1 ? "vendedor" : "vendedores"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold text-destructive">Erro ao carregar dados</h3>
              <p className="text-sm text-destructive/80">
                {error.message || "Não foi possível buscar as informações da equipe."}
              </p>
              <button
                onClick={() => mutate()}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/50 px-4 py-1.5 text-sm font-semibold text-foreground hover:bg-foreground/5"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {carregandoDados && <LoadingState />}

      {!carregandoDados && data && (
        <>
          {/* KPIs Overview removido conforme solicitado */}

          {/* Destaques removidos conforme solicitado */}

          {/* Filtros e Busca */}
          <section className="rounded-2xl border border-border/40 bg-card/80 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-border/30 p-5 md:flex-row md:items-center md:justify-between">
              {/* Busca */}
              <div className="w-full md:max-w-sm">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Buscar colaborador
                </label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    className="w-full rounded-full border border-border/40 bg-background/60 py-2 pl-10 pr-10 text-sm focus:border-primary focus:outline-none transition-all duration-300"
                    placeholder="Nome, e-mail ou ótica"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                  {/* Indicador de debouncing */}
                  {busca !== buscaDebounced && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Elementos de filtro removidos conforme solicitado */}
              </div>
            </div>
          </section>

          {/* Grid de Vendedores */}
          {equipeFiltrada.length === 0 ? (
            <EmptyState onClear={limparFiltros} />
          ) : (
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {equipeFiltrada.map((membro, index) => (
                <MembroCard key={membro.id} membro={membro} index={index} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}