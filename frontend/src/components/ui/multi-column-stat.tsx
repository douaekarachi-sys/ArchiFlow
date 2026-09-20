import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface StatColumn {
  key: string;
  icon?: ReactNode;
  label: string;
  value: number | string;
  detail?: ReactNode;
}

/** Plusieurs colonnes séparées par des filets verticaux dans un même bloc — pas des cartes isolées. */
export function MultiColumnStat({ columns, className }: { columns: StatColumn[]; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-card border border-line bg-surface shadow-elevated', className)}>
      <div className="flex min-w-max divide-x divide-line">
        {columns.map((col) => (
          <div key={col.key} className="flex min-w-40 flex-1 flex-col gap-1.5 px-5 py-4">
            <div className="flex items-center gap-2 text-sm text-fg-secondary">
              {col.icon && <span className="text-fg-muted [&_svg]:size-4">{col.icon}</span>}
              {col.label}
            </div>
            <strong className="text-xl font-semibold tabular text-fg">{col.value}</strong>
            {col.detail}
          </div>
        ))}
      </div>
    </div>
  );
}
