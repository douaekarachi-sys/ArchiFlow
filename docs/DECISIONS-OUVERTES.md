# Registre des décisions techniques

*Anciennement « décisions ouvertes ». Seize arbitrages sont tranchés, un est sans objet,
trois restent ouverts.*

| Réf. | Sujet | État | ADR | Bloque |
|---|---|---|---|---|
| D-01 | Stockage du document d'architecture | ✅ Tranché — hybride | [0001](ADR/0001-stockage-architecture-hybride.md) | — |
| D-02 | Paquet partagé et validation | ✅ Tranché — oui, Zod excepté | [0002](ADR/0002-paquet-partage-zod.md) | — |
| D-03 | Validation au glisser-déposer | ✅ Tranché — local + autorité serveur | [0003](ADR/0003-validation-locale-autorite-serveur.md) | — |
| D-04 | Permissions : code ou base | ✅ Tranché — code | [0004](ADR/0004-permissions-en-code.md) | — |
| D-05 | Périmètre du temps réel | 🕓 Ouvert | — | Phase 10 |
| D-06 | Migration de l'enum de rôles | ⛔ Sans objet | — | — |
| D-07 | Retours en arrière du workflow | ✅ Tranché — nommés et motivés | [0005](ADR/0005-retours-en-arriere-nommes.md) | — |
| D-08 | Priorité (§3) et lot (§8.1) du CDC | ✅ Rouverte puis tranchée — §8.1 pour le lot, §3 pour la priorité | [0009](ADR/0009-priorite-et-lot-du-cdc.md) | — |
| D-09 | Multi-tenancy | ✅ Tranché — deux niveaux | [0006](ADR/0006-tenancy-deux-niveaux.md) | — |
| D-10 | shadcn/ui, format des tokens | ✅ Tranché — re-thémé, tokens HSL | [0007](ADR/0007-shadcn-retheme-sur-tokens.md) | — |
| D-11 | Génération du PDF | ✅ Tranché — `@react-pdf/renderer`, serveur | [0017](ADR/0017-pdf-react-pdf-renderer.md) | — |
| D-12 | Fournisseur LLM du chatbot | 🕓 Ouvert | — | Phase 13 |
| D-13 | Suppression au catalogue | ✅ Tranché — archivage | [0008](ADR/0008-archivage-catalogue.md) | — |
| D-14 | Création des comptes CLIENT | ✅ Tranché — par l'administrateur, anti-énumération | [0010](ADR/0010-comptes-client-crees-par-admin.md) | — |
| D-15 | Format du paquet partagé | ✅ Tranché — ESM | [0011](ADR/0011-paquet-partage-esm.md) | — |
| D-16 | Ancien code et section 0.1 du brief | ✅ Tranché — abandonné, section retirée | — | — |
| D-17 | Base PostgreSQL de développement | 🕓 Ouvert | — | Environnement local |
| D-18 | Palette et contraste WCAG AA | ✅ Tranché — jetons ajoutés là où la palette échoue | [0012](ADR/0012-ajustements-contraste-palette.md) | — |
| D-19 | Versions de la stack | ✅ Tranché — NestJS 11, Prisma 7.10, Tailwind 4 | [0013](ADR/0013-versions-de-la-stack.md) | — |
| D-20 | Mot de passe et sessions | ✅ Tranché — 12 caractères, rotation, détection de réutilisation | [0014](ADR/0014-politique-mot-de-passe-et-sessions.md) | — |
| D-21 | Thème par défaut et couleur d'action | ✅ Tranché — clair par défaut, violet unique | [0015](ADR/0015-theme-clair-par-defaut-accent-violet.md) | — |

**Aucune décision ne bloque la Phase 1.** Restent D-05 (Phase 10), D-12 (Phase 13) et D-17
(environnement de développement, non bloquant pour le code).

Ce registre donne l'état ; les ADR portent le raisonnement. En cas de divergence, l'ADR fait
foi.

---

# Partie 1 — Décisions tranchées

## D-01 — Stockage du document d'architecture : **hybride**

**Décision.** La version de travail courante vit dans des **tables normalisées**
(`ArchitectureElement`, `ArchitectureConnection`, `ArchitectureZone`) avec **clé étrangère
réelle** vers `EquipmentModel`. Chaque version sauvegardée est **en plus** figée dans un
**snapshot JSONB immuable** porté par `ArchitectureVersion`.

