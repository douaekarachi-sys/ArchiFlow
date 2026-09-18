# ADR 0001 — Stockage hybride du document d'architecture

**Statut** : Accepté — 18/09/2026
**Référence registre** : D-01

## Contexte

L'architecture est une donnée structurée, jamais une image (contrainte 0.4 du brief). Deux
usages tirent le stockage dans des directions opposées :

- Le BOM (EF-302) et le chiffrage (EF-303) veulent des **agrégations par jointure** et une
  **intégrité référentielle** vers le catalogue.
- Le versionnage, la comparaison et la restauration (EF-405) veulent un document
  **auto-porteur**, lisible indépendamment du schéma courant.

Un seul support ne satisfait pas les deux.

## Décision

Modèle hybride à deux étages.

| Étage | Support | Rôle |
|---|---|---|
| Version de travail courante | `ArchitectureElement`, `ArchitectureConnection`, `ArchitectureZone`, avec **clé étrangère réelle** vers `EquipmentModel` | Ce que le designer lit et écrit |
| Versions sauvegardées | `ArchitectureVersion.snapshot` — **JSONB immuable** | Historique, diff, restauration |

Le snapshot fige les caractéristiques du modèle au moment de la sauvegarde — référence,
nombre de ports, débit, hauteur U, budget PoE, prix indicatif — et non le seul
`equipmentModelId`.

## Pourquoi le snapshot fige les caractéristiques : c'est une exigence métier

**Les prix évoluent.** Régénérer le BOM d'une version validée doit redonner le chiffrage
validé **à l'époque**, pas celui d'aujourd'hui. Sans figeage, une proposition commerciale
acceptée par un client deviendrait irreproductible dès la première mise à jour du catalogue —
et l'on ne saurait plus justifier le montant sur lequel le client s'est engagé.

Ce n'est donc pas une optimisation de lecture, et la duplication entre snapshot et catalogue
n'est pas une redondance à éliminer : c'est la condition pour que l'historique commercial ait
une valeur.

## Conséquences

1. `EquipmentModel` ne peut plus être supprimé physiquement → **ADR 0008**.
2. Sauvegarder est **une transaction unique** : mise à jour des tables normalisées *et*
   insertion du snapshot. Jamais deux appels séparés.
3. Restaurer **crée une nouvelle version**, n'écrase jamais. L'historique n'est pas amputé.
4. La forme `{ elements, connections, zones }` reste le **contrat d'API** et le format du
   snapshot ; les tables normalisées en sont la persistance.
5. Un snapshot est un document d'archive, pas une vue normalisée. On ne le « nettoie » pas.

## Alternatives écartées

- **JSONB seul** : pas d'intégrité référentielle, agrégations BOM et coûts coûteuses,
  recherche « quels projets utilisent ce modèle » impossible sans scan.
- **Normalisé seul** : le versionnage devient une copie de N lignes, le diff sémantique est à
  écrire entièrement, et surtout le **chiffrage historique devient irreproductible** dès qu'un
  prix change — ce qui disqualifie l'option pour raison métier, pas technique.
