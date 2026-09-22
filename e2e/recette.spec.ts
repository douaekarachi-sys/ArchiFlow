import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Test de recette (T14) : pour chaque rôle, clique RÉELLEMENT sur chaque entrée de la barre
 * latérale et vérifie que l'application répond vraiment. « Terminé » ne veut plus dire
 * « le code existe », mais « ce test est vert ».
 *
 * Échoue si :
 *  - une entrée de navigation est grisée / « Bientôt disponible » ;
 *  - un clic ne change ni l'URL ni le contenu affiché ;
 *  - la console du navigateur reçoit une erreur ;
 *  - la page déborde horizontalement (scrollWidth > clientWidth).
 *
 * Nécessite le backend (3000) et le frontend (5173) déjà démarrés, base seedée
 * (`npm run db:seed`) — ce test observe l'application telle qu'un jury la trouverait.
 */

const PASSWORD = 'Demo-ArchiFlow-2026';
const ACCOUNTS: { role: string; email: string }[] = [
  { role: 'ADMIN', email: 'admin@archiflow.local' },
  { role: 'PROJECT_MANAGER', email: 'pm@archiflow.local' },
  { role: 'ENGINEER', email: 'engineer@archiflow.local' },
  { role: 'ARCHITECT', email: 'architect@archiflow.local' },
  { role: 'SALES', email: 'sales@archiflow.local' },
  { role: 'CLIENT', email: 'client@archiflow.local' },
];

interface Finding {
  role: string;
  entry: string;
  kind: 'DISABLED_ENTRY' | 'DEAD_CLICK' | 'CONSOLE_ERROR' | 'HORIZONTAL_OVERFLOW';
  detail: string;
}

const findings: Finding[] = [];
const OUT_DIR = path.join(__dirname, '..', '.tmp', 'recette');

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(/\/(admin|pm|engineer|architect|sales|client)/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

for (const account of ACCOUNTS) {
  test(`recette — portail ${account.role} : chaque entrée de navigation répond vraiment`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await login(page, account.email);

    if (await hasHorizontalOverflow(page)) {
      findings.push({ role: account.role, entry: '(tableau de bord initial)', kind: 'HORIZONTAL_OVERFLOW', detail: page.url() });
    }

    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav).toBeVisible();

    // Ouvre le groupe repliable s'il existe et n'est pas déjà ouvert.
    const groupToggle = nav.getByRole('button').first();
    if (await groupToggle.count()) {
      const expanded = await groupToggle.getAttribute('aria-expanded');
      if (expanded === 'false') await groupToggle.click();
    }

    // Chaque entrée est SOIT un lien (<a>), SOIT un espace réservé désactivé (aria-disabled).
    const entryHandles = await nav.locator('a, [aria-disabled="true"]').all();
    const entries: { text: string; disabled: boolean }[] = [];
    for (const handle of entryHandles) {
      const text = ((await handle.textContent()) ?? '').trim();
      const disabled = (await handle.getAttribute('aria-disabled')) === 'true';
      entries.push({ text, disabled });
    }

    for (const entry of entries) {
      if (entry.disabled) {
        findings.push({ role: account.role, entry: entry.text, kind: 'DISABLED_ENTRY', detail: 'grisée / « Bientôt disponible »' });
        continue;
      }

      consoleErrors.length = 0;
      const urlBefore = page.url();
      const bodyTextBefore = ((await page.locator('#main').innerText().catch(() => '')) || '').trim();

      const link = nav.getByRole('link', { name: entry.text, exact: true }).first();
      const targetHref = await link.getAttribute('href');
      // Deux entrées peuvent pointer vers LA MÊME destination par construction (ex. « BOM » et
      // « Coûts » → un seul écran dérivé), et cliquer l'entrée déjà active est un no-op légitime.
      const sameDestination = !!targetHref && new URL(targetHref, urlBefore).pathname === new URL(urlBefore).pathname;

      await link.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(400);

      const urlAfter = page.url();
      const bodyTextAfter = ((await page.locator('#main').innerText().catch(() => '')) || '').trim();

      if (!sameDestination && urlAfter === urlBefore && bodyTextAfter === bodyTextBefore) {
        findings.push({
          role: account.role,
          entry: entry.text,
          kind: 'DEAD_CLICK',
          detail: `URL et contenu inchangés après clic (resté sur ${urlBefore})`,
        });
      }

      if (bodyTextAfter.length < 10) {
        findings.push({ role: account.role, entry: entry.text, kind: 'DEAD_CLICK', detail: `contenu de #main quasi vide après clic (${urlAfter})` });
      }

      if (await hasHorizontalOverflow(page)) {
        findings.push({ role: account.role, entry: entry.text, kind: 'HORIZONTAL_OVERFLOW', detail: urlAfter });
      }

      if (consoleErrors.length > 0) {
        findings.push({ role: account.role, entry: entry.text, kind: 'CONSOLE_ERROR', detail: consoleErrors.join(' | ') });
      }
    }
  });
}

test.afterAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'findings.json'), JSON.stringify(findings, null, 2));
  console.log(`\n=== RECETTE : ${findings.length} problème(s) trouvé(s) ===`);
  for (const f of findings) {
    console.log(`[${f.role}] ${f.kind} — « ${f.entry} » : ${f.detail}`);
  }
});

// Dernier test, après les six portails : le verdict global. Rouge tant qu'un seul problème subsiste.
test('recette — verdict global : zéro entrée grisée, zéro clic mort, zéro erreur console, zéro débordement', () => {
  expect(findings, `${findings.length} problème(s) — voir .tmp/recette/findings.json`).toEqual([]);
});
