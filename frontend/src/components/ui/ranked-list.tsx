import { cn } from '@/utils/cn';

export interface RankedItem {
  key: string;
  name: string;
  value: number | string;
  /** 0–100 : longueur de la barre fine et base du pourcentage affiché. */
  percent: number;
  /** Classe Tailwind statique (ex. `bg-critical`) — jamais construite dynamiquement. */
  colorClass: string;
}

/** Liste classée : nom tronqué, valeur, pourcentage, barre de couleur fine à gauche de la ligne. */
export function RankedList({ items, onSelect, className }: { items: RankedItem[]; onSelect?: (key: string) => void; className?: string }) {
  return (
    <ul className={cn('flex flex-col', className)}>
      {items.map((item) => {
        const Row = onSelect ? 'button' : 'div';
        return (
          <li key={item.key} className="border-b border-line last:border-b-0">
            <Row
              type={onSelect ? 'button' : undefined}
              onClick={onSelect ? () => onSelect(item.key) : undefined}
              className={cn(
                'flex w-full items-center gap-3 py-2.5 text-left transition-colors duration-150',
                onSelect && 'hover:bg-overlay/3',
              )}
            >
              <span className={cn('h-6 w-1 shrink-0 rounded-full', item.colorClass)} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm text-fg">{item.name}</span>
              <span className="shrink-0 text-sm font-medium tabular text-fg">{item.value}</span>
              <span className="w-11 shrink-0 text-right text-xs tabular text-fg-muted">{item.percent}%</span>
            </Row>
          </li>
        );
      })}
    </ul>
  );
}
