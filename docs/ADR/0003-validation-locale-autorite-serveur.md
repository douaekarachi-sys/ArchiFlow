# ADR 0003 — Validation locale au glisser-déposer, autorité serveur à la sauvegarde

**Statut** : Accepté — 18/09/2026
**Référence registre** : D-03

## Contexte

Le diagramme de séquence « Conception architecture » plaçait `verifierCompatibilite` et
`calculerCapacite` côté serveur, **à l'intérieur du bloc `loop`**, donc à chaque équipement
déposé sur le canvas.

Appliqué à la lettre, cela impose un aller-retour réseau par glisser-déposer. Incompatible
avec deux exigences :

- **ENF-01** — temps de réponse inférieur à 2 s, rendu fluide de plusieurs centaines
  d'éléments.
- **EF-106** — mise à jour en temps réel du plan à chaque ajout, modification ou suppression.

## Décision

`verifierCompatibilite` et `calculerCapacite` s'exécutent **en local**, via les fonctions pures
de `packages/shared` (ADR 0002). Seul `sauvegarderProjet` traverse le réseau, et le serveur
**revalide et fait autorité**.

## Conséquences

1. Retour visuel sans latence réseau, y compris sur une grande architecture.
2. Aucune divergence possible entre les deux validations : c'est **le même code** qui tourne
   des deux côtés (ADR 0002).
3. Le client n'est jamais l'autorité. Une sauvegarde peut être refusée même si l'interface
   affichait « compatible » — l'interface doit donc savoir présenter ce refus proprement, ce
   n'est pas un cas théorique.
4. **Correction documentaire due.** Le fichier `.drawio` du diagramme « Conception
   architecture » doit être modifié : sortir les deux appels du bloc `loop` côté serveur pour
   en faire des appels internes au client, et les rattacher à `sauvegarderProjet`. Les
   branches `alt [compatible]` / `alt [incompatible]` restent, mais se jouent localement.
   **À faire dès réception du dossier de travail.**
5. À présenter en soutenance comme une décision d'architecture — validation optimiste,
   autorité serveur — et non comme un écart au diagramme.

## Alternative écartée

**Suivre le diagramme à la lettre.** Un appel serveur par dépôt d'équipement. Les diagrammes
seraient restés exacts sans retouche, au prix d'une expérience dépendante du réseau et d'un
risque direct sur ENF-01. Corriger un diagramme coûte moins cher que corriger une architecture.
