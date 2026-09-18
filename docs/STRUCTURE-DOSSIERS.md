# Structure des dossiers cible — Phase 0, point 8

> **Projet reconstruit à neuf.** Cette arborescence est celle à créer, sans reprise ni
> rapprochement avec l'existant. L'ancien code reste consultable en référence ; il
> n'impose aucune convention.

---

## Racine

```
/
├── docker-compose.yml
├── package.json                  ← workspaces npm (racine, si D-02 = paquet partagé)
├── docs/
│   ├── TRACABILITE.md
│   ├── ARCHITECTURE-CIBLE.md
│   ├── PHASES.md
│   ├── DECISIONS-OUVERTES.md
│   └── ADR/
│       ├── 0001-document-architecture-jsonb.md
│       └── ...
├── packages/
│   └── shared/                   ← voir décision D-02
├── backend/
└── frontend/
```

---

## `packages/shared/` — types et règles pures partagés

Tranché en **D-02** (ADR 0002). Contrainte ferme : **zéro dépendance externe, sauf Zod**.

```
packages/shared/src/
├── architecture/
│   ├── document.schema.ts        ← Zod : elements, connections, zones, placement
│   └── types.ts                  ← dérivés par z.infer du schéma ci-dessus
├── catalog/                      ← types du catalogue consommés par les moteurs
├── rbac/
│   ├── actions.ts
│   └── check-permissions.ts      ← fonction pure, identique back et front
├── validation/
│   ├── compatibility.ts          ← verifyCompatibility()
│   ├── capacity.ts               ← calculateCapacity()
│   └── cidr.ts                   ← validation IP / CIDR
├── sizing/                       ← règles de dimensionnement (pures)
└── index.ts
```

Ce paquet ne contient **que** du TypeScript pur : ni Nest, ni React, ni Prisma, ni accès
réseau, et **aucune bibliothèque tierce en dehors de Zod**. C'est la condition pour que les
mêmes règles tournent des deux côtés sans duplication, et pour qu'il reste léger à charger
dans le navigateur.

Le schéma du document y est défini **une seule fois** ; les types en sont dérivés par
`z.infer` et ne peuvent donc pas diverger de la validation. Conséquence dans le backend :
`class-validator` n'est pas utilisé, les DTO sont validés par un pipe Zod.

À protéger par une règle de lint : le jour où une **deuxième** dépendance entre dans ce
paquet, le bénéfice s'évapore sans que personne ne s'en aperçoive.

---

## `backend/` — NestJS

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/               ← migrations nommées, jamais db push sur données existantes
│   └── seed/
│       ├── index.ts
│       ├── catalog.seed.ts       ← tous les prix et specs marqués DEMO DATA
│       ├── users.seed.ts         ← un compte par rôle
│       └── projects.seed.ts      ← un projet à chaque étape du workflow
├── test/
│   ├── integration/              ← auth, projets, affectations, catalogue
│   └── isolation/                ← isolation multi-organisations (suite dédiée)
└── src/
    ├── main.ts
    ├── app.module.ts
    │
    ├── core/                     ← infrastructure technique, pas de métier
    │   ├── config/               ← chargement et validation des variables d'env
    │   ├── prisma/               ← PrismaService + extension d'isolation org
    │   ├── logging/
    │   └── events/               ← bus d'événements de domaine
    │
    ├── security/
    │   ├── guards/               ← Jwt · Roles · OrgScope · ProjectAccess
    │   ├── decorators/           ← @Roles @RequirePermission @Audited @CurrentUser
    │   ├── hashing/              ← bcrypt/argon2, isolé derrière une interface
    │   └── tokens/               ← émission et rotation des JWT
    │
    ├── common/
    │   ├── dto/                  ← pagination, enveloppes
    │   ├── filters/              ← filtre d'exception unique
    │   ├── interceptors/         ← audit, logging
    │   └── pipes/                ← pipe de validation Zod
    │
    ├── domain/                   ← ★ CŒUR PUR — aucune dépendance framework
    │   ├── sizing/
    │   │   ├── ports.ts          ← calcul du nombre de ports et de switches
    │   │   ├── wifi.ts           ← nombre de points d'accès
    │   │   ├── bandwidth.ts
    │   │   ├── power.ts          ← puissance électrique, budget PoE
    │   │   ├── storage.ts
    │   │   └── explain.ts        ← construit le détail lisible du calcul
    │   ├── validation/
    │   │   ├── compatibility.ts  ← verifyCompatibility()
    │   │   ├── capacity.ts       ← calculateCapacity()
    │   │   ├── anomalies/        ← spof.ts · loop.ts · redundancy.ts · vlan.ts
    │   │   └── issue.ts          ← { level, titre, explication, chiffres, action }
    │   ├── ipam/
    │   │   ├── cidr.ts           ← parsing, validation, appartenance
    │   │   └── conflicts.ts      ← chevauchements et doublons
    │   ├── costing/
    │   ├── bom/
    │   ├── workflow/
    │   │   └── project-state-machine.ts
    │   └── rbac/                 ← ou ré-export depuis packages/shared
    │
    ├── modules/                  ← une tranche par domaine applicatif
    │   └── projects/
    │       ├── projects.module.ts
    │       ├── projects.controller.ts
    │       ├── projects.service.ts
    │       ├── projects.repository.ts
    │       └── dto/
    │
    └── workers/                  ← tâches longues : génération PDF, projections, e-mails