**Motif.** Le normalisé garantit l'intégrité référentielle et permet les agrégations BOM et
coûts par jointure. Le snapshot rend la restauration et le diff de version auto-porteurs,
indépendants du schéma courant.

**Pourquoi le snapshot fige les caractéristiques du modèle — motif métier.** Les prix évoluent.
Régénérer le BOM d'une version validée doit redonner le chiffrage validé **à l'époque**, pas
celui d'aujourd'hui : sans figeage, une proposition acceptée par un client deviendrait
irreproductible dès la première mise à jour du catalogue. Ce n'est pas une optimisation de
lecture, et la duplication entre snapshot et catalogue n'est pas une redondance à éliminer.

**Conséquences** — détaillées dans `ARCHITECTURE-CIBLE.md` §6.4 :

1. `EquipmentModel` ne se supprime jamais physiquement → voir **D-13**.
2. Sauvegarder est une transaction unique : tables normalisées **et** snapshot.
3. Restaurer crée une nouvelle version, n'écrase jamais.
4. Le snapshot embarque les caractéristiques du modèle au moment du figeage, pas seulement
   son identifiant — sinon il redevient dépendant du catalogue courant et perd sa raison
   d'être.

---

## D-02 — Paquet partagé : **oui**

**Décision.** `packages/shared` contient les types et les **fonctions pures** — capacité,
compatibilité, validation IP/CIDR, matrice de permissions — avec **zéro dépendance externe**.
Le frontend les exécute pour un retour instantané ; le backend les réexécute à la sauvegarde
et **fait autorité**.

**Conséquences.** Workspaces npm et TypeScript composite à mettre en place dès l'initialisation
du projet. Une seule implémentation des règles métier, donc aucune divergence possible entre
ce que l'utilisateur voit et ce que le serveur accepte. C'est aussi ce qui rend D-03 réalisable.

**Règle à tenir** : la contrainte « zéro dépendance externe » n'est pas décorative. Le jour où
une dépendance y entre, le paquet devient difficile à charger côté navigateur et le bénéfice
s'évapore. À protéger par une règle de lint.

**Exception unique : Zod.** Le schéma du document d'architecture est défini **une seule fois**
dans le paquet ; les types TypeScript en sont dérivés par inférence (`z.infer`) ; frontend et
backend valident avec le même schéma. Aucune autre dépendance externe n'y entre.

Conséquence pratique : `class-validator` devient inutile. Les DTO NestJS sont validés par un
pipe Zod — **une seule grammaire de validation dans tout le projet**.

---

## D-03 — Validation au glisser-déposer : **locale, autorité serveur**

**Décision.** `verifierCompatibilite` s'exécute en local via le paquet partagé. Seul
`sauvegarderProjet` traverse le réseau et revalide côté serveur.

