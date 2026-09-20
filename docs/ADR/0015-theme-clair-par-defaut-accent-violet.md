# ADR 0015 — Thème clair par défaut, accent violet unique

**Statut** : Accepté — 19/09/2026
**Référence registre** : D-21

## Contexte

L'audit visuel de la Phase 1 (voir le rapport d'audit joint à la demande de refonte) a mis en
évidence deux problèmes qui dépassent la simple préférence esthétique :

1. **Un bug d'architecture CSS.** `tokens.css` redéfinissait les jetons `--dashboard-*` trois
   fois : une valeur sombre dans le bloc `:root, [data-theme='dark']`, une valeur claire dans
   un bloc `:root` inconditionnel placé plus loin dans le fichier. À spécificité égale, la
   déclaration la plus tardive du fichier l'emportait **quel que soit le thème choisi** — le
   tableau de bord, le catalogue et la file des demandes restaient donc figés en clair même en
   thème sombre. Ce n'était pas un choix, c'était un accident de cascade.
2. **Une direction de référence.** Le commanditaire a fourni une capture d'écran de référence
   (console de sécurité cloud) dont l'interface est **claire par défaut**, avec une seule
   couleur d'action (violet) réservée à l'élément actif de la navigation, aux boutons
   principaux, aux liens et à la sélection — jamais dispersée en décoration.

Rien dans les ADR précédents n'imposait le sombre par défaut : l'ADR 0007 tranche le
re-thémage de shadcn/ui et le format des tokens (triplets HSL, hexadécimal en commentaire),
pas la valeur par défaut du thème. Cet ADR reste donc pleinement valide et n'est **pas**
remplacé — seule la direction visuelle change.

## Décision

1. **Thème clair par défaut.** `:root` porte directement les valeurs claires ; le thème sombre
   devient une surcharge explicite (`:root[data-theme='dark']`) plus une bascule automatique
   (`@media (prefers-color-scheme: dark)`) pour le réglage « Système ». Les deux blocs sombres
   portent des valeurs identiques, vérifiées par un test dédié (`tokens.test.ts`) — sans quoi
   ils divergeraient silencieusement au premier oubli.
2. **Une seule couleur d'action : violet `#6D28D9`** (`--primary`), utilisée pour l'entrée
   active de la navigation, les boutons principaux, les liens et les sélections. Elle est
   volontairement rare : le reste de l'interface reste neutre.
3. **Jetons `--dashboard-*` réintégrés dans les blocs de thème**, avec les mêmes valeurs que le
   reste de l'application — ce n'est plus une palette séparée. C'est le correctif du bug
   d'architecture ci-dessus, pas seulement un changement de couleur.
4. **Cinq niveaux de sévérité** (`--critical`, `--high`, `--warning`, `--success`, `--info`),
   alignés sur le besoin des futurs blocs d'anomalies (EF-204) plutôt que sur les quatre
   niveaux hérités de la palette initiale.
5. **Trois choix de thème, pas deux** : Clair, Sombre, Système — Système par défaut, qui suit
   `prefers-color-scheme` et se met à jour en direct. Le choix explicite est mémorisé dans
   `localStorage`, lecture et écriture protégées par `try/catch` ; si le stockage est
   indisponible, l'interface se comporte comme si « Système » était choisi.

## Conséquences

1. **Écart AA assumé, dans la continuité de l'ADR 0012.** La teinte violette brute et deux des
   cinq couleurs de sévérité échouent l'AA en tant que texte sur fond clair (`#F59E0B` : 2,15:1,
   `#E8590C` : 3,58:1) : des jetons `-text` dédiés, plus sombres, couvrent cet usage — mêmes
   valeurs `--critical` que `--critical-text` là où la teinte brute suffit déjà, une valeur
   distincte ailleurs. Le detail chiffré est en commentaire dans `tokens.css`.
2. **`--text-muted` sombre ajusté** (`#7E8AA0`, plus clair que la proposition initiale) : la
   valeur la plus stricte est la surface la plus claire du thème sombre (`--bg-elevated`,
   modales et menus) — un jeton unique doit passer AA sur les trois surfaces sombres à la fois.
3. **`prefers-reduced-motion` inchangé** : les transitions restent 120–200 ms, jamais
   décoratives, et coupées à la demande de l'utilisateur.
4. **Migration à coût nul pour les composants existants.** Les composants qui consomment déjà
   les jetons sémantiques (`bg-surface`, `text-fg`, `border-line`…) héritent de la nouvelle
   palette sans modification — c'est précisément ce que le paquet de tokens est censé
   garantir. Seuls les écrans qui contournaient les jetons (page de connexion, ADR 0007 non
   respecté) exigent une réécriture, traitée séparément dans le plan de refonte.

## Alternatives écartées

- **Corriger uniquement le bug de cascade, garder le sombre par défaut et l'ancienne palette
  bleue.** Aurait réglé le bug sans répondre à la direction visuelle demandée — un correctif
  qu'il aurait fallu refaire une seconde fois immédiatement après.
- **Deux palettes actives en parallèle (ancienne + nouvelle), bascule par future
  fonctionnalité.** Recrée exactement la classe de bug à l'origine de cet ADR : deux sources de
  vérité pour la même couleur ne restent jamais synchronisées longtemps.
