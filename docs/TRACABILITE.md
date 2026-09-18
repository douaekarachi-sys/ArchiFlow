# Traçabilité au cahier des charges

**Statut : version 3 — projet reconstruit à neuf, planification arrêtée.**

Les libellés de la colonne *Exigence* sont repris **mot pour mot** du cahier des charges
(tableaux 3.1 à 3.5 et 5). Ils ne doivent pas être reformulés lors des mises à jour.

Aucune exigence n'est encore implémentée : toutes les lignes sont en `🕓`, à leur phase cible.
La colonne *Où c'est implémenté* se remplit au fur et à mesure des phases.

Mise à jour : à chaque fin de phase.

---

## Comment lire ce tableau

### Deux axes de priorité, à ne pas confondre

| Colonne | Source | Signification |
|---|---|---|
| **Priorité** | Tableaux 3.1 à 3.5 du CDC | Importance de l'exigence : `Élevée` / `Moyenne` / `Faible` |
| **Lot** | Tableau 8.1 du CDC | Moment de livraison : `MVP` / `V1` / `V2` |

Les deux sont indépendants. **Une exigence `Moyenne` peut être livrée en `V2`** — c'est le
cas d'EF-104 (vue 3D). Ce n'est pas une incohérence du CDC.

Contenu des lots selon le tableau 8.1 :

| Lot | Contenu principal |
|---|---|
| MVP | Visualisation drag-and-drop, catalogue de base, connexions, export PDF, comptes et partage simple |
| Version 1 | Calcul de capacité et compatibilité, versions, collaboration, rapports personnalisés, administration |
| Version 2 | Vue 3D, détection d'anomalies, modèles d'architectures, co-édition avancée, intégrations |

Le tableau 8.1 décrit les lots par **thèmes**, pas par références. L'affectation d'un lot à
chaque exigence est donc en partie interprétative :

- **Lot sans annotation** : le libellé du lot désigne l'exigence de façon quasi littérale
  (« drag-and-drop » → EF-101, « export PDF » → EF-301).
- **Lot suivi de ⁽ᵈ⁾** : affectation **déduite** par cohérence. À confirmer sur le CDC.
- **`à confirmer`** : aucun élément du tableau 8.1 ne permet de trancher.

### Statut

| Symbole | Signification |
|---|---|
| `🕓 Phase N` | Planifié pour la phase indiquée |
| `🔨` | En cours |
| `✅` | Fait — livré **et** testé |
| `⛔` | Hors périmètre — justification obligatoire dans la cellule |

Une exigence ne passe jamais directement de `🔨` à `✅` sur la foi d'un rendu à l'écran : `✅`
signifie livré **et** couvert par un test exécuté.

---

## 3.1 — Module Visualisation en temps réel

| Réf. | Exigence | Priorité | Lot | Statut | Où c'est implémenté |
|---|---|---|---|---|---|
| EF-101 | Interface de conception par glisser-déposer (drag-and-drop) permettant de placer les éléments : serveurs, routeurs, pare-feu, commutateurs, répartiteurs de charge, stockage, postes clients. | Élevée | MVP | 🕓 Phase 5 | — |
| EF-102 | Bibliothèque d'icônes normalisées (symboles réseau standard) associées à chaque type d'équipement. | Élevée | MVP ⁽ᵈ⁾ | 🕓 Phase 5 | — |
| EF-103 | Tracé de connexions réseau visuelles entre éléments, avec libellés (débit, protocole, type de lien filaire/sans fil). | Élevée | MVP | 🕓 Phase 5 | — |
| EF-104 | Basculement entre une vue 2D (schéma logique) et une vue 3D (implantation physique : baies, salle serveur). | Moyenne | V2 | 🕓 Phase 9 | — |
| EF-105 | Navigation fluide : zoom, panoramique, grille magnétique et alignement automatique des éléments. | Moyenne | MVP ⁽ᵈ⁾ | 🕓 Phase 5 | — |
| EF-106 | Mise à jour en temps réel du plan à chaque ajout, modification ou suppression d'un élément. | Élevée | MVP ⁽ᵈ⁾ | 🕓 Phase 5 | — |
| EF-107 | Regroupement des éléments en zones logiques (DMZ, LAN, WAN, sites distants). | Moyenne | à confirmer | 🕓 Phase 5 | — |

