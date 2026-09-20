import { cn } from '@/utils/cn';

export interface TabItem {
  key: string;
  label: string;
}

/** Liste d'onglets simple, accessible (role tablist/tab) — sans dépendance supplémentaire. */
export function Tabs({ items, value, onChange, className }: { items: TabItem[]; value: string; onChange: (key: string) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('flex gap-6 border-b border-line', className)}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              'border-b-2 pb-3 pt-1 text-sm transition-colors duration-150',
              active ? 'border-primary font-medium text-primary-text' : 'border-transparent text-fg-secondary hover:text-fg',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
