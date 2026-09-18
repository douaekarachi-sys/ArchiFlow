# ADR 0009 — Priorité d'une exigence et lot de livraison : deux sources, deux rôles

**Statut** : Accepté — 18/09/2026
**Référence registre** : D-08 (rouverte, puis close)

## Contexte

La première clôture de D-08 affirmait que le CDC portait deux axes indépendants, priorité et
lot. C'était inexact. Le CDC §3 lie explicitement les deux :

> « Chaque exigence est identifiée par une référence unique (EF-xxx) et associée à un niveau de
> priorité : Élevée (indispensable au MVP), Moyenne (attendue en version 1), Faible
> (souhaitable, évolution). »

Or le tableau §8.1 décrit le contenu des lots MVP / V1 / V2 par thèmes, et ces thèmes
contredisent la priorité de **sept** exigences :

| Réf. | Priorité §3 | Lot déduit de §3 | Thème §8.1 | Lot §8.1 |
|---|---|---|---|---|
| EF-104 | Moyenne | V1 | « Vue 3D » | V2 |
| EF-202 | Élevée | MVP | « Calcul de capacité » | V1 |
| EF-203 | Élevée | MVP | « compatibilité » | V1 |
| EF-204 | Moyenne | V1 | « détection d'anomalies » | V2 |
| EF-206 | Moyenne | V1 | « modèles d'architectures » | V2 |
| EF-404 | Moyenne | V1 | « co-édition avancée » | V2 |
| EF-405 | Élevée | MVP | « versions » | V1 |

## Décision

- **§8.1 fait foi pour le lot**, c'est-à-dire l'ordre de livraison.
- **§3 fait foi pour la priorité**, c'est-à-dire l'importance de l'exigence.
- Quand §8.1 ne nomme pas le thème d'une exigence, le lot se déduit de sa priorité §3, selon
  la définition même du CDC.

## Conséquences

1. `TRACABILITE.md` porte en tête une note d'écart nommant les sept exigences. C'est un
   **constat d'analyse présenté au jury**, pas une erreur à masquer.
2. Les deux colonnes *Priorité* et *Lot* restent distinctes dans le tableau, et une exigence
   peut légitimement y afficher `Élevée` / `V1`.
3. Conséquence directe de la règle de déduction : EF-205, EF-302, EF-303 et EF-402, toutes
   `Élevée` et non nommées par §8.1, relèvent du **MVP**. Le MVP n'est donc complet qu'à la
   fin de la Phase 11 (BOM et coûts), pas à la fin de la Phase 5.
4. Trois exigences restent d'interprétation, faute de mention littérale dans §8.1 :
   EF-306 (formats Word, Excel, VSDX — « intégrations » en V2 ?), EF-402 (droits fins — « partage
   simple » en MVP ou « collaboration » en V1 ?) et EF-406 (notifications, `Faible` — donc
   évolution — mais rattachée au module Collaboration, en V1). Elles sont signalées dans le
   tableau et attendent un arbitrage.

## Alternative écartée

**§3 fait foi pour le lot.** Cohérent avec la définition du CDC, mais place la vue 3D en V1 et le
calcul de capacité en MVP, à rebours du découpage §8.1 que le planning suit — et que le jury
lira comme le plan de livraison.