> **EF-106 — tranché (D-03).** La mise à jour temps réel du plan est assurée **en local**, via
> les fonctions pures du paquet partagé : compatibilité et capacité sont recalculées sans
> aller-retour réseau. Seule la sauvegarde traverse le réseau et revalide côté serveur.
> Le diagramme de séquence « Conception architecture » est corrigé en conséquence.

---

## 3.2 — Module Outils de conception

| Réf. | Exigence | Priorité | Lot | Statut | Où c'est implémenté |
|---|---|---|---|---|---|
| EF-201 | Catalogue de composants référençant des marques et modèles réels (fabricant, référence, caractéristiques techniques). | Élevée | MVP | 🕓 Phase 3 | — |
| EF-202 | Calcul automatique de capacité : bande passante, nombre de ports, puissance électrique, charge estimée. | Élevée | V1 | 🕓 Phase 4 | — |
| EF-203 | Vérification automatique de compatibilité entre équipements (interfaces, protocoles, versions). | Élevée | V1 | 🕓 Phase 7 | — |
| EF-204 | Détection des anomalies de conception : boucles, sous-dimensionnement, points uniques de défaillance (SPOF). | Moyenne | V2 | 🕓 Phase 7 | — |
| EF-205 | Génération de diagrammes détaillés : schéma logique, schéma physique, plan d'adressage. | Élevée | V1 ⁽ᵈ⁾ | 🕓 Phases 5, 6 et 8 | — |
| EF-206 | Bibliothèque de modèles d'architectures types (PME, datacenter, multi-sites) réutilisables. | Moyenne | V2 | 🕓 Post-Phase 10 | — |
| EF-207 | Attribution et gestion du plan d'adressage IP (sous-réseaux, VLAN). | Moyenne | V1 ⁽ᵈ⁾ | 🕓 Phase 8 | — |

> **EF-205 couvre à lui seul les trois vues du designer** (logique, physique, adressage), en
> priorité **Élevée**. Il s'étale donc sur trois phases et ne peut être clos avant la Phase 8.
>
> **EF-202 et EF-203** sont implémentés dans `packages/shared` (décision D-02) : mêmes
> fonctions pures exécutées côté client pour le retour immédiat et côté serveur pour
> l'autorité.

---

## 3.3 — Module Rapports clients

| Réf. | Exigence | Priorité | Lot | Statut | Où c'est implémenté |
|---|---|---|---|---|---|
| EF-301 | Export PDF de l'architecture (schémas, légende, mise en page soignée). | Élevée | MVP | 🕓 Phases 5 et 12 | — |
| EF-302 | Génération automatique des spécifications techniques et de la nomenclature (BOM). | Élevée | V1 ⁽ᵈ⁾ | 🕓 Phase 11 | — |
| EF-303 | Estimation des coûts : matériel, licences et, en option, mise en œuvre. | Élevée | V1 ⁽ᵈ⁾ | 🕓 Phase 11 | — |
| EF-304 | Production d'une documentation technique (description des flux, adressage, inventaire des équipements). | Moyenne | V1 ⁽ᵈ⁾ | 🕓 Phase 12 | — |
| EF-305 | Personnalisation des rapports : logo, en-tête client, charte graphique. | Moyenne | V1 | 🕓 Phase 12 | — |
| EF-306 | Export dans d'autres formats : Word, Excel, image, Visio (VSDX). | Moyenne | V2 ⁽ᵈ⁾ | 🕓 Phase 12 | — |

> **EF-301 est en lot MVP** alors que la Phase 12 est la dernière du plan. Un PDF minimal
> (schéma logique, légende, liste des équipements) est donc livré **dès la fin de la Phase 5**,
> puis enrichi en Phase 12. D'où les deux phases dans la cellule.
>
> **EF-302 et EF-303** s'appuient sur les tables normalisées `ArchitectureElement` /
> `ArchitectureConnection` et leur clé étrangère vers `EquipmentModel` (décision D-01) : le
> BOM et les coûts sont des agrégations par jointure, pas un parcours de JSON.

---

## 3.4 — Module Collaboration

