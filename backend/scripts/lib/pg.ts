import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Charge le .env racine s'il existe (scripts lancés hors de l'application). */
export function loadRootEnv(): void {
  const rootEnv = resolve(__dirname, '..', '..', '..', '.env');
  if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
}

/** Binaire PostgreSQL : PG_BIN_DIR s'il est défini, sinon le PATH. */
export function pgBin(name: 'pg_dump' | 'pg_restore' | 'psql' | 'initdb' | 'pg_ctl' | 'createdb'): string {
  const dir = process.env['PG_BIN_DIR'];
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  return dir ? join(dir, exe) : exe;
}

/**
 * Les URL Prisma portent `?schema=public`, que libpq refuse. On ne transmet aux outils
 * PostgreSQL que l'URL de connexion nue.
 */
export function libpqUrl(prismaUrl: string): string {
  const url = new URL(prismaUrl);
  url.search = '';
  return url.toString();
}

export function withDatabase(prismaUrl: string, database: string): string {
  const url = new URL(libpqUrl(prismaUrl));
  url.pathname = `/${database}`;
  return url.toString();
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Variable d'environnement manquante : ${name}`);
    process.exit(1);
  }
  return value;
}
