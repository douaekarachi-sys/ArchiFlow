import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Role } from '@archiflow/shared';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate } from 'react-router';
import { authApi } from '@/api/endpoints';
import { useSession } from '@/auth/session-store';
import { Brand } from '@/components/patterns/brand';
import { ThemeToggle } from '@/components/patterns/theme-toggle';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/ui/sidebar';

/** Coquille commune aux six portails : barre latérale labellisée, barre du haut minimale. */
export function PortalLayout({ role }: { role: Role }) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-page">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-button focus:bg-elevated focus:px-3 focus:py-2"
      >
        {t('nav.skipToContent')}
      </a>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-14 items-center border-b border-line px-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar role={role} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/90 px-4 backdrop-blur">
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
            <Sidebar role={role} onNavigate={() => setMobileOpen(false)} />
          </div>
        )}

        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
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
