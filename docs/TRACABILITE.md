# Traçabilité au cahier des charges

**Statut : version 18 — recette automatisée + gestion des données par l'interface, tranche T14/T15 (22/09/2026).** Colonne *Lot* : ADR 0009.

> **Mode « recette » (22/09/2026).** Un audit manuel a montré un écart entre les comptes rendus
> précédents et l'application réellement testée (entrées « Bientôt disponible » toujours grisées,
> onglets sans effet). Depuis ce point, « terminé » signifie : vérifié par `e2e/recette.spec.ts`
> (Playwright, `npm run test:e2e`), qui se connecte réellement avec chacun des six comptes et
> clique chaque entrée de navigation. Score courant : **25/36 vérifications passent** — le détail
> des 11 restantes est sous chaque exigence concernée ci-dessous et dans `.tmp/recette/findings.json`.

Les libellés de la colonne *Exigence* sont repris **mot pour mot** du cahier des charges
(tableaux 3.1 à 3.5 et 5). Ils ne doivent pas être reformulés lors des mises à jour.

Mise à jour : à chaque fin de phase.

## État global (21/09/2026, fin de la tranche T13)

**✅ Livré et testé** : authentification et RBAC (Phase 1), tenancy à deux niveaux (Phase 1),
machine à états et workflow (Phase 1), catalogue — lecture et administration (T1, EF-201/505),
demande client — cadrage et bâtiments/départements (T2, EF-507 partiel), concepteur 2D (T3,
EF-101 à EF-107), moteurs de capacité/compatibilité/anomalies avec revalidation serveur (T4,
ADR 0003 fermée, EF-202/203), versions d'architecture — snapshot auto-porteur, diff sémantique,
restauration (T5, EF-405), BOM et coûts dérivés (T6, EF-302, matériel+licences d'EF-303), export
PDF minimal (T7, EF-301, D-11 fermée), validation client — publication, consultation,
commentaire, validation, notification (T10, EF-508), plan d'adressage IP/VLAN — VLAN, CIDR,
passerelle, plage DHCP, rattachement aux équipements, validation des chevauchements/conflits,
tableau dans le PDF (T11, EF-207), construction physique minimale — bâtiment → étage → salle →
baie → position U, rattachement d'un équipement, navigation dans la vue 3D (T12, partie « schéma
physique » d'EF-205), partage d'un projet — inviter un utilisateur de l'organisation avec un
droit lecture/commentaire/édition, vérifié côté serveur (T13, EF-401/402).

**🔨 Livré en périmètre réduit, écart documenté** : détection d'anomalies structurelles limitée
au graphe logique, les anomalies physiques restent à faire (dépassement de capacité d'une salle,
alimentation d'une baie — T4/EF-204) ; coût de mise en œuvre volontairement non chiffré, aucune
donnée de tarif horaire au catalogue (T6, EF-303) ; chatbot en repli local uniquement, fournisseur
LLM externe non câblé, aucune clé disponible (T9, D-12 partiellement tranchée) ; construction
physique sans câblage détaillé, comme demandé (T12, EF-205) ; droit « commentaire » du partage
stocké et vérifiable mais fonctionnellement identique à « lecture » tant qu'EF-403 (commentaires)
n'est pas livré — aucune action de commentaire n'existe encore pour s'y accrocher (T13, EF-402).

**⛔ Hors périmètre assumé** : co-édition temps réel CRDT (EF-404, dépend de D-05) ; chatbot
lui-même hors CDC par nature, livré comme extension (voir « Écarts assumés » ci-dessous) ; lien
de partage public (explicitement exclu par la demande, EF-401).

**🕓 Planifié, non commencé** : bibliothèque de modèles d'architecture (EF-206), commentaires et
présence temps réel (EF-403, Phase 10 — donnerait enfin un sens fonctionnel au droit « commentaire »
du partage), personnalisation des rapports et formats d'export additionnels (EF-304/305/306,
Phase 12).

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
| EF-104 | Basculement entre une vue 2D (schéma logique) et une vue 3D (implantation physique : baies, salle serveur). | Moyenne | V2 ⚠ | ✅ T8 (consultation) + T12 (navigation bâtiment → étage → salle → baie réelle) | `frontend/src/features/designer3d/` (`Designer3DPage`, `buildScene3D`, `SiteNavigator`) — test `scene-layout.test.ts`, `designer-3d-page.test.tsx` |
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
>
> **T8 — vue 3D, périmètre volontairement réduit.** `buildScene3D` dérive la scène du MÊME
> document que le designer 2D (ADR 0001, aucun second modèle) : orbite, zoom, sélection d'un
> équipement avec panneau d'informations, bascule 2D ↔ 3D, chunk Three.js chargé paresseusement
> (jamais atteint depuis un tableau de bord). **Écarts assumés, à annoncer** : (1) navigation
> bâtiment → étage → salle → baie dépend de `placement`, posé par la construction physique
> (Phase 6, pas encore livrée) — tant qu'aucun élément n'a de `placement`, la vue retombe
> honnêtement sur un plan à plat plutôt que de simuler une hiérarchie inexistante ; (2) chaque
> équipement est un maillage individuel, pas une instance géométrique groupée — correct pour les
> tailles de plan de démonstration, pas optimisé pour plusieurs centaines d'éléments (ENF-01).

---

## 3.2 — Module Outils de conception

| Réf. | Exigence | Priorité | Lot | Statut | Où c'est implémenté |
|---|---|---|---|---|---|
| EF-201 | Catalogue de composants référençant des marques et modèles réels (fabricant, référence, caractéristiques techniques). | Élevée | MVP | ✅ T1 — lecture (liste paginée, recherche, filtre par catégorie, portée locataire) et écriture (fabricant/marque idempotents, modèle, modification) testées ; seed 6 fabricants réels, 22 modèles DEMO DATA | `backend/src/modules/catalog/`, `frontend/src/features/admin/catalog-page.tsx` — tests `backend/test/catalog.e2e-spec.ts` |
| EF-202 | Calcul automatique de capacité : bande passante, nombre de ports, puissance électrique, charge estimée. | Élevée | V1 ⚠ | ✅ T4 | `packages/shared/src/architecture/validation.ts` (`checkCapacity`, capacité d'une architecture déjà posée) ; `packages/shared/src/sizing/engineering-sizing.ts` (`calculateSizing`, proposition chiffrée à partir du besoin client — ports, switches, bande passante, points d'accès, puissance) branché sur le portail ingénieur, `frontend/src/features/engineer/sizing-page.tsx` |
| EF-203 | Vérification automatique de compatibilité entre équipements (interfaces, protocoles, versions). | Élevée | V1 ⚠ | ✅ T4 | `packages/shared/src/architecture/validation.ts` (`checkCompatibility`) — type de port vs type de lien (fibre), catégorie vs lien sans fil, débit du lien vs débit supporté |
| EF-204 | Détection des anomalies de conception : boucles, sous-dimensionnement, points uniques de défaillance (SPOF). | Moyenne | V2 ⚠ | 🔨 T4 (logique) + T12 (position U hors baie, conflit de position, `checkPlacement`) | `packages/shared/src/architecture/validation.ts` (`checkGraphAnomalies`), `packages/shared/src/physical/placement.ts` (`checkPlacement`) — boucles (DFS), SPOF (Tarjan), éléments isolés, conflits de position U ; sous-dimensionnement couvert par EF-202. Anomalies physiques de capacité (surcharge d'une salle/baie en volume) hors périmètre |
| EF-205 | Génération de diagrammes détaillés : schéma logique, schéma physique, plan d'adressage. | Élevée | MVP (§3) | ✅ T3 (logique), T11 (adressage), T12 (physique, minimal) | `frontend/src/features/designer/` (logique), `packages/shared/src/network/addressing.ts` (adressage), `packages/shared/src/physical/placement.ts` + `element-inspector.tsx` (`PhysicalSitesManager`, physique) |
| EF-206 | Bibliothèque de modèles d'architectures types (PME, datacenter, multi-sites) réutilisables. | Moyenne | V2 ⚠ | 🕓 Post-Phase 10 | — |
| EF-207 | Attribution et gestion du plan d'adressage IP (sous-réseaux, VLAN). | Moyenne | V1 (§3) | ✅ T11 | `packages/shared/src/network/addressing.ts` (`checkAddressing`, `parseCidr`, `cidrsOverlap`), `packages/shared/src/architecture/document.schema.ts` (`ipNetworkSchema`), `frontend/src/features/designer/element-inspector.tsx` (`NetworksManager`) — tests `addressing.spec.ts`, `document.schema.spec.ts`, `architecture.e2e-spec.ts`, `reports.e2e-spec.ts` |

> **EF-205** couvre à lui seul les trois vues du designer, en priorité **Élevée** et donc en
> lot MVP. Les trois vues sont maintenant livrées : schéma logique (T3), plan d'adressage (T11),
> schéma physique minimal (T12) — sans câblage physique détaillé, comme demandé.
>
> **T12 — construction physique minimale (schéma physique d'EF-205, 21/09/2026).** Bâtiment →
> étage → salle → baie, dans le MÊME document que le reste (ADR 0001) : `Building`/`Floor`/
> `Room`/`Rack`, chaque niveau référençant son parent par id (superRefine, comme networks/zones),
> normalisés côté serveur (`ArchitectureBuilding/Floor/Room/Rack`, migration additive
> `20260921210020`) + figés dans le snapshot de version. `ArchitectureElement.placement`
> (colonne JSON déjà posée en Phase 1) rattache un élément à une baie et une position U — inchangée
> dans sa forme, maintenant adossée à des entités réelles plutôt qu'à des identifiants libres.
> Conflit de position U entre deux éléments d'une même baie, position U hors des bornes de la
> baie : anomalies CRITICAL (`checkPlacement`, `packages/shared/src/physical/placement.ts`),
> mêmes règles en local et en revalidation serveur (ADR 0003), même panneau que les autres
> familles d'anomalies. Côté designer 2D, `PhysicalSitesManager` (`element-inspector.tsx`) crée la
> chaîne complète en un seul ajout (réutilise bâtiment/étage/salle déjà nommés) ; le rattachement
> d'un équipement se fait par un sélecteur de baie + position U dans l'inspecteur d'élément. Côté
> vue 3D, `SiteNavigator` (`designer3d/designer-3d-page.tsx`) offre quatre listes en cascade
> (bâtiment → étage → salle → baie) qui filtrent réellement la scène affichée à la baie choisie —
> la navigation EF-104 fonctionne désormais avec de vraies données, plus seulement une vue à plat.
> Pas de câblage physique détaillé (hors périmètre explicite de ce point).
>
> **T11 — plan d'adressage IP/VLAN (EF-207, 21/09/2026).** Un réseau (`IpNetwork` : nom, VLAN,
> CIDR, passerelle, plage DHCP) vit dans le MÊME document d'architecture (ADR 0001), comme les
> zones — normalisé (`ArchitectureNetwork`, migration additive `20260921204442`) + figé dans le
> snapshot de version. Rattachement à un équipement par `element.networkId` (référence, pas de
> duplication). Validation croisée — chevauchements de sous-réseaux et conflits de VLAN entre
> plusieurs réseaux — dans `checkAddressing` (`packages/shared/src/network/addressing.ts`,
> IPv4 pur, sans dépendance), branchée dans `validateArchitecture` : mêmes règles en local
> (retour instantané, ADR 0003) et en revalidation serveur à la sauvegarde (même fonction, fait
> autorité). CIDR/VLAN mal formés, passerelle ou plage DHCP hors du sous-réseau : anomalies
> CRITICAL/WARNING avec le détail du calcul, dans le même panneau que les anomalies EF-202/203/204.
> Tableau d'adressage (réseau, VLAN, sous-réseau, passerelle, plage DHCP, équipements rattachés)
> ajouté au PDF (EF-301). IPv6 hors périmètre CDC.
>
> **T4 — validation locale (second volet de l'ADR 0003).** Fonctions pures testées (19 tests,
> `validation.spec.ts`) : `checkCapacity` (EF-202), `checkCompatibility` (EF-203),
> `checkGraphAnomalies` (EF-204), combinées par `validateArchitecture`. Branchées en direct dans
> `DesignerCanvas` (recalcul à chaque changement du document, `EquipmentIndex` construit depuis
> le catalogue déjà chargé pour la palette) : aucun aller-retour réseau, conforme à ENF-01.
> Panneau d'anomalies (`ValidationPanel`) : compteurs CRITICAL/WARNING/INFO, tri par sévérité
> (une CRITICAL ne reste jamais masquée derrière des WARNING/INFO plus nombreuses), explication
> en français avec les chiffres concrets (ex. « 2 connexions pour 1 ports disponibles »),
> élément ou connexion concernée.
>
> **ADR 0003 close (20/09/2026).** La revalidation côté serveur est câblée sur
> `PUT /projects/:id/architecture` (`ArchitectureService.save`) : `validateArchitecture` y est
> réexécuté avec un `EquipmentIndex` reconstruit depuis le catalogue en base (jamais celui envoyé
> par le client). Une anomalie CRITICAL rejette la sauvegarde (422, code
> `ARCHITECTURE_INCOMPATIBLE`, `details.anomalies`) **avant** la transaction — rien n'est écrit.
> Le designer affiche les anomalies renvoyées avec la même traduction que le panneau local.
> Tests : deux scénarios envoient une architecture invalide **directement à l'API**, sans passer
> par l'interface (boucle CRITICAL, dépassement de ports CRITICAL) et vérifient le rejet **et**
> l'absence d'écriture.
>
> **Portail ingénieur (20/09/2026).** Le portail était vide : « Catalogue », « Analyse du
> besoin » et « Calculs de capacité » restaient des entrées de menu grisées (« Phase 4 »), alors
> que le rôle qui dimensionne dans le CDC n'avait aucun outil. Corrections : `catalog.read` (déjà
> accordé à l'ingénieur par la matrice de permissions) donne maintenant un accès réel en
> consultation (`/engineer/catalog`, actions d'administration masquées via `catalog.manage`) ;
> « Analyse du besoin » affiche le besoin client en lecture pour un projet affecté
> (`need-analysis-page.tsx`, réutilise `RequestOverview` du détail projet) ; « Calculs de
> capacité » expose `calculateSizing` avec, pour chaque carte, la trace complète du calcul
> (`sizing-page.tsx`) — jamais un chiffre seul. Les deux derniers sont des outils **par projet**
> (comme le concepteur 2D) : un sélecteur de projet précède l'écran de calcul.

---

## 3.3 — Module Rapports clients

| Réf. | Exigence | Priorité | Lot | Statut | Où c'est implémenté |
|---|---|---|---|---|---|
| EF-301 | Export PDF de l'architecture (schémas, légende, mise en page soignée). | Élevée | MVP | 🔨 T7 — informations client, schéma logique vectoriel, équipements, BOM, coûts ; personnalisation (logo, charte) reportée Phase 12 | `backend/src/modules/reports/` (`ReportsService`, `pdf-document.tsx`) — test `reports.e2e-spec.ts` |
| EF-302 | Génération automatique des spécifications techniques et de la nomenclature (BOM). | Élevée | MVP (§3) | ✅ T6 | `packages/shared/src/architecture/bom.ts` (`buildBom`) — `backend/src/modules/architecture/bom.controller.ts` (`GET /projects/:id/bom`), `frontend/src/features/bom/bom-page.tsx` — tests `bom.spec.ts`, `architecture.e2e-spec.ts`, `bom-page.test.tsx` |
| EF-303 | Estimation des coûts : matériel, licences et, en option, mise en œuvre. | Élevée | MVP (§3) | 🔨 T6 — matériel et licences dérivés et chiffrés ; mise en œuvre honnêtement non estimée (aucune donnée de tarif horaire au catalogue, exigence « en option ») | même implémentation qu'EF-302 |
| EF-304 | Production d'une documentation technique (description des flux, adressage, inventaire des équipements). | Moyenne | V1 (§3) | 🕓 Phase 12 | — |
| EF-305 | Personnalisation des rapports : logo, en-tête client, charte graphique. | Moyenne | V1 | 🕓 Phase 12 | — |
| EF-306 | Export dans d'autres formats : Word, Excel, image, Visio (VSDX). | Moyenne | V1 (§3) ⚑ | 🕓 Phase 12 | — |

> **EF-301** : le PDF minimal prévu pour la fin de la Phase 5 est livré en T7 (D-11 tranchée,
> [ADR 0017](ADR/0017-pdf-react-pdf-renderer.md)) — contenu dérivé de la dernière version
> sauvegardée (ADR 0001), jamais du catalogue courant. Enrichissement (logo, charte, formats
> additionnels) en Phase 12.
>
> **T6 — BOM et coûts.** `buildBom` agrège les éléments d'un document par modèle catalogue
> (quantité, prix unitaire, sous-total), à partir du snapshot de la **dernière version
> sauvegardée** — jamais du catalogue courant (ADR 0001) : un test vérifie que changer le prix
> catalogue APRÈS la sauvegarde ne modifie pas le BOM déjà chiffré. Nouveau champ
> `EquipmentModel.licenseAnnualCost` (migration additive `20260920222904_equipment_license_cost`,
> distincte du prix matériel) : le total « Licences » est réel, jamais estimé. **Mise en œuvre**
> affichée mais volontairement **non chiffrée** — inventer un tarif horaire sans donnée catalogue
> aurait été une donnée fictive présentée comme réelle ; le CDC la classe « en option ».
> Visible dans le portail Commercial (`/sales/bom`), et pour ADMIN/PROJECT_MANAGER.
>
> **⚑ EF-306** — §4.3 range les exports VSDX, image et Excel sous « Intégrations et
> interopérabilité ». Si le thème « intégrations » de §8.1 les englobe, EF-306 passe en **V2**.
> Arbitrage attendu.

---

## 3.4 — Module Collaboration

| Réf. | Exigence | Priorité | Lot | Statut | Où c'est implémenté |
|---|---|---|---|---|---|
| EF-401 | Partage d'un projet avec d'autres utilisateurs (lien ou invitation). | Élevée | MVP | ✅ T13 — invitation par identifiant utilisateur, jamais de lien public (demande explicite) | `backend/src/modules/projects/projects.service.ts` (`share`/`unshare`), `frontend/src/features/projects/project-detail-dialog.tsx` (`ShareActions`) — test `projects.e2e-spec.ts` |
| EF-402 | Gestion fine des droits d'accès : lecture, commentaire, édition. | Élevée | MVP (§3) ⚑ | 🔨 T13 — droit borné par projet (`ProjectShare.right`), vérifié côté serveur ; lecture et édition pleinement fonctionnelles, commentaire stocké mais sans action à gater tant qu'EF-403 n'existe pas | `backend/prisma/schema.prisma` (`ProjectShare`), `packages/shared/src/projects/project.schema.ts` (`createShareSchema`) — test `projects.e2e-spec.ts` (describe « partage (T13, EF-401/402) ») |
| EF-403 | Commentaires et annotations en temps réel, positionnés sur les éléments. | Moyenne | V1 | 🕓 Phase 10 | — |
| EF-404 | Édition collaborative simultanée avec indication de la présence des utilisateurs. | Moyenne | V2 ⚠ | 🕓 Phase 10 (présence) · post-V2 (co-édition) | — |
| EF-405 | Historique et gestion des versions : comparaison et restauration d'une version antérieure. | Élevée | V1 ⚠ | ✅ T5 | `backend/src/modules/architecture/architecture.service.ts` (`persist`/`listVersions`/`getVersion`/`diffVersions`/`restoreVersion`), `packages/shared/src/architecture/diff.ts` (`diffArchitecture`) — `frontend/src/features/versions/versions-page.tsx` — tests `backend/test/architecture.e2e-spec.ts`, `diff.spec.ts`, `versions-page.test.tsx` |
| EF-406 | Notifications lors d'une modification, d'un commentaire ou d'un partage. | Faible | V2 (§3) ⚑ | 🔨 T10 — notification e-mail *best-effort* aux transitions du workflow client (publication, commentaire, validation) uniquement ; pas encore sur une modification ou un partage quelconque | `backend/src/modules/projects/projects.service.ts` (`notifyTransition`), `backend/src/modules/mail/` |

> **⚑ EF-402** — « Partage simple » est MVP, « collaboration » est V1 ; des droits *fins* relèvent
> plutôt du second. Lot MVP retenu faute de mention littérale. Arbitrage attendu.
>
> **⚑ EF-406** — Priorité `Faible`, donc « évolution » selon §3 ; mais l'exigence appartient au
> module Collaboration, que §8.1 place en V1. Arbitrage attendu.
>
> **EF-404** se scinde : la présence est livrée en Phase 10, la co-édition dépend de D-05.
>
> **T13 — partage et droits (EF-401, EF-402, 21/09/2026).** `ProjectShare` (migration additive
> `20260921211731`) : un droit borné (`READ`/`COMMENT`/`EDIT`) par couple projet/utilisateur,
> distinct de `ProjectAssignment` (qui reste le mécanisme d'affectation par rôle projet, inchangé).
> Toujours un utilisateur DE L'ORGANISATION, identifié par id — jamais un compte CLIENT, jamais de
> lien public (refusé explicitement, testé). Deux effets, tous deux vérifiés côté serveur :
> **visibilité** — `ProjectsService.scope()` rend le projet visible à un utilisateur partagé même
> sans affectation (`GET /projects`, `GET /projects/:id`) ; **édition** — `ArchitectureService
> .persist()` (`assertCanEditViaShare`) exige `right = 'EDIT'` pour un accès qui ne vient QUE d'un
> partage (ni ADMIN, ni affecté) — un droit `READ` seul est refusé (403) à la sauvegarde de
> l'architecture. Réinviter le même utilisateur change son droit (upsert), sans doublon. Nouvelle
> permission `project.share` (ADMIN, PROJECT_MANAGER) — la matrice de rôles elle-même
> (`PERMISSION_MATRIX`) reste inchangée (D-04) : le partage ne contourne jamais les permissions de
> rôle, il ajoute une portée par-projet, exactement comme `ProjectAssignment` le fait déjà. Droit
> `COMMENT` : stocké, retourné par l'API, distinct de `READ` dans le modèle de données — mais sans
> action serveur à gater tant que le module de commentaires (EF-403) n'existe pas ; se comporte
> donc comme `READ` en pratique aujourd'hui, écart assumé et annoncé ci-dessus. `comment.create`
> existe déjà dans `PERMISSION_MATRIX` depuis la Phase 1 (jamais câblé à une route) : EF-403
> pourra s'appuyer directement sur cette permission et sur le droit `COMMENT` du partage sans
> nouvelle décision RBAC.
>
> **T5 — versions (ADR 0001).** Chaque sauvegarde de l'architecture (y compris une restauration)
> crée une nouvelle `ArchitectureVersion`, jamais n'écrase la précédente : snapshot auto-porteur
> (`frozenSpec` par élément — nom, référence, caractéristiques, **prix et devise au moment du
> gel**), dans la MÊME transaction que les tables normalisées. `diffArchitecture` compare deux
> versions par identifiant d'élément stable et regroupe par catégorie (« +2 switches, −1
> pare-feu » — exemple du brief reproduit littéralement en test) ; un élément déplacé ne compte
> pour rien, un modèle remplacé compte comme « modifié ». Restaurer rejoue la topologie
> historique **à travers le même chemin que la sauvegarde** : revalidée contre le catalogue actuel
> (ADR 0003), figée avec les prix actuels — une restauration est un événement de sauvegarde comme
> un autre, pas une exception. Accessible depuis le concepteur (bouton « Historique ») et depuis
> le portail chef de projet (menu « Versions », `phase 10` levé pour cette destination précise).

---

## 3.5 — Module Administration et gestion des comptes

| Réf. | Exigence | Priorité | Lot | Statut | Où c'est implémenté |
|---|---|---|---|---|---|
| EF-501 | Création et gestion des comptes utilisateurs et des organisations. | Élevée | MVP | ✅ T15 — création, modification (identité, rattachement société), changement de rôle, réinitialisation de mot de passe, désactivation/réactivation ; sociétés clientes : créer/modifier/archiver ; tout depuis l'interface, plus l'API seule | `backend/src/modules/users/`, `backend/src/modules/client-companies/`, `frontend/src/features/admin/users-page.tsx`, `frontend/src/features/admin/client-companies-page.tsx` — tests `users.e2e-spec.ts`, `client-companies.e2e-spec.ts` |
| EF-502 | Authentification sécurisée (identifiant / mot de passe, SSO ou OAuth en option). | Élevée | MVP (§3) | ✅ Phase 1 — identifiant / mot de passe ; SSO et OAuth (optionnels) non implémentés | `backend/src/modules/auth/`, `backend/src/security/`, `frontend/src/features/auth/` — tests `backend/test/auth.e2e-spec.ts` |
| EF-503 | Gestion des rôles et permissions (administrateur, concepteur, invité). | Élevée | MVP (§3) | ✅ Phase 1 | `packages/shared/src/rbac/`, `backend/src/security/guards/` — tests `check-permissions.spec.ts`, `users.e2e-spec.ts` |
| EF-504 | Tableau de bord des projets : liste, recherche, filtres, statut. | Moyenne | V1 (§3) | 🔨 Phases 1 et 3 — liste et statut par portail (API : recherche et filtre par statut) ; recherche et filtres à l’écran en Phase 3 | `frontend/src/features/projects/`, `frontend/src/features/dashboard/` |
| EF-505 | Gestion du catalogue de composants par l'administrateur (ajout, mise à jour). | Moyenne | V1 | ✅ T1 (ajout) + T15 (modification câblée à l'écran — l'API existait, le formulaire d'édition manquait) ; archivage (ADR 0008) ; `catalog.manage` réservé à l'administrateur, testé | `backend/src/modules/catalog/catalog.service.ts`, `frontend/src/features/admin/catalog-page.tsx` — tests `backend/test/catalog.e2e-spec.ts` |

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
>
> **Tableaux de bord repris (20/09/2026).** Les six portails affichaient la même page générique
> (onglets non fonctionnels, contrôle « mes projets/organisation » inerte, bloc « Progression des
> livraisons » non stylé donc tronqué). Repris avec le langage visuel validé de `/dev/ui`
> (`KpiCard`+barre empilée, `MultiColumnStat`, `RankedList`, `Panel`) et des données réellement
> disponibles (aucune UI décorative sans donnée derrière) : répartition par statut mutuellement
> exclusive (`status-groups.ts`, testé), projets sans mise à jour récente (`stale-projects.ts`,
> testé). Portail CLIENT distinct : son projet, sa progression en 4 étapes non techniques
> (`client-progress.ts`, testé — jamais les 13 statuts internes), sa prochaine action réelle
> (`GET /projects/:id/transitions`, pas de texte inventé), sans colonne société ni bouton
> « + Nouveau » redondant avec « Nouvelle demande ». `dashboard-page.test.tsx` couvre les deux
> profils.
| ENF-04 | Disponibilité | Taux de disponibilité cible de 99,5 % ; sauvegardes régulières et plan de reprise d'activité. | 🔨 Phases 1 et 14 — sauvegarde chiffrée, rotation GFS, restauration vérifiée le 18/09/2026, supervision /health ; test chronométré en conditions réelles en Phase 14 | `backend/scripts/`, `docs/RUNBOOK-RESTAURATION.md` |
| ENF-05 | Compatibilité | Support des navigateurs récents (Chrome, Firefox, Edge, Safari) ; usage bureautique prioritaire, tablette en option. | 🔨 Phases 1 et 14 — vérifié sur Edge (bureau et mobile) ; Chrome, Firefox, Safari en Phase 14 | — |
| ENF-06 | Évolutivité | Architecture modulaire permettant la montée en charge et l'ajout de nouveaux modules ; mode multi-organisations. | 🔨 Phase 1 — multi-organisations livré et testé (deux suites d’isolation, filet Prisma) ; montée en charge mesurée en Phase 14 | `backend/src/core/prisma/org-scope.ts` — tests `isolation.e2e-spec.ts` |
>
> **Alerte levée et refermée (20/09/2026).** Connecté en `client@archiflow.local`, 13 projets
> d'autres sociétés semblaient visibles. Cause réelle : le **seed** de démonstration, pas le
> filtre serveur — tous les projets démo étaient rattachés à la même société cliente
> (« Groupe Atlas Services »), la seconde société créée restait vide. Le filtre
> `clientCompanyId` (`ProjectsService.scope`) était déjà correct et déjà couvert par
> `isolation.e2e-spec.ts` (« sa liste ne contient que les projets de sa société »). Corrections :
> seed peuplant **trois** sociétés clientes distinctes avec comptes CLIENT et projets séparés
> (`backend/prisma/seed/index.ts`), et test renforcé reproduisant le symptôme observé (13 projets
> supplémentaires dans une autre société, toujours 0 fuite).
| ENF-07 | Traçabilité | Journalisation des actions (audit) et historisation des versions de projet. | ✅ Phases 1, 5 et T15 — journal d’audit (API + écran `/admin/audit`, auteur résolu), historique des statuts et versions d’architecture livrés et testés | `backend/src/modules/audit/`, `frontend/src/features/admin/audit-page.tsx`, `ProjectStatusHistory` |

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
| EF-508 | Consultation, commentaire et validation d'une version publiée par le client. | Moyenne | V1 | ✅ T10 | `backend/src/modules/projects/projects.service.ts` (`applyTransition`, `notifyTransition`), `frontend/src/app/router.tsx` (routes CLIENT `design`/`bom` lecture seule), `frontend/src/features/projects/project-detail-dialog.tsx` — tests `backend/test/projects.e2e-spec.ts` (describe « validation client (T10, EF-401/402) ») |

### 4. Chatbot d'assistance client — hors périmètre initial, livré en T9 (🔨)

Aucune exigence du CDC ne couvre l'assistant conversationnel. C'est une **extension hors
périmètre**, à annoncer comme telle.

**T9 (21/09/2026).** `packages/shared/src/chatbot/local-engine.ts` (`answerLocally`, fonction
pure, testée) — moteur de repli **local, sans réseau**, mode par défaut (D-12,
[ADR 0018](ADR/0018-chatbot-repli-local-par-defaut.md)) : réutilise `calculateSizing` (T4) pour
les questions de volumétrie avec le détail du calcul, explique les catégories d'équipement,
détecte les rubriques manquantes du besoin exprimé via `requestStepDone` (T2). Ne décide jamais
seul : hors de ces trois familles de questions, propose de transmettre à l'équipe technique —
`POST /projects/:id/chat/escalate` journalise réellement dans l'audit (ENF-07), pas un accusé de
réception fictif. Accès scopé au projet du CLIENT connecté (ADR 0006, 404 hors périmètre).
Fournisseur LLM externe : abstraction prête (`ChatbotService.answer`, `AI_PROVIDER_API_KEY`),
aucune implémentation réelle câblée — aucune clé disponible dans cet environnement, aucun
fournisseur choisi. Page `frontend/src/features/chatbot/`, nav CLIENT « Assistant ». Tests :
`local-engine.spec.ts` (9 cas), `chatbot.e2e-spec.ts` (5 cas, dont l'audit réel et l'isolation
entre sociétés clientes), `chatbot-page.test.tsx`.

### 5. Validation client — EF-508, clôture du parcours de bout en bout (T10)

**T10 (21/09/2026).** La machine à états (`packages/shared/src/workflow/`) proposait déjà les
transitions `COMMERCIAL_REVIEW → CLIENT_REVIEW` (SALES publie), `CLIENT_REVIEW →
CLIENT_COMMENTS` (le client demande des modifications) et `CLIENT_REVIEW → CLIENT_APPROVED` (le
client valide) ; elles n'étaient reliées à aucune notification et le motif du client n'était
conservé que pour les retours en arrière (ADR 0005). T10 ferme ces trois manques :

- `ProjectsService.applyTransition` conserve désormais le motif fourni pour **toute** transition
  (pas seulement les retours en arrière au sens de l'ADR 0005, qui reste inchangée) ;
- `notifyTransition` envoie un e-mail **best-effort** (une panne d'envoi ne bloque jamais la
  transition, testé) : aux CLIENT de la société à `CLIENT_REVIEW` (« Proposition disponible »),
  au chef de projet affecté à `CLIENT_APPROVED` (« validé ») et à `CLIENT_COMMENTS` (motif du
  client inclus dans le texte) ;
- le CLIENT peut désormais consulter l'architecture (lecture seule, `frontend/src/features/
  designer/designer-page.tsx` retombe déjà en lecture seule sans `architecture.edit`), le BOM et
  les coûts, et télécharger le PDF depuis le dialogue de détail projet — les trois boutons de
  découverte (`project-detail-dialog.tsx`) et les routes correspondantes (`router.tsx`) sont
  nouveaux.

Chaque transition reste auditée (`AuditLog`, action `project.transition`), comme toutes les
transitions du workflow depuis la Phase 1 — T10 n'a rien changé à l'audit lui-même, seulement à
la notification et à la persistance du motif. Tests : 4 nouveaux cas dans
`backend/test/projects.e2e-spec.ts` (publication notifiée, validation notifiée+auditée,
commentaire avec motif persisté et transmis, panne d'envoi non bloquante) — 20/20 dans ce
fichier, suite complète backend et frontend au vert.

**Écart assumé** : la notification reste un e-mail simple (pas de centre de notifications
in-app, pas de badge non-lu) — suffisant pour « notification simple » demandé, pas une
implémentation d'EF-406 dans sa généralité (voir la ligne EF-406 ci-dessus).

---

## Ce qui reste à faire sur ce document

1. Arbitrer les trois lots marqués `⚑` : EF-306, EF-402, EF-406.
2. Faire valider la numérotation proposée EF-506 à EF-508.
3. Faire évoluer *Statut* et *Où c'est implémenté* à chaque fin de phase.
