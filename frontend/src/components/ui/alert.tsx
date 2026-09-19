import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

const TONES = {
  critical: { icon: CircleAlert, cls: 'border-critical/40 bg-critical/10 [&_svg]:text-critical-text' },
  warning: { icon: TriangleAlert, cls: 'border-warning/40 bg-warning/10 [&_svg]:text-warning-text' },
  success: { icon: CircleCheck, cls: 'border-success/40 bg-success/10 [&_svg]:text-success-text' },
  info: { icon: Info, cls: 'border-info/40 bg-info/10 [&_svg]:text-info-text' },
} as const;

/** Message en ligne : icône + texte, jamais la couleur seule. */
export function Alert({
  tone,
  children,
  className,
  icon,
}: {
  tone: keyof typeof TONES;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  const { icon: DefaultIcon, cls } = TONES[tone];
  const resolvedIcon = icon ?? <DefaultIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />;
  return (
    <div
      role={tone === 'critical' ? 'alert' : 'status'}
      className={cn('flex gap-2.5 rounded-field border p-3 text-sm text-fg', cls, className)}
    >
      <span className="inline-flex shrink-0 leading-none">{resolvedIcon}</span>
      <div>{children}</div>
    </div>
  );
}
