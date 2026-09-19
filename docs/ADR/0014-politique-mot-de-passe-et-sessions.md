# ADR 0014 — Politique de mot de passe et de session

**Statut** : Accepté — 18/09/2026
**Référence registre** : D-20

## Contexte

ENF-02 exige une « gestion sécurisée des sessions ». Le paquet partagé fixait 8 caractères
minimum. Les diagrammes de séquence imposent un message unique « Identifiants incorrects ».

## Décision

**Mots de passe**
- **12 caractères minimum**, 128 maximum, sans règle de composition imposée : la longueur
  protège mieux que les règles de complexité, qui produisent des mots de passe prévisibles.
- bcrypt, coût 12 (refusé en dessous en production). Comparaison factice quand le compte
  n'existe pas, pour égaliser le temps de réponse.
- Changer son mot de passe invalide tous les jetons antérieurs et révoque toutes les sessions.

**Sessions**
- Jeton d'accès JWT HS256, **15 minutes**, gardé **en mémoire** par le frontend.
- Jeton de rafraîchissement **opaque** (256 bits), **30 jours**, en cookie `httpOnly`,
  `SameSite=Strict`, `Secure` en production, limité au chemin `/api/v1/auth`. Seule son
  empreinte SHA-256 est stockée.
- **Rotation à chaque usage** ; la réutilisation d'un jeton déjà échangé révoque toute sa
  famille (vol présumé).
- À chaque requête, l'utilisateur est **relu en base** : désactivation et changement de rôle
  prennent effet immédiatement.
- Limitation de débit sur `/auth/login`, `/auth/forgot`, `/auth/reset`, `/auth/password` :
  10 requêtes par minute et par adresse IP.

## Conséquences

1. Une lecture en base par requête authentifiée : coût accepté, négligeable devant ENF-01.
2. Le frontend mutualise le rafraîchissement (une seule requête en vol) : sans cela, deux
   onglets déclencheraient la détection de réutilisation.
3. Le MFA prévu par le brief s'ajoutera comme une étape entre la vérification du mot de passe
   et l'émission des jetons, sans changer ce modèle.
