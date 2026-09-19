// @vitest-environment node
/**
 * ENF-03 — aucune chaîne en dur : chaque clé employée par le code doit exister dans fr.json.
 * Le test parcourt le code source et vérifie :
 *  - les appels t('clé') littéraux ;
 *  - les clés produites par le domaine (statuts, rôles, transitions, validation, erreurs d'API).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  EQUIPMENT_CATEGORIES,
  PROJECT_STATUSES,
  PROJECT_TRANSITIONS,
  ROLES,
} from '@archiflow/shared';
import { describe, expect, it } from 'vitest';
import fr from './locales/fr.json';

function has(key: string): boolean {
  let node: unknown = fr;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object' || !(part in node)) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string';
}

/** Une clé plurielle (count) existe sous ses formes _one / _other. */
const hasOrPlural = (key: string) => has(key) || (has(`${key}_one`) && has(`${key}_other`));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const src = resolve(__dirname, '..');

describe('traductions (ENF-03)', () => {
  it('chaque t(\'clé\') littéral du code existe dans fr.json', () => {
    const missing: string[] = [];
    for (const file of sourceFiles(src)) {
      for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z][\w.-]*)'/g)) {
        if (!hasOrPlural(m[1]!)) missing.push(`${m[1]} (${file.slice(src.length + 1)})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('chaque statut, rôle, catégorie et libellé de transition est traduit', () => {
    for (const s of PROJECT_STATUSES) expect(has(`status.${s}`), s).toBe(true);
    for (const r of ROLES) {
      expect(has(`roles.${r}`), r).toBe(true);
      expect(has(`portal.${r}.title`), r).toBe(true);
    }
    for (const c of EQUIPMENT_CATEGORIES) expect(has(`equipment.category.${c}`), c).toBe(true);
    for (const t of PROJECT_TRANSITIONS) expect(has(t.labelKey), t.labelKey).toBe(true);
  });

  it('chaque message de validation des schémas partagés est une clé traduite', () => {
    const sharedSrc = resolve(src, '..', '..', 'packages', 'shared', 'src');
    const keys = sourceFiles(sharedSrc).flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(/'(validation\.[\w.]+)'/g)].map((m) => m[1]!),
    );
    expect(keys.length).toBeGreaterThan(10);
    expect(keys.filter((k) => !has(k))).toEqual([]);
  });

  it('chaque code d’erreur de l’API a un message', () => {
    const backendErrors = readFileSync(resolve(src, '..', '..', 'backend', 'src', 'common', 'errors', 'app-error.ts'), 'utf8');
    const block = backendErrors.slice(backendErrors.indexOf('ERROR_CODES'), backendErrors.indexOf('} as const'));
    const codes = [...block.matchAll(/^\s+([A-Z_]+):/gm)].map((m) => m[1]!);
    expect(codes.length).toBeGreaterThan(5);
    expect(codes.filter((c) => !has(`errors.${c}`))).toEqual([]);
  });
});
