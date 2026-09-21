# ADR 0017 — Génération du PDF : `@react-pdf/renderer`, côté serveur

**Statut** : Accepté — 20/09/2026
**Référence registre** : D-11

## Contexte

`docs/DECISIONS-OUVERTES.md` posait trois options pour EF-301 (export PDF) :

| Option | Rendu | Coût |
|---|---|---|
| **A** — Puppeteer côté serveur | Excellent, réutilise le rendu HTML/CSS réel | Dépendance Chromium, image plus lourde |
| **B** — `@react-pdf/renderer` | Correct, mise en page à réécrire | Pas de Chromium, mais duplication du design |
| **C** — génération côté client | Variable | Dépend du poste client, difficile à automatiser |

T7 devait livrer une version minimale mais réelle, sans faire dépendre l'image serveur d'un
Chromium complet (Puppeteer) ni du poste de l'utilisateur.

## Décision

**Option B** — `@react-pdf/renderer`, exécuté **côté serveur** (`backend/src/modules/reports/`),
jamais dans le navigateur. Le document PDF est un arbre de composants React
(`Document`/`Page`/`View`/`Text`/`Svg`) rendu en buffer (`renderToBuffer`) et streamé par
`GET /projects/:id/report/pdf`.

**Le schéma logique n'est PAS un second modèle** (ADR 0001) : `LogicalDiagram` dessine des
rectangles et des traits directement à partir des `position.x`/`position.y` du même
`ArchitectureDocument` que le concepteur 2D — mêmes données, rendu vectoriel différent, pas de
duplication de données.

## Conséquences

1. `react` devient une dépendance backend (peer de `@react-pdf/renderer`), sans jamais toucher
   au DOM : uniquement des composants au sens JSX, jamais rendus dans un navigateur. Un fichier
   `.tsx` unique (`pdf-document.tsx`), JSX activé dans `tsconfig.json`/`tsconfig.check.json`
   pour ce seul usage.
2. Mise en page à écrire à la main (pas de réutilisation directe du CSS Tailwind du designer) —
   accepté comme coût de l'option B, cohérent avec le choix initial du registre.
3. Rendu en **niveaux de gris uniquement** (contrainte du brief : le PDF s'imprime en noir et
   blanc, aucun statut ni catégorie n'y est porté par la couleur seule).
4. Le contenu vient du **snapshot de la dernière version sauvegardée** (`ArchitectureVersion`),
   jamais des tables de travail courantes ni du catalogue actuel — même garantie de
   reproductibilité que le BOM (ADR 0001, T6).
5. Si la qualité de mise en page devient insuffisante (mise en page complexe, pagination fine),
   l'option A (Puppeteer) reste ouverte pour un enrichissement en Phase 12 — ce choix n'est pas
   irréversible, `ReportsService` encapsule entièrement le moteur de rendu.

## Alternative écartée

**Option A (Puppeteer)** — reportée : dépendance Chromium significative pour un export PDF T7
minimal ; à reconsidérer en Phase 12 si les besoins de mise en page (pagination multi-schémas,
vue 3D en image) dépassent ce que `@react-pdf/renderer` peut raisonnablement produire.
