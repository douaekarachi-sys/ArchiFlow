/**
 * Environnement des tests d'intégration, posé AVANT la création de l'application.
 * La base de test est distincte de la base de développement : les tests la vident.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const rootEnv = resolve(__dirname, '..', '..', '..', '.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const testUrl = process.env['DATABASE_URL_TEST'];
if (!testUrl) throw new Error('DATABASE_URL_TEST est requis pour les tests d’intégration');

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: testUrl,
  JWT_ACCESS_SECRET: process.env['JWT_ACCESS_SECRET'] ?? 'test-access-secret-0123456789abcdef0123456789',
  BCRYPT_ROUNDS: '4',
  MAIL_TRANSPORT: 'memory',
  THROTTLE_AUTH_LIMIT: '1000',
  BACKUP_DIR: '',
});
delete process.env['BACKUP_DIR'];
