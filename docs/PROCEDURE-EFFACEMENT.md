# Procédure d'effacement d'un utilisateur — ENF-02

## Principe

L'effacement est une **anonymisation**, jamais une suppression. Supprimer la ligne détruirait
l'auteur de chaque version d'architecture et de chaque entrée d'audit, en contradiction avec
ENF-07. On efface l'identité ; on conserve l'identifiant technique et l'historique.

## Qui

| Étape | Rôle |
|---|---|
| Demande | La personne concernée, auprès de l'organisation qui exploite la plateforme |
| Vérification de l'identité du demandeur | Responsable de traitement (hors application) |
| Exécution | Un utilisateur `ADMIN` de l'organisation — jamais sur son propre compte |

**Délai** : un mois à compter de la demande (RGPD, art. 12).

## Comment

`POST /api/v1/users/{id}/anonymize` (permission `user.deactivate`, réservée à `ADMIN`).
L'écran d'administration correspondant arrive en Phase 3.

## Effet technique exact

| Champ | Avant | Après |
|---|---|---|
| `firstName` / `lastName` | Identité réelle | « Utilisateur » / « supprimé » |
| `email` | Adresse réelle | `supprime+<id>@invalide.local` (unicité préservée) |
| `passwordHash` | Empreinte bcrypt | Valeur inutilisable : aucune connexion possible |
| `deletedAt`, `anonymizedAt` | — | Date de l'opération |
| `ClientProfile` | Téléphone, fonction | Effacés, `deletedAt` renseigné |
| Sessions | Actives | Toutes révoquées |
| Identifiant, affectations, historique, audit | — | **Conservés** |

L'opération est **irréversible** : un compte anonymisé ne peut pas être réactivé.

## Preuve d'exécution

Une entrée d'audit `user.anonymized` (auteur, cible, horodatage) est écrite à chaque
exécution. Elle constitue la preuve à communiquer au demandeur.

## À ne pas confondre

La **désactivation** (`POST /users/{id}/deactivate`) est réversible : elle bloque l'accès sans
toucher à l'identité. Elle convient au départ d'un salarié, pas à une demande d'effacement.