```

**Point de vigilance.** `domain/` ne doit importer ni `@nestjs/*`, ni `@prisma/client`.
C'est une règle qui se perd en trois semaines si personne ne la garde : elle est à outiller
par une règle ESLint `no-restricted-imports` dès la Phase 1, pas par de la discipline.

---

## `frontend/` — React + Vite

```
frontend/
├── index.html
├── tailwind.config.ts
└── src/
    ├── main.tsx
    ├── app/
    │   ├── router.tsx            ← routage par rôle + lazy loading
    │   ├── providers.tsx         ← Query, thème, i18n, toasts
    │   └── layouts/              ← un layout par portail
    │
    ├── styles/
    │   ├── tokens.css            ← ★ ÉCRIT EN PREMIER, avant tout composant
    │   └── globals.css
    │
    ├── i18n/
    │   ├── index.ts
    │   └── locales/fr.json       ← ar.json, en.json prévus (ENF-03)
    │
    ├── components/ui/            ← shadcn/ui copié dans le dépôt (D-10), re-thémé sur
    │                                tokens.css : Button, Input, Dialog, Badge, Table,
    │                                Skeleton, EmptyState, ErrorState…
    │                                Aucune valeur de couleur propre à shadcn ne subsiste.
    ├── components/patterns/      ← compositions réutilisées : PageHeader, DataTable,
    │                                StatCard, IssueCard, ConfirmDestructive
    │
    ├── features/
    │   ├── auth/
    │   ├── client/
    │   │   ├── dashboard/
    │   │   ├── request-wizard/   ← formulaire multi-étapes, brouillon, progression
    │   │   └── chatbot/
    │   ├── admin/                ← users · organizations · assignments · catalog · audit
    │   ├── engineer/             ← sizing, explications de calcul
    │   ├── architect/
    │   │   └── designer/         ← ★ cœur du produit
    │   │       ├── canvas/       ← intégration React Flow
    │   │       ├── nodes/        ← un composant par catégorie d'équipement
    │   │       ├── edges/        ← arêtes étiquetées (débit, protocole, type)
    │   │       ├── palette/      ← catalogue virtualisé, source du drag & drop
    │   │       ├── inspector/    ← panneau de propriétés de l'élément sélectionné
    │   │       ├── views/        ← logique · physique · plan-réseau (projections)
    │   │       ├── adapters/     ← toFlow() / applyFlowChange()
    │   │       ├── history/      ← undo/redo par patchs inverses
    │   │       └── store.ts      ← store d'édition Zustand
    │   ├── architect3d/          ← R3F, chunk séparé, jamais importé ailleurs
    │   ├── pm/                   ← timeline, kanban, coûts, versions
    │   └── sales/                ← BOM, chiffrage, proposition, publication
    │
    ├── api/                      ← client HTTP, endpoints typés, gestion du refresh
    ├── hooks/                    ← hooks TanStack Query par ressource
    ├── auth/                     ← contexte de session, garde de route
    ├── permissions/              ← miroir d'affichage de la matrice RBAC
    ├── types/
    └── utils/
```

---

## Conventions

| Sujet | Règle |
|---|---|
| Nommage fichiers | `kebab-case.ts`, composants React en `PascalCase.tsx` |
| Barrels | `index.ts` uniquement à la frontière d'une feature, jamais en profondeur |
| Imports croisés | Une feature n'importe pas dans une autre feature : elle passe par `components/`, `hooks/` ou `packages/shared` |
| Couleurs | Aucune valeur en dur dans un composant — tokens uniquement |
| Chaînes | Aucune chaîne visible en dur — clés i18n uniquement (ENF-03) |
| Tests | `*.spec.ts` à côté du code pour l'unitaire ; `test/` pour l'intégration et l'E2E |
| Fichiers fourre-tout | Interdits : pas de `utils.ts` global, pas de `helpers.ts` sans domaine |
