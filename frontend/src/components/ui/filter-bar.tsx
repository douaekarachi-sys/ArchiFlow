import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Panneau de filtres pleine largeur, sur surface creusée — pilote toute la page (brief). */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 rounded-card bg-inset p-2', className)}>
      {children}
    </div>
  );
}

interface FilterDropdownProps {
  label: string;
  value?: string;
  onClick?: () => void;
}

/**
 * Libellé + caret, façon menu déroulant. Simple déclencheur visuel ici (le menu réel se
 * construit avec `Select` — voir /dev/ui) : ce composant fixe l'apparence du bouton du filtre.
 */
export function FilterDropdownTrigger({ label, value, onClick }: FilterDropdownProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-1.5 rounded-field border border-transparent bg-surface px-3 text-sm text-fg-secondary shadow-elevated transition-colors duration-150 hover:border-line-strong hover:text-fg"
    >
      <span>{label}</span>
      {value && <span className="font-medium text-fg">{value}</span>}
      <ChevronDown className="size-3.5 text-fg-muted" aria-hidden="true" />
    </button>
  );
}
