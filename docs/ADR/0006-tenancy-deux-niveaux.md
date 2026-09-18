# ADR 0006 — Multi-tenancy à deux niveaux

**Statut** : Accepté — 18/09/2026
**Référence registre** : D-09

## Contexte

**ENF-06 impose le mode multi-organisations.** La question n'était donc pas s'il en fallait,
mais lequel : le client final constitue-t-il une organisation séparée de l'entreprise
d'intégration qui conçoit l'architecture ?

## Décision

Deux niveaux de portée.

| Niveau | Champ | Porté par | Signification |
|---|---|---|---|
| Locataire | `organizationId` | **Toutes** les entités | L'entreprise d'intégration |
| Client final | `clientCompanyId` | Les **projets** | Le client est une entité *dans* le locataire, pas une organisation séparée |

Règles d'accès :

- Un utilisateur **`CLIENT`** ne voit que les projets portant son `clientCompanyId`.
- Les **rôles internes** voient tous les projets de leur `organizationId`, sous réserve de
  leurs affectations.

Mise en œuvre par **deux Guards qui se composent** — `OrgScopeGuard` puis `ClientScopeGuard`,
ce dernier transparent pour les rôles internes — plus un **filet** au niveau du client Prisma
qui rejette toute requête org-scoped sans `organizationId` dans son `where`.

## Conséquences

1. **Deux suites de tests d'isolation**, pas une :
   - un utilisateur du locataire 1 face à chaque ressource du locataire 2 ;
   - un `CLIENT` de la société A face à un projet de la société B, **dans le même locataire**.
2. Les deux répondent **`404`, jamais `403`** : un `403` confirmerait l'existence de la
   ressource.
3. Le second test est le plus facile à oublier et le plus embarrassant à rater en
   démonstration — il est écrit en Phase 1, avec le premier.
4. Un projet appartient à l'intégrateur et **référence** une société cliente. C'est conforme à
   la réalité métier : le client ne possède pas le dossier de conception.

## Alternative écartée

**Une organisation par client.** Plus simple au départ, mais l'isolation devient fragile dès le
deuxième client, et le modèle ne dit plus à qui appartient le projet.
