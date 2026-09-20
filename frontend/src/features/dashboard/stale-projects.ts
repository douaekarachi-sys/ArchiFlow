import type { ProjectStatus } from '@archiflow/shared';
import type { RankedItem } from '@/components/ui/ranked-list';

const DONE_STATUSES: readonly ProjectStatus[] = ['CLIENT_APPROVED', 'COMPLETED'];

/** Seuils indicatifs, alignés sur la sévérité des jetons visuels — pas une règle métier du CDC. */
function staleColorClass(days: number): string {
  if (days > 30) return 'bg-critical';
  if (days > 14) return 'bg-warning';
  if (days > 7) return 'bg-info';
  return 'bg-line-strong';
}

/**
 * Projets actifs (ni approuvés ni terminés) classés par ancienneté de la dernière mise à jour —
 * seule donnée déjà disponible côté client sans nouvel appel réseau (`updatedAt`).
 */
export function staleProjects(
  projects: readonly { id: string; name: string; status: ProjectStatus; updatedAt: string }[],
  now: number = Date.now(),
  limit = 5,
): RankedItem[] {
  const active = projects
    .filter((p) => !DONE_STATUSES.includes(p.status))
    .map((p) => ({ ...p, days: Math.max(0, Math.floor((now - new Date(p.updatedAt).getTime()) / 86_400_000)) }))
    .sort((a, b) => b.days - a.days)
    .slice(0, limit);

  const maxDays = active[0]?.days ?? 0;
  return active.map((p) => ({
    key: p.id,
    name: p.name,
    value: p.days,
    percent: maxDays > 0 ? Math.round((p.days / maxDays) * 100) : 0,
    colorClass: staleColorClass(p.days),
  }));
}
