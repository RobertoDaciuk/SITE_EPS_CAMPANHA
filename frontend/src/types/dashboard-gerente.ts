/**
 * ============================================================================
 * TYPES: DASHBOARD GERENTE COMPLETO
 * ============================================================================
 * 
 * Tipos TypeScript para o dashboard premium do gerente.
 * Sincronizado com o backend (dashboard.service.ts - getDashboardGerenteCompleto)
 * 
 * @module Types
 * ============================================================================
 */

// ============================================================================
// TIPOS BASE
// ============================================================================

export interface OpticaResumo {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
}

export interface Vendedor {
  id: string;
  nome: string;
  avatarUrl: string | null;
}

// ============================================================================
// COMISSÃO
// ============================================================================

export interface ProximoPagamento {
  valor: number;
  data: Date | string;
}

export interface Comissao {
  pendente: number;
  proximoPagamento: ProximoPagamento | null;
  historico30Dias: number;
  pontosPendentesEquipe: number;
}

// ============================================================================
// PERFORMANCE DA EQUIPE
// ============================================================================

export interface EvolucaoTemporal {
  data: Date | string;
  pontos: number;
  vendas: number;
}

export interface Performance {
  totalPontosEquipe: number;
  crescimentoSemana: number; // Percentual
  mediaVendedorAtivo: number;
  cartelasCompletas: number;
  evolucaoTemporal: EvolucaoTemporal[];
}

// ============================================================================
// ALERTAS INTELIGENTES
// ============================================================================

export type TipoAlerta = 'CRITICO' | 'ATENCAO' | 'OPORTUNIDADE';

export interface Alerta {
  tipo: TipoAlerta;
  vendedor?: string;
  descricao: string;
  acao: string;
}

export interface Alertas {
  criticos: Alerta[];
  atencao: Alerta[];
  oportunidades: Alerta[];
}

// ============================================================================
// TOP PERFORMERS
// ============================================================================

export interface TopPerformer {
  vendedor: Vendedor;
  pontos: number;
  crescimento: number; // Percentual
  badge: '🥇' | '🥈' | '🥉' | '';
}

// ============================================================================
// PIPELINE DE VENDAS
// ============================================================================

export interface Pipeline {
  emAnalise: number;
  validadasHoje: number;
  rejeitadas7Dias: number;
  aguardandoVendedor: number;
}

// ============================================================================
// MAPA DE ATIVIDADE
// ============================================================================

export interface MapaAtividade {
  vendedorId: string;
  vendedorNome: string;
  ultimaVenda: Date | string | null;
  diasInativo: number;
  atividadeSemanal: number[]; // [dom, seg, ter, qua, qui, sex, sab]
}

// ============================================================================
// CAMPANHAS COM ENGAJAMENTO
// ============================================================================

export interface CampanhaEngajamento {
  campanhaId: string;
  campanhaNome: string;
  campanhaImagem: string | null;
  participacao: number; // Percentual (0-100)
  totalVendas: number;
  mediaCartelas: number;
  melhorVendedor: string | null;
}

// ============================================================================
// OVERVIEW GERAL
// ============================================================================

export interface Overview {
  totalVendedores: number;
  ativos: number;
  pendentes: number;
  bloqueados: number;
}

// ============================================================================
// GERENTE
// ============================================================================

export interface Gerente {
  id: string;
  nome: string;
  email: string;
  avatarUrl: string | null;
  saldoPontos: number;
  optica: OpticaResumo | null;
}

// ============================================================================
// DASHBOARD GERENTE COMPLETO (Root)
// ============================================================================

export interface DashboardGerenteCompleto {
  gerente: Gerente;
  comissao: Comissao;
  performance: Performance;
  alertas: Alertas;
  topPerformers: TopPerformer[];
  pipeline: Pipeline;
  mapaAtividade: MapaAtividade[];
  campanhasEngajamento: CampanhaEngajamento[];
  overview: Overview;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Estado de carregamento do SWR
 */
export interface DashboardGerenteState {
  data: DashboardGerenteCompleto | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: () => void;
}

/**
 * Props para componentes filhos que recebem dados do dashboard
 */
export interface DashboardGerenteProps {
  dados: DashboardGerenteCompleto;
}
