/**
 * Cluster PostgreSQL de développement JETABLE (D-17), sans Docker et sans toucher aux services
 * PostgreSQL déjà installés sur la machine.
 *
 *   npm run db:ephemeral -- start   crée le cluster si besoin (.tmp/pgdata), le démarre sur 55432
 *   npm run db:ephemeral -- stop
 *   npm run db:ephemeral -- status
 *
 * Authentification « trust » locale : réservé au poste de développement, jamais exposé.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadRootEnv, pgBin } from './lib/pg';

const PORT = process.env['EPHEMERAL_PG_PORT'] ?? '55432';
const ROOT = resolve(__dirname, '..', '..', '.tmp');
const DATA = join(ROOT, 'pgdata');
const LOG = join(ROOT, 'postgres.log');

function run(bin: Parameters<typeof pgBin>[0], args: string[]): string {
  return execFileSync(pgBin(bin), args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function status(): boolean {
  try {
    run('pg_ctl', ['-D', DATA, 'status']);
    return true;
  } catch {
    return false;
  }
}

async function start(): Promise<void> {
  mkdirSync(ROOT, { recursive: true });
  if (!existsSync(join(DATA, 'PG_VERSION'))) {
    console.log(`Initialisation du cluster dans ${DATA}…`);
    run('initdb', ['-D', DATA, '-U', 'archiflow', '-A', 'trust', '-E', 'UTF8', '--locale=C']);
  }
  if (!status()) {
    // postgres est lancé détaché : pg_ctl garderait sinon la console attachée.
    const log = openSync(LOG, 'a');
    spawn(pgBin('pg_ctl'), ['-D', DATA, '-o', `-p ${PORT}`, '-l', LOG, 'start'], {
      detached: true,
      stdio: ['ignore', log, log],
    }).unref();
    for (let i = 0; i < 30 && !status(); i++) await new Promise((r) => setTimeout(r, 500));
  }
  for (const db of ['archiflow', 'archiflow_test']) {
    try {
      run('createdb', ['-h', 'localhost', '-p', PORT, '-U', 'archiflow', db]);
      console.log(`Base « ${db} » créée.`);
    } catch {
      // Déjà présente.
    }
  }
  console.log(`PostgreSQL jetable prêt : postgresql://archiflow@localhost:${PORT}/archiflow`);
}

async function main(): Promise<void> {
  loadRootEnv();
  const command = process.argv[2] ?? 'start';
  if (command === 'start') return start();
  if (command === 'stop') {
    if (status()) run('pg_ctl', ['-D', DATA, 'stop', '-m', 'fast']);
    console.log('Arrêté.');
    return;
  }
  console.log(status() ? `En marche sur le port ${PORT}.` : 'Arrêté.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
