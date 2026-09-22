import type { Anomaly, AnomalySeverity, EquipmentIndex } from '@archiflow/shared';
import type { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

/**
 * Panneau d'anomalies (EF-202/203/204/207, schéma physique d'EF-205) : partagé entre le
 * concepteur 2D (panneau inline) et la page « Validation » dédiée du portail Architecte
 * (T16) — même rendu, même détail de calcul, une seule source de vérité visuelle.
 */

export const SEVERITY_ORDER = ['CRITICAL', 'WARNING', 'INFO'] as const;

export const SEVERITY_CLASS: Record<AnomalySeverity, string> = {
  CRITICAL: 'border-red-500/60 bg-red-500/10 text-red-200',
  WARNING: 'border-amber-500/60 bg-amber-500/10 text-amber-200',
  INFO: 'border-sky-500/60 bg-sky-500/10 text-sky-200',
};

export const DOT_CLASS: Record<AnomalySeverity, string> = {
  CRITICAL: 'bg-red-500',
  WARNING: 'bg-amber-500',
  INFO: 'bg-sky-500',
};

export function buildEquipmentIndex(
  items: Array<{
    id: string;
    portCount: number | null;
    portType: string | null;
    throughputMbps: number | null;
    poeBudgetW: number | null;
    powerDrawW: number | null;
  }>,
): EquipmentIndex {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      {
        portCount: item.portCount ?? null,
        portType: item.portType ?? null,
        throughputMbps: item.throughputMbps ?? null,
        poeBudgetW: item.poeBudgetW ?? null,
        powerDrawW: item.powerDrawW ?? null,
      },
    ]),
  );
}

export function ValidationPanel({
  anomalies,
  compatible,
  t,
  className,
  maxVisible = 5,
}: {
  anomalies: Anomaly[];
  compatible: boolean;
  t: ReturnType<typeof useTranslation>['t'];
  className?: string;
  /** Le panneau inline du concepteur tronque à 5 ; la page dédiée montre tout. */
  maxVisible?: number;
}) {
  if (anomalies.length === 0) {
    return (
      <div className={cn('border-t border-line bg-surface px-4 py-3 text-sm text-fg-secondary', className)}>
        {t('designer.validation.none')}
      </div>
    );
  }

  const totals = SEVERITY_ORDER.reduce(
    (acc, severity) => {
      acc[severity] = anomalies.filter((anomaly) => anomaly.severity === severity).length;
      return acc;
    },
    { CRITICAL: 0, WARNING: 0, INFO: 0 } as Record<AnomalySeverity, number>,
  );
  // Triées par sévérité : une CRITICAL ne doit jamais rester masquée derrière des WARNING/INFO plus nombreuses.
  const sorted = [...anomalies].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  const visible = sorted.slice(0, maxVisible);
  const hiddenCount = sorted.length - visible.length;

  return (
    <div className={cn('border-t border-line bg-surface px-4 py-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">{t('designer.validation.title')}</span>
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
              compatible ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200' : 'border-red-500/60 bg-red-500/10 text-red-200',
            )}
          >
            {compatible ? t('designer.validation.compatible') : t('designer.validation.incompatible')}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-fg-muted">
          {SEVERITY_ORDER.map((severity) => (
            <span key={severity} className={cn('inline-flex rounded-full border px-2 py-0.5', SEVERITY_CLASS[severity])}>
              {severity} {totals[severity]}
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {visible.map((anomaly) => (
          <li
            key={`${anomaly.code}-${anomaly.elementIds.join('-')}-${anomaly.connectionIds.join('-')}`}
            className="flex gap-2 rounded-md border border-line bg-inset px-2.5 py-2"
          >
            <span
              className={cn('mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full', DOT_CLASS[anomaly.severity])}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-fg">{t(anomaly.code, anomaly.params ?? {})}</p>
              <p className="mt-0.5 text-[11px] text-fg-muted">
                {anomaly.severity} ·{' '}
                {anomaly.elementIds.length > 0 ? anomaly.elementIds.join(', ') : anomaly.connectionIds.join(', ') || t('designer.validation.unknown')}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <p className="mt-2 text-[11px] text-fg-muted">{t('designer.validation.more', { count: hiddenCount })}</p>
      )}
    </div>
  );
}
