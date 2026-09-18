import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Regles d'architecture outillees, pas confiees a la discipline.
 *
 * - backend/src/domain/ doit rester pur : pas de NestJS, pas de Prisma, pas d'I/O.
 *   (ARCHITECTURE-CIBLE.md 6.2)
 * - packages/shared/ n'accepte qu'une seule dependance externe : zod.
 *   (ADR 0002)
 */
const DOMAIN_PURITY = [
  'error',
  {
    patterns: [
      {
        group: ['@nestjs', '@nestjs/*'],
        message: "domain/ doit rester pur : aucune dependance NestJS (ARCHITECTURE-CIBLE 6.2).",
      },
      {
        group: ['@prisma/client', '.prisma', '.prisma/*', 'prisma'],
        message: "domain/ ne connait pas Prisma : il recoit des donnees, il ne les lit pas.",
      },
      {
        group: ['node:*', 'fs', 'path', 'http', 'https', 'child_process'],
        message: "domain/ ne fait aucune I/O.",
      },
      {
        group: ['**/modules/**', '**/repositories/**', '**/core/**'],
        message: 'domain/ ne depend pas des couches superieures.',
      },
    ],
  },
];

/**
 * Liste BLANCHE : seuls zod, les imports relatifs et vitest (dans les tests) sont admis.
 * Une liste noire laissait passer n'importe quelle bibliotheque non prevue (lodash, dayjs...).
 */
const SHARED_ALLOWLIST = (extra = []) => [
  'error',
  {
    patterns: [
      {
        regex: `^(?!(?:${['zod$', '\\.{1,2}/', ...extra].join('|')}))`,
        message:
          "packages/shared : zero dependance externe, zod excepte (ADR 0002). Si une dependance devient necessaire, il faut un nouvel ADR.",
      },
    ],
  },
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'backend/prisma/migrations/**',
      '**/*.config.js',
      '**/*.config.cjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.es2023 },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['backend/src/domain/**/*.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': DOMAIN_PURITY },
  },
  {
    files: ['packages/shared/src/**/*.ts'],
    ignores: ['packages/shared/src/**/*.spec.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': SHARED_ALLOWLIST() },
  },
  {
    files: ['packages/shared/src/**/*.spec.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': SHARED_ALLOWLIST(['vitest$']) },
  },
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  prettier,
);
