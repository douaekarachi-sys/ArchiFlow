import { hasPermission, type Permission, type Role } from '@archiflow/shared';
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Calculator,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  GitBranch,
  History,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  MapPinned,
  MessageSquare,
  MessageSquarePlus,
  Radar,
  Receipt,
  ScrollText,
  Send,
  Share2,
  ShieldCheck,
  Users,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import { useSession } from '@/auth/session-store';

export interface NavItem {
  key: string;
  icon: LucideIcon;
  /** Présent si la section existe ; sinon `phase` indique quand elle arrive. */
  path?: string;
  phase?: number;
}

/** Un groupe nommé, repliable — au plus un par rôle, comme la maquette de référence. */
export interface NavGroup {
  key: string;
  items: NavItem[];
}

export interface RoleNav {
  /** Entrées de premier niveau, jamais repliées. */
  main: NavItem[];
  group?: NavGroup;
}

/**
 * Navigation de chaque portail. Les sections des phases suivantes sont affichées comme telles,
 * désactivées et datées : la structure du produit est visible, sans lien mort.
 */
export const PORTAL_NAV: Record<Role, RoleNav> = {
  ADMIN: {
    main: [
      { key: 'dashboard', icon: LayoutDashboard, path: '/admin' },
      { key: 'requests', icon: Inbox, path: '/admin/requests' },
      { key: 'projects', icon: FolderKanban, path: '/admin/projects' },
    ],
    group: {
      key: 'administration',
      items: [
        { key: 'users', icon: Users, path: '/admin/users' },
        { key: 'clientCompanies', icon: Building2, phase: 3 },
        { key: 'catalog', icon: BookOpen, path: '/admin/catalog' },
        { key: 'audit', icon: ScrollText, phase: 3 },
      ],
    },
  },
  PROJECT_MANAGER: {
    main: [
      { key: 'dashboard', icon: LayoutDashboard, path: '/pm' },
      { key: 'projects', icon: FolderKanban, path: '/pm/projects' },
      { key: 'planning', icon: History, phase: 10 },
    ],
    group: {
      key: 'tracking',
      items: [
        { key: 'kanban', icon: KanbanSquare, phase: 10 },
        { key: 'costs', icon: Receipt, phase: 11 },
        { key: 'risks', icon: AlertTriangle, phase: 10 },
        { key: 'versions', icon: GitBranch, path: '/pm/versions' },
      ],
    },
  },
  ENGINEER: {
    main: [
      { key: 'dashboard', icon: LayoutDashboard, path: '/engineer' },
      { key: 'projects', icon: FolderKanban, path: '/engineer/projects' },
      { key: 'alerts', icon: Radar, phase: 7 },
    ],
    group: {
      key: 'sizingGroup',
      items: [
        // Outils par-projet (comme le concepteur 2D) : la destination est un sélecteur de
        // projet, pas un écran unique — voir router.tsx.
        { key: 'needAnalysis', icon: ClipboardList, path: '/engineer/need-analysis' },
        { key: 'sizing', icon: Calculator, path: '/engineer/sizing' },
        { key: 'catalog', icon: BookOpen, path: '/engineer/catalog' },
      ],
    },
  },
  ARCHITECT: {
    main: [
      { key: 'dashboard', icon: LayoutDashboard, path: '/architect' },
      { key: 'projects', icon: FolderKanban, path: '/architect/projects' },
    ],
    group: {
      key: 'design',
      items: [
        // Le concepteur 2D est un outil PAR PROJET (ouvert depuis la fiche projet, pas un
        // destination de rôle) : il n'a jamais eu sa place ici, même « à venir ».
        { key: 'physicalView', icon: MapPinned, phase: 6 },
        { key: 'addressPlan', icon: Waypoints, phase: 8 },
        { key: 'validationCheck', icon: ShieldCheck, phase: 7 },
      ],
    },
  },
  SALES: {
    main: [
      { key: 'dashboard', icon: LayoutDashboard, path: '/sales' },
      { key: 'projects', icon: FolderKanban, path: '/sales/projects' },
      { key: 'proposals', icon: Send, phase: 11 },
    ],
    group: {
      key: 'quoting',
      items: [
        // Nomenclature et coûts (EF-302/303) forment un seul écran dérivé de l'architecture :
        // deux entrées de menu, une seule destination.
        { key: 'bom', icon: FileSpreadsheet, path: '/sales/bom' },
        { key: 'costs', icon: Receipt, path: '/sales/bom' },
        { key: 'clientPublish', icon: Share2, phase: 11 },
      ],
    },
  },
  CLIENT: {
    main: [
      { key: 'myProject', icon: LayoutDashboard, path: '/client' },
      { key: 'request', icon: MessageSquarePlus, path: '/client/request' },
      { key: 'documents', icon: FileText, phase: 12 },
      { key: 'messages', icon: MessageSquare, phase: 10 },
    ],
  },
};

/**
 * Confort d'affichage uniquement : griser ou masquer une action. Le serveur revérifie TOUT
 * (ADR 0004) — cette fonction n'est jamais une autorité.
 */
export function useCan(permission: Permission): boolean {
  const role = useSession((s) => s.profile?.role);
  return role ? hasPermission(role, permission) : false;
}