| Réf. | Exigence | Priorité | Lot | Statut | Où c'est implémenté |
|---|---|---|---|---|---|
| EF-401 | Partage d'un projet avec d'autres utilisateurs (lien ou invitation). | Élevée | MVP | 🕓 Phase 1 | — |
| EF-402 | Gestion fine des droits d'accès : lecture, commentaire, édition. | Élevée | V1 | 🕓 Phases 1 et 10 | — |
| EF-403 | Commentaires et annotations en temps réel, positionnés sur les éléments. | Moyenne | V1 | 🕓 Phase 10 | — |
| EF-404 | Édition collaborative simultanée avec indication de la présence des utilisateurs. | Moyenne | V2 | 🕓 Phase 10 (présence) · post-V2 (co-édition) | — |
| EF-405 | Historique et gestion des versions : comparaison et restauration d'une version antérieure. | Élevée | V1 | 🕓 Phase 10 | — |
| EF-406 | Notifications lors d'une modification, d'un commentaire ou d'un partage. | Faible | V1 ⁽ᵈ⁾ | 🕓 Phase 10 | — |

> **EF-404 se scinde en deux.** L'« indication de la présence des utilisateurs » est livrée en
> Phase 10 à faible coût ; l'« édition collaborative simultanée » dépend de **D-05**, encore
> ouverte. La ligne ne passe `✅` que lorsque les deux moitiés sont livrées.
>
> **EF-405 — appuyé par D-01.** La comparaison et la restauration reposent sur les snapshots
> JSONB immuables de `ArchitectureVersion` : ils sont auto-porteurs, donc restaurables même
> après évolution du schéma normalisé.

---

## 3.5 — Module Administration et gestion des comptes

| Réf. | Exigence | Priorité | Lot | Statut | Où c'est implémenté |
|---|---|---|---|---|---|
| EF-501 | Création et gestion des comptes utilisateurs et des organisations. | Élevée | MVP | 🕓 Phases 1 et 3 | — |
| EF-502 | Authentification sécurisée (identifiant / mot de passe, SSO ou OAuth en option). | Élevée | MVP ⁽ᵈ⁾ | 🕓 Phase 1 | — |
| EF-503 | Gestion des rôles et permissions (administrateur, concepteur, invité). | Élevée | MVP ⁽ᵈ⁾ | 🕓 Phase 1 | — |
| EF-504 | Tableau de bord des projets : liste, recherche, filtres, statut. | Moyenne | V1 | 🕓 Phases 1 et 3 | — |
| EF-505 | Gestion du catalogue de composants par l'administrateur (ajout, mise à jour). | Moyenne | V1 | 🕓 Phase 3 | — |

> **EF-503 : divergence assumée, à présenter au jury.** Le CDC nomme trois rôles
> (administrateur, concepteur, invité). L'application en implémente six — `ADMIN`,
> `PROJECT_MANAGER`, `ENGINEER`, `ARCHITECT`, `SALES`, `CLIENT` — conformément au diagramme
> de cas d'utilisation, qui distingue cinq acteurs métier. Le CDC est **sous-spécifié** sur ce
> point ; l'implémentation le couvre et le dépasse. Voir « Écarts assumés ».
>
> La matrice rôle → permission est **en code**, dans un fichier unique testé unitairement
> (décision D-04). L'administrateur attribue des rôles ; il n'édite pas les permissions.
>
> **EF-503 en lot MVP** est une déduction : le tableau 8.1 place « administration » en V1,
> mais toute la navigation étant pilotée par le rôle, les rôles sont un **prérequis** du MVP.
> L'écran d'administration des rôles, lui, reste en V1.

---

## 5 — Exigences non fonctionnelles

| Réf. | Domaine | Exigence | Statut | Où c'est implémenté |
|---|---|---|---|---|
| ENF-01 | Performance | Temps de réponse inférieur à 2 s pour les actions courantes ; rendu fluide d'un plan comportant plusieurs centaines d'éléments ; latence de co-édition inférieure à 500 ms. | 🕓 Transverse · mesurée Phase 14 | — |
| ENF-02 | Sécurité | Chiffrement des échanges (TLS) et des données sensibles ; gestion sécurisée des sessions ; conformité à la loi 09-08 relative à la protection des données personnelles (Maroc) et, le cas échéant, au RGPD. | 🕓 Phases 1 et 14 | — |
| ENF-03 | Ergonomie | Interface intuitive et responsive ; prise en main rapide ; interface en français, extensible à l'arabe et à l'anglais. | 🕓 Phase 1 | — |
| ENF-04 | Disponibilité | Taux de disponibilité cible de 99,5 % ; sauvegardes régulières et plan de reprise d'activité. | 🕓 Phases 1 et 14 | — |
| ENF-05 | Compatibilité | Support des navigateurs récents (Chrome, Firefox, Edge, Safari) ; usage bureautique prioritaire, tablette en option. | 🕓 Phases 1 et 14 | — |
| ENF-06 | Évolutivité | Architecture modulaire permettant la montée en charge et l'ajout de nouveaux modules ; mode multi-organisations. | 🕓 Phase 1 | — |
| ENF-07 | Traçabilité | Journalisation des actions (audit) et historisation des versions de projet. | 🕓 Phases 1 et 10 | — |

