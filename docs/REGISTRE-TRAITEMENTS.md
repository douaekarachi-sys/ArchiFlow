# Registre des traitements — loi 09-08 / RGPD (ENF-02)

*Document préparatoire. La déclaration à la CNDP est une obligation du **responsable de
traitement** — l'organisation qui exploite la plateforme — et ne s'implémente pas : elle se
fait. Ce registre est le document qui sert à la préparer.*

**Constat structurant** : aucune donnée sensible au sens de la loi 09-08 n'est traitée (ni
santé, ni opinions, ni appartenance, ni données bancaires). C'est ce qui justifie le niveau
des mesures ci-dessous.

| # | Traitement | Finalité | Personnes | Données | Base légale | Destinataires | Durée | Mesures |
|---|---|---|---|---|---|---|---|---|
| 1 | Comptes et authentification | Accès sécurisé à la plateforme | Utilisateurs internes et clients | Nom, prénom, e-mail, rôle, organisation, date de dernière connexion, empreinte du mot de passe | Exécution du contrat | Administrateurs de l'organisation | Relation + revue à 12 mois d'inactivité | bcrypt (coût 12), TLS, sessions révocables, isolation par organisation |
| 2 | Sessions | Maintien de la connexion | Utilisateurs | Empreinte SHA-256 du jeton, dates d'émission, d'expiration et de révocation | Intérêt légitime (sécurité) | Aucun | 30 jours ; 7 jours après révocation | Jeton jamais stocké en clair, cookie httpOnly |
| 3 | Contacts client | Conduite des projets | Interlocuteurs des sociétés clientes | Nom, e-mail, téléphone, fonction | Exécution du contrat | Équipe projet affectée | Projet + 3 ans | Visibles des seuls utilisateurs habilités ; anonymisation |
| 4 | Journal d'audit | Traçabilité (ENF-07), sécurité | Tous les utilisateurs | Identifiant de l'auteur, action, cible, horodatage | Intérêt légitime | Administrateurs de l'organisation | 12 mois glissants | Jamais de mot de passe, de jeton ni de corps d'authentification |
| 5 | Contenus projet | Conception et proposition commerciale | Tous les utilisateurs | Auteur des versions, commentaires, annotations | Exécution du contrat | Membres du projet, client concerné | Durée de vie du projet | Isolation par organisation et par société cliente |
| 6 | Sauvegardes | Continuité (ENF-04) | Tous | Copie intégrale de la base | Intérêt légitime | Exploitant | Rotation GFS : 7 j, 4 sem., 12 mois | Chiffrement AES-256-GCM, copie hors machine |

## Mesures techniques communes

- Chiffrement des échanges : TLS obligatoire, HSTS, redirection HTTP → HTTPS.
- Données au repos : chiffrement du volume PostgreSQL (à la charge de l'hébergement) ;
  sauvegardes chiffrées par l'application.
- Chiffrement applicatif champ par champ : **écarté** (ARCHITECTURE-CIBLE §6.12).
- Isolation multi-organisations vérifiée par deux suites de tests automatisés.
