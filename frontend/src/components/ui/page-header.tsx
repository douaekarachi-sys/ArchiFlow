import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Grand titre de page, suivi à droite d'un contrôle (segmenté, actions…). */
export function PageHeader({ title, subtitle, action, className }: { title: string; subtitle?: string; action?: ReactNode; className?: string }) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5', className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.01em] text-fg">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-secondary">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
