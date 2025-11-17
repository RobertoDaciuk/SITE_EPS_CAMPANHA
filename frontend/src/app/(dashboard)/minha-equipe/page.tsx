"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  Clock,
  Filter,
  Loader2,
  LucideIcon,
  Search,
  Target,
  TrendingUp,
  Trophy,
  UserCheck,
  UserX,
  Users,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/contexts/ContextoAutenticacao";
import api from "@/lib/axios";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============================================================================
// Tipagens locais para garantir consistência com o backend
// ============================================================================
type StatusUsuario = "ATIVO" | "PENDENTE" | "BLOQUEADO";
type StatusFiltro = "TODOS" | StatusUsuario;

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
  whatsapp: string | null;
  status: StatusUsuario;
  nivel: string | null;
  avatarUrl?: string | null;
  saldoPontos: number;
  totalPontosReais: number;
  cartelasConcluidas: number;
  vendasUltimos30Dias: number;
  ultimaVenda: string | null;
  optica?: OpticaResumo | null;
  criadoEm: string;
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
    avatarUrl?: string | null;
    whatsapp?: string | null;
    nivel?: string | null;
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

const fetcher = (url: string) => api.get<MinhaEquipeResponse>(url).then((res) => res.data);

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatarPontos = (valor?: number) => `${numberFormatter.format(valor ?? 0)} pts`;
const formatarMoeda = (valor?: number) => currencyFormatter.format(valor ?? 0);

const formatarData = (valor?: string | null) => {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return format(data, "dd/MM/yyyy", { locale: ptBR });
};

const statusStyles: Record<StatusUsuario, string> = {
  ATIVO: "bg-emerald-100 text-emerald-600",
  PENDENTE: "bg-amber-100 text-amber-700",
  BLOQUEADO: "bg-rose-100 text-rose-600",
};

const filtrosStatus: { label: string; value: StatusFiltro }[] = [
  { label: "Todos", value: "TODOS" },
  { label: "Ativos", value: "ATIVO" },
  { label: "Pendentes", value: "PENDENTE" },
  { label: "Bloqueados", value: "BLOQUEADO" },
];

const LoadingState = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-36 rounded-2xl border border-border/30 bg-card/60 shadow-inner animate-pulse"
        />
      ))}
    </div>
    <div className="h-[420px] rounded-2xl border border-border/30 bg-card/60 animate-pulse" />
  </div>
);

const DestaqueCard = ({
  titulo,
  membro,
  subtitulo,
  icon: Icon,
  color,
}: {
  titulo: string;
  membro: MembroEquipe | null;
  subtitulo: string;
  icon: LucideIcon;
  color: string;
}) => (
  <div className="flex-1 rounded-2xl border border-border/40 bg-card/80 p-5 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className={cn("rounded-2xl p-2", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{subtitulo}</p>
        <h4 className="text-lg font-semibold">{titulo}</h4>
      </div>
    </div>
    {membro ? (
      <div className="space-y-2">
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
    ) : (
      <p className="text-sm text-muted-foreground">
        Nenhum colaborador se enquadra neste destaque.
      </p>
    )}
  </div>
);

const EmptyState = ({ onClear }: { onClear: () => void }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
    <Users className="h-10 w-10 text-muted-foreground/70" />
    <p className="text-sm">Nenhum colaborador encontrado com os filtros atuais.</p>
    <button
      onClick={onClear}
      className="rounded-full border border-border/50 px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-foreground/5"
    >
      Limpar filtros
    </button>
  </div>
);

