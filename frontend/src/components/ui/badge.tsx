import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

/**
 * Badge : un statut n'est JAMAIS porté par la couleur seule (daltonisme, impression N&B).
 * `icon` est donc attendu pour tout badge de statut ; le libellé est toujours présent.
 */
const badgeVariants = cva(
  'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-field border px-2 text-xs font-medium [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'border-line-strong bg-overlay/5 text-fg-secondary',
        primary: 'border-primary/35 bg-primary/12 text-primary-text',
        success: 'border-success/35 bg-success/12 text-success-text',
        warning: 'border-warning/35 bg-warning/12 text-warning-text',
        critical: 'border-critical/35 bg-critical/12 text-critical-text',
        info: 'border-info/35 bg-info/12 text-info-text',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  icon?: ReactNode;
}

export function Badge({ tone, icon, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {icon && <span aria-hidden="true" className="inline-flex">{icon}</span>}
      {children}
    </span>
  );
}
