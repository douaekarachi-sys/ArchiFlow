# ArchiFlow

Plateforme interactive de conception d'architecture réseau et système — de l'expression du
besoin client à la conception, au chiffrage et à la validation.

Monorepo npm : `packages/shared` (schémas Zod et règles pures communes), `backend` (NestJS 11,
Prisma 7, PostgreSQL 16), `frontend` (React 19, Vite 7, Tailwind 4). Architecture et décisions :
[`docs/`](docs/) — commencer par [`ARCHITECTURE-CIBLE.md`](docs/ARCHITECTURE-CIBLE.md) et le
[journal des ADR](docs/ADR/README.md). État d'avancement : [`TRACABILITE.md`](docs/TRACABILITE.md).

## Démarrer

Prérequis : Node ≥ 22.12 (`.nvmrc`), PostgreSQL 16 (Docker, instance locale ou hébergée).

```bash
npm install                     # génère aussi le client Prisma (postinstall backend)
cp .env.example .env            # puis renseigner les secrets (voir les commentaires)
npm run build --workspace=@archiflow/shared

# Base de données — une des options de D-17 :
npm run db:up                                        # Docker, port 5433
# ou : npm run db:ephemeral --workspace=@archiflow/backend   (cluster jetable, port 55432)

npm run db:migrate              # applique les migrations
npm run db:seed                 # données de démonstration (un compte par rôle)

npm run dev:api                 # http://localhost:3000/api/v1
npm run dev:web                 # http://localhost:5173
```

Le client Prisma (`backend/src/generated/prisma`) est généré automatiquement par le script
`postinstall` de `backend/package.json` — sur un clone neuf, `npm install` suffit, pas besoin de
lancer `prisma generate` à la main. Si le dossier venait à manquer (ex. `node_modules` réinstallé
sans passer par `npm install` à la racine) : `npm run db:generate --workspace=@archiflow/backend`.

`.npmrc` (racine) active `legacy-peer-deps` : `@react-three/fiber` (vue 3D, T8) déclare un
intervalle de peer trop strict pour React 19.3 — un décalage de plage, pas une vraie
incompatibilité. Sans ce réglage, `npm install` échoue avec un conflit ERESOLVE.

## Comptes de démonstration

Mot de passe unique, affiché par le seed : **`Demo-ArchiFlow-2026`**. Il n'y a pas d'inscription
publique, l'administrateur crée les comptes (ADR 0010).

| Rôle | E-mail | Société cliente |
|---|---|---|
| Administrateur | `admin@archiflow.local` | Groupe Atlas Services |
| Chef de projet | `pm@archiflow.local` | Groupe Atlas Services |
| Ingénieur | `engineer@archiflow.local` | Groupe Atlas Services |
| Architecte | `architect@archiflow.local` | Groupe Atlas Services |
| Commercial | `sales@archiflow.local` | Groupe Atlas Services |
| Client | `client@archiflow.local` | Groupe Atlas Services |
| Client | `client2@archiflow.local` | Maghreb Logistique |
| Client | `client3@archiflow.local` | Atlas Négoce |

Trois sociétés clientes distinctes, chacune avec ses propres projets : `client2`/`client3`
existent pour vérifier à l'écran l'isolation entre sociétés d'un même locataire (D-09), pas
seulement en test.

## Démonstration en 5 minutes

Le seed (`npm run db:seed`) construit un scénario jouable **directement**, sans rien préparer :

1. **Connexion** — `client@archiflow.local`. Le tableau de bord montre le projet le plus actif,
   sa progression en langage client (jamais les statuts internes) et sa prochaine action réelle.
2. **Historique et diff** — ouvrir **« Nouveau siège Rabat »** (statut *Proposition client*) :
   Historique → deux versions déjà sauvegardées, comparer 1 → 2 (« +1 switch »). Télécharger le
   PDF (informations client, schéma, équipements, BOM, coûts).
3. **BOM et coûts** — se reconnecter en `sales@archiflow.local`, menu *BOM* : nomenclature et
   coûts du même projet, matériel et licence distingués, détail du calcul par ligne.
4. **Détection d'anomalie** — se reconnecter en `architect@archiflow.local`, ouvrir
   **« Campus Agadir »** dans le concepteur : le panneau de validation affiche une anomalie
   **CRITICAL** (boucle à trois switches) dès l'ouverture, sans rien configurer.
5. **Affectation** — `admin@archiflow.local`, ouvrir **« Clinique Fès »** (*En attente
   d'affectation*) : affecter un ingénieur et un architecte, observer la transition automatique.
6. **Page blanche** — `architect@archiflow.local`, ouvrir **« Agence Tanger »** (*Brouillon*,
   aucune architecture) : glisser un équipement depuis le catalogue, voir la validation en
   direct, la vue 3D (bouton *Vue 3D*), sauvegarder — une version 1 apparaît dans l'historique.
7. **Assistant** — se reconnecter en `client@archiflow.local`, menu *Assistant* : poser
   « 200 employés, combien de switches ? » (réponse chiffrée, calcul détaillé, sans connexion
   Internet — repli local par défaut), puis une question hors périmètre pour voir la proposition
   de transmission à l'équipe technique.

## Vérifier

```bash
npm run lint
npm run typecheck
npm test          # shared + backend (unitaires et intégration, base DATABASE_URL_TEST) + frontend
npm run build
```

Les tests d'intégration du backend utilisent une vraie base PostgreSQL (`DATABASE_URL_TEST`),
qu'ils vident : ne jamais la faire pointer vers une base de données utile.

## Exploitation

Sauvegarde, restauration et test de restauration : [`docs/RUNBOOK-RESTAURATION.md`](docs/RUNBOOK-RESTAURATION.md).
Données personnelles : [`docs/REGISTRE-TRAITEMENTS.md`](docs/REGISTRE-TRAITEMENTS.md),
[`docs/RETENTION.md`](docs/RETENTION.md), [`docs/PROCEDURE-EFFACEMENT.md`](docs/PROCEDURE-EFFACEMENT.md).
