# ArchiFlow — règles permanentes

Contexte complet dans `docs/` : commencer par `ARCHITECTURE-CIBLE.md`, `docs/ADR/` (ADR
acceptés = référence, contradiction → nouvel ADR, jamais une modification), `PHASES.md`,
`DECISIONS-OUVERTES.md`, `TRACABILITE.md`. Ne pas redemander ce contexte, il est dans le dépôt.

## Stack figée (ADR 0013, 0019)
NestJS 11.2 (CJS) · Prisma 7.10 + `@prisma/adapter-pg` (jamais 8.x-rc) · PostgreSQL 16 ·
React 19 + Vite 7 + Tailwind 4 (config CSS `@theme`, pas `tailwind.config.ts`) · Zustand ·
React Hook Form + Zod · TanStack Query · `packages/shared` en ESM (ADR 0011), zéro dépendance
hors Zod (ADR 0002) · Node ≥ 22.12 (`.nvmrc` : 24) · Vitest partout.

## Décisions clés à ne pas recontredire
- D-01 (ADR 0001) : document hybride — tables normalisées + `ArchitectureVersion.snapshot`
  JSONB immuable, figé au moment de la sauvegarde (prix compris).
- D-03 (ADR 0003) : validation/capacité en LOCAL via `packages/shared` ; seule la sauvegarde
  revalide côté serveur, qui fait autorité.
- D-04 (ADR 0004) : permissions en code (fichier unique testé), pas en base.
- D-09 (ADR 0006) : tenancy à 2 niveaux, `organizationId` partout + `clientCompanyId` sur les
  projets ; toute violation d'isolation répond `404`, jamais `403`.
- D-13 (ADR 0008) : catalogue = archivage (`archivedAt`), jamais de suppression physique.
- D-07 (ADR 0005) : retours de workflow nommés, motif obligatoire ; rien depuis
  `CLIENT_APPROVED`.
- D-14 (ADR 0010) : pas d'inscription publique, admin crée les comptes CLIENT,
  anti-énumération.
- Ouvertes, sans effet sur le code actuel : D-05 (Phase 10), D-12 (Phase 13),
  D-17 (env. local seulement).

## Conventions
- `domain/` (backend) ne dépend de rien (pas Nest, pas Prisma, pas I/O) — fonctions pures
  testables sans base ni serveur. Règle ESLint `no-restricted-imports` protège ça : ne pas
  contourner.
- Zod = seule grammaire de validation (DTO NestJS et formulaires). Pas de `class-validator`.
- Tokens couleur : uniquement `frontend/src/styles/tokens.css`, triplets HSL + hex en
  commentaire, enveloppe `hsl(var(--x))` conservée. Aucune couleur en dur dans un composant.
- État : TanStack Query = état serveur, Zustand = état d'édition local (jamais les deux pour
  la même donnée), RHF+Zod = formulaires, `localStorage` = préférences d'affichage seulement
  (toujours dans un try/catch — le stockage peut échouer en prod, pas seulement en test).

## Interdits permanents
- Ne jamais modifier une migration Prisma déjà commitée : toute correction = nouvelle migration.
- `prisma migrate` (dev en local, `deploy` en CI/non-interactif), jamais `db push`.
- Ne jamais déclarer une phase/fonctionnalité terminée sans avoir exécuté lint+typecheck+test+build réellement.
- Ne jamais lire ni afficher le contenu de `.env`.

## Vérifier (à la racine)
```
npm run lint && npm run typecheck && npm test && npm run build
```
DB de dev : `npm run db:up` (Docker, port 5433) puis `npm run db:migrate` — voir D-17 pour
l'alternative sans Docker. Les tests d'intégration backend vident `DATABASE_URL_TEST` : ne
jamais la faire pointer vers une base utile.

## Qualité visuelle (section 9 du brief)
Tout écran touché : hiérarchie des boutons, états focus/disabled/loading, états
vide/chargement/erreur, contraste WCAG AA (ADR 0012 — jetons `*-solid*`/`*-text` dédiés).
Fonctionnel mais visuellement brut = pas terminé.
