import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

/**
 * Logotype : trois nœuds reliés, aux couleurs des catégories pare-feu, commutateur et serveur.
 * Le même code couleur que les schémas (brief §9.1).
 */
export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-inset stroke-line" />
        <path d="M9 10 16 23 23 10" fill="none" className="stroke-accent" strokeWidth="1.6" />
        <circle cx="9" cy="10" r="3" className="fill-cat-switch" />
        <circle cx="23" cy="10" r="3" className="fill-cat-firewall" />
        <circle cx="16" cy="23" r="3" className="fill-cat-server" />
      </svg>
      {!compact && <span className="text-base font-semibold tracking-tight text-fg">{t('app.name')}</span>}
    </span>
  );
}
