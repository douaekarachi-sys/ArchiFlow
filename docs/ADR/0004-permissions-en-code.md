# ADR 0004 — Matrice de permissions en code, pas en base

**Statut** : Accepté — 18/09/2026
**Référence registre** : D-04

## Contexte

EF-503 exige une gestion des rôles et permissions. L'application implémente six rôles. La
question est le support de la matrice `(rôle × permission)` : une table en base, éditable
depuis l'administration, ou un fichier versionné avec le code.

Le CDC demande que l'administrateur **attribue des rôles**. Il ne demande nulle part qu'il
**édite les permissions attachées à un rôle** — ce sont deux besoins différents, souvent
confondus.

## Décision

Matrice dans un **fichier unique**, versionnée avec le dépôt, **testée unitairement**, avec des
décorateurs NestJS par-dessus (`@RequirePermission('project.changeStatus')`).

Le frontend importe la même fonction depuis `packages/shared` pour griser les boutons —
**confort d'affichage uniquement, jamais une autorité**.

## Conséquences

1. Changer un droit exige un déploiement. Assumé.
2. En contrepartie, toute modification passe par une revue de code et ne peut pas dériver
   silencieusement en production.
3. La matrice est testable sans base de données : un test par rôle, un test par permission
   sensible.
4. Migrable vers une table plus tard si le besoin apparaît réellement — l'inverse, extraire
   une matrice d'une base déjà éditée par des administrateurs, serait bien plus coûteux.

## Alternative écartée

**Table `Permission` + `RolePermission` avec écran d'administration.** Impose des migrations,
une interface d'édition, un cache à invalider et un risque de configuration incohérente en
production — pour une flexibilité dont aucun besoin n'a été exprimé.
