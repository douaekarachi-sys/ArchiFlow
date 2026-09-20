# Traçabilité au cahier des charges

**Statut : version 8 — moteurs de capacité/compatibilité/anomalies, tranche T4 (20/09/2026).** Colonne *Lot* : ADR 0009.

Les libellés de la colonne *Exigence* sont repris **mot pour mot** du cahier des charges
(tableaux 3.1 à 3.5 et 5). Ils ne doivent pas être reformulés lors des mises à jour.

Mise à jour : à chaque fin de phase.

---

## ⚠ Note d'écart — le CDC se contredit sur sept exigences

*Constat d'analyse, à présenter au jury.*

Le CDC définit la priorité d'une exigence comme son lot de livraison (§3) : « Élevée
(indispensable au MVP), Moyenne (attendue en version 1), Faible (souhaitable, évolution) ».
Le tableau §8.1, qui décrit le contenu de chaque lot par thèmes, **contredit cette définition
pour sept exigences** :

| Réf. | Priorité (§3) | Lot selon §3 | Thème cité en §8.1 | Lot selon §8.1 |
|---|---|---|---|---|
| **EF-104** | Moyenne | V1 | « Vue 3D » | **V2** |
| **EF-202** | Élevée | MVP | « Calcul de capacité » | **V1** |
| **EF-203** | Élevée | MVP | « compatibilité » | **V1** |
| **EF-204** | Moyenne | V1 | « détection d'anomalies » | **V2** |
| **EF-206** | Moyenne | V1 | « modèles d'architectures » | **V2** |
| **EF-404** | Moyenne | V1 | « co-édition avancée » | **V2** |
| **EF-405** | Élevée | MVP | « versions » | **V1** |

