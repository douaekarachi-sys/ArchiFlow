import { defineConfig } from '@playwright/test';

/**
 * Test de recette (T14) : clique réellement dans l'interface, pour chaque rôle, chaque entrée
 * de navigation. Nécessite le backend (port 3000) et le frontend (port 5173) déjà démarrés,
 * avec une base seedée (`npm run db:seed`) — ce test ne les lance pas lui-même : il vérifie
 * l'application telle qu'un jury la trouverait.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: '.tmp/recette/results.json' }]],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
