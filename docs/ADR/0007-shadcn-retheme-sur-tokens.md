# ADR 0007 — shadcn/ui re-thémé sur `tokens.css`, tokens en triplets HSL

**Statut** : Accepté — 18/09/2026
**Référence registre** : D-10

## Contexte

La section 9 du brief spécifie le design system au pixel près — hauteur de bouton 36 px, rayon
8 px, états de focus, comportement du `loading` à largeur constante — et impose qu'aucune
couleur ne soit écrite en dur dans un composant.

shadcn/ui apporte des composants accessibles dont **le code est copié dans le dépôt**, donc
entièrement re-thémables. Mais il enveloppe ses variables en `hsl(var(--x))`, ce qui suppose
des valeurs stockées en triplets HSL, alors que les tokens du brief sont donnés en
hexadécimal.

## Décision

shadcn/ui, avec les variables CSS **mappées sur les tokens de `tokens.css`**. Une seule
palette, celle de `tokens.css`.

**Les tokens sont stockés en triplets HSL, avec la valeur hexadécimale en commentaire sur
chaque ligne.**

```css
:root {
  --primary: 220 100% 62%;   /* #3D7DFF */
  --accent:  188 86% 53%;    /* #22D3EE */
}
```

**L'enveloppe `hsl(var(--x))` est conservée.** C'est la raison décisive : elle seule permet les
modificateurs d'opacité de Tailwind — `bg-primary/10`, `bg-white/5` — dont le design system
dépend directement (`--primary-soft` pour les badges et états actifs, fonds de survol des
boutons *secondary* et *ghost*).

## Conséquences

1. Le commentaire hexadécimal est obligatoire sur chaque ligne : sans lui, la palette devient
   illisible en relecture et impossible à rapprocher du brief.
2. Aucune valeur de couleur propre à shadcn ne subsiste après le re-thème. La vérification
   fait partie de la revue de fin de Phase 1.
3. Les composants dont les specs du brief s'écartent de shadcn — Button en particulier, avec
   ses cinq variantes et son `loading` à largeur constante — sont écrits à la main plutôt que
   combattus.
4. `tokens.css` reste le tout premier fichier écrit du projet, avant tout composant.

## Alternative écartée

**Retirer l'enveloppe `hsl()` et référencer directement des tokens hexadécimaux.** Plus direct
à lire, mais fait perdre les modificateurs d'opacité Tailwind, qu'il faudrait alors remplacer
par des variables dédiées pour chaque niveau de transparence — soit exactement la seconde
palette parallèle que la décision interdit.
