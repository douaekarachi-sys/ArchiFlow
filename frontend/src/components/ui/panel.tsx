import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  actions?: ReactNode;
}

/** Carte / panneau : surface + bordure, rayon 12 px. En sombre, pas d'ombre (brief §9.3). */
export function Panel({ title, actions, className, children, ...props }: PanelProps) {
  return (
    <section className={cn('rounded-card border border-line bg-surface shadow-elevated', className)} {...props}>
      {(title || actions) && (
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-2">
          {title && <h2 className="text-sm font-semibold text-fg">{title}</h2>}
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
