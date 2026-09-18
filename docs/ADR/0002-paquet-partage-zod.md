# ADR 0002 — Paquet partagé, avec Zod pour unique dépendance

**Statut** : Accepté — 18/09/2026
**Référence registre** : D-02

## Contexte

Les règles métier — capacité (EF-202), compatibilité (EF-203), validation IP/CIDR (EF-207),
matrice de permissions (EF-503) — doivent produire **le même résultat** côté client, pour un
retour immédiat exigé par EF-106 et ENF-01, et côté serveur, qui fait autorité.

Deux implémentations de la même règle divergent toujours, et la divergence se manifeste au
pire moment : l'utilisateur voit « compatible », le serveur refuse la sauvegarde.

## Décision

Un paquet `packages/shared` contenant les **types** et les **fonctions pures**.

**Zéro dépendance externe, avec une exception unique : Zod.**

Le schéma du document d'architecture y est défini **une seule fois**. Les types TypeScript en
sont dérivés par inférence (`z.infer`). Frontend et backend valident avec **le même schéma**.

## Conséquences

1. Une seule définition du document : les types ne peuvent pas dériver de la validation,
   puisqu'ils en sont dérivés.
2. Les DTO NestJS sont validés par un pipe Zod. `class-validator` devient inutile — **une
   seule grammaire de validation dans tout le projet**, backend et frontend confondus.
3. Workspaces npm et TypeScript composite à mettre en place dès l'initialisation.
4. **Règle de lint** : toute dépendance autre que Zod est refusée dans ce paquet. La règle est
   outillée, pas confiée à la discipline — c'est précisément le genre de contrainte qui se perd
   en trois semaines.
5. Le paquet reste chargeable dans le navigateur sans alourdir le bundle.

## Alternatives écartées

- **Zéro dépendance stricte** : obligeait à écrire les schémas de validation de forme des deux
  côtés, donc à réintroduire la duplication qu'on cherchait à supprimer, sur la partie la plus
  mécanique et la plus facile à désynchroniser.
- **Pas de paquet partagé** : duplication permanente des règles métier, et écart silencieux
  entre ce que l'utilisateur voit et ce que le serveur accepte.
