import { calculateSizing, type SizingInput, type SizingStep } from '../sizing/engineering-sizing.js';
import type { EquipmentCategory } from '../architecture/document.schema.js';
import { REQUEST_STEPS, requestStepDone, type RequestNeed, type RequestStep } from '../requests/request.schema.js';

/**
 * Chatbot client (T9) — moteur de repli LOCAL, sans réseau : mode par défaut, l'application doit
 * être démontrable sans Internet. Il ne décide jamais seul — il répond aux questions de
 * volumétrie avec le détail du calcul (jamais un chiffre seul, même règle que le reste du
 * domaine), explique les catégories d'équipement, détecte les informations manquantes, et
 * propose de transmettre à l'équipe technique quand il ne sait pas répondre.
 *
 * Fonction pure (ADR 0002) : pas d'accès réseau, pas d'appel externe. `AIService` (backend)
 * l'appelle par défaut ; un fournisseur LLM externe reste une implémentation alternative,
 * désactivée si aucune clé n'est configurée.
 */

export interface ChatAnswer {
  /** Clé i18n de la réponse — jamais un texte en dur (ENF-03), comme Anomaly.code et SizingStep.key. */
  key: string;
  params?: Record<string, string | number>;
  steps: SizingStep[];
  /** Vrai quand le moteur local ne peut pas répondre : le chatbot conseille de transmettre, il ne décide jamais seul. */
  shouldEscalate: boolean;
}

const EMPLOYEE_PATTERN = /(\d+)\s*(employ|poste|utilisateur|salari)/i;
const CATEGORY_QUESTION = /(?:qu[’']est[- ]ce qu[’']|c[’']est quoi|définition de|à quoi sert)\s*(?:un|une|le|la|l[’'])?\s*([a-zàâäéèêëïîôöùûüç-]+)/i;

/** Le CDC et les utilisateurs parlent français ; les codes de catégorie (EQUIPMENT_CATEGORIES) sont en anglais. */
const CATEGORY_SYNONYMS: Record<string, EquipmentCategory> = {
  'pare-feu': 'firewall',
  'parefeu': 'firewall',
  firewall: 'firewall',
  routeur: 'router',
  router: 'router',
  commutateur: 'switch',
  switch: 'switch',
  'point d’accès': 'access-point',
  "point d'accès": 'access-point',
  'point d’acces': 'access-point',
  borne: 'access-point',
  'contrôleur wifi': 'wifi-controller',
  'controleur wifi': 'wifi-controller',
  serveur: 'server',
  server: 'server',
  stockage: 'storage',
  storage: 'storage',
  'répartiteur de charge': 'load-balancer',
  'repartiteur de charge': 'load-balancer',
  onduleur: 'ups',
  baie: 'rack',
  rack: 'rack',
  'poste client': 'workstation',
  poste: 'workstation',
  workstation: 'workstation',
  internet: 'internet',
};

function findCategory(text: string): EquipmentCategory | null {
  const normalized = text.toLowerCase();
  for (const [term, category] of Object.entries(CATEGORY_SYNONYMS)) {
    if (normalized.includes(term)) return category;
  }
  return null;
}

function extractCount(question: string): number | null {
  const match = question.match(EMPLOYEE_PATTERN);
  return match ? Number(match[1]) : null;
}

function sizingInputFrom(count: number): SizingInput {
  return { workstationCount: count, totalEmployees: count, serverCount: null, wifi: true };
}

/** Étapes du besoin non encore renseignées (REQUEST_STEPS) — jamais un « besoin incomplet » vague. */
export function missingNeedSteps(need: RequestNeed): RequestStep[] {
  return REQUEST_STEPS.filter((step) => !requestStepDone(step, need));
}

export function answerLocally(question: string, need: RequestNeed | null): ChatAnswer {
  const q = question.trim();
  if (q.length === 0) {
    return { key: 'chatbot.empty', steps: [], shouldEscalate: false };
  }

  // Volumétrie : "200 employés, combien de switches ?"
  const count = extractCount(q);
  if (count != null && count > 0) {
    const sizing = calculateSizing(sizingInputFrom(count));
    if (/switch|commutateur|port/i.test(q)) {
      return { key: 'chatbot.sizingPorts', params: { count }, steps: sizing.ports.steps, shouldEscalate: false };
    }
    if (/wifi|wi-fi|point[s]? d[’']acc[eè]s|borne/i.test(q)) {
      return { key: 'chatbot.sizingAccessPoints', params: { count }, steps: sizing.accessPoints.steps, shouldEscalate: false };
    }
    if (/bande passante|d[eé]bit|mbps|bandwidth/i.test(q)) {
      return { key: 'chatbot.sizingBandwidth', params: { count }, steps: sizing.bandwidth.steps, shouldEscalate: false };
    }
    if (/puissance|[eé]lectri|watt/i.test(q)) {
      return { key: 'chatbot.sizingPower', params: { count }, steps: sizing.power.steps, shouldEscalate: false };
    }
    // Un chiffre reconnu mais l'intention non identifiée : proposer le dimensionnement complet.
    return {
      key: 'chatbot.sizingGeneric',
      params: { count },
      steps: [...sizing.ports.steps, ...sizing.bandwidth.steps, ...sizing.accessPoints.steps],
      shouldEscalate: false,
    };
  }

  // Catégorie d'équipement : "qu'est-ce qu'un pare-feu ?"
  const categoryMatch = q.match(CATEGORY_QUESTION);
  const category = categoryMatch ? findCategory(categoryMatch[1] ?? '') : findCategory(q);
  if (category) {
    return { key: 'chatbot.categoryExplained', params: { category }, steps: [{ key: `chatbot.categoryDescription.${category}` }], shouldEscalate: false };
  }

  // Complétude du besoin exprimé.
  if (/manque|incomplet|complet|besoin/i.test(q) && need) {
    const missing = missingNeedSteps(need);
    if (missing.length === 0) {
      return { key: 'chatbot.needComplete', steps: [], shouldEscalate: false };
    }
    return {
      key: 'chatbot.needIncomplete',
      params: { count: missing.length },
      steps: missing.map((step) => ({ key: `chatbot.needStep.${step}` })),
      shouldEscalate: false,
    };
  }

  // Le moteur local ne sait pas répondre : il conseille de transmettre, il ne décide jamais seul.
  return { key: 'chatbot.fallback', steps: [], shouldEscalate: true };
}