**Motif.** Un aller-retour serveur à chaque glisser-déposer est incompatible avec ENF-01
(< 2 s, plusieurs centaines d'éléments) et avec EF-106 (mise à jour temps réel du plan).

**Conséquence documentaire — faite en Phase 0.5.** Le fichier **`.drawio`** du diagramme de
séquence « Conception architecture » est corrigé (`diagrams/sequence-conception-architecture.drawio`) : `verifierCompatibilite` et
`calculerCapacite` sortent du bloc `loop` côté serveur pour devenir des appels internes au
client ; les branches `alt [compatible]` / `alt [incompatible]` restent mais se jouent
localement. La correction et son motif sont consignés dans l'ADR 0003.

---

## D-04 — Permissions : **en code**

**Décision.** Matrice rôle → permission dans un **fichier unique**, testée unitairement, avec
des décorateurs NestJS par-dessus. Pas de matrice en base.

**Motif.** Une matrice en base impose migrations et écran d'administration pour une
flexibilité dont personne n'a exprimé le besoin. Migrable plus tard si le besoin apparaît.

**Conséquence.** Changer un droit exige un déploiement — assumé. En contrepartie, la matrice
est relue en revue de code et ne peut pas dériver silencieusement en production.

---

## D-07 — Retours en arrière : **autorisés mais nommés**

**Décision.** Les transitions inverses sont déclarées explicitement dans la table de
transitions — `CLIENT_COMMENTS → REVISION → ARCHITECTURE` — chacune avec son rôle autorisé, un
**motif obligatoire** et une **entrée d'audit**. Aucun retour arbitraire.
**Depuis `CLIENT_APPROVED`, aucun retour** : on crée une nouvelle version.

**Conséquence.** `applyTransition` refuse une transition `reverse` sans motif. La règle
« approuvé ne se rouvre pas » est ce qui donne sa valeur à la validation client.

---

## D-09 — Multi-tenancy : **deux niveaux**

**Décision.**

| Niveau | Champ | Portée |
|---|---|---|
| Locataire | `organizationId` | Toutes les entités — l'entreprise d'intégration |
| Client final | `clientCompanyId` | Les projets — le client est une entité *dans* le locataire |

Un utilisateur `CLIENT` ne voit que les projets de son `clientCompanyId`. Les rôles internes
voient tous les projets de leur `organizationId`. **Deux Guards qui se composent**
(`OrgScopeGuard` puis `ClientScopeGuard`), plus un filet au niveau du client Prisma.

**Conséquence.** Deux suites de tests d'isolation distinctes, dont la seconde — un `CLIENT` de
la société A face à un projet de la société B **dans le même locataire** — est la plus facile
à oublier. Les deux répondent `404`, jamais `403`. Satisfait ENF-06.

---

## D-10 — Bibliothèque de composants : **shadcn/ui**

**Décision.** shadcn/ui, dont le code est copié dans le dépôt et donc re-thémable
intégralement. **Condition ferme** : les variables CSS de shadcn sont **mappées sur les tokens
de `tokens.css`**. Aucune seconde palette en parallèle.

**Format des tokens — tranché.** Les tokens sont stockés en **triplets HSL**, avec la valeur
**hexadécimale en commentaire sur chaque ligne**.

```css
:root {
  --primary: 220 100% 62%;   /* #3D7DFF */
}
```

L'enveloppe `hsl(var(--x))` est **conservée** : elle seule permet les modificateurs d'opacité
de Tailwind — `bg-primary/10`, `bg-white/5` — dont le design system dépend directement
(`--primary-soft`, fonds de survol des boutons *secondary* et *ghost*).

Le commentaire hexadécimal est obligatoire : sans lui, la palette n'est plus relisible ni
rapprochable du brief.

---

## D-13 — Suppression au catalogue : **archivage** *(conséquence de D-01)*

**Décision.** Suppression logique via `EquipmentModel.archivedAt`. L'administration propose
**« Archiver »**, jamais « Supprimer ». Un modèle archivé **reste lisible** dans les
architectures existantes mais **ne peut plus être ajouté** à une nouvelle conception.

**Motif.** La clé étrangère réelle vers `EquipmentModel` (D-01) ne laisse qu'un refus de la
base ou une cascade destructrice sur des architectures livrées.

**Conséquences.** La palette du designer filtre sur `archivedAt IS NULL` ; les éléments
existants portant un modèle archivé s'affichent avec un marqueur ; aucun écran ne propose de
suppression définitive. Le BOM d'une version ancienne reste juste, puisqu'il se régénère depuis
le snapshot figé et non depuis le catalogue courant.

---

# Partie 2 — Décisions sans objet

## D-06 — ~~Migration de l'enum de rôles et du seed~~

Fermée par la reconstruction à neuf. Les six rôles sont définis directement dans la première
migration ; le seed crée un compte par rôle.

---

# Partie 2 bis — Décisions tranchées en Phase 0.5

## D-08 — Priorité (§3) et lot (§8.1) : **rouverte, puis tranchée**

**Première clôture erronée.** Elle affirmait que priorité et lot étaient deux axes
indépendants. Or le CDC §3 les lie explicitement (« Élevée (indispensable au MVP), Moyenne
(attendue en version 1), Faible (souhaitable, évolution) »), et se contredit avec §8.1 sur
sept exigences : EF-104, EF-202, EF-203, EF-204, EF-206, EF-404, EF-405.

**Décision.** §8.1 fait foi pour le lot, §3 pour la priorité. Constat présenté au jury comme
un résultat d'analyse. Détail : ADR 0009 et note d'écart en tête de `TRACABILITE.md`.

## D-14 — Création des comptes CLIENT : **par l'administrateur**

Pas d'inscription publique ; le rôle `invite` n'existe pas. L'administrateur crée le compte
CLIENT et le rattache à une société cliente. Réponse identique que l'adresse soit libre ou non,
compte non créé silencieusement en cas de collision. Détail : ADR 0010.

## D-15 — Paquet partagé : **ESM**

`packages/shared` est publié en ESM ; le backend CommonJS le charge par `require()` d'ESM
(Node ≥ 22.12). Détail : ADR 0011.

## D-16 — Ancien code : **abandonné**

L'ancien code n'existe plus. La section 0.1 du brief (« le repository contient déjà une base
fonctionnelle… tu ne la réécris pas ») est **retirée**. Seul subsiste le tableau de la stack
imposée : NestJS, Prisma, PostgreSQL, React, Vite, TypeScript, Tailwind, React Flow, Zustand.
Toute mention d'un « ancien code conservé en référence » dans ces documents est caduque.

---

# Partie 3 — Décisions encore ouvertes

## D-17 — Base PostgreSQL de développement

**Constat.** Un service Windows `postgresql-x64-16` écoute déjà sur le port hôte **5433**,
celui que `docker-compose.yml` réserve au conteneur. Les deux ne peuvent pas coexister, et
les identifiants de l'instance native ne sont pas ceux de `.env.example`.

| Option | Effet |
|---|---|
| **A** *(recommandée)* — utiliser l'instance native sur 5433 | Créer le rôle et la base `archiflow` (script fourni : `backend/scripts/create-dev-db.sql`) ; Docker devient optionnel |
| **B** — arrêter le service natif, utiliser Docker | Conforme au `docker-compose.yml` tel quel |
| **C** — PostgreSQL hébergé | `DATABASE_URL` à renseigner dans `.env` |

En attendant, les migrations et les tests d'intégration tournent sur un cluster PostgreSQL 16
**jetable**, créé avec les binaires locaux (`npm run db:ephemeral`), sans toucher au service
existant.

## D-05 — Périmètre du temps réel

**À trancher avant la Phase 10.**

| Option | Effort | Ce qu'on obtient |
|---|---|---|
| **A** *(recommandée)* | faible | Présence des utilisateurs + invalidation de cache. Suffit à EF-403 et à la moitié « présence » d'EF-404. |
| **B** | moyen | Verrou par élément : un seul éditeur à la fois. Pas de conflit possible. |
| **C** | élevé | Co-édition CRDT (Yjs). Projet en soi, classé V2 par le CDC. |

La cible ENF-01 de 500 ms est atteignable dès A.

---

## D-11 — Génération du PDF : **tranchée — `@react-pdf/renderer`, côté serveur**

**Décision (T7, 20/09/2026).** Option B retenue plutôt que la recommandation initiale (Puppeteer,
option A) : pas de dépendance Chromium pour un premier export fonctionnel, mise en page réécrite
à la main via des composants React rendus en PDF (`backend/src/modules/reports/`). Le schéma
logique est dessiné en vectoriel directement depuis les positions du document d'architecture —
même donnée que le designer 2D, pas de second modèle (ADR 0001). Détail et alternative écartée :
[ADR 0017](ADR/0017-pdf-react-pdf-renderer.md).

**Contrainte commune, respectée** : le PDF s'imprime en noir et blanc. Aucun statut ni catégorie
n'y est porté par la couleur seule.

---

## D-12 — Fournisseur LLM du chatbot

**À trancher avant la Phase 13.** L'abstraction `AIService` est écrite dès le départ pour que
le choix reste réversible.

À décider : quel fournisseur, quel budget, et surtout **quelles données ont le droit de
sortir**. Recommandation par défaut : uniquement des agrégats du besoin (nombres d'employés,
de postes, de sites) et des extraits du catalogue — **jamais** de noms de clients, d'adresses
IP, de schémas complets ni de données nominatives. Cohérent avec ENF-02.

Si aucun envoi externe n'est acceptable, le chatbot se réduit à un assistant local branché sur
les règles de dimensionnement, sans LLM. Option viable et défendable en soutenance.

