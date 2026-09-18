# Phases d'implémentation — Phase 0, point 9

> **Projet construit à neuf** ; l'ancien code n'existe plus (D-16). Il n'y a ni audit de
> l'existant ni plan de migration Prisma.
>
> La charge indiquée reste un ordre de grandeur relatif, pas un engagement de délai.
>
> **Aucune décision ne bloque les Phases 1 à 4.** Restent **D-11** (Phase 5), **D-05**
> (Phase 10), **D-12** (Phase 13) et **D-17** (base de développement, sans effet sur le code).

## Règle appliquée à chaque phase

Une phase n'est **terminée** que si les six points suivants sont vrais :

1. Le code est typé, sans `any` non justifié.
2. Les fonctions de domaine introduites ont des tests unitaires qui **passent**, lancés.
3. `build` backend et frontend passent, lancés.
4. Aucune fonctionnalité existante n'a régressé.
5. `docs/TRACABILITE.md` est mis à jour (statut + chemin d'implémentation).
6. Les décisions structurantes prises sont consignées dans `docs/ADR/`.

Sans exécution réelle des tests et du build, une phase est déclarée **en cours**, pas terminée.

---

## Phase 0 — Close

Livrables produits : `ARCHITECTURE-CIBLE.md`, `STRUCTURE-DOSSIERS.md`, `PHASES.md`,
`DECISIONS-OUVERTES.md`, `TRACABILITE.md`.

Les huit arbitrages structurants sont tranchés et documentés dans `docs/ADR/`.

---

## Phase 0.5 — Remise à niveau (une demi-journée)

*Dépend de : 0.*

- Rapatriement des livrables de Phase 0 dans `docs/`, premier commit.
- D-08 rouverte et close (ADR 0009) ; `TRACABILITE.md` v4 avec note d'écart.
- D-14 comptes CLIENT créés par l'administrateur (ADR 0010), D-15 paquet partagé en ESM
  (ADR 0011), D-16 ancien code abandonné.
- Trois diagrammes UML corrigés dans `docs/diagrams/` ; originaux conservés dans
  `docs/diagrams/source/`.
- Corrections de `packages/shared` : jeton de rafraîchissement hors JSON, catégories
  `workstation` et `wifi-controller`, `superRefine` complété, permission `request.read`,
  tests de la machine à états, liste blanche ESLint, sortie ESM.
- CI minimale (`build` + `test` + `lint`), `.nvmrc`.

---

## Phase 1 — Fondations

*Priorité CDC : MVP. Charge : élevée. Dépend de : rien — plus aucun arbitrage en attente.*

**Préalable — initialisation du projet** (une demi-journée, pas une phase) : monorepo,
`docker-compose.yml`, `.env.example`, TypeScript, ESLint avec la règle
`no-restricted-imports` protégeant `domain/`, Prettier, CI minimale lançant `build` + `test`.
Cette règle ESLint se pose **maintenant** : la remettre après trois modules revient à
corriger des dizaines d'imports.

- `styles/tokens.css` + configuration Tailwind, **avant tout composant** (section 9 du brief).
  Tokens en **triplets HSL, valeur hexadécimale en commentaire sur chaque ligne** ; enveloppe
  `hsl(var(--x))` conservée pour garder les modificateurs d'opacité Tailwind (D-10, ADR 0007).
- Installation de **shadcn/ui**, code copié dans le dépôt, variables CSS mappées sur les
  tokens. **Aucune seconde palette** : la vérification fait partie de la revue de phase.
- Primitives `components/ui` : Button dans ses 5 variantes et tous ses états (focus clavier,
  disabled, loading à largeur constante), Input, Dialog, Badge, Table, Skeleton, EmptyState,
  ErrorState, ConfirmDestructive — composants shadcn re-thémés là où ils existent, écrits à la
  main là où les specs du brief s'en écartent.
- **`packages/shared`** (D-02, ADR 0002) : workspaces npm, TypeScript composite, schéma Zod du
  document défini une fois, types dérivés par `z.infer`, pipe Zod côté NestJS. Règle de lint
  interdisant toute dépendance externe autre que Zod.
- **Première migration Prisma complète** : les tables normalisées `ArchitectureElement`,
  `ArchitectureConnection`, `ArchitectureZone` avec clé étrangère vers `EquipmentModel`, et
  `ArchitectureVersion.snapshot` en JSONB (D-01). Le designer ne les remplira qu'en Phase 5,
  mais le schéma est posé maintenant.
- Thème sombre par défaut + thème clair complet, `prefers-reduced-motion` respecté.
- i18n avec `fr.json` peuplé dès le premier écran.
- Auth complète conforme au diagramme de séquence : création de compte par l'administrateur
  (ADR 0010, pas d'inscription publique), connexion, refresh, changement de mot de passe,
  mot de passe oublié — message générique « Identifiants incorrects » dans les deux branches.
- Rôles, **matrice de permissions en code** dans un fichier unique testé unitairement (D-04),
  décorateurs NestJS.
- **Tenancy à deux niveaux** (D-09) : `organizationId` sur toutes les entités,
  `clientCompanyId` sur les projets, `OrgScopeGuard` et `ClientScopeGuard` composés, filet
  Prisma. **Deux suites de tests d'isolation** — entre locataires, et entre sociétés clientes
  d'un même locataire.
- Machine à états du projet (table de transitions + tests unitaires), avec les trois
  transitions inverses déclarées, motif obligatoire et audit (D-07).
- Journal d'audit via décorateur `@Audited`.
- Layouts et navigation des six portails, tableaux de bord vides mais avec leurs trois états.

**Ajouts imposés par ENF-02 — en Phase 1, pas en Phase 14** (voir `ARCHITECTURE-CIBLE.md` §6.12) :

- Champs de cycle de vie des données dès la première migration : `User.deletedAt`,
  `User.anonymizedAt`, `User.lastLoginAt`, `ClientProfile.deletedAt`,
  `RefreshToken.tokenHash` / `expiresAt` / `revokedAt`. Les rétro-ajouter plus tard
  imposerait une migration de données sur des tables peuplées.
- `anonymizeUser()` — effacement par anonymisation, jamais par `DELETE` en cascade, sans quoi
  ENF-02 détruirait l'historisation exigée par ENF-07.
- Constantes de rétention dans `domain/retention/policies.ts` + worker de purge quotidien.
- Sessions : refresh tokens hachés en base, rotatifs, révocables ; TLS et HSTS en
  configuration.
- Livrables documentaires : `REGISTRE-TRAITEMENTS.md`, `RETENTION.md`,
  `PROCEDURE-EFFACEMENT.md`.

**Ajout imposé par ENF-04** : sauvegarde `pg_dump` quotidienne opérationnelle **dès qu'il y a
des données à perdre**, et premier test de restauration effectué avant la fin de la phase.
Mettre en place les sauvegardes en Phase 14 reviendrait à travailler treize phases sans filet.

**Schéma et seed conçus à neuf.** L'enum de rôles est défini directement avec ses six valeurs
(`ADMIN`, `PROJECT_MANAGER`, `ENGINEER`, `ARCHITECT`, `SALES`, `CLIENT`) — plus de migration
d'enum, plus de compatibilité ascendante à préserver. Le seed crée un compte par rôle dès
cette phase ; il est rejouable et destructif sur une base de développement uniquement.

---

## Phase 2 — Portail client

*MVP. Charge : moyenne. Dépend de : 1.*

Formulaire multi-étapes (général, bâtiments, utilisateurs, services, serveurs, réseau,
sécurité, préférences matériel), sauvegarde en brouillon, barre de progression, reprise après
interruption. Soumission → transition `DRAFT → SUBMITTED`. Tableau de bord client,
consultation en lecture, commentaires.

**Règle d'UX à tenir** : le formulaire parle le langage du client, jamais celui du catalogue.

---

## Phase 3 — Portail administrateur

*MVP + V1. Charge : moyenne. Dépend de : 1.*

Comptes, rôles, organisations, sociétés clientes, projets, affectations, catalogue
(fabricants, marques, catégories, modèles), consultation des logs d'audit, tableau de bord
administrateur. Seed de catalogue réaliste, **prix et specs marqués `DEMO DATA`**.

**Archivage, pas suppression** (D-13, ADR 0008). L'écran d'administration du catalogue propose
« Archiver ». Un modèle archivé reste lisible dans les architectures existantes mais disparaît
de la palette du designer (`archivedAt IS NULL`). Aucun écran ne propose de suppression
définitive.

---

## Phase 4 — Moteur d'ingénierie

*V1. Charge : moyenne. Dépend de : 3 (le catalogue alimente les calculs).*

`domain/sizing/` : ports, switches, bande passante, Wi-Fi et points d'accès, puissance,
serveurs, stockage, capacité firewall, capacité des liens. **Fonctions pures, testées
unitairement en premier.** Chaque résultat expose le détail du calcul, jamais un nombre seul.
Portail ingénieur : besoin client → proposition de dimensionnement commentée.

---

## Phase 5 — Designer 2D ★

*MVP. Charge : très élevée — c'est le cœur du produit, il prend le temps qu'il faut.*
*Dépend de : 3.*

Document d'architecture et son schéma Zod, couche d'adaptation React Flow, drag & drop
(EF-101), icônes normalisées par type (EF-102), connexions étiquetées (EF-103), zoom, pan,
grille, snap, alignement, duplication, suppression, groupement, sélection multiple,
**undo/redo par patchs**, raccourcis clavier, annotations, zones logiques, sauvegarde
versionnée, inspecteur de propriétés.

**Ajout imposé par le lot MVP** : **EF-301 (export PDF) est en lot MVP**, alors que la Phase 12
est la dernière du plan. Un **PDF minimal** — schéma logique, légende, liste des équipements —
est donc livré **à la fin de cette phase**, puis enrichi en Phase 12. Cela avance la décision
**D-11** (technologie de génération PDF) de la Phase 12 à la Phase 5.

**EF-205** (« Génération de diagrammes détaillés : schéma logique, schéma physique, plan
d'adressage », priorité Élevée) démarre ici avec le schéma logique. Il se poursuit en Phase 6
(schéma physique) et Phase 8 (plan d'adressage) : **l'exigence ne peut pas être close avant la
fin de la Phase 8.**

La validation locale via `packages/shared` est en place depuis la Phase 1 (D-02, D-03) : cette
phase la branche sur le canvas, elle ne la réinvente pas.

Seul arbitrage restant à prendre avant de commencer : **D-11** (technologie de génération PDF).

---

## Phase 6 — Construction physique

*V1. Charge : moyenne. Dépend de : 5.*

Bâtiments, étages, salles, racks, position U. Lien physique ↔ logique via `placement`.
Vue physique comme projection du même document. Bac des éléments non placés.
C'est aussi le socle indispensable de la 3D (Phase 9).

---

## Phase 7 — Validation automatique

*V1 et V2. Charge : moyenne. Dépend de : 5, et de 6 pour les anomalies physiques.*

`verifyCompatibility`, `calculateCapacity`, détection de SPOF, boucle, absence de redondance,
incohérences VLAN et IP, sous-dimensionnement. Trois niveaux `CRITICAL` / `WARNING` / `INFO`.

**Chaque anomalie produit** : un titre lisible, une explication en français, les chiffres
concrets (requis vs disponible), l'action recommandée et, quand c'est possible, un bouton
d'action rapide. Un message sec type `SPOF detected` est un bug, pas un raccourci.

---

## Phase 8 — Adressage IP et VLAN

*V1. Charge : moyenne. Dépend de : 5.*

Réseaux, sous-réseaux, VLAN, CIDR, passerelles, DHCP, plages, équipements associés,
**détection des conflits et chevauchements**. Parsing et arithmétique CIDR testés
exhaustivement — c'est typiquement le code qu'on casse sans s'en apercevoir.

---

## Phase 9 — Vue 3D

*V2. Charge : élevée. Dépend de : 6.*

React Three Fiber en chunk paresseux. Géométries paramétriques depuis les dimensions du
catalogue, instancing, navigation site → bâtiment → étage → salle → rack → équipement,
sélection partagée avec la 2D, bascule fluide 2D ↔ 3D.

**Contrainte de performance non négociable** : la scène 3D n'est jamais chargée à l'ouverture
d'un tableau de bord.

---

## Phase 10 — Chef de projet, versions, collaboration

*V1. Charge : élevée. Dépend de : 5.*

Versionnage, **diff sémantique** (« + 2 switches, − 1 pare-feu »), restauration, historique.
Commentaires, mentions, annotations positionnées, droits fins. Notifications. Timeline et
Kanban, tâches, progression, risques. Passerelle WebSocket limitée à la présence et à
l'invalidation de cache.

---

## Phase 11 — Commercial

*V1. Charge : moyenne. Dépend de : 5, 10.*

BOM **dérivé du document**, jamais saisi à la main. Coûts matériel, licences, services, mise
en œuvre. Proposition commerciale, publication d'une version client, cycle
brouillon → revue interne → proposition → commentaires → révision → validation.

---

## Phase 12 — Rapports

*MVP pour le PDF, V1 et V2 pour le reste. Charge : élevée. Dépend de : 5, 6, 11.*

PDF d'architecture : informations client, schémas logique et physique, vue 3D si pertinent,
équipements, VLAN, adressage, recommandations, BOM, coûts. En-tête et logo personnalisables
(EF-305). Exports Excel, image, Word, Visio en points d'extension (EF-306).

**Contrainte de lisibilité** : le PDF s'imprime en noir et blanc, donc aucun statut ni aucune
catégorie n'y est porté par la couleur seule.

---

## Phase 13 — Chatbot client

*Hors priorités CDC connues. Charge : moyenne. Dépend de : 3, 4.*

`AIService`, contexte construit côté serveur et limité aux données autorisées, appui sur le
catalogue et les règles de dimensionnement, détection des informations manquantes,
transmission à l'équipe technique. Positionné explicitement comme consultatif.

---

## Phase 14 — Durcissement

*Transverse. Charge : élevée. Dépend de : tout.*

Couverture de tests (unitaires, intégration, E2E du parcours complet client → admin →
ingénieur → architecte → chef de projet → commercial → client), revue de sécurité,
vérification des budgets de performance ENF-01, compatibilité navigateurs ENF-05 (Chrome,
Firefox, Edge, Safari), accessibilité et contraste WCAG AA, gestion d'erreurs, logging,
documentation, `TRACABILITE.md` final.

**ENF-04 — ce qui se vérifie ici et non ailleurs** : test de restauration complet chronométré
face aux cibles RPO 24 h / RTO 4 h, rédaction de `RUNBOOK-RESTAURATION.md`, et mise en place
de l'alerte sur échec de sauvegarde. Les sauvegardes elles-mêmes tournent depuis la Phase 1 ;
cette phase mesure si elles tiennent leurs promesses.

---

## Vue d'ensemble des dépendances

```
1 ──┬──► 2 ──────────────────────────────────┐
    │                                         │
    └──► 3 ──┬──► 4 ────────────────┐         │
             │                      │         │
             └──► 5 ★ ──┬──► 6 ──┬──► 9       │
                        │        │            │
                        ├──► 7 ◄─┘            │
                        ├──► 8                │
                        └──► 10 ──► 11 ──► 12 │
                                    │         │
                                    └──► 13 ◄─┘
                                          │
                                          ▼
                                         14
```

**Chemin critique** : 1 → 3 → 5 → 10 → 11 → 12. Tout retard sur la Phase 5 se propage à la
moitié du produit — d'où la consigne de ne pas la comprimer.
