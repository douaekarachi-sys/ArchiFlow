import { CircleAlert, RotateCw } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { Button } from './button';

/**
 * Les trois états obligatoires de toute liste et de toute vue (brief §9.5).
 * Un écran blanc sans explication est un bug.
 */

/** Chargement : squelette qui respecte la mise en page finale, jamais un spinner centré. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-field bg-overlay/8', className)} {...props} />;
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Vide : icône + une phrase + une action principale. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-10 text-center', className)}>
      <div className="flex size-11 items-center justify-center rounded-card border border-line bg-inset text-fg-secondary [&_svg]:size-5">
        {icon}
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-sm font-semibold text-fg">{title}</p>
        {description && <p className="text-sm text-fg-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}

interface ErrorStateProps {
  /** Cause, déjà traduite. */
  message: string;
  onRetry?: () => void;
  className?: string;
}

/** Erreur : la cause + une action de récupération. */
export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-3 px-6 py-10 text-center', className)}
    >
      <div className="flex size-11 items-center justify-center rounded-card border border-critical/40 bg-critical/10 text-critical-text">
        <CircleAlert className="size-5" aria-hidden="true" />
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-sm font-semibold text-fg">{t('states.errorTitle')}</p>
        <p className="text-sm text-fg-secondary">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RotateCw />} onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
