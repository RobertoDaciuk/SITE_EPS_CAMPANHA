
import {
  LayoutDashboard,
  Target,
  BarChart2,
  Award,
  History,
  User,
  Settings,
  Building,
  Users,
  CheckCircle,
  Truck,
  FileText,
  UploadCloud,
  LucideIcon,
  Store,
  DollarSign,
} from "lucide-react";

// Para segurança de tipos, definimos os papéis que existem no sistema
export enum PapelUsuario {
  ADMIN = "ADMIN",
  GERENTE = "GERENTE",
  VENDEDOR = "VENDEDOR",
}

// Interface para cada item de navegação
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Papéis que podem ver este item de menu. Se vazio, todos podem ver. */
  roles: PapelUsuario[];
  /** Onde o item deve aparecer na sidebar */
  position: "main" | "footer";
  /** Função opcional para determinar se o item deve ser exibido */
  shouldShow?: (usuario: any) => boolean;
}

// =========================================================================
// LISTA MESTRA DE TODOS OS ITENS DE NAVEGAÇÃO POSSÍVEIS
// =========================================================================
export const ALL_MENU_ITEMS: NavItem[] = [
  // === ITENS COMUNS OU DE VENDEDOR ===
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: [PapelUsuario.ADMIN, PapelUsuario.VENDEDOR],
    position: "main",
  },
  // Dashboard específico para Gerente
  {
    href: "/gerente",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: [PapelUsuario.GERENTE],
    position: "main",
  },
  {
    href: "/campanhas",
    label: "Campanhas",
    icon: Target,
    roles: [PapelUsuario.GERENTE, PapelUsuario.VENDEDOR],
    position: "main",
  },
  // Versão Admin de Campanhas: aponta para a tela correta de gestão
  {
    href: "/admin/campanhas",
    label: "Campanhas",
    icon: Target,
    roles: [PapelUsuario.ADMIN],
    position: "main",
  },
  // Ranking para ADMIN
  {
    href: "/admin/ranking",
    label: "Ranking",
    icon: BarChart2,
    roles: [PapelUsuario.ADMIN],
    position: "main",
  },
  // Ranking para GERENTE
  {
    href: "/gerente/ranking",
    label: "Ranking",
    icon: BarChart2,
    roles: [PapelUsuario.GERENTE],
    position: "main",
  },
  // Ranking para VENDEDOR (apenas visível se optica.rankingVisivelParaVendedores = true)
  {
    href: "/ranking",
    label: "Ranking",
    icon: BarChart2,
    roles: [PapelUsuario.VENDEDOR],
    position: "main",
    shouldShow: (usuario: any) =>
      usuario?.optica?.rankingVisivelParaVendedores === true,
  },
  // Prêmios e resgates removidos no escopo atual

  // === ITENS DE GERENTE ===
  {
    href: "/minha-equipe",
    label: "Minha Equipe",
    icon: Users,
    roles: [PapelUsuario.GERENTE],
    position: "main",
  },

  // === ITENS DE ADMIN ===
  {
    href: "/admin/validacao",
    label: "Validação de Vendas",
    icon: CheckCircle,
    roles: [PapelUsuario.ADMIN],
    position: "main",
  },
  {
    href: "/admin/oticas",
    label: "Óticas",
    icon: Building,
    roles: [PapelUsuario.ADMIN],
    position: "main",
  },
  {
    href: "/admin/usuarios",
    label: "Usuários",
    icon: Users,
    roles: [PapelUsuario.ADMIN],
    position: "main",
  },
  
  {
    href: "/admin/financeiro",
    label: "Financeiro",
    icon: FileText,
    roles: [PapelUsuario.ADMIN],
    position: "main",
  },

  // === ITENS DE RODAPÉ ===
  {
    href: "/perfil",
    label: "Meu Perfil",
    icon: User,
    roles: [PapelUsuario.GERENTE, PapelUsuario.VENDEDOR], // REMOVIDO: PapelUsuario.ADMIN
    position: "footer",
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: Settings,
    roles: [PapelUsuario.ADMIN], // Apenas Admin pode ver as configurações globais
    position: "footer",
  },
];
