# Architecture cible — Phase 0, point 6

*Version 3 — projet reconstruit à neuf. L'ancien code est conservé en référence et ne
contraint plus aucune décision.*

**Statut du document.**
Ce n'est plus une cible conditionnelle : c'est **l'architecture de référence du projet**.
Les points 1 à 5 et 7 de la Phase 0 (audit de l'existant, dettes, plan de migration Prisma)
sont **sans objet** — il n'y a rien à migrer, le schéma est conçu proprement dès la première
migration.

**Ce qui reste imposé** : NestJS + Prisma + PostgreSQL côté serveur, React + Vite +
TypeScript + Tailwind + React Flow + Zustand côté client. Cette stack est documentée dans le
rapport de projet et n'est pas rediscutée ici.

**Ce qui reste ouvert** : les douze arbitrages de `DECISIONS-OUVERTES.md`. La reconstruction
à neuf les rend plus faciles à trancher, pas moins nécessaires — plusieurs (D-01, D-02, D-09)
déterminent la toute première migration Prisma et ne se rattrapent pas après coup.

---

## 6.1 Vue d'ensemble

Monorepo, trois processus à l'exécution.

```
┌──────────────┐        HTTPS / REST /api/v1        ┌──────────────┐
│  web (Vite)  │ ─────────────────────────────────▶ │  api (Nest)  │
│  React + TS  │ ◀───────────────────────────────── │  TypeScript  │
└──────────────┘     WebSocket (préparé, Phase 10)  └──────┬───────┘
                                                            │ Prisma
                                                    ┌───────▼───────┐
                                                    │  PostgreSQL   │
                                                    │  Docker :5433 │
                                                    └───────────────┘
```

Un quatrième élément, **non-processus mais structurant** : le paquet partagé
`packages/shared` — tranché (**D-02**, ADR 0002). Il contient le **schéma Zod du document
d'architecture**, les **types** qui en sont dérivés par `z.infer`, et les **fonctions pures** :
capacité, compatibilité, validation IP/CIDR, matrice de permissions.

**Zéro dépendance externe, avec une exception unique : Zod.** Le schéma est défini une seule
fois ; frontend et backend valident avec le même. Les types ne peuvent pas diverger de la
validation, puisqu'ils en sont dérivés.

Le partage n'est pas une commodité, c'est le mécanisme qui rend D-03 possible : le frontend
exécute ces fonctions pour un retour instantané, le backend les réexécute à la sauvegarde et
**fait autorité**. Une seule implémentation, donc aucune divergence possible entre ce que
l'utilisateur voit et ce que le serveur accepte.

Le `docker-compose.yml` est réécrit avec le projet. Le port hôte `5433` est conservé —
il évite le conflit avec une instance PostgreSQL locale sur `5432` et figure déjà dans la
documentation du rapport de projet. Identifiants et nom de base passent par un `.env`
non versionné, avec un `.env.example` versionné.

---

## 6.2 Backend NestJS — couches

Quatre couches, dépendances dirigées vers l'intérieur uniquement.

```
modules/        ← frontière HTTP : controller, DTO, guards, mapping
  └── services/ ← orchestration applicative : transactions, événements, audit
      └── repositories/ ← accès Prisma, et rien d'autre
domain/         ← règles métier PURES : pas de Nest, pas de Prisma, pas d'I/O
```

**La règle qui compte : `domain/` ne dépend de rien.** Pas de décorateur Nest, pas
d'injection, pas de `PrismaClient`, pas de `Date.now()` non injecté. Ce sont des fonctions
et des types. Conséquence directe : les calculs de capacité, de ports, de coûts, la
validation CIDR, la compatibilité et la matrice de permissions se testent sans base de
données et sans démarrer Nest — ce sont précisément les fonctions listées comme prioritaires
dans les critères de recette.

### Modules applicatifs

| Module | Responsabilité |
|---|---|
| `auth` | Inscription, connexion, refresh, mot de passe oublié, rate limiting |
| `users` | Comptes, profils, activation / désactivation, changement de rôle |
| `organizations` | Organisations, rattachement des utilisateurs, profils clients |
| `projects` | Projets, machine à états, affectations |
| `requests` | Expression du besoin client (brouillon multi-étapes, soumission) |
| `catalog` | Fabricants, marques, catégories, modèles, import |
| `architecture` | Document d'architecture, éléments, connexions, zones |
| `versions` | Versionnage, diff sémantique, restauration, publication |
| `sizing` | Dimensionnement — expose `domain/sizing` |
| `validation` | Compatibilité et anomalies — expose `domain/validation` |
| `ipam` | Réseaux, sous-réseaux, VLAN, adresses, détection de conflits |
| `physical` | Bâtiments, étages, salles, racks, positions U |
| `bom` | Nomenclature dérivée du document |
| `costs` | Estimation matériel, licences, services, mise en œuvre |
| `reports` | PDF, exports secondaires |
| `collaboration` | Commentaires, mentions, annotations |
| `notifications` | Création, lecture, préférences |
| `audit` | Journal d'audit (ENF-07) |
| `ai` | `AIService`, chatbot client |

### Éléments transverses

- **Guards**, dans cet ordre : `JwtAuthGuard` → `RolesGuard` → `OrgScopeGuard` →
  `ClientScopeGuard` → `ProjectAccessGuard`. Les deux Guards de portée **se composent**
  (D-09) ; le dernier vérifie que l'utilisateur est affecté au projet visé, avec le rôle
  projet adéquat.
- **Interceptor d'audit** : déclenché par un décorateur `@Audited('project.assign')`, il
  journalise acteur, action, cible, diff, horodatage. Pas d'appel manuel dispersé.
- **Filtre d'exception** unique produisant une enveloppe d'erreur stable.
- **Pipe de validation Zod** pour les DTO, adossé aux schémas de `packages/shared`.
  `class-validator` n'est pas utilisé : une seule grammaire de validation dans tout le
  projet, backend et frontend confondus (D-02).
- **Helmet**, CORS restreint, `@nestjs/throttler` sur `/auth/*`.

### Isolation — deux niveaux de portée, tranché (D-09)

ENF-06 impose le mode multi-organisations. Le modèle retenu distingue **le locataire** et
**le client final** :

| Niveau | Champ | Porté par | Signification |
|---|---|---|---|
| Locataire | `organizationId` | **toutes** les entités | L'entreprise d'intégration qui exploite la plateforme |
| Client final | `clientCompanyId` | les **projets** | Le client est une entité *dans* le locataire, pas une organisation séparée |

Règle d'accès qui en découle :

- Un utilisateur **`CLIENT`** ne voit que les projets portant **son** `clientCompanyId`.
- Les **rôles internes** (`ADMIN`, `PROJECT_MANAGER`, `ENGINEER`, `ARCHITECT`, `SALES`) voient
  tous les projets de **leur** `organizationId`, sous réserve de leurs affectations.

Deux Guards qui se composent, plus un filet :

1. **`OrgScopeGuard`** — injecte `organizationId` dans la portée de la requête. S'applique à
   tout le monde, sans exception.
2. **`ClientScopeGuard`** — n'a d'effet que pour le rôle `CLIENT` : il restreint en plus au
   `clientCompanyId` de l'utilisateur. Pour les rôles internes, il est transparent.
3. **Filet Prisma** — une extension du client qui **rejette** au runtime toute requête sur un
   modèle marqué « org-scoped » dont le `where` ne porte pas `organizationId`. Une erreur de
   développeur devient une exception bruyante, pas une fuite silencieuse.

Les repositories reçoivent un `AuthContext { userId, organizationId, clientCompanyId?, role }`
et étendent `OrgScopedRepository`, qui applique la portée — aucun `where` recopié à la main.

**Tests d'isolation, deux suites distinctes** :

- Un utilisateur du locataire 1 tente de lire chaque ressource du locataire 2 → `404`.
- Un `CLIENT` de la société A tente de lire un projet de la société B, **dans le même
  locataire** → `404`.

Dans les deux cas `404`, jamais `403` : un `403` confirmerait l'existence de la ressource.
Le second test est le plus facile à oublier et le plus embarrassant à rater en démonstration.

---

## 6.3 Frontend React

- **`app/`** : routeur, providers, thème, i18n, garde d'authentification.
- **`features/`** : tranches verticales, une par portail et par domaine fonctionnel.
- **Routage par rôle** : après connexion, le backend renvoie le rôle et le frontend redirige
  vers `/admin`, `/client`, `/engineer`, `/architect`, `/pm` ou `/sales`. Le rôle sert
  **uniquement** à l'affichage et à la navigation ; toute décision d'autorisation est
  re-vérifiée côté serveur.

### Répartition de l'état — la règle à ne pas violer

| Nature de l'état | Outil | Exemple |
|---|---|---|
| État serveur | **TanStack Query** | projets, catalogue, versions, notifications |
| État d'édition local | **Zustand** | document en cours d'édition, sélection, outil actif, viewport, pile undo/redo |
| État de formulaire | **React Hook Form + Zod** | formulaire de besoin client |
| Préférence d'affichage | `localStorage` via un petit store | thème, langue, panneaux repliés |

Le piège à éviter : **deux sources de vérité pour le document d'architecture**. La règle
retenue est qu'à l'ouverture du designer, le document chargé par TanStack Query est copié
**une fois** dans le store d'édition, qui devient la seule source de vérité tant que
l'éditeur est monté. La sauvegarde est une mutation explicite qui crée une version et
ré-invalide le cache. Pas de synchronisation bidirectionnelle permanente.

Zustand fait partie de la stack imposée. La répartition ci-dessus définit **son périmètre** :
il porte l'état d'édition du designer, pas l'état serveur. Confondre les deux est l'erreur qui
rend un éditeur graphique impossible à déboguer.

---

## 6.4 Modèle de données cible

### Le point central : comment stocker une architecture — **tranché (D-01)**

**Modèle hybride à deux étages.**

| Étage | Support | Rôle |
|---|---|---|
| Version de travail courante | Tables normalisées `ArchitectureElement`, `ArchitectureConnection`, `ArchitectureZone`, avec **clé étrangère réelle** vers `EquipmentModel` | Ce que le designer lit et écrit |
| Versions sauvegardées | `ArchitectureVersion.snapshot` — **JSONB immuable** | Historique, comparaison, restauration |

Le normalisé garantit l'intégrité référentielle et permet les agrégations BOM et coûts par
simple jointure. Le snapshot rend la restauration et le diff **auto-porteurs**, indépendants
du schéma courant.

Concrètement :

- Le BOM est un `GROUP BY` avec jointure sur `EquipmentModel`, pas un parcours de JSON.
- Un élément ne peut pas référencer un modèle inexistant : la base le refuse.
- Une version de l'an dernier reste lisible même si le schéma a évolué depuis.

La forme `{ elements, connections, zones }` de la contrainte 0.4 du brief reste le **contrat
d'API** et le format du snapshot ; les tables normalisées en sont la persistance. Le paquet
partagé travaille sur cette forme, pas sur les tables.

### Quatre conséquences à assumer

1. **`EquipmentModel` ne se supprime jamais physiquement** — tranché (D-13, ADR 0008).
   Suppression logique via `archivedAt` : le modèle **reste lisible** dans les architectures
   existantes mais **ne peut plus être ajouté** à une nouvelle conception. La palette du
   designer filtre sur `archivedAt IS NULL` ; les éléments existants affichent un marqueur
   « modèle archivé ». L'administration du catalogue propose « Archiver », pas « Supprimer ».
2. **Sauvegarder est une transaction unique** : mise à jour des tables normalisées **et**
   insertion du snapshot. Jamais deux appels séparés — un échec entre les deux laisserait un
   historique qui ment.
3. **Restaurer crée une nouvelle version, n'écrase jamais.** On relit le snapshot, on réécrit
   les tables normalisées, on insère une nouvelle `ArchitectureVersion` marquée comme
   restauration de la version *n*. L'historique n'est jamais amputé.
4. **Un snapshot est réellement auto-porteur** : il embarque les caractéristiques du modèle au
   moment du figeage — référence, ports, débit, hauteur U, budget PoE, **prix indicatif**.

   **Le motif est métier, pas technique.** Les prix évoluent. Régénérer le BOM d'une version
   validée doit redonner le chiffrage validé **à l'époque**, pas celui d'aujourd'hui : sans
   figeage, une proposition commerciale acceptée par un client deviendrait irreproductible dès
   la première mise à jour du catalogue, et le montant sur lequel il s'est engagé ne serait
   plus justifiable. La duplication entre snapshot et catalogue n'est donc pas une redondance
   à éliminer — c'est la condition pour que l'historique commercial ait une valeur.

### Entités par domaine

```
Identité       User · Organization · ClientCompany · ClientProfile · Session/RefreshToken
Autorisation   Role (enum) · ProjectAssignment (rôle projet) · PermissionMatrix (code, pas table)
Projet         Project · ProjectRequest · ProjectStatusHistory · ProjectTask
Besoin         RequestBuilding · RequestDepartment · RequestServerNeed · RequestNetworkNeed …
Physique       Site · Building · Floor · Room · Rack · RackUnit(dérivé)
Catalogue      EquipmentManufacturer · EquipmentBrand · EquipmentCategory · EquipmentModel
Architecture   Architecture · ArchitectureElement · ArchitectureConnection · ArchitectureZone
               · ArchitectureVersion (snapshot JSONB immuable)
Réseau         Network · Subnet · Vlan · IpAllocation
Chiffrage      Bom · BomItem · CostEstimate · CostLine
Collaboration  Comment · Annotation · Notification · Document
Traçabilité    AuditLog
```

Notes de conception :

- `EquipmentModel.metadata` en **JSONB** : c'est ce qui permet d'ajouter une marque ou une
  caractéristique sans migration ni modification du code métier (exigence section 3).
  Les champs qui **alimentent les moteurs** (ports, débit, budget PoE, consommation, U,
  interfaces, protocoles) restent des colonnes typées, pas du JSON — on ne calcule pas sur
  du non-typé.
- `PermissionMatrix` est **du code**, pas une table — tranché (**D-04**) : une matrice
  `(rôle × permission)` dans un fichier unique, versionnée avec le dépôt, testée
  unitairement, exposée par des décorateurs NestJS. Pas de table `Permission` : migrations et
  écran d'administration pour une flexibilité sans usage réel. Migrable plus tard si le besoin
  apparaît.
- Index PostgreSQL à prévoir dès la création : `Project(organizationId, status)`,
  `Project(clientCompanyId, status)`, `ProjectAssignment(userId)`,
  `ArchitectureElement(architectureId)`, `ArchitectureElement(equipmentModelId)`,
  `ArchitectureVersion(architectureId, createdAt DESC)`,
  `AuditLog(organizationId, createdAt DESC)`, `EquipmentModel(categoryId, brandId)`,
  `Notification(userId, readAt)`.
- **Champs imposés par ENF-02, à poser dès la première migration** — les rétro-ajouter
  coûterait une migration de données sur des tables déjà peuplées :
  `User.deletedAt`, `User.anonymizedAt`, `User.lastLoginAt`, `ClientProfile.deletedAt`,
  `RefreshToken.tokenHash` / `expiresAt` / `revokedAt`. Détail en **§6.12**.
- **Pas de table `Consent`.** La base légale des traitements est l'exécution du contrat et
  l'intérêt légitime, pas le consentement : une table de consentement serait du décor.
- **Aucune migration héritée.** Le schéma est conçu à neuf, et les trois décisions qui
  structuraient la première migration — D-01 (stockage), D-02 (paquet partagé), D-09
  (tenancy) — sont **tranchées**. Elle peut donc être écrite complète dès la Phase 1.
- **`prisma migrate`, jamais `prisma db push`**, y compris en développement et y compris au
  tout début. `db push` ne laisse aucune trace : dès le deuxième développeur ou le premier
  déploiement, l'historique manquant se paie. Migrations nommées, versionnées avec le code.

---

## 6.5 RBAC

### Deux niveaux distincts

1. **Rôle global** porté par `User.role` : `ADMIN`, `PROJECT_MANAGER`, `ENGINEER`,
   `ARCHITECT`, `SALES`, `CLIENT` (`VIEWER` plus tard). Il détermine le portail.
2. **Rôle projet** porté par `ProjectAssignment` : un ingénieur n'a de droits que sur les
   projets auxquels il est affecté. Le rôle global ouvre une porte, l'affectation ouvre la
   pièce.

### Mécanisme

Une fonction pure, nommée d'après le diagramme de séquence « API gestion des comptes » :

```ts
// domain/rbac/check-permissions.ts
checkPermissions(ctx: AuthContext, action: Action, resource: ResourceRef): PermissionResult
```

Utilisée par un décorateur `@RequirePermission('project.changeStatus')` et un
`PermissionsGuard`. Le frontend importe **la même fonction** depuis `packages/shared` pour
griser les boutons — confort d'interface uniquement, jamais une autorité.

Règle du diagramme respectée telle quelle : le changement de rôle passe par
`checkPermissions(token, "ADMIN")`, et le refus renvoie « Permissions insuffisantes ».

### Règle de sécurité issue du diagramme d'authentification

`[mot de passe invalide]` et `[compte introuvable]` renvoient **le même message générique
« Identifiants incorrects »**, le même code HTTP et un temps de réponse comparable — une
comparaison bcrypt factice est exécutée quand le compte n'existe pas, sans quoi l'écart de
latence trahit l'existence du compte.

---

## 6.6 Machine à états du projet

Une **table de transitions** unique, pas des `if` dispersés.

```ts
// domain/workflow/project-state-machine.ts
const TRANSITIONS: Transition[] = [
  { from: 'DRAFT',              to: 'SUBMITTED',          roles: ['CLIENT'] },
  { from: 'SUBMITTED',          to: 'PENDING_ASSIGNMENT', roles: ['ADMIN'] },
  { from: 'PENDING_ASSIGNMENT', to: 'ASSIGNED',           roles: ['ADMIN'], guard: hasEngineerAndArchitect },
  { from: 'ASSIGNED',           to: 'ENGINEERING',        roles: ['ENGINEER'] },
  { from: 'ENGINEERING',        to: 'ARCHITECTURE',       roles: ['ENGINEER', 'PROJECT_MANAGER'] },
  { from: 'ARCHITECTURE',       to: 'INTERNAL_REVIEW',    roles: ['ARCHITECT'] },
  { from: 'INTERNAL_REVIEW',    to: 'COMMERCIAL_REVIEW',  roles: ['PROJECT_MANAGER'] },
  { from: 'INTERNAL_REVIEW',    to: 'ARCHITECTURE',       roles: ['PROJECT_MANAGER'], reverse: true },
  { from: 'COMMERCIAL_REVIEW',  to: 'CLIENT_REVIEW',      roles: ['SALES'] },
  { from: 'CLIENT_REVIEW',      to: 'CLIENT_COMMENTS',    roles: ['CLIENT'] },
  { from: 'CLIENT_REVIEW',      to: 'CLIENT_APPROVED',    roles: ['CLIENT'] },
  { from: 'CLIENT_COMMENTS',    to: 'REVISION',           roles: ['PROJECT_MANAGER'], reverse: true },
  { from: 'REVISION',           to: 'ARCHITECTURE',       roles: ['ARCHITECT'],       reverse: true },
  { from: 'CLIENT_APPROVED',    to: 'COMPLETED',          roles: ['PROJECT_MANAGER', 'ADMIN'] },
]
```

### Retours en arrière — tranché (D-07)

Les retours sont **autorisés mais nommés**. Il n'existe aucun retour arbitraire : une
transition inverse n'est possible que si elle figure explicitement dans la table, avec son
rôle autorisé. Trois seulement sont déclarées, marquées `reverse: true` ci-dessus, et elles
forment la boucle de correction `CLIENT_COMMENTS → REVISION → ARCHITECTURE`.

Toute transition `reverse` impose deux contraintes supplémentaires :

- **Motif obligatoire.** `applyTransition` refuse une transition inverse sans texte de motif.
  Ce n'est pas un champ de confort : c'est ce qui rend l'historique d'un projet relisible
  six mois plus tard.
- **Entrée d'audit systématique**, motif inclus.

**Depuis `CLIENT_APPROVED`, aucun retour.** Une architecture validée par le client ne se
rouvre pas : on crée une **nouvelle version**. C'est la règle qui protège la valeur juridique
de la validation client — sans elle, « approuvé » ne veut plus rien dire.

`applyTransition()` est le seul point d'entrée : il vérifie la transition, écrit
l'historique, émet l'entrée d'audit et déclenche les notifications. Aucun service n'écrit
`project.status` directement.

---

## 6.7 API

- REST, préfixe `/api/v1`, orientée ressources, documentée par `@nestjs/swagger`.
- **Authentification** : access JWT court (~15 min) en mémoire côté client, refresh token
  rotatif en cookie `httpOnly` `Secure` `SameSite=Strict`. Secrets en variables
  d'environnement.
- **Gestion des sessions (ENF-02)** : le refresh token n'est **jamais stocké en clair** en
  base — seul son hash l'est, comme un mot de passe. Rotation à chaque usage, détection de
  réutilisation d'un token déjà consommé valant révocation de toute la famille de tokens.
  TLS obligatoire, HSTS activé, redirection HTTP → HTTPS. Déconnexion = révocation serveur,
  pas seulement suppression côté client.
- **Pagination** uniforme `?page&pageSize` avec enveloppe `{ data, total, page, pageSize }`.
- **Erreurs** : `{ error: { code, message, details? } }`, `code` stable et traduisible côté
  client (ENF-03 — les messages ne sont pas figés en anglais dans le backend).

Endpoints principaux :

```
POST   /auth/register · /auth/login · /auth/refresh · /auth/logout · /auth/forgot · /auth/reset
GET    /me
GET    /users · POST /users · PATCH /users/:id · PATCH /users/:id/role
GET    /organizations · …
GET    /projects · POST /projects · GET /projects/:id
POST   /projects/:id/transitions          → applyTransition
POST   /projects/:id/assignments
GET    /requests/:id · PATCH /requests/:id (brouillon) · POST /requests/:id/submit
GET    /catalog/models?category=&brand=   (paginé, filtrable)
GET    /projects/:id/architecture
POST   /projects/:id/architecture/validate   → { compatible, issues[], capacity }
POST   /projects/:id/architecture/versions   → sauvegarde = nouvelle version
GET    /architectures/:id/versions/:a/diff/:b
GET    /projects/:id/sizing · POST /projects/:id/sizing/run
GET    /projects/:id/ipam/conflicts
GET    /projects/:id/bom · GET /projects/:id/costs
POST   /projects/:id/reports/pdf
GET    /notifications · GET /audit-logs
POST   /ai/chat
```

---

## 6.8 Stratégie du designer 2D

C'est la fonctionnalité centrale. Cinq principes.

**1. React Flow est un moteur de rendu, pas le modèle.**
Le modèle est le document décrit en 0.4 du brief. Une couche d'adaptation isole les deux :

```ts
toFlow(document, view): { nodes, edges }     // document → React Flow
applyFlowChange(document, change): Document  // interaction → document
```

Aucun composant ne lit `node.data` comme s'il s'agissait de la vérité. Sans cette couche, on
se retrouve enfermé dans le format de React Flow le jour où la 3D, le PDF ou le BOM ont
besoin des mêmes données — exactement ce que la contrainte 0.4 interdit.

**2. Trois vues, un seul document.**
*Logique*, *physique* et *plan réseau* sont **trois projections** : elles filtrent, regroupent
et positionnent différemment le même graphe. La vue physique lit `placement` ; les éléments
sans `placement` apparaissent dans un bac « non placés » plutôt que de disparaître
silencieusement.

Ces trois vues ne sont pas un confort d'interface : elles constituent **EF-205 — « Génération
de diagrammes détaillés : schéma logique, schéma physique, plan d'adressage »**, exigence de
priorité **Élevée**. Elles s'étalent sur les Phases 5, 6 et 8, et l'exigence ne peut être
close avant la fin de la Phase 8.

**3. Undo/redo par patchs inverses.**
Chaque mutation du document passe par Immer avec `produceWithPatches`, qui produit les patchs
directs et inverses. La pile d'historique stocke des patchs, pas des copies du document — ce
qui reste soutenable à plusieurs centaines d'éléments. Une action utilisateur = une entrée
d'historique (un déplacement à la souris est coalescé sur relâchement, pas 200 entrées).

**4. Validation à deux vitesses.**
Le retour visuel de compatibilité doit être immédiat ; l'autorité reste au serveur. Les
règles étant des fonctions pures dans `packages/shared`, le client les exécute en local à
chaque dépôt (retour < 50 ms) et le serveur les ré-exécute à la sauvegarde, faisant foi.

> **Tranché (D-03) — le diagramme de séquence est corrigé.** `verifierCompatibilite` et
> `calculerCapacite` s'exécutent **en local**, via `packages/shared`. Seul
> `sauvegarderProjet` traverse le réseau et revalide côté serveur, qui fait autorité.
> Motif : un aller-retour serveur à chaque glisser-déposer est incompatible avec ENF-01
> (< 2 s, plusieurs centaines d'éléments) et avec EF-106 (mise à jour temps réel du plan).
>
> **À faire sur le diagramme « Conception architecture »** : sortir `verifierCompatibilite` et
> `calculerCapacite` du bloc `loop`, où ils deviennent des appels internes au client, et les
> rattacher à `sauvegarderProjet` côté serveur. Les branches `alt [compatible]` /
> `alt [incompatible]` restent, mais se jouent localement. À présenter en soutenance comme
> une décision d'architecture — validation optimiste, autorité serveur — et non comme un
> raccourci d'implémentation.

**5. Performance (ENF-01).**
Nœuds mémoïsés, `onlyRenderVisibleElements`, mises à jour du store groupées via
`requestAnimationFrame` pendant le drag, flux animé sur les arêtes désactivé automatiquement
au-delà de 200 éléments et désactivable manuellement, palette du catalogue virtualisée.

---

## 6.9 Stratégie 3D

- **Chargée paresseusement**, dans un chunk de route dédié. React Three Fiber et Three.js ne
  figurent dans aucun bundle atteint depuis un tableau de bord (exigence explicite du brief).
- **Aucun modèle GLTF au départ.** Les équipements sont des géométries paramétriques
  construites depuis les dimensions du catalogue (hauteur U, largeur, profondeur) et colorées
  par le token de catégorie. C'est exact, léger, sans pipeline d'assets, et cohérent avec la
  2D par construction. Des modèles détaillés pourront remplacer les boîtes plus tard sans
  toucher au reste.
- **Instancing** pour les unités de rack et les équipements répétés ; niveau de détail piloté
  par le niveau de navigation : site → bâtiment → étage → salle → rack → équipement.
- **Sélection partagée** : la 3D lit et écrit le même store d'édition que la 2D. Sélectionner
  un switch en 2D puis basculer en 3D conserve la sélection et recadre la caméra dessus.
- La 3D est **en lecture et navigation** d'abord. L'édition 3D (déplacer un équipement dans
  un rack à la souris) est une extension, pas un prérequis.

---

## 6.10 Abstraction IA (chatbot)

```ts
interface AIService {
  chat(messages: ChatMessage[], ctx: AiContext): Promise<ChatReply>
}
```

- Le fournisseur est choisi par configuration ; aucun appel SDK hors de l'implémentation.
- `AiContext` est construit **côté serveur** à partir de l'`AuthContext` : le contexte envoyé
  au modèle est restreint aux données que l'utilisateur courant a le droit de lire, isolation
  d'organisation comprise. Le client ne choisit pas ce qui part vers le LLM.
- Les réponses du chatbot sont **consultatives** et affichées comme telles ; toute traduction
  en décision technique passe par l'ingénieur.

---

## 6.11 Préparation du temps réel

Sans l'implémenter maintenant, on évite de se fermer la porte :

- Toute mutation passe par une couche de commandes qui émet un événement de domaine.
- Une passerelle Socket.IO avec une room par projet est prévue ; en Phase 10 elle ne diffuse
  que **présence** et **invalidation de cache**, ce qui suffit à la collaboration décrite et
  ne demande aucune résolution de conflit.
- La co-édition caractère par caractère (CRDT / Yjs) reste hors périmètre et fait l'objet de
  la décision **D-05**.

---

## 6.12 Protection des données personnelles — ENF-02

### Cadrage retenu

Décidé, pas ouvert à arbitrage. Le principe directeur est la **proportionnalité** : les
mesures correspondent aux données réellement traitées, pas à un idéal de conformité.

**Données personnelles traitées**

| Catégorie | Données | Personnes concernées |
|---|---|---|
| Comptes | nom, prénom, e-mail, rôle, organisation de rattachement, date de dernière connexion | utilisateurs internes et clients |
| Contacts client | nom, e-mail, téléphone, fonction | interlocuteurs des organisations clientes |
| Traçabilité | identifiant de l'auteur, action, cible, horodatage | tous les utilisateurs |
| Contenus | commentaires, annotations, auteur des versions | tous les utilisateurs |

**Aucune donnée sensible** au sens de la loi 09-08 n'est traitée : ni santé, ni opinions, ni
appartenance, ni données bancaires. C'est ce constat qui justifie le niveau de mesures
ci-dessous — il doit figurer dans le registre, car il est la motivation de tout le reste.

### Mesures techniques

| Mesure | Choix | Pourquoi ce niveau |
|---|---|---|
| Mots de passe | **bcrypt**, coût ≥ 12 | Hachage non réversible. Ce n'est pas du chiffrement : un mot de passe ne se déchiffre jamais, même par l'exploitant. |
| Échanges | **TLS** obligatoire, HSTS, cookies `Secure` | Exigence explicite d'ENF-02. |
| Données au repos | **Chiffrement au niveau du volume PostgreSQL** | Couvre le modèle de menace réel : vol de disque, de sauvegarde ou d'instantané. |
| Chiffrement applicatif champ par champ | **Écarté** | Casserait l'index et la recherche sur l'e-mail, empêcherait le tri sur le nom, et ne protégerait de rien de plus : un attaquant ayant l'accès applicatif a de toute façon la clé. Coût réel, gain nul. |
| Sessions | Refresh tokens hachés, rotatifs, révocables | Voir §6.7. |
| Journalisation | Les logs applicatifs ne contiennent **jamais** de mot de passe, de token ni de corps de requête d'authentification | Un log est une copie non maîtrisée. |

### Impact sur le modèle de données — le point qui ne pouvait pas attendre

**L'effacement d'un utilisateur est une anonymisation, jamais un `DELETE`.**

ENF-02 (droit à l'effacement) et ENF-07 (historisation des versions et journal d'audit) se
contredisent frontalement si l'effacement est une suppression en cascade : supprimer un
architecte détruirait l'auteur de toutes ses versions d'architecture et la traçabilité de ses
actions. La résolution retenue :

```
anonymizeUser(id) :
  User.name       ← « Utilisateur supprimé »
  User.email      ← « supprimé+<id>@invalide.local »   (unicité préservée)
  User.anonymizedAt ← now()
  révocation de tous les RefreshToken
  → l'identifiant, les références et l'historique sont CONSERVÉS
```

L'audit garde une trace de *qui* a agi au sens d'un identifiant technique, sans plus porter
d'identité. C'est exactement ce que demandent les deux exigences prises ensemble.

Conséquence : `deletedAt` et `anonymizedAt` sont deux champs distincts. Le premier désactive
le compte (réversible), le second efface l'identité (irréversible).

### Durées de conservation

Proposition chiffrée, à valider par l'exploitant — c'est lui le responsable de traitement.

| Catégorie | Durée | Déclencheur |
|---|---|---|
| Compte utilisateur | Durée de la relation, puis **12 mois** d'inactivité | `lastLoginAt` |
| Contacts client | Durée du projet **+ 3 ans** | clôture du projet |
| Journal d'audit | **12 mois** glissants | `createdAt` |
| Refresh tokens | **30 jours** ; 7 jours pour les révoqués | `expiresAt` / `revokedAt` |
| Brouillons de demande non soumis | **12 mois** | dernière modification |
| Notifications | **6 mois** | `createdAt` |
| Versions d'architecture, BOM, rapports | Conservés avec le projet | — (données métier, auteur anonymisé le cas échéant) |

Ces durées sont des **constantes de code** dans `domain/retention/policies.ts`, pas une table
de configuration : elles doivent être relues en revue de code, pas modifiées silencieusement
en base.

Un worker quotidien `workers/retention.worker.ts` applique ces politiques. Il est idempotent
et journalise **des volumes, jamais des contenus** (« 143 notifications purgées »).

### Livrables documentaires

| Livrable | Contenu |
|---|---|
| `docs/REGISTRE-TRAITEMENTS.md` | Finalité, catégories de personnes, catégories de données, base légale, destinataires, durée, mesures de sécurité — une ligne par traitement |
| `docs/RETENTION.md` | Le tableau ci-dessus, tenu à jour avec le code |
| `docs/PROCEDURE-EFFACEMENT.md` | Qui peut demander, qui exécute, délai, effet technique exact, preuve d'exécution |

### Ce qui n'est pas du ressort de l'application

**La déclaration à la CNDP** est une obligation du **responsable de traitement**, c'est-à-dire
de l'organisation qui exploite la plateforme. Elle ne s'implémente pas : elle se fait. Elle
est mentionnée ici pour que personne ne la croie couverte par le code, et le registre des
traitements est précisément le document qui sert à la préparer.

---

## 6.13 Sauvegarde, disponibilité et reprise — ENF-04

### Ce que « 99,5 % » veut dire concrètement

99,5 % de disponibilité autorise **3 h 39 min d'indisponibilité par mois**. C'est un budget
confortable : il est atteignable **en mono-instance**, avec une fenêtre de maintenance
mensuelle, sans cluster ni bascule automatique. Viser de la haute disponibilité ici serait
dépenser pour un besoin que le CDC n'exprime pas.

### Cibles chiffrées

Provisoires, à confirmer avec l'exploitant.

| Indicateur | Cible initiale | Cible à terme |
|---|---|---|
| **RPO** (perte de données maximale) | **24 h** — sauvegarde logique quotidienne | **15 min** si archivage WAL activé |
| **RTO** (délai de remise en service) | **4 h** — restauration manuelle documentée | 1 h avec procédure scriptée |
| Disponibilité | 99,5 % | inchangé |

### Stratégie de sauvegarde

1. **`pg_dump -Fc` quotidien à 02:00**, déclenché par un service dédié du `docker-compose`
   ou une tâche planifiée de l'hôte.
2. **Rétention GFS** : 7 quotidiennes, 4 hebdomadaires, 12 mensuelles.
3. **Copie hors machine** — second volume, NAS ou stockage objet. Une sauvegarde sur le même
   disque que la base ne protège de rien : elle meurt avec elle.
4. **Dumps chiffrés**, puisqu'ils contiennent l'intégralité des données personnelles
   (cohérence avec §6.12).
5. **Dump systématique avant chaque migration Prisma en production**, sans exception.
6. **Restauration testée trimestriellement** : `pg_restore` sur une base jetable, puis script
   de vérification — comptes de lignes par table, ouverture d'un projet, rendu d'une
   architecture. Une sauvegarde jamais restaurée n'est pas une sauvegarde, c'est une
   supposition.

### Supervision minimale

- Endpoint `/health` vérifiant la base, l'espace disque et l'âge de la dernière sauvegarde.
- **Alerte sur échec de sauvegarde.** Sans elle, la panne se découvre le jour de la
  restauration, c'est-à-dire le pire jour possible.

### Livrable documentaire

`docs/RUNBOOK-RESTAURATION.md` : la procédure pas à pas, écrite pour être suivie sous
pression par quelqu'un qui ne l'a pas rédigée, avec la date du dernier test réussi en
en-tête.

### Ce qui reste à l'exploitant

Choix de l'hébergement, redondance matérielle, plan de reprise sur site distant, et
engagement de disponibilité de l'infrastructure sous-jacente. L'application fournit les
moyens ; elle ne fournit pas l'exploitation.
