# ADR 0018 — Chatbot client : repli local par défaut, fournisseur externe optionnel

**Statut** : Accepté — 21/09/2026
**Référence registre** : D-12

## Contexte

`docs/DECISIONS-OUVERTES.md` posait D-12 (fournisseur LLM du chatbot) comme ouverte, à trancher
avant la Phase 13, avec une recommandation par défaut : agrégats seulement, jamais de données
nominatives vers un tiers, et un mode « assistant local sans LLM » comme option viable.

T9 devait livrer une version minimale mais réelle, démontrable **sans connexion Internet**.

## Décision

**`ChatbotService.answer()` utilise le moteur LOCAL par défaut** (`packages/shared/src/chatbot/
local-engine.ts`, fonction pure `answerLocally`, zéro appel réseau) — pas un fournisseur LLM
externe. L'abstraction `AIService` existe (interface implicite : `answer(ctx, projectId,
message)`), mais aucune implémentation externe réelle n'est câblée dans cette tranche : aucune
clé de fournisseur n'est disponible dans cet environnement, et en brancher une sans l'avoir
choisie avec le client serait une intégration fictive.

`ENV.AI_PROVIDER_API_KEY` (optionnelle) est le point d'extension prévu : sa présence future
sélectionnera un fournisseur externe sans changer l'API du contrôleur ni le contrat
`ChatAnswer`. Tant qu'elle est absente — **le cas par défaut** — le repli local répond seul.

Le moteur local répond à trois familles de questions, avec le détail du calcul (jamais un
chiffre seul, même règle que le reste du domaine) :
1. **Volumétrie** — réutilise `calculateSizing` (T4/Phase 4) : « 200 employés, combien de
   switches ? ».
2. **Catégories d'équipement** — dictionnaire de descriptions, un synonyme français par
   catégorie du catalogue (les codes `EQUIPMENT_CATEGORIES` sont en anglais).
3. **Complétude du besoin** — réutilise `requestStepDone`/`REQUEST_STEPS` (EF-507, T2) : jamais
   de « besoin incomplet » vague, toujours les rubriques précises manquantes.

**Le chatbot ne décide jamais seul.** Hors de ces trois familles, il répond `chatbot.fallback`
(`shouldEscalate: true`) et propose de transmettre à l'équipe technique — `POST
/projects/:id/chat/escalate` écrit une entrée d'audit réelle (`chat.escalated`, ENF-07), pas un
accusé de réception fictif : aucun système de messagerie/ticketing n'existe encore (EF-403,
Phase 10), l'audit est le canal de traçabilité disponible aujourd'hui.

## Conséquences

1. Démontrable sans Internet : condition explicite de cette tranche, satisfaite par construction
   (le mode par défaut ne fait aucun appel réseau).
2. Accès strictement scopé : `ChatbotService.answer` passe par `ProjectsService.get` (portée
   ADR 0006 déjà appliquée) — un CLIENT ne peut interroger que ses propres projets, 404 sinon.
3. Si un fournisseur externe est choisi plus tard, la question des données autorisées à sortir
   (recommandation du registre : agrégats seulement, jamais de données nominatives) reste
   entière et devra faire l'objet d'un nouvel ADR au moment du choix — celui-ci ne la tranche
   pas, il la reporte volontairement avec l'abstraction prête à l'accueillir.

## Alternative écartée

**Brancher un fournisseur externe réel dès T9** — écarté : aucune clé disponible dans cet
environnement de démonstration, aucun choix de fournisseur/budget validé avec le client. Une
intégration non fonctionnelle (clé absente en permanence) n'aurait rien apporté de plus que
l'abstraction déjà en place.
