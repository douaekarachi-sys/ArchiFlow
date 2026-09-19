# Runbook — sauvegarde et restauration (ENF-04)

> **Dernier test de restauration réussi : 18/09/2026** — base de développement, 1,1 s,
> 4 contrôles sur 4 (`npm run db:restore:verify`). Un fichier altéré a été refusé
> (« unable to authenticate data »).
>
> Écrit pour être suivi **sous pression** par quelqu'un qui ne l'a pas rédigé.

## Cibles

| Indicateur | Cible initiale |
|---|---|
| RPO — perte de données maximale | 24 h (sauvegarde quotidienne) |
| RTO — délai de remise en service | 4 h |
| Disponibilité | 99,5 % (3 h 39 min d'indisponibilité par mois) |

## Prérequis

- Variables dans `.env` (jamais versionné) : `DATABASE_URL`, `BACKUP_DIR`,
  `BACKUP_ENCRYPTION_KEY`, et `PG_BIN_DIR` si `pg_dump` n'est pas dans le PATH.
- `BACKUP_ENCRYPTION_KEY` : 32 octets en base64 (`openssl rand -base64 32`).
  **Conservez cette clé hors de la machine**, dans un coffre : sans elle, les sauvegardes
  sont illisibles, y compris pour vous.
- `BACKUP_DIR` doit être **copié hors machine** (second disque, NAS, stockage objet) : une
  sauvegarde sur le disque de la base meurt avec elle.

## 1. Sauvegarde quotidienne

```bash
npm run db:backup --workspace=@archiflow/backend
```

- Produit `archiflow-AAAAMMJJTHHMMSSZ.dump.enc` (pg_dump -Fc chiffré AES-256-GCM).
- Écrit d'abord un `.partial`, renommé seulement si pg_dump a réussi.
- Applique la rotation GFS : 7 quotidiennes, 4 hebdomadaires, 12 mensuelles.

**Planification** — tous les jours à 02:00 :
- Linux : `0 2 * * * cd /srv/archiflow && npm run db:backup --workspace=@archiflow/backend`
- Windows : Planificateur de tâches, action `npm.cmd run db:backup --workspace=@archiflow/backend`,
  dossier de départ = racine du dépôt.

**Avant toute migration Prisma en production** : lancer une sauvegarde, sans exception.

## 2. Surveillance

`GET /api/v1/health` rapporte l'âge de la dernière sauvegarde. Au-delà de
`BACKUP_MAX_AGE_HOURS` (26 h par défaut), le statut passe à `degraded`. Brancher une alerte
sur ce statut : sinon la panne de sauvegarde se découvre le jour de la restauration.

## 3. Test de restauration (trimestriel)

```bash
npm run db:restore:verify --workspace=@archiflow/backend
```

Restaure la dernière sauvegarde dans une base **jetable** créée pour l'occasion, vérifie les
comptes de lignes, les migrations appliquées et l'ouverture d'un projet, mesure la durée,
puis supprime la base jetable. La production n'est jamais touchée. Reporter la date et la
durée en tête de ce document.

## 4. Restauration réelle (incident)

1. **Arrêter l'API** pour qu'aucune écriture n'arrive pendant l'opération.
2. Identifier la sauvegarde : la plus récente dans `BACKUP_DIR`, sauf corruption connue.
3. Restaurer vers une **nouvelle** base d'abord, pour vérifier :
   ```bash
   npm run db:restore --workspace=@archiflow/backend -- <fichier.dump.enc> --target postgresql://…/archiflow_restored
   ```
4. Contrôler : connexion d'un compte, ouverture d'un projet, derniers éléments d'audit.
5. Basculer : pointer `DATABASE_URL` vers la base restaurée **ou** restaurer sur la base
   d'origine (`--target <DATABASE_URL> --yes` — le `--yes` est volontairement obligatoire).
6. Appliquer les migrations éventuellement plus récentes que la sauvegarde :
   `npm run db:deploy --workspace=@archiflow/backend`.
7. Redémarrer l'API, vérifier `/api/v1/health`.
8. Journaliser l'incident : heure de début, sauvegarde utilisée, durée, perte de données.

## Ce qui reste à l'exploitant

Hébergement, redondance matérielle, plan de reprise sur site distant, chiffrement du volume
PostgreSQL, copie hors machine des sauvegardes.
