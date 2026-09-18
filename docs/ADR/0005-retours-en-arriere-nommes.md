# ADR 0005 — Retours en arrière du workflow : autorisés mais nommés

**Statut** : Accepté — 18/09/2026
**Référence registre** : D-07

## Contexte

Le workflow projet donne une chaîne nominale `DRAFT → … → COMPLETED`, mais aucune boucle de
correction. Or un projet réel repart en arrière : le chef de projet renvoie une conception,
le client demande une modification.

Deux écueils symétriques : un workflow sans retour est inutilisable en production ; un
workflow à retours libres n'est plus un workflow, c'est un champ de statut.

## Décision

Les transitions inverses sont **déclarées explicitement** dans la table de transitions, avec
le marqueur `reverse: true` et leur rôle autorisé. Trois seulement :

```
INTERNAL_REVIEW  → ARCHITECTURE   (PROJECT_MANAGER)
CLIENT_COMMENTS  → REVISION       (PROJECT_MANAGER)
REVISION         → ARCHITECTURE   (ARCHITECT)
```

Toute transition `reverse` impose un **motif obligatoire** et une **entrée d'audit**.

**Depuis `CLIENT_APPROVED`, aucun retour.** On crée une nouvelle version.

## Conséquences

1. `applyTransition` refuse une transition inverse sans texte de motif. Ce n'est pas un champ
   de confort : c'est ce qui rend l'historique d'un projet relisible six mois plus tard, quand
   personne ne se souvient pourquoi la conception est repartie en arrière.
2. Aucun retour arbitraire n'est possible : ce qui n'est pas dans la table n'existe pas.
3. La règle « approuvé ne se rouvre pas » protège la valeur de la validation client. Sans
   elle, `CLIENT_APPROVED` ne signifierait plus rien.
4. Les transitions inverses sont visibles dans l'interface comme des actions distinctes
   (« Renvoyer à l'architecte »), pas comme un changement de statut parmi d'autres.

## Question laissée ouverte

Un `ADMIN` peut-il forcer une transition hors table en cas de blocage opérationnel ? Non
traité à ce stade. Si le besoin apparaît, il devra être une transition nommée de plus, pas une
porte dérobée.
