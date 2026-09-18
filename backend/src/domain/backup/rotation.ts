/**
 * Rotation des sauvegardes GFS (ENF-04, ARCHITECTURE-CIBLE §6.13) :
 * 7 quotidiennes, 4 hebdomadaires, 12 mensuelles.
 *
 * Fonction pure : elle reçoit des dates, elle rend celles à conserver. Le script de sauvegarde
 * supprime le reste. Une erreur ici effacerait des sauvegardes — d'où les tests.
 */
export const BACKUP_POLICY = { daily: 7, weekly: 4, monthly: 12 } as const;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const monthKey = (d: Date) => d.toISOString().slice(0, 7);

/** Semaine ISO (lundi) : l'année ISO peut différer de l'année civile en fin décembre. */
function weekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Pour chaque période, garde la sauvegarde la PLUS RÉCENTE de la période, sur les N périodes
 * les plus récentes. Une sauvegarde retenue par au moins une règle est conservée.
 */
export function selectBackupsToKeep(dates: readonly Date[], policy = BACKUP_POLICY): Set<number> {
  const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime());
  const keep = new Set<number>();

  const retain = (keyOf: (d: Date) => string, periods: number) => {
    const seen = new Set<string>();
    for (const d of sorted) {
      const key = keyOf(d);
      if (seen.has(key)) continue;
      if (seen.size >= periods) break;
      seen.add(key);
      keep.add(d.getTime());
    }
  };

  retain(dayKey, policy.daily);
  retain(weekKey, policy.weekly);
  retain(monthKey, policy.monthly);
  return keep;
}
