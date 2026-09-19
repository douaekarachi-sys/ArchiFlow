# ADR 0012 — Ajustements de la palette imposés par WCAG AA

**Statut** : Accepté — 18/09/2026
**Référence registre** : D-18

## Contexte

Le brief (§9.1) fixe une palette précise **et** exige que « tout texte respecte WCAG AA
(4,5:1 ; 3:1 pour le texte ≥ 18 px) ». Mesurées, plusieurs combinaisons de la palette
échouent à cette même exigence :

| Combinaison du brief | Contraste | Seuil |
|---|---|---|
| Texte blanc sur `--primary` #3D7DFF (bouton primaire, 14 px) | 3,77 | 4,5 |
| Texte blanc sur `--primary-hover` #5A91FF | 3,03 | 4,5 |
| Texte blanc sur `--critical` #EF4444 (bouton destructif) | 3,76 | 4,5 |
| `--text-muted` #6B7C99 sur `--bg-surface` (sombre) | 4,20 | 4,5 |
| `--text-muted` #7A8CA3 sur `--bg-surface` (clair) | 3,44 | 4,5 |
| Couleurs sémantiques comme texte sur blanc (succès, alerte, info) | 2,1 à 2,3 | 4,5 |
| Anneau de focus #22D3EE sur blanc | 1,81 | 3 (WCAG 1.4.11) |

Les deux exigences ne peuvent pas être satisfaites ensemble. L'accessibilité est une règle ;
une valeur hexadécimale est un moyen.

## Décision

On conserve **toutes** les valeurs du brief là où elles passent, et on ajoute des jetons
dédiés aux usages qui échouent. Aucune couleur n'est supprimée.

| Usage | Jeton | Valeur | Contraste |
|---|---|---|---|
| Fond du bouton primaire (repos / survol / actif) | `--primary-solid*` | #2563EB / #1D4ED8 / #1E40AF | 5,17 / 6,70 / 8,72 |
| Fond du bouton destructif | `--danger-solid*` | #DC2626 / #B91C1C / #991B1B | 4,83 / 6,47 / 8,31 |
| Texte atténué, sombre | `--text-muted` | #7A8BA8 | ≥ 4,5 sur toutes les surfaces |
| Texte atténué, clair | `--text-muted` | #5A6B82 | ≥ 4,5 sur toutes les surfaces |
| Primaire employé comme texte | `--primary-text` | #6B9BFF (sombre) · #2459D6 (clair) | ≥ 4,5 |
| Sémantiques employées comme texte, clair | `--*-text` | #15803D · #B45309 · #B91C1C · #0369A1 | ≥ 4,5 |
| Anneau de focus, clair | `--focus` | #0891B2 | 3,68 |

`--primary` (#3D7DFF), `--accent`, `--success`, `--warning`, `--critical` et `--info` restent
inchangés pour les indicateurs, icônes, bordures, sélections et fonds atténués.

Conséquence pour les boutons : le survol du bouton primaire **assombrit** (#1D4ED8) au lieu
d'éclaircir (#5A91FF) — un éclaircissement ferait tomber le contraste à 3,03.

## Conséquences

1. `frontend/src/styles/tokens.test.ts` vérifie à chaque exécution, dans les deux thèmes,
   les 75 combinaisons texte / fond et focus / fond, ainsi que la correspondance entre chaque
   triplet HSL et sa valeur hexadécimale commentée. Une régression de contraste casse le build.
2. Deux catégories absentes du brief ont reçu une couleur : `wifi-controller` #2DD4BF et
   `workstation` #93C5FD (« postes clients » d'EF-101).
3. Si la palette du brief doit être respectée à la lettre, c'est l'exigence AA qu'il faut
   assouplir explicitement — pas l'inverse, silencieusement.
