/**
 * Test de restauration (ENF-04) — « une sauvegarde jamais restaurée n'est pas une sauvegarde ».
 *
 *   npm run db:restore:verify [-- <fichier.dump.enc>]
 *
 * Restaure la sauvegarde la plus récente (ou celle indiquée) dans une base JETABLE créée pour
 * l'occasion sur le même serveur, vérifie son contenu, mesure la durée, puis supprime la base.
 * La base de production n'est jamais touchée. Code de sortie non nul en cas d'échec.
 */
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { parseKey } from './lib/crypto';
import { libpqUrl, loadRootEnv, requireEnv, withDatabase } from './lib/pg';
import { restore } from './restore';

async function latestBackup(dir: string): Promise<string> {
  const files = (await readdir(dir)).filter((f) => /^archiflow-.*\.dump\.enc$/.test(f)).sort();
  const last = files.at(-1);
  if (!last) throw new Error(`Aucune sauvegarde dans ${dir}`);
  return join(dir, last);
}

async function main(): Promise<void> {
  loadRootEnv();
  const source = requireEnv('DATABASE_URL');
  const key = parseKey(requireEnv('BACKUP_ENCRYPTION_KEY'));
  const file = process.argv[2] ? resolve(process.argv[2]) : await latestBackup(requireEnv('BACKUP_DIR'));
  const scratch = `archiflow_restore_check_${Date.now()}`;
  const admin = new Client({ connectionString: withDatabase(source, 'postgres') });
  await admin.connect();

  const started = Date.now();
  const checks: [string, boolean, string][] = [];
  try {
    await admin.query(`CREATE DATABASE "${scratch}"`);
    const scratchUrl = withDatabase(source, scratch);
    await restore(file, scratchUrl, key);
    const restoredIn = (Date.now() - started) / 1000;

    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: scratchUrl }) });
    try {
      const counts = {
        organisations: await prisma.organization.count(),
        utilisateurs: await prisma.user.count(),
        projets: await prisma.project.count(),
        historique: await prisma.projectStatusHistory.count(),
        audit: await prisma.auditLog.count(),
      };
      checks.push(['au moins une organisation', counts.organisations > 0, JSON.stringify(counts)]);
      checks.push(['au moins un utilisateur', counts.utilisateurs > 0, '']);

      const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
        SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name`;
      const expected = (await readdir(resolve(__dirname, '..', 'prisma', 'migrations'), { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();
      checks.push([
        'migrations identiques au dépôt',
        JSON.stringify(migrations.map((m) => m.migration_name)) === JSON.stringify(expected),
        `${migrations.length} appliquées, ${expected.length} dans le dépôt`,
      ]);

      // « Ouverture d'un projet » : lecture d'un projet avec ses relations, comme le fait l'API.
      const project = await prisma.project.findFirst({ include: { assignments: true, history: true, clientCompany: true } });
      checks.push(['un projet s’ouvre avec ses relations', counts.projets === 0 || project !== null, project?.name ?? '(aucun projet)']);
    } finally {
      await prisma.$disconnect();
    }

    console.log(`Sauvegarde vérifiée : ${file}`);
    console.log(`Durée de restauration : ${restoredIn.toFixed(1)} s (objectif RTO : 4 h)`);
    for (const [label, ok, detail] of checks) console.log(`  ${ok ? '✔' : '✘'} ${label}${detail ? ` — ${detail}` : ''}`);
  } finally {
    await admin.query(`DROP DATABASE IF EXISTS "${scratch}" WITH (FORCE)`).catch(() => undefined);
    await admin.end();
  }
  if (checks.some(([, ok]) => !ok)) process.exit(1);
  console.log(`Test de restauration RÉUSSI — ${new Date().toISOString()} (base source : ${new URL(libpqUrl(source)).pathname.slice(1)})`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