export default function MinhaEquipePage() {
  const { usuario, carregando } = useAuth();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>("TODOS");

  const podeCarregar = usuario?.papel === "GERENTE";

  const { data, error, isLoading, mutate } = useSWR<MinhaEquipeResponse>(
    podeCarregar ? "/perfil/minha-equipe" : null,
    fetcher,
    {
      refreshInterval: 120000, // 2 minutos para manter visão quase em tempo real
      revalidateOnFocus: true,
    },
  );

  const equipeOrdenada = useMemo(() => {
    if (!data?.equipe) return [];
    return [...data.equipe].sort((a, b) => b.totalPontosReais - a.totalPontosReais);
  }, [data]);

  const equipeFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return equipeOrdenada.filter((membro) => {
      const correspondeStatus =
        filtroStatus === "TODOS" ? true : membro.status === filtroStatus;
      const correspondeBusca =
        termo.length === 0
          ? true
          : membro.nome.toLowerCase().includes(termo) ||
            membro.email.toLowerCase().includes(termo) ||
            membro.optica?.nome?.toLowerCase().includes(termo);
      return correspondeStatus && correspondeBusca;
    });
  }, [busca, filtroStatus, equipeOrdenada]);

  const limparFiltros = () => {
    setBusca("");
    setFiltroStatus("TODOS");
  };

  const carregandoDados = podeCarregar && (isLoading || (!data && !error));

  if (carregando) {
    return (
      <div className="flex h-full items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!usuario) {
    return null;
  }

  if (usuario.papel !== "GERENTE") {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/80 p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <h2 className="text-2xl font-semibold">Acesso restrito</h2>
        <p className="mt-2 text-muted-foreground">
          Esta área foi desenhada exclusivamente para gerentes. Entre em contato com o suporte
          caso precise de acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wider text-primary/80">Gestão da equipe</p>
        <h1 className="text-3xl font-bold text-foreground">Minha equipe</h1>
        <p className="text-muted-foreground">
          Acompanhe performance, engajamento e oportunidades de coaching em tempo real.
        </p>
      </header>

      <section className="rounded-2xl border border-border/30 bg-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {(data?.gerente?.nome || usuario.nome)
                .split(" ")
                .slice(0, 2)
                .map((parte) => parte[0])
                .join("")}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Responsável</p>
              <h3 className="text-xl font-semibold text-foreground">
                {data?.gerente?.nome ?? usuario.nome}
              </h3>
              <p className="text-sm text-muted-foreground">
                {data?.gerente?.optica?.nome ?? usuario.optica?.nome ?? "Ótica não vinculada"}
              </p>
            </div>
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground md:text-right">
            <p>
              {data?.gerente?.optica?.cidade && data?.gerente?.optica?.estado
                ? `${data.gerente.optica.cidade} / ${data.gerente.optica.estado}`
                : "Localização não informada"}
            </p>
            <p>Saldo pessoal: {formatarPontos(data?.gerente?.saldoPontos ?? 0)}</p>
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
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              titulo="Vendedores ativos"
              valor={data.overview.ativos}
              descricao={`${data.overview.totalVendedores} na equipe`}
              Icone={UserCheck}
              cor="success"
            />
            <KpiCard
              titulo="Pendentes de aprovação"
              valor={data.overview.pendentes}
              descricao="Aguardando onboarding"
              Icone={Clock}
              cor="warning"
            />
            <KpiCard
              titulo="Bloqueados"
              valor={data.overview.bloqueados}
              descricao="Revisar pendências"
              Icone={UserX}
              cor="danger"
            />
            <KpiCard
              titulo="Pontos acumulados"
              valor={formatarPontos(data.overview.totalPontosEquipe)}
              descricao={`${data.overview.cartelasConcluidas} cartelas concluídas`}
              Icone={TrendingUp}
            />
            <KpiCard
              titulo="Saldo disponível"
              valor={formatarPontos(data.overview.saldoEquipe)}
              descricao="Pronto para premiações"
              Icone={Wallet}
            />
            <KpiCard
              titulo="Vendas em análise"
              valor={data.overview.vendasEmAnalise}
              descricao="Acompanhe as validações"
              Icone={Target}
              cor="warning"
            />
            <KpiCard
              titulo="Comissão pendente"
              valor={formatarMoeda(data.overview.comissaoPendente)}
              descricao="Financeiro aguardando aprovação"
              Icone={Activity}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DestaqueCard
              titulo="Top performer da semana"
              subtitulo="Maior entrega em pontos reais"
              membro={data.destaques.topPerformer}
              icon={Trophy}
              color="bg-amber-100 text-amber-700"
            />
            <DestaqueCard
              titulo="Precisa de atenção"
              subtitulo="Menor atividade nos últimos 30 dias"
              membro={data.destaques.precisaAtencao}
              icon={AlertTriangle}
              color="bg-rose-100 text-rose-700"
            />
          </section>

          <section className="rounded-2xl border border-border/40 bg-card/80 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-border/30 p-5 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:max-w-sm">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Buscar colaborador
                </label>
                <div className="mt-1 relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    className="w-full rounded-full border border-border/40 bg-background/60 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
                    placeholder="Nome, e-mail ou ótica"
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" /> Status
                </span>
                {filtrosStatus.map((filtro) => (
                  <button
                    key={filtro.value}
                    onClick={() => setFiltroStatus(filtro.value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition", 
                      filtroStatus === filtro.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/40 text-muted-foreground hover:border-border/80",
                    )}
                  >
                    {filtro.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border/30 text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 text-left">Colaborador</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Cartelas</th>
                    <th className="px-4 py-3 text-left">Pontos</th>
                    <th className="px-4 py-3 text-left">Vendas 30d</th>
                    <th className="px-4 py-3 text-left">Última venda</th>
                    <th className="px-4 py-3 text-left">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {equipeFiltrada.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState onClear={limparFiltros} />
                      </td>
                    </tr>
                  )}
                  {equipeFiltrada.map((membro) => (
                    <tr key={membro.id} className="hover:bg-background/40">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{membro.nome}</span>
                          <span className="text-xs text-muted-foreground">{membro.email}</span>
                          {membro.optica?.nome && (
                            <span className="text-xs text-muted-foreground">
                              {membro.optica.nome}
                              {membro.optica.cidade && membro.optica.estado
                                ? ` · ${membro.optica.cidade}/${membro.optica.estado}`
                                : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={cn("border-none", statusStyles[membro.status])}>
                          {membro.status === "ATIVO"
                            ? "Ativo"
                            : membro.status === "PENDENTE"
                              ? "Pendente"
                              : "Bloqueado"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 font-semibold">{membro.cartelasConcluidas}</td>
                      <td className="px-4 py-4 font-semibold">{formatarPontos(membro.totalPontosReais)}</td>
                      <td className="px-4 py-4">{membro.vendasUltimos30Dias}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{formatarData(membro.ultimaVenda)}</td>
                      <td className="px-4 py-4 font-semibold">{formatarPontos(membro.saldoPontos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