Points d'attention :

- **ENF-02** impose la conformité loi 09-08 / RGPD et le chiffrement des données au repos.
  Traité en Phase 1 (champs de cycle de vie, anonymisation, rétention, sessions) et vérifié
  en Phase 14. Détail dans `ARCHITECTURE-CIBLE.md` §6.12.
- **ENF-04** : les sauvegardes tournent dès la Phase 1 ; la Phase 14 vérifie les cibles
  RPO 24 h / RTO 4 h par un test de restauration chronométré. Détail en §6.13.
- **ENF-05** porte sur les **navigateurs** ; le responsive relève d'ENF-03. « Usage
  bureautique prioritaire » valide la stratégie desktop-first du designer 2D/3D.
- **ENF-06** — satisfait par la décision **D-09** : `organizationId` sur toutes les entités
  (le tenant est l'entreprise d'intégration) et `clientCompanyId` sur les projets.

---

## Écarts assumés — à présenter au jury

### 1. Rôles — le CDC est sous-spécifié

EF-503 prévoit trois rôles : administrateur, concepteur, invité.
L'application en implémente six : `ADMIN`, `PROJECT_MANAGER`, `ENGINEER`, `ARCHITECT`,
`SALES`, `CLIENT`.

Justification : le diagramme de cas d'utilisation, validé, distingue cinq acteurs métier
(Ingénieur/Architecte, Client final, Chef de projet, Commercial/Avant-vente, Administrateur).
Trois rôles ne permettent pas de représenter ce découpage. L'implémentation **couvre** EF-503
et l'étend.

### 2. Workflow projet et portail client — hors exigences EF

La machine à états `DRAFT → SUBMITTED → PENDING_ASSIGNMENT → ASSIGNED → ENGINEERING →
ARCHITECTURE → INTERNAL_REVIEW → COMMERCIAL_REVIEW → CLIENT_REVIEW → CLIENT_COMMENTS →
REVISION → CLIENT_APPROVED → COMPLETED` et le **portail client d'expression du besoin** ne
correspondent à aucune exigence du CDC. Ils découlent du diagramme de cas d'utilisation et du
besoin métier.

**Action recommandée** : leur attribuer des références dans un avenant — `EF-506` et suivantes,
ou une annexe — afin que la traçabilité reste complète le jour de la soutenance. Sans cela,
une part significative du travail livré n'apparaît dans aucune ligne du CDC.

Proposition de numérotation, à valider :

| Réf. proposée | Exigence proposée | Priorité proposée | Lot proposé | Statut |
|---|---|---|---|---|
| EF-506 | Cycle de vie d'un projet piloté par une machine à états, avec transitions contrôlées par rôle, retours en arrière nommés et motivés. | Élevée | MVP | 🕓 Phase 1 |
| EF-507 | Portail client d'expression du besoin : formulaire multi-étapes, sauvegarde en brouillon, soumission. | Élevée | V1 | 🕓 Phase 2 |
| EF-508 | Consultation, commentaire et validation d'une version publiée par le client. | Moyenne | V1 | 🕓 Phase 11 |

### 3. Chatbot d'assistance client — hors périmètre initial

Aucune exigence du CDC ne couvre l'assistant conversationnel décrit en section 8 du brief.
C'est une **extension hors périmètre**, à annoncer comme telle et à ne pas présenter comme la
réalisation d'une exigence. Sa valeur de démonstration est réelle ; sa légitimité
contractuelle, nulle.

---

## Ce qui reste à faire sur ce document

1. Confirmer les affectations de lot marquées ⁽ᵈ⁾ et les trois `à confirmer` sur le
   tableau 8.1 du CDC.
2. Faire valider ou corriger la numérotation proposée EF-506 à EF-508.
3. Faire évoluer la colonne *Statut* et renseigner *Où c'est implémenté* à chaque fin de phase.
