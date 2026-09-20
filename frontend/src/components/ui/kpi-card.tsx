import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { StackedBar, type StackedBarSegment } from './stacked-bar';

interface KpiCardProps {
  /** « Anomalies », jamais précédé d'une icône (brief : titre + sous-titre de dimension). */
  title: string;
  /** « Par sévérité » — la dimension affichée. */
  subtitle: string;
  value: number | string;
  valueLabel: string;
  segments?: StackedBarSegment[];
  onSegmentClick?: (key: string) => void;
  className?: string;
  children?: ReactNode;
}

/** Bloc KPI signature : grand chiffre de contexte + barre empilée de répartition. */
export function KpiCard({ title, subtitle, value, valueLabel, segments, onSegmentClick, className, children }: KpiCardProps) {
  return (
    <article className={cn('rounded-card border border-line bg-surface p-6 shadow-elevated', className)}>
      <h3 className="text-lg font-semibold text-fg">
        {title} <span className="font-normal text-fg-muted">- {subtitle}</span>
      </h3>
      <div className="mt-4 flex items-baseline gap-2">
        <strong className="text-[2rem] font-semibold leading-none tabular text-fg">{value}</strong>
        <span className="text-sm text-fg-secondary">{valueLabel}</span>
      </div>
      {segments && <StackedBar segments={segments} onSegmentClick={onSegmentClick} className="mt-5" />}
      {children}
    </article>
  );
}
