/**
 * Effacement d'un utilisateur (ENF-02) : une ANONYMISATION, jamais un DELETE.
 *
 * ENF-02 (droit à l'effacement) et ENF-07 (historique et audit) se contrediraient si
 * l'effacement supprimait la ligne : l'auteur de chaque version et de chaque action disparaîtrait.
 * On efface l'identité, on garde l'identifiant technique et tout l'historique qui y renvoie.
 */
export interface AnonymizedIdentity {
  firstName: string;
  lastName: string;
  email: string;
  /** Empreinte inutilisable : aucun mot de passe ne peut plus correspondre. */
  passwordHash: string;
  mustChangePassword: false;
  deletedAt: Date;
  anonymizedAt: Date;
}

export const ANONYMIZED_FIRST_NAME = 'Utilisateur';
export const ANONYMIZED_LAST_NAME = 'supprimé';

export function anonymizedIdentity(userId: string, now: Date): AnonymizedIdentity {
  return {
    firstName: ANONYMIZED_FIRST_NAME,
    lastName: ANONYMIZED_LAST_NAME,
    // Unicité préservée par l'identifiant, domaine réservé qui ne reçoit aucun courrier.
    email: `supprime+${userId}@invalide.local`,
    passwordHash: '!anonymized',
    mustChangePassword: false,
    deletedAt: now,
    anonymizedAt: now,
  };
}
