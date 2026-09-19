# ADR 0013 — Versions de la stack imposée

**Statut** : Accepté — 18/09/2026
**Référence registre** : D-19

## Contexte

La stack est imposée (NestJS, Prisma, PostgreSQL, React, Vite, TypeScript, Tailwind,
React Flow, Zustand). Restait à choisir les **versions majeures**, dont certaines venaient de
changer au moment de l'initialisation :

- **NestJS 12** est sorti le 27/08/2026, **ESM uniquement**. NestJS 11 reste maintenu
  (11.1.29 en août 2026, 11.2.5 à ce jour).
- Le tag `latest` du CLI **Prisma** pointe sur une release candidate (`8.0.0-rc.15`) ; la
  dernière version stable est **7.10.0**. Prisma 7 impose un adaptateur de pilote et un
  fichier `prisma.config.ts`.
- **Tailwind 4** se configure en CSS (`@theme`) et non plus par `tailwind.config.ts`.

## Décision

| Couche | Version | Motif |
|---|---|---|
| NestJS | **11.2** (CommonJS) | Mature, écosystème complet ; la 12 a trois semaines |
| Prisma | **7.10** + `@prisma/adapter-pg` | Dernière version stable ; client généré en CJS, imports `.js` |
| PostgreSQL | 16 | Conforme au `docker-compose.yml` |
| React | 19.3 | — |
| React Router | 7.18 | La v8 est récente ; la v7 couvre le besoin |
| Vite | 7.3 | Compatible avec Vitest 3 et `@vitejs/plugin-react` 5 |
| Tailwind | 4.3, configuration en CSS | La configuration vit dans `globals.css` (`@theme inline`) |
| Vitest | 3.2, partout | Un seul exécuteur de tests ; SWC pour les décorateurs NestJS |
| Hachage | `bcryptjs` 3 (bcrypt, coût 12) | Implémentation JS pure : aucune compilation native sous Windows |
| Node | ≥ 22.12 (`.nvmrc` : 24) | `require()` d'un module ESM (ADR 0011) |

## Conséquences

1. La migration vers NestJS 12 est un chantier identifié, à mener hors d'une phase
   fonctionnelle : elle impose un backend ESM (imports suffixés, `type: module`).
2. `backend/src/generated/` n'est pas versionné : `prisma generate` s'exécute dans `build` et
   `typecheck`.
3. Le brief mentionnait `tailwind.config.ts` ; avec Tailwind 4, son équivalent est le bloc
   `@theme` de `frontend/src/styles/globals.css`, qui ne fait que pointer vers `tokens.css`.
4. `class-validator` n'est pas utilisé : validation par les schémas Zod partagés (ADR 0002).
