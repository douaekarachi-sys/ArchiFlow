# ADR 0010 — Comptes CLIENT créés par l'administrateur, anti-énumération à la création

**Statut** : Accepté — 18/09/2026
**Référence registre** : D-14

## Contexte

Le diagramme de séquence « API gestion des comptes » décrivait une **inscription publique**
créant un compte `role=invite`, et répondait « Email déjà utilisé » quand l'adresse existait.
Trois problèmes :

- le rôle `invite` n'existe pas parmi les six rôles de l'application ;
- un client final n'a aucune raison de s'inscrire seul : il est rattaché à une **société
  cliente** du locataire (ADR 0006), ce qu'une inscription anonyme ne sait pas faire ;
- « Email déjà utilisé » révèle l'existence d'un compte — exactement ce que la règle
  « Identifiants incorrects » interdit à la connexion. Les adresses étant uniques sur toute
  la plateforme, la fuite traverserait même la frontière entre locataires.

## Décision

1. **Aucune inscription publique.** Pas de `POST /auth/register`.
2. Seul un `ADMIN` crée un compte `CLIENT`, via `POST /users`, et le rattache à une société
   cliente de son locataire. Il saisit un **mot de passe provisoire**, haché comme tout mot de
   passe (`hacherMotDePasse`).
3. **Anti-énumération** : la réponse est **identique** que l'adresse soit libre ou non —
   même code HTTP (`202`), même corps, même message « Demande de création prise en compte ».
   Si l'adresse existe déjà, **aucun compte n'est créé**, silencieusement pour l'appelant, et
   la tentative est journalisée dans l'audit.
4. Le compte créé porte `mustChangePassword = true` : à la première connexion, l'utilisateur
   est redirigé vers le changement de mot de passe avant tout autre écran.

## Conséquences

1. Le diagramme est corrigé : acteur administrateur, `creerCompte(nom, email, hash,
   role=CLIENT, idSocieteCliente)`, branche `[email déjà utilisé]` sans message distinctif.
2. L'administrateur constate la création dans la liste des utilisateurs de son locataire.
   Une collision avec un compte **d'un autre locataire** reste invisible pour lui — c'est
   l'objectif.
3. L'administrateur connaît le mot de passe provisoire. Risque accepté, borné par le
   changement obligatoire à la première connexion. Le jour où l'envoi d'e-mails existe, une
   invitation par lien à usage unique pourra remplacer le mot de passe provisoire sans toucher
   au reste du flux.

## Alternatives écartées

- **Inscription publique avec validation ultérieure** : impose un circuit de modération et
  ne résout pas le rattachement à la société cliente.
- **Mot de passe provisoire généré par le serveur et renvoyé à l'administrateur** : la
  réponse différerait selon que le compte a été créé ou non, ce qui réintroduit l'énumération.
