import { cn } from '@/utils/cn';

const TONE_CLASS: Record<'critical' | 'high' | 'warning' | 'success' | 'info', string> = {
  critical: 'bg-critical',
  high: 'bg-high',
  warning: 'bg-warning',
  success: 'bg-success',
  info: 'bg-info',
};

/**
 * Indicateur à pastilles (●●●○) : exprime un niveau à côté d'un chiffre, jamais seul — le
 * chiffre reste la source de vérité, les pastilles n'en sont qu'un résumé visuel.
 */
export function SeverityDots({
  level,
  max = 4,
  tone,
  className,
}: {
  level: number;
  max?: number;
  tone: keyof typeof TONE_CLASS;
  className?: string;
}) {
  const filled = Math.max(0, Math.min(level, max));
  return (
    <span className={cn('inline-flex items-center gap-1', className)} role="img" aria-label={`${filled} / ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn('size-1.5 rounded-full', i < filled ? TONE_CLASS[tone] : 'bg-line-strong')}
        />
      ))}
    </span>
  );
}
