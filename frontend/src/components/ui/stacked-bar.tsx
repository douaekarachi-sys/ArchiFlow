import { cn } from '@/utils/cn';

export interface StackedBarSegment {
  key: string;
  label: string;
  value: number;
  /** Classe Tailwind statique (ex. `bg-critical`) — jamais construite dynamiquement. */
  colorClass: string;
}

interface StackedBarProps {
  segments: StackedBarSegment[];
  className?: string;
  /** Un segment cliquable mène à la vue filtrée correspondante (brief). */
  onSegmentClick?: (key: string) => void;
}

/**
 * Barre de répartition pleine largeur + légende en pourcentages — le motif signature de la
 * référence : le chiffre donne le contexte, la barre donne la répartition.
 */
export function StackedBar({ segments, className, onSegmentClick }: StackedBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-inset">
        {segments.map((s) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          if (pct <= 0) return null;
          const style = { width: `${pct}%` };
          return onSegmentClick ? (
            <button
              key={s.key}
              type="button"
              onClick={() => onSegmentClick(s.key)}
              style={style}
              aria-label={`${s.label} : ${s.value}`}
              className={cn('h-full transition-opacity duration-150 first:rounded-l-full last:rounded-r-full hover:opacity-80', s.colorClass)}
            />
          ) : (
            <span key={s.key} style={style} aria-hidden="true" className={cn('h-full first:rounded-l-full last:rounded-r-full', s.colorClass)} />
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.key} className="flex items-center gap-1.5 text-xs text-fg-secondary">
              <span className={cn('size-2 shrink-0 rounded-[2px]', s.colorClass)} aria-hidden="true" />
              {s.label} <span className="tabular text-fg-muted">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
