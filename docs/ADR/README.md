# Journal des décisions d'architecture (ADR)

Une décision = un fichier court : contexte, décision, conséquences, alternatives écartées.
Un ADR accepté ne se modifie pas — s'il est remis en cause, on en écrit un nouveau qui le
remplace et on marque l'ancien « Remplacé par ADR NNNN ».

| ADR | Décision | Registre | Statut |
|---|---|---|---|
| [0001](0001-stockage-architecture-hybride.md) | Stockage hybride du document d'architecture | D-01 | Accepté |
| [0002](0002-paquet-partage-zod.md) | Paquet partagé, Zod pour unique dépendance | D-02 | Accepté |
| [0003](0003-validation-locale-autorite-serveur.md) | Validation locale, autorité serveur | D-03 | Accepté |
| [0004](0004-permissions-en-code.md) | Matrice de permissions en code | D-04 | Accepté |
| [0005](0005-retours-en-arriere-nommes.md) | Retours en arrière nommés et motivés | D-07 | Accepté |
| [0006](0006-tenancy-deux-niveaux.md) | Multi-tenancy à deux niveaux | D-09 | Accepté |
| [0007](0007-shadcn-retheme-sur-tokens.md) | shadcn/ui re-thémé, tokens en HSL | D-10 | Accepté |
| [0008](0008-archivage-catalogue.md) | Archivage au catalogue, jamais de suppression | D-13 | Accepté |

Décisions encore ouvertes, sans ADR à ce stade : **D-05** (périmètre du temps réel),
**D-11** (génération du PDF), **D-12** (fournisseur LLM). Voir `../DECISIONS-OUVERTES.md`.

## Action documentaire en attente

**ADR 0003** entraîne une correction du fichier `.drawio` du diagramme de séquence
« Conception architecture ». À effectuer dès réception du dossier de travail.
