import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Role } from '@archiflow/shared';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { authApi } from '@/api/endpoints';
import { useSession } from '@/auth/session-store';
import { Brand } from '@/components/patterns/brand';
import { ThemeToggle } from '@/components/patterns/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PORTAL_NAV, type NavItem } from '@/permissions/portals';
import { cn } from '@/utils/cn';

/** Coquille commune aux six portails : navigation propre au rôle, barre supérieure, compte. */
export function PortalLayout({ role }: { role: Role }) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-button focus:bg-elevated focus:px-3 focus:py-2"
      >
        {t('nav.skipToContent')}
      </a>

      <aside className="hidden w-[84px] shrink-0 flex-col border-r border-[hsl(var(--dashboard-sidebar))] bg-[hsl(var(--dashboard-sidebar))] md:flex">
        <div className="flex h-14 items-center justify-center border-b border-white/10 px-4">
          <Brand compact className="text-white" />
        </div>
        <PortalNav role={role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-base/90 px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t('nav.main')}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
          <Brand compact className="md:hidden" />
          <span className="hidden text-sm text-fg-secondary md:inline">{t(`roles.${role}`)}</span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </header>

        {mobileOpen && (
          <div className="border-b border-line bg-surface md:hidden">
            <PortalNav role={role} onNavigate={() => setMobileOpen(false)} />
          </div>
        )}

        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PortalNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('nav.main')} className="flex flex-col gap-2 p-3">
      {PORTAL_NAV[role].map((item) => (
        <NavEntry key={item.key} item={item} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function NavEntry({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  const base = 'group relative flex h-12 items-center justify-center rounded-button px-2 text-sm transition-colors';

  if (!item.path) {
    // Section d'une phase ultérieure : visible, datée, non cliquable.
    return (
      <span className={cn(base, 'cursor-not-allowed text-white/45')} aria-disabled="true" title={t(`nav.${item.key}`)}>
        <Icon className="size-5" aria-hidden="true" />
        <span className="sr-only">{t(`nav.${item.key}`)}</span>
        <Badge className="absolute right-1 top-1 h-3 min-w-3 px-0.5 text-[8px]">{item.phase}</Badge>
      </span>
    );
  }
  return (
    <NavLink
      to={item.path}
      end
      onClick={onNavigate}
      title={t(`nav.${item.key}`)}
      className={({ isActive }) =>
        cn(
          base,
          isActive
            ? 'bg-white/15 font-medium text-white shadow-[inset_3px_0_0_hsl(var(--accent))]'
            : 'text-white/55 hover:bg-white/10 hover:text-white',
        )
      }
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className="sr-only">{t(`nav.${item.key}`)}</span>
    </NavLink>
  );
}

function AccountMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, clear } = useSession();
  if (!profile) return null;

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      // Révocation serveur tentée ; l'état local est effacé quoi qu'il arrive.
      clear();
      queryClient.clear();
      void navigate('/login', { replace: true });
    }
  };

  const initials = `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" className="gap-2 px-2" aria-label={t('nav.account')}>
          <span className="flex size-7 items-center justify-center rounded-full border border-line-strong bg-inset text-xs font-semibold text-fg">
            {initials}
          </span>
          <span className="hidden max-w-40 truncate text-sm text-fg lg:inline">
            {profile.firstName} {profile.lastName}
          </span>
          <ChevronDown className="size-4 text-fg-muted" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-56 rounded-card border border-line bg-elevated p-1 shadow-elevated"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-fg">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="truncate font-mono text-xs text-fg-muted">{profile.email}</p>
            <p className="mt-1 text-xs text-fg-secondary">{t(`roles.${profile.role}`)}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item
            onSelect={() => void logout()}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-button px-2.5 text-sm text-fg outline-none data-[highlighted]:bg-overlay/5"
          >
            <LogOut className="size-4 text-fg-muted" aria-hidden="true" />
            {t('nav.logout')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
