import { hasPermission, type Permission, type Role } from '@archiflow/shared';
import {
  BookOpen,
  Calculator,
  ClipboardList,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  MessageSquarePlus,
  Network,
  Receipt,
  ScrollText,
  Send,
  Users,
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

/**
 * Navigation de chaque portail. Les sections des phases suivantes sont affichées comme telles,
 * désactivées et datées : la structure du produit est visible, sans lien mort.
 */
export const PORTAL_NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { key: 'dashboard', icon: LayoutDashboard, path: '/admin' },
    { key: 'users', icon: Users, path: '/admin/users' },
    { key: 'requests', icon: Inbox, path: '/admin/requests' },
    { key: 'assignments', icon: ClipboardList, phase: 3 },
    { key: 'catalog', icon: BookOpen, path: '/admin/catalog' },
    { key: 'audit', icon: ScrollText, phase: 3 },
  ],
  PROJECT_MANAGER: [
    { key: 'dashboard', icon: LayoutDashboard, path: '/pm' },
    { key: 'planning', icon: FolderKanban, phase: 10 },
  ],
  ENGINEER: [
    { key: 'dashboard', icon: LayoutDashboard, path: '/engineer' },
    { key: 'sizing', icon: Calculator, phase: 4 },
  ],
  ARCHITECT: [
    { key: 'dashboard', icon: LayoutDashboard, path: '/architect' },
    { key: 'designer', icon: Network, phase: 5 },
  ],
  SALES: [
    { key: 'dashboard', icon: LayoutDashboard, path: '/sales' },
    { key: 'costs', icon: Receipt, phase: 11 },
    { key: 'proposals', icon: Send, phase: 11 },
  ],
  CLIENT: [
    { key: 'dashboard', icon: LayoutDashboard, path: '/client' },
    { key: 'request', icon: MessageSquarePlus, path: '/client/request' },
    { key: 'documents', icon: FileText, phase: 12 },
  ],
};

/**
 * Confort d'affichage uniquement : griser ou masquer une action. Le serveur revérifie TOUT
 * (ADR 0004) — cette fonction n'est jamais une autorité.
 */
export function useCan(permission: Permission): boolean {
  const role = useSession((s) => s.profile?.role);
  return role ? hasPermission(role, permission) : false;
}
