import { Inject, Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ENV, type Env } from '../../core/config/env';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Point d'extension de l'envoi d'e-mails. Aucun fournisseur SMTP n'est branché à ce stade :
 * - `file`     (développement) : chaque message est écrit dans MAIL_DIR, jamais dans les logs ;
 * - `memory`   (tests)         : les messages restent consultables dans `outbox` ;
 * - `disabled` (défaut)        : rien n'est envoyé, seul un compteur est journalisé.
 */
@Injectable()
export class Mailer {
  private readonly logger = new Logger('Mailer');
  readonly outbox: MailMessage[] = [];

  constructor(@Inject(ENV) private readonly env: Env) {}

  async send(message: MailMessage): Promise<void> {
    switch (this.env.MAIL_TRANSPORT) {
      case 'memory':
        this.outbox.push(message);
        return;
      case 'file': {
        const dir = resolve(this.env.MAIL_DIR);
        await mkdir(dir, { recursive: true });
        const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${message.to.replace(/[^a-z0-9.@-]/gi, '_')}.json`;
        await writeFile(join(dir, name), JSON.stringify(message, null, 2), 'utf8');
        return;
      }
      case 'disabled':
        // Ni destinataire ni contenu dans les logs : un lien de réinitialisation est un secret.
        this.logger.warn('E-mail non envoyé : transport désactivé (MAIL_TRANSPORT=disabled)');
    }
  }
}
