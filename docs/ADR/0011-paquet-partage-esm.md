# ADR 0011 — Paquet partagé publié en ESM

**Statut** : Accepté — 18/09/2026
**Référence registre** : D-15
**Complète** : ADR 0002

## Contexte

`packages/shared` était compilé en CommonJS (`tsconfig.base.json` : `module: commonjs`). Vite
ne pré-compile pas un paquet lié en workspace : le navigateur recevrait du CJS qu'il ne sait
pas exécuter. Le backend NestJS, lui, reste en CommonJS.

## Décision

- `packages/shared` déclare `"type": "module"` et compile avec `module: nodenext` : sortie
  **ESM**, imports relatifs suffixés `.js`, champ `exports` explicite.
- Le frontend (Vite) le consomme nativement.
- Le backend (CommonJS) l'importe par `require()` d'un module ESM, pris en charge sans
  option par Node ≥ 20.19 / 22.12 et par TypeScript ≥ 5.8 en `module: nodenext`. Le paquet ne
  contient aucun `await` de premier niveau, condition de ce mécanisme.
- `engines.node` passe à `>=22.12`.

## Conséquences

1. Un seul format publié, pas de double compilation CJS + ESM à maintenir.
2. Interdiction ferme d'un `await` de premier niveau dans `packages/shared` : il casserait le
   `require()` côté backend. Le build backend échouerait immédiatement, la régression ne
   passerait pas inaperçue.
3. Node 20 antérieur à 20.19 n'est plus pris en charge.

## Alternative écartée

**Double sortie CJS + ESM** : deux configurations TypeScript, deux arbres `dist/`, et le risque
de charger deux instances du même module — pour un besoin que Node couvre désormais nativement.
