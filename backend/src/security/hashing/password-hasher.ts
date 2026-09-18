import { Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { ENV, type Env } from '../../core/config/env';

/**
 * Hachage des mots de passe (ENF-02). bcrypt est un hachage à sens unique : un mot de passe ne
 * se « déchiffre » jamais, pas même par l'exploitant.
 */
@Injectable()
export class PasswordHasher {
  /** Empreinte factice : comparée quand le compte n'existe pas, pour égaliser le temps de réponse. */
  private dummyHash: Promise<string>;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.dummyHash = bcrypt.hash('archiflow-dummy-password-for-timing', env.BCRYPT_ROUNDS);
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.env.BCRYPT_ROUNDS);
  }

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Comparaison sans issue possible, au coût identique à une vraie vérification. Sans elle,
   * l'écart de latence entre « compte introuvable » et « mauvais mot de passe » trahirait
   * l'existence du compte, malgré le message unique.
   */
  async burnVerification(password: string): Promise<false> {
    await bcrypt.compare(password, await this.dummyHash);
    return false;
  }
}
