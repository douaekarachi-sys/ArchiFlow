/**
 * Restauration d'une sauvegarde chiffrée (docs/RUNBOOK-RESTAURATION.md).
 *
 *   npm run db:restore -- <fichier.dump.enc> --target <url-postgresql> [--yes]
 *
 * La base cible est REMPLACÉE. Restaurer sur DATABASE_URL (la base courante) exige --yes :
 * la commande ne doit jamais écraser la production par une faute de frappe.
 */
import { execFileSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decryptFileToFile, parseKey } from './lib/crypto';
import { libpqUrl, loadRootEnv, pgBin, requireEnv } from './lib/pg';

export async function restore(file: string, targetUrl: string, key: Buffer): Promise<void> {
  const plain = join(tmpdir(), `archiflow-restore-${process.pid}-${Date.now()}.dump`);
  try {
    // Déchiffrement complet et vérification de l'intégrité AVANT de toucher à la base cible.
    await decryptFileToFile(file, plain, key);
    execFileSync(
      pgBin('pg_restore'),
      ['--clean', '--if-exists', '--no-owner', '--no-privileges', '--exit-on-error', '--dbname', libpqUrl(targetUrl), plain],
      { stdio: ['ignore', 'inherit', 'inherit'] },
    );
  } finally {
    await rm(plain, { force: true });
  }
}

async function main(): Promise<void> {
  loadRootEnv();
  const [file] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const targetIndex = process.argv.indexOf('--target');
  const target = targetIndex > 0 ? process.argv[targetIndex + 1] : undefined;
  if (!file || !target) {
    console.error('Usage : npm run db:restore -- <fichier.dump.enc> --target <url-postgresql> [--yes]');
    process.exit(1);
  }
  const current = process.env['DATABASE_URL'];
  if (current && libpqUrl(current) === libpqUrl(target) && !process.argv.includes('--yes')) {
    console.error('La cible est la base courante (DATABASE_URL). Relancez avec --yes pour confirmer son remplacement.');
    process.exit(1);
  }
  const started = Date.now();
  await restore(file, target, parseKey(requireEnv('BACKUP_ENCRYPTION_KEY')));
  console.log(`Restauration terminée en ${((Date.now() - started) / 1000).toFixed(1)} s.`);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
