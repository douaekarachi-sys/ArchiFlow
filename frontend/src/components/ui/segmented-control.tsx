import { cn } from '@/utils/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Contrôle à deux (ou trois) options : l'option active passe en surface blanche, bordure violette. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  'aria-label': string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('inline-flex items-center gap-1 rounded-button border border-line bg-inset p-1', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-7 rounded-field px-3 text-sm font-medium transition-colors duration-150',
              active ? 'border border-primary bg-surface text-primary-text shadow-elevated' : 'border border-transparent text-fg-secondary hover:text-fg',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