**Règle retenue (ADR 0009)** : **§8.1 fait foi pour le lot** (ordre de livraison), **§3 fait foi
pour la priorité** (importance de l'exigence). Quand §8.1 ne nomme pas une exigence, son lot
se déduit de sa priorité selon la définition de §3.

Conséquence à connaître : EF-205, EF-302, EF-303 et EF-402 sont `Élevée` et absentes de §8.1,
donc **MVP**. Le MVP n'est complet qu'avec le BOM et les coûts, soit à la fin de la Phase 11.

---

## Comment lire ce tableau

| Colonne | Source | Signification |
|---|---|---|
| **Priorité** | Tableaux 3.1 à 3.5 du CDC | Importance : `Élevée` / `Moyenne` / `Faible` |
| **Lot** | Tableau 8.1, sinon §3 | Moment de livraison : `MVP` / `V1` / `V2` |

Annotations de la colonne *Lot* :

| Marque | Signification |
|---|---|
| *(aucune)* | Thème nommé littéralement par §8.1 |
| `(§3)` | §8.1 muet : lot déduit de la priorité |
| `⚠` | Contradiction §3 / §8.1, tranchée en faveur de §8.1 (voir note d'écart) |
| `⚑` | Rattachement à un thème de §8.1 discutable — **arbitrage attendu** |

Statut :

| Symbole | Signification |
|---|---|
| `🕓 Phase N` | Planifié pour la phase indiquée |
| `🔨` | En cours, ou partiellement livré |
| `✅` | Fait — livré **et** couvert par un test exécuté |
| `⛔` | Hors périmètre — justification obligatoire dans la cellule |

---

## 3.1 — Module Visualisation en temps réel

| Réf. | Exigence | Priorité | Lot | Statut | Où c'est implémenté |
|---|---|---|---|---|---|
| EF-101 | Interface de conception par glisser-déposer (drag-and-drop) permettant de placer les éléments : serveurs, routeurs, pare-feu, commutateurs, répartiteurs de charge, stockage, postes clients. | Élevée | MVP | ✅ T3 | `frontend/src/features/designer/{equipment-palette,designer-page}.tsx` — palette du catalogue (archivedAt IS NULL) groupée par catégorie, glisser vers React Flow ; élément générique « Internet » pour ce qui n'a pas de modèle catalogue |
| EF-102 | Bibliothèque d'icônes normalisées (symboles réseau standard) associées à chaque type d'équipement. | Élevée | MVP | ✅ T3 | `frontend/src/features/designer/category-icons.ts` — une icône par catégorie, couleur `tokens.css` §cat-* (déjà utilisée par `CategoryBadge` depuis T1) |
| EF-103 | Tracé de connexions réseau visuelles entre éléments, avec libellés (débit, protocole, type de lien filaire/sans fil). | Élevée | MVP | ✅ T3 | `frontend/src/features/designer/labeled-edge.tsx` — tracé et couleur distincts par `linkType` (cuivre/fibre/sans fil/virtuel), libellé flottant débit + protocole |
| EF-104 | Basculement entre une vue 2D (schéma logique) et une vue 3D (implantation physique : baies, salle serveur). | Moyenne | V2 ⚠ | 🕓 Phase 9 | — |
| EF-105 | Navigation fluide : zoom, panoramique, grille magnétique et alignement automatique des éléments. | Moyenne | V1 (§3) | 🔨 T3 | Zoom/panoramique/grille magnétique livrés (`snapGrid`, `--canvas-snap`) ; « alignement automatique » interprété comme l'accrochage à la grille — pas d'outil d'alignement multi-sélection dédié |
| EF-106 | Mise à jour en temps réel du plan à chaque ajout, modification ou suppression d'un élément. | Élevée | MVP (§3) | ✅ T3 | `frontend/src/features/designer/document-adapter.ts` (`toFlow`/`fromFlow`) + `use-designer-history.ts` — mise à jour locale immédiate (ADR 0003), historique par patchs Immer (undo/redo), document `packages/shared` comme seule source de vérité |
| EF-107 | Regroupement des éléments en zones logiques (DMZ, LAN, WAN, sites distants). | Moyenne | V1 (§3) | 🔨 T3 | `frontend/src/features/designer/element-inspector.tsx` — zones créables et assignables par élément (panneau « Zones logiques ») ; regroupement visuel par étiquette de couleur, pas encore par conteneur géométrique déplaçable |

> **EF-101** cite les « postes clients » : la catégorie `workstation` existe dans le schéma du
> document depuis la Phase 0.5.
>
> **EF-106 — ADR 0003.** La mise à jour temps réel est assurée **en local**, via les fonctions
> pures du paquet partagé. Seule la sauvegarde traverse le réseau et revalide côté serveur.
>
> **T3 — persistance.** Les tables normalisées `Architecture*` (ADR 0001) existaient déjà dans
> la migration initiale, inutilisées ; T3 leur ajoute un module NestJS complet
> (`backend/src/modules/architecture/`, `GET`/`PUT /projects/:id/architecture`, permission
> `architecture.edit` réservée à ARCHITECT/ADMIN) et 8 tests e2e. Aucune nouvelle migration.
> Validation locale de compatibilité/capacité (second volet de l'ADR 0003) : T4.

---

## 3.2 — Module Outils de conception

| Réf. | Exigence | Priorité | Lot | Statut | Où c'est implémenté |
|---|---|---|---|---|---|
| EF-201 | Catalogue de composants référençant des marques et modèles réels (fabricant, référence, caractéristiques techniques). | Élevée | MVP | ✅ T1 — lecture (liste paginée, recherche, filtre par catégorie, portée locataire) et écriture (fabricant/marque idempotents, modèle, modification) testées ; seed 6 fabricants réels, 22 modèles DEMO DATA | `backend/src/modules/catalog/`, `frontend/src/features/admin/catalog-page.tsx` — tests `backend/test/catalog.e2e-spec.ts` |
| EF-202 | Calcul automatique de capacité : bande passante, nombre de ports, puissance électrique, charge estimée. | Élevée | V1 ⚠ | ✅ T4 | `packages/shared/src/architecture/validation.ts` (`checkCapacity`) — ports disponibles vs utilisés, budget PoE vs consommation des équipements reliés, modèle non renseigné ; branché en direct dans le designer |
| EF-203 | Vérification automatique de compatibilité entre équipements (interfaces, protocoles, versions). | Élevée | V1 ⚠ | ✅ T4 | `packages/shared/src/architecture/validation.ts` (`checkCompatibility`) — type de port vs type de lien (fibre), catégorie vs lien sans fil, débit du lien vs débit supporté |
| EF-204 | Détection des anomalies de conception : boucles, sous-dimensionnement, points uniques de défaillance (SPOF). | Moyenne | V2 ⚠ | 🔨 T4 | `packages/shared/src/architecture/validation.ts` (`checkGraphAnomalies`) — boucles (DFS), SPOF (points d'articulation, Tarjan), éléments isolés ; sous-dimensionnement couvert par EF-202. Anomalies physiques (Phase 6, racks/étages) hors périmètre : pas encore de construction physique |
| EF-205 | Génération de diagrammes détaillés : schéma logique, schéma physique, plan d'adressage. | Élevée | MVP (§3) | 🕓 Phases 5, 6 et 8 | — |
| EF-206 | Bibliothèque de modèles d'architectures types (PME, datacenter, multi-sites) réutilisables. | Moyenne | V2 ⚠ | 🕓 Post-Phase 10 | — |
| EF-207 | Attribution et gestion du plan d'adressage IP (sous-réseaux, VLAN). | Moyenne | V1 (§3) | 🕓 Phase 8 | — |

> **EF-205** couvre à lui seul les trois vues du designer, en priorité **Élevée** et donc en
> lot MVP. Il s'étale sur trois phases et ne peut être clos avant la fin de la Phase 8.
>
> **T4 — validation locale (second volet de l'ADR 0003).** Fonctions pures testées (19 tests,
> `validation.spec.ts`) : `checkCapacity` (EF-202), `checkCompatibility` (EF-203),
> `checkGraphAnomalies` (EF-204), combinées par `validateArchitecture`. Branchées en direct dans
> `DesignerCanvas` (recalcul à chaque changement du document, `EquipmentIndex` construit depuis
> le catalogue déjà chargé pour la palette) : aucun aller-retour réseau, conforme à ENF-01.
> Panneau d'anomalies (`ValidationPanel`) : compteurs CRITICAL/WARNING/INFO, tri par sévérité
> (une CRITICAL ne reste jamais masquée derrière des WARNING/INFO plus nombreuses), explication
> en français avec les chiffres concrets (ex. « 2 connexions pour 1 ports disponibles »),
> élément ou connexion concernée. **Écart assumé à ce stade** : la revalidation **côté serveur**
> à la sauvegarde (deuxième moitié de l'ADR 0003 — « une sauvegarde peut être refusée même si
> l'interface affichait compatible ») n'est pas encore câblée sur `PUT /projects/:id/architecture` ;
> `validateArchitecture` n'y est pas encore appelée. À faire avant de clore l'ADR 0003.

---

## 3.3 — Module Rapports clients

| Réf. | Exigence | Priorité | Lot | Statut | Où c'est implémenté |
|---|---|---|---|---|---|
| EF-301 | Export PDF de l'architecture (schémas, légende, mise en page soignée). | Élevée | MVP | 🕓 Phases 5 et 12 | — |
| EF-302 | Génération automatique des spécifications techniques et de la nomenclature (BOM). | Élevée | MVP (§3) | 🕓 Phase 11 | — |
| EF-303 | Estimation des coûts : matériel, licences et, en option, mise en œuvre. | Élevée | MVP (§3) | 🕓 Phase 11 | — |
| EF-304 | Production d'une documentation technique (description des flux, adressage, inventaire des équipements). | Moyenne | V1 (§3) | 🕓 Phase 12 | — |
| EF-305 | Personnalisation des rapports : logo, en-tête client, charte graphique. | Moyenne | V1 | 🕓 Phase 12 | — |
| EF-306 | Export dans d'autres formats : Word, Excel, image, Visio (VSDX). | Moyenne | V1 (§3) ⚑ | 🕓 Phase 12 | — |

> **EF-301** : un PDF minimal est livré dès la fin de la Phase 5, puis enrichi en Phase 12.
>
> **⚑ EF-306** — §4.3 range les exports VSDX, image et Excel sous « Intégrations et
> interopérabilité ». Si le thème « intégrations » de §8.1 les englobe, EF-306 passe en **V2**.
> Arbitrage attendu.

---

## 3.4 — Module Collaboration

| Réf. | Exigence | Priorité | Lot | Statut | Où c'est implémenté |
|---|---|---|---|---|---|
| EF-401 | Partage d'un projet avec d'autres utilisateurs (lien ou invitation). | Élevée | MVP | 🔨 Phases 1 et 3 — partage par affectation à un projet (API, testé) ; invitation et lien en Phase 3 | `backend/src/modules/projects/` (affectations) |
| EF-402 | Gestion fine des droits d'accès : lecture, commentaire, édition. | Élevée | MVP (§3) ⚑ | 🔨 Phases 1 et 10 — portée par rôle, locataire, société cliente et affectation (testé) ; droits lecture / commentaire / édition par projet en Phase 10 | `packages/shared/src/rbac/`, `backend/src/domain/projects/visibility.ts` |
| EF-403 | Commentaires et annotations en temps réel, positionnés sur les éléments. | Moyenne | V1 | 🕓 Phase 10 | — |
| EF-404 | Édition collaborative simultanée avec indication de la présence des utilisateurs. | Moyenne | V2 ⚠ | 🕓 Phase 10 (présence) · post-V2 (co-édition) | — |
| EF-405 | Historique et gestion des versions : comparaison et restauration d'une version antérieure. | Élevée | V1 ⚠ | 🕓 Phase 10 | — |
| EF-406 | Notifications lors d'une modification, d'un commentaire ou d'un partage. | Faible | V2 (§3) ⚑ | 🕓 Phase 10 | — |

> **⚑ EF-402** — « Partage simple » est MVP, « collaboration » est V1 ; des droits *fins* relèvent
> plutôt du second. Lot MVP retenu faute de mention littérale. Arbitrage attendu.
>
> **⚑ EF-406** — Priorité `Faible`, donc « évolution » selon §3 ; mais l'exigence appartient au
> module Collaboration, que §8.1 place en V1. Arbitrage attendu.
>
> **EF-404** se scinde : la présence est livrée en Phase 10, la co-édition dépend de D-05.

---

## 3.5 — Module Administration et gestion des comptes

| Réf. | Exigence | Priorité | Lot | Statut | Où c'est implémenté |
|---|---|---|---|---|---|
| EF-501 | Création et gestion des comptes utilisateurs et des organisations. | Élevée | MVP | 🔨 Phases 1 et 3 — API comptes (création, rôle, désactivation, anonymisation) et sociétés clientes, testées ; liste, recherche et activation/désactivation des comptes livrées ; création et sociétés clientes à poursuivre | `backend/src/modules/users/`, `backend/src/modules/client-companies/`, `frontend/src/features/admin/users-page.tsx` |
| EF-502 | Authentification sécurisée (identifiant / mot de passe, SSO ou OAuth en option). | Élevée | MVP (§3) | ✅ Phase 1 — identifiant / mot de passe ; SSO et OAuth (optionnels) non implémentés | `backend/src/modules/auth/`, `backend/src/security/`, `frontend/src/features/auth/` — tests `backend/test/auth.e2e-spec.ts` |
| EF-503 | Gestion des rôles et permissions (administrateur, concepteur, invité). | Élevée | MVP (§3) | ✅ Phase 1 | `packages/shared/src/rbac/`, `backend/src/security/guards/` — tests `check-permissions.spec.ts`, `users.e2e-spec.ts` |
| EF-504 | Tableau de bord des projets : liste, recherche, filtres, statut. | Moyenne | V1 (§3) | 🔨 Phases 1 et 3 — liste et statut par portail (API : recherche et filtre par statut) ; recherche et filtres à l’écran en Phase 3 | `frontend/src/features/projects/`, `frontend/src/features/dashboard/` |
| EF-505 | Gestion du catalogue de composants par l'administrateur (ajout, mise à jour). | Moyenne | V1 | ✅ T1 — ajout, modification, archivage (ADR 0008) ; `catalog.manage` réservé à l'administrateur, testé | `backend/src/modules/catalog/catalog.service.ts`, `frontend/src/features/admin/catalog-page.tsx` — tests `backend/test/catalog.e2e-spec.ts` |

> **EF-502 — ADR 0010.** Pas d'inscription publique : l'administrateur crée les comptes. La
> création répond de manière identique que l'adresse soit libre ou non (anti-énumération).
>
> **EF-503 : divergence assumée.** Le CDC nomme trois rôles (administrateur, concepteur,
> invité). L'application en implémente six, conformément au diagramme de cas d'utilisation.
> Voir « Écarts assumés ».

---

## 5 — Exigences non fonctionnelles

| Réf. | Domaine | Exigence | Statut | Où c'est implémenté |
|---|---|---|---|---|
| ENF-01 | Performance | Temps de réponse inférieur à 2 s pour les actions courantes ; rendu fluide d'un plan comportant plusieurs centaines d'éléments ; latence de co-édition inférieure à 500 ms. | 🕓 Transverse · mesurée Phase 14 — chunks séparés et chargement paresseux en place | `frontend/vite.config.ts`, `frontend/src/app/router.tsx` |
| ENF-02 | Sécurité | Chiffrement des échanges (TLS) et des données sensibles ; gestion sécurisée des sessions ; conformité à la loi 09-08 relative à la protection des données personnelles (Maroc) et, le cas échéant, au RGPD. | 🔨 Phases 1 et 14 — bcrypt, sessions rotatives révocables, HSTS, anonymisation, rétention, registre (testés) ; TLS de déploiement et chiffrement du volume à la charge de l’hébergement | `backend/src/security/`, `backend/src/domain/`, `backend/src/workers/`, `docs/REGISTRE-TRAITEMENTS.md` |
| ENF-03 | Ergonomie | Interface intuitive et responsive ; prise en main rapide ; interface en français, extensible à l'arabe et à l'anglais. | 🔨 Phase 1 — interface en français, aucune chaîne en dur (test automatique), responsive, bascule RTL prête ; arabe et anglais à traduire | `frontend/src/i18n/` — test `i18n.test.ts` |
| ENF-04 | Disponibilité | Taux de disponibilité cible de 99,5 % ; sauvegardes régulières et plan de reprise d'activité. | 🔨 Phases 1 et 14 — sauvegarde chiffrée, rotation GFS, restauration vérifiée le 18/09/2026, supervision /health ; test chronométré en conditions réelles en Phase 14 | `backend/scripts/`, `docs/RUNBOOK-RESTAURATION.md` |
| ENF-05 | Compatibilité | Support des navigateurs récents (Chrome, Firefox, Edge, Safari) ; usage bureautique prioritaire, tablette en option. | 🔨 Phases 1 et 14 — vérifié sur Edge (bureau et mobile) ; Chrome, Firefox, Safari en Phase 14 | — |
| ENF-06 | Évolutivité | Architecture modulaire permettant la montée en charge et l'ajout de nouveaux modules ; mode multi-organisations. | 🔨 Phase 1 — multi-organisations livré et testé (deux suites d’isolation, filet Prisma) ; montée en charge mesurée en Phase 14 | `backend/src/core/prisma/org-scope.ts` — tests `isolation.e2e-spec.ts` |
| ENF-07 | Traçabilité | Journalisation des actions (audit) et historisation des versions de projet. | 🔨 Phases 1 et 10 — journal d’audit et historique des statuts livrés et testés ; historisation des versions d’architecture en Phase 10 | `backend/src/modules/audit/`, `ProjectStatusHistory` |

---

## Écarts assumés — à présenter au jury

### 1. Priorité et lot — le CDC se contredit

Voir la note d'écart en tête de document et l'ADR 0009.

### 2. Rôles — le CDC est sous-spécifié

EF-503 prévoit trois rôles : administrateur, concepteur, invité. L'application en implémente
six : `ADMIN`, `PROJECT_MANAGER`, `ENGINEER`, `ARCHITECT`, `SALES`, `CLIENT`. Le diagramme de
cas d'utilisation, validé, distingue cinq acteurs métier ; trois rôles ne permettent pas de
représenter ce découpage. L'implémentation **couvre** EF-503 et l'étend. Le rôle « invité »
du CDC n'a pas d'équivalent : il n'y a pas d'inscription publique (ADR 0010).

### 3. Workflow projet et portail client — hors exigences EF

La machine à états du projet et le portail client d'expression du besoin ne correspondent à
aucune exigence du CDC. Numérotation proposée, à valider :

| Réf. proposée | Exigence proposée | Priorité proposée | Lot proposé | Statut |
|---|---|---|---|---|
| EF-506 | Cycle de vie d'un projet piloté par une machine à états, avec transitions contrôlées par rôle, retours en arrière nommés et motivés. | Élevée | MVP | ✅ Phase 1 — `packages/shared/src/workflow/`, `ProjectsService.applyTransition`, dialogue de projet |
| EF-507 | Portail client d'expression du besoin : formulaire multi-étapes, sauvegarde en brouillon, soumission. | Élevée | V1 | 🔨 T2 — cadrage, bâtiments/départements (`useFieldArray`), capacité, réseau et sécurité structurés ; sauvegarde en brouillon locale (par profil) et transaction ProjectRequest (buildings/departments inclus) livrées ; reprise de brouillon **côté serveur** (multi-appareil) sciemment différée — `updateRequestSchema` existe déjà côté `packages/shared` mais n'est câblé à aucune route ; à faire quand un besoin réel de reprise multi-appareil apparaît | `frontend/src/features/request/request-page.tsx`, `backend/src/modules/projects/projects.service.ts` — test `request-page.test.tsx` |
| EF-508 | Consultation, commentaire et validation d'une version publiée par le client. | Moyenne | V1 | 🕓 Phase 11 |

### 4. Chatbot d'assistance client — hors périmètre initial

Aucune exigence du CDC ne couvre l'assistant conversationnel. C'est une **extension hors
périmètre**, à annoncer comme telle.

---

## Ce qui reste à faire sur ce document

1. Arbitrer les trois lots marqués `⚑` : EF-306, EF-402, EF-406.
2. Faire valider la numérotation proposée EF-506 à EF-508.
3. Faire évoluer *Statut* et *Où c'est implémenté* à chaque fin de phase.
