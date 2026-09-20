import type { Role } from '@archiflow/shared';
import { ChevronRight, Clock } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { PORTAL_NAV, type NavItem } from '@/permissions/portals';
import { cn } from '@/utils/cn';
import { Tooltip } from './tooltip';

/**
 * Barre latérale labellisée : icône + libellé, un groupe repliable par rôle au plus (brief de
 * refonte). Les entrées sans route sont visibles, datées, non cliquables — jamais de lien mort.
 */
export function Sidebar({ role, onNavigate, className }: { role: Role; onNavigate?: () => void; className?: string }) {
  const { t } = useTranslation();
  const nav = PORTAL_NAV[role];
  const [groupOpen, setGroupOpen] = useState(true);

  return (
    <nav aria-label={t('nav.main')} className={cn('flex flex-col gap-0.5 p-3', className)}>
      {nav.main.map((item) => (
        <SidebarEntry key={item.key} item={item} onNavigate={onNavigate} />
      ))}

      {nav.group && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setGroupOpen((value) => !value)}
            aria-expanded={groupOpen}
            className="flex w-full items-center gap-1.5 rounded-button px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted transition-colors duration-150 hover:text-fg"
          >
            <ChevronRight className={cn('size-3.5 shrink-0 transition-transform duration-150', groupOpen && 'rotate-90')} aria-hidden="true" />
            {t(`nav.groups.${nav.group.key}`)}
          </button>
          {groupOpen && (
            <div className="ml-[18px] flex flex-col gap-0.5 border-l border-line pl-3">
              {nav.group.items.map((item) => (
                <SidebarEntry key={item.key} item={item} onNavigate={onNavigate} indented />
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

function SidebarEntry({ item, onNavigate, indented = false }: { item: NavItem; onNavigate?: () => void; indented?: boolean }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  const base = 'group flex h-10 items-center gap-3 rounded-button px-3 text-sm transition-colors duration-150';

  if (!item.path) {
    return (
      <Tooltip content={t('nav.comingSoonTooltip', { phase: item.phase })}>
        <span className={cn(base, 'cursor-not-allowed text-fg-muted/60')} aria-disabled="true">
          {!indented && <Icon className="size-[18px] shrink-0" aria-hidden="true" />}
          <span className="truncate">{t(`nav.${item.key}`)}</span>
          <Clock className="ml-auto size-3.5 shrink-0" aria-hidden="true" />
        </span>
      </Tooltip>
    );
  }

  return (
    <NavLink
      to={item.path}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          base,
          isActive
            ? 'bg-primary-soft font-medium text-primary-text'
            : 'text-fg-secondary hover:bg-inset hover:text-fg',
        )
      }
    >
      {!indented && <Icon className="size-[18px] shrink-0" aria-hidden="true" />}
      <span className="truncate">{t(`nav.${item.key}`)}</span>
    </NavLink>
  );
}
