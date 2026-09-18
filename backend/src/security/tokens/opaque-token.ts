import { createHash, randomBytes } from 'node:crypto';

/**
 * Jetons opaques (rafraîchissement de session, réinitialisation de mot de passe).
 * 256 bits d'aléa : une empreinte SHA-256 sans sel suffit, un tel jeton ne se devine pas par
 * dictionnaire. Seule l'empreinte est stockée ; une fuite de la base ne livre aucun jeton utilisable.
 */
export function generateOpaqueToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashOpaqueToken(token) };
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
