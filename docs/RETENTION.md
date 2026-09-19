# Durées de conservation — ENF-02

*Source de vérité : `backend/src/domain/retention/policies.ts`. Ce document et ce fichier
évoluent ensemble ; en cas d'écart, le code fait foi et ce document est à corriger.*

Proposition chiffrée, **à valider par l'exploitant**, responsable de traitement.

| Catégorie | Durée | Déclencheur | Application |
|---|---|---|---|
| Journal d'audit | 12 mois glissants | `AuditLog.createdAt` | Purge quotidienne |
| Jetons de session expirés | Supprimés dès expiration (durée de vie 30 jours) | `RefreshToken.expiresAt` | Purge quotidienne |
| Jetons de session révoqués | 7 jours après révocation | `RefreshToken.revokedAt` | Purge quotidienne |
| Jetons de réinitialisation | 7 jours après expiration ou usage | `expiresAt` / `usedAt` | Purge quotidienne |
| Comptes utilisateurs | Durée de la relation, puis revue après 12 mois d'inactivité | `User.lastLoginAt` | **Signalés**, jamais effacés automatiquement |
| Contacts client | Durée du projet + 3 ans | Clôture du projet | Anonymisation par l'administrateur |
| Brouillons de demande non soumis | 12 mois | Dernière modification | À appliquer en Phase 2 |
| Notifications | 6 mois | `createdAt` | À appliquer en Phase 10 |
| Versions d'architecture, BOM, rapports | Conservés avec le projet | — | Données métier ; auteur anonymisé le cas échéant |

## Fonctionnement

- Tâche `RetentionWorker`, chaque jour à 03:00 (heure de Casablanca), idempotente.
- Elle journalise **des volumes, jamais des contenus** : « 143 entrées d'audit purgées ».
- Un compte inactif n'est jamais effacé par la machine : l'anonymisation est irréversible et
  reste une décision d'administrateur (voir `PROCEDURE-EFFACEMENT.md`).
- Testée : `backend/test/infrastructure.e2e-spec.ts` (« rétention des données »).
