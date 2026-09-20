// @vitest-environment node
/**
 * Garde du design system : tokens.css est la seule source des couleurs, ce test en garantit
 * la cohérence et l'accessibilité à chaque exécution.
 *
 *  1. chaque triplet HSL correspond à la valeur hexadécimale annoncée en commentaire (ADR 0007) ;
 *  2. chaque paire texte / fond de chaque thème atteint WCAG AA (4,5:1) ;
 *  3. l'anneau de focus atteint 3:1 sur les fonds (WCAG 1.4.11) ;
 *  4. le bloc `@media (prefers-color-scheme: dark)` reste identique au bloc sombre explicite
 *     (ADR 0015) — sans ce test, les deux peuvent diverger silencieusement au fil des éditions.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8');

type Tokens = Record<string, { hsl: [number, number, number]; hex: string }>;

function parseBlock(selector: string): Tokens {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`Bloc introuvable : ${selector}`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start));
  const tokens: Tokens = {};
  const re = /--([\w-]+):\s*(\d+)\s+(\d+)%\s+(\d+)%;\s*\/\*\s*(#[0-9A-Fa-f]{6})/g;
  for (const m of body.matchAll(re)) {
    tokens[m[1]!] = { hsl: [Number(m[2]), Number(m[3]), Number(m[4])], hex: m[5]!.toUpperCase() };
  }
  return tokens;
}

// Le thème clair est la valeur par défaut de `:root` : ce bloc porte aussi les jetons partagés
// (catégories d'équipement, rayons, écran de connexion). Le thème sombre ne redéclare que ce
// qui change ; le reste passe par la cascade normale des custom properties, reproduite ici par
// une fusion `{ ...clair, ...sombre }`.
const light = parseBlock(':root {');
const darkExplicit = parseBlock(":root[data-theme='dark'] {");
const themes = {
  clair: light,
  sombre: { ...light, ...darkExplicit },
};

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  const S = s / 100;
  const L = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)) as [number, number, number];
}

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

const BACKGROUNDS = ['bg-base', 'bg-surface', 'bg-elevated', 'bg-inset'];
const TEXTS = ['text-primary', 'text-secondary', 'text-muted'];
const SEMANTIC_TEXTS = ['primary-text', 'success-text', 'warning-text', 'high-text', 'critical-text', 'info-text'];
const SOLIDS = [
  'primary-solid',
  'primary-solid-hover',
  'primary-solid-active',
  'danger-solid',
  'danger-solid-hover',
  'danger-solid-active',
];

describe.each(Object.entries(themes))('thème %s', (_name, tokens) => {
  const hex = (name: string) => {
    const token = tokens[name];
    if (!token) throw new Error(`Jeton absent : --${name}`);
    return token.hex;
  };

  it('chaque triplet HSL correspond à sa valeur hexadécimale commentée', () => {
    for (const [name, token] of Object.entries(tokens)) {
      const [r, g, b] = hslToRgb(token.hsl);
      const [er, eg, eb] = hexToRgb(token.hex);
      // L'arrondi des triplets à l'unité admet quelques unités d'écart par canal.
      const drift = Math.max(Math.abs(r - er), Math.abs(g - eg), Math.abs(b - eb));
      expect(drift, `--${name} : hsl(${token.hsl.join(' ')}) ≠ ${token.hex}`).toBeLessThanOrEqual(4);
    }
  });

  it.each(TEXTS.flatMap((t) => BACKGROUNDS.map((b) => [t, b])))('%s sur %s ≥ 4,5:1', (text, bg) => {
    expect(contrast(hex(text), hex(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SEMANTIC_TEXTS.flatMap((t) => ['bg-base', 'bg-surface', 'bg-elevated'].map((b) => [t, b])))(
    '%s sur %s ≥ 4,5:1',
    (text, bg) => {
      expect(contrast(hex(text), hex(bg))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(SOLIDS)('texte blanc sur %s ≥ 4,5:1', (solid) => {
    expect(contrast(hex('on-solid'), hex(solid))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['bg-base', 'bg-surface', 'bg-elevated'])('anneau de focus sur %s ≥ 3:1', (bg) => {
    expect(contrast(hex('focus'), hex(bg))).toBeGreaterThanOrEqual(3);
  });

  it('primary employé comme texte sur primary-soft ≥ 4,5:1 (entrée active de la barre latérale)', () => {
    expect(contrast(hex('primary-text'), hex('primary-soft'))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('bascule système (prefers-color-scheme)', () => {
  it('le bloc media sombre reste identique au bloc [data-theme=\'dark\'] explicite (ADR 0015)', () => {
    const mediaStart = css.indexOf('@media (prefers-color-scheme: dark) {');
    expect(mediaStart, 'bloc media sombre introuvable').toBeGreaterThan(-1);
    const bodyStart = css.indexOf(":root:not([data-theme='light']) {", mediaStart);
    const body = css.slice(css.indexOf('{', bodyStart) + 1, css.indexOf('\n  }', bodyStart));
    const tokens: Tokens = {};
    const re = /--([\w-]+):\s*(\d+)\s+(\d+)%\s+(\d+)%;\s*\/\*\s*(#[0-9A-Fa-f]{6})/g;
    for (const m of body.matchAll(re)) {
      tokens[m[1]!] = { hsl: [Number(m[2]), Number(m[3]), Number(m[4])], hex: m[5]!.toUpperCase() };
    }
    expect(Object.keys(tokens).length, 'le bloc media semble vide — sélecteur mal détecté').toBeGreaterThan(10);
    expect(tokens).toEqual(darkExplicit);
  });
});

describe('couleurs de catégorie', () => {
  it('définit une couleur pour chaque catégorie du document d’architecture', async () => {
    const { EQUIPMENT_CATEGORIES } = await import('@archiflow/shared');
    for (const category of EQUIPMENT_CATEGORIES) {
      expect(light[`cat-${category}`], category).toBeDefined();
    }
  });
});
