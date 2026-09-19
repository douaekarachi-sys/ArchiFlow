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
npm install
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

Comptes de démonstration (mot de passe affiché par le seed, `Demo-ArchiFlow-2026` par
défaut) : `admin@`, `pm@`, `engineer@`, `architect@`, `sales@`, `client@archiflow.local`.
Il n'y a pas d'inscription publique : l'administrateur crée les comptes (ADR 0010).

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
