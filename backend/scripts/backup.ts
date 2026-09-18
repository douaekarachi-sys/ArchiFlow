/**
 * Sauvegarde quotidienne (ENF-04, docs/RUNBOOK-RESTAURATION.md).
 *
 *   npm run db:backup
 *
 * 1. pg_dump -Fc de DATABASE_URL, chiffré au fil de l'eau (AES-256-GCM) dans BACKUP_DIR ;
 * 2. écriture dans un fichier temporaire, renommé seulement si pg_dump a réussi ;
 * 3. rotation GFS : 7 quotidiennes, 4 hebdomadaires, 12 mensuelles.
 *
 * Refuse de produire une sauvegarde en clair. Journalise des volumes, jamais des contenus.
 * BACKUP_DIR doit être copié hors machine : une sauvegarde sur le disque de la base meurt avec elle.
 */
import { spawn } from 'node:child_process';
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { selectBackupsToKeep } from '../src/domain/backup/rotation';
import { encryptStreamToFile, parseKey } from './lib/crypto';
import { libpqUrl, loadRootEnv, pgBin, requireEnv } from './lib/pg';

const NAME = /^archiflow-(\d{8}T\d{6}Z)\.dump\.enc$/;

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const parseStamp = (s: string) =>
  new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`);

async function main(): Promise<void> {
  loadRootEnv();
  const databaseUrl = requireEnv('DATABASE_URL');
  const dir = requireEnv('BACKUP_DIR');
  const key = parseKey(requireEnv('BACKUP_ENCRYPTION_KEY'));
  await mkdir(dir, { recursive: true });

  const started = Date.now();
  const target = join(dir, `archiflow-${stamp(new Date())}.dump.enc`);
  const partial = `${target}.partial`;

  const dump = spawn(pgBin('pg_dump'), ['--format=custom', '--no-owner', '--no-privileges', '--dbname', libpqUrl(databaseUrl)], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  dump.stderr.on('data', (c: Buffer) => (stderr += c.toString()));
  const exited = new Promise<number>((resolve, reject) => {
    dump.on('error', reject);
    dump.on('close', (code) => resolve(code ?? 1));
  });

  try {
    await encryptStreamToFile(dump.stdout, partial, key);
    const code = await exited;
    if (code !== 0) throw new Error(`pg_dump a échoué (code ${code}) : ${stderr.trim()}`);
    await rename(partial, target);
  } catch (error) {
    await rm(partial, { force: true });
    throw error;
  }

  const { size } = await stat(target);
  console.log(`Sauvegarde écrite : ${target} (${(size / 1024).toFixed(0)} Kio, ${((Date.now() - started) / 1000).toFixed(1)} s)`);

  // Rotation GFS.
  const backups = (await readdir(dir)).flatMap((f) => {
    const m = NAME.exec(f);
    return m ? [{ file: f, date: parseStamp(m[1]!) }] : [];
  });
  const keep = selectBackupsToKeep(backups.map((b) => b.date));
  const removed = backups.filter((b) => !keep.has(b.date.getTime()));
  for (const b of removed) await rm(join(dir, b.file));
  console.log(`Rotation : ${backups.length - removed.length} sauvegardes conservées, ${removed.length} supprimées.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
