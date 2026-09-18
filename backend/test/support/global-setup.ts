/**
 * Prépare la base de test une fois pour toute la suite : création si absente, puis application
 * des migrations versionnées — exactement comme en production (`migrate deploy`, jamais `db push`).
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

export default async function globalSetup(): Promise<void> {
  const rootEnv = resolve(__dirname, '..', '..', '..', '.env');
  if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
  const testUrl = process.env['DATABASE_URL_TEST'];
  if (!testUrl) throw new Error('DATABASE_URL_TEST est requis pour les tests d’intégration');

  const url = new URL(testUrl);
  const database = url.pathname.slice(1);
  if (!/^[a-z0-9_]+$/i.test(database)) throw new Error(`Nom de base de test invalide : ${database}`);

  const admin = new URL(testUrl);
  admin.pathname = '/postgres';
  admin.search = '';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
  if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${database}"`);
  await client.end();

  const prismaBin = resolve(__dirname, '..', '..', '..', 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(process.execPath, [prismaBin, 'migrate', 'deploy'], {
    cwd: resolve(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'pipe',
  });
}
