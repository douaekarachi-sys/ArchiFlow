# ADR 0008 — Archivage au catalogue, jamais de suppression

**Statut** : Accepté — 18/09/2026
**Référence registre** : D-13

## Contexte

La clé étrangère réelle entre `ArchitectureElement` et `EquipmentModel` (ADR 0001) ne laisse
que deux issues à un `DELETE` sur un modèle référencé : le refus par la base, ou une cascade
qui détruirait des architectures livrées.

Or un catalogue vit : des modèles sortent de production, des références sont remplacées.

## Décision

**Suppression logique** via `EquipmentModel.archivedAt`.

L'administration du catalogue propose **« Archiver »**, jamais « Supprimer ».

Un modèle archivé :

- **reste lisible** dans les architectures existantes ;
- **ne peut plus être ajouté** à une nouvelle conception.

## Conséquences

1. La palette du designer filtre sur `archivedAt IS NULL`. Un modèle archivé n'apparaît plus
   dans les résultats de recherche du catalogue.
2. Les éléments existants qui portent un modèle archivé s'affichent avec un marqueur
   « modèle archivé », dans le designer comme dans le BOM — l'information est utile à
   l'architecte, elle ne doit pas être silencieuse.
3. **Aucun écran ne propose de suppression définitive d'un modèle.** C'est une contrainte
   visible pour l'administrateur, assumée : c'est le prix de l'intégrité référentielle.
4. Le BOM d'une version ancienne reste correct quoi qu'il arrive, puisqu'il se régénère depuis
   le snapshot figé (ADR 0001) et non depuis le catalogue courant.
5. `archivedAt` est distinct d'une éventuelle indisponibilité commerciale : un modèle peut être
   indisponible chez le fournisseur sans être archivé de la plateforme.
