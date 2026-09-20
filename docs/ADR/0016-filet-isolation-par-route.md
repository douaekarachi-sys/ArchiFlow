# ADR 0016 — Filet d'isolation multi-organisations sur les routes authentifiées

**Statut** : Accepté — 20/09/2026

## Contexte

L'isolation entre organisations est une propriété de sécurité critique. Elle a déjà été cassée par oubli de filtre sur des routes métier, et ce type d'erreur est facile à réintroduire sans couverture de test.

## Décision

- Le client Prisma métier est étendu avec un filet `organizationId` qui rejette toute requête org-scoped sans filtre.
- Les routes authentifiées sont couvertes par un test e2e générique : pour chaque endpoint qui cible une ressource du locataire A, un utilisateur du locataire B reçoit une `404`.
- Les cas de liste continuent de vérifier que le contenu ne mélange pas les organisations.

Le test est structuré comme une matrice de routes, pas comme un cas isolé. Un futur oubli de filtre casse automatiquement la suite.

## Conséquences

1. Une fuite de locataire ne peut plus passer en silence : elle est bloquée au niveau Prisma et couverte par la suite e2e.
2. Un ajout de route métier doit inclure sa cible de ressource dans cette matrice, sinon le test échoue.
3. Le comportement reste cohérent avec la règle de sécurité : `404` pour une ressource inconnue / hors portée, jamais `403`.
