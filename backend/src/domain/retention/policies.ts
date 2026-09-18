/**
 * Durées de conservation (ENF-02, ARCHITECTURE-CIBLE §6.12).
 *
 * Constantes de CODE, pas de configuration : elles se relisent en revue, elles ne se modifient
 * pas silencieusement en base. Proposition à valider par l'exploitant, responsable de traitement.
 * Tenue à jour avec docs/RETENTION.md.
 */
const DAY = 86_400_000;

export const RETENTION = {
  /** Journal d'audit : 12 mois glissants. */
  auditLogDays: 365,
  /** Jetons de rafraîchissement expirés : supprimés dès expiration (durée de vie : 30 jours). */
  expiredRefreshTokenDays: 0,
  /** Jetons de rafraîchissement révoqués : 7 jours, le temps d'investiguer une réutilisation. */
  revokedRefreshTokenDays: 7,
  /** Jetons de réinitialisation : 7 jours après expiration ou usage. */
  passwordResetTokenDays: 7,
  /** Comptes inactifs : 12 mois sans connexion, signalés pour revue (jamais effacés automatiquement). */
  inactiveAccountDays: 365,
} as const;

export interface RetentionCutoffs {
  auditLogBefore: Date;
  expiredRefreshTokenBefore: Date;
  revokedRefreshTokenBefore: Date;
  passwordResetTokenBefore: Date;
  inactiveAccountBefore: Date;
}

export function retentionCutoffs(now: Date): RetentionCutoffs {
  const minus = (days: number) => new Date(now.getTime() - days * DAY);
  return {
    auditLogBefore: minus(RETENTION.auditLogDays),
    expiredRefreshTokenBefore: minus(RETENTION.expiredRefreshTokenDays),
    revokedRefreshTokenBefore: minus(RETENTION.revokedRefreshTokenDays),
    passwordResetTokenBefore: minus(RETENTION.passwordResetTokenDays),
    inactiveAccountBefore: minus(RETENTION.inactiveAccountDays),
  };
}
