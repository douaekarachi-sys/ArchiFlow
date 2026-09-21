import { describe, expect, it } from 'vitest';
import { EMPTY_NEED, type RequestNeed } from '../requests/request.schema.js';
import { answerLocally, missingNeedSteps } from './local-engine.js';

describe('answerLocally (T9 — repli local, sans réseau)', () => {
  it('répond à une question de volumétrie avec le détail du calcul, jamais un chiffre seul', () => {
    const answer = answerLocally('200 employés, combien de switches ?', null);
    expect(answer.key).toBe('chatbot.sizingPorts');
    expect(answer.params).toEqual({ count: 200 });
    expect(answer.steps.length).toBeGreaterThan(0);
    expect(answer.steps[0]!.key).toBe('sizing.ports.formula');
    expect(answer.shouldEscalate).toBe(false);
  });

  it('reconnaît les points d’accès Wi-Fi', () => {
    const answer = answerLocally('Pour 80 postes, combien de points d’accès Wi-Fi ?', null);
    expect(answer.key).toBe('chatbot.sizingAccessPoints');
    expect(answer.params).toEqual({ count: 80 });
  });

  it('reconnaît la bande passante', () => {
    const answer = answerLocally('150 utilisateurs, quelle bande passante ?', null);
    expect(answer.key).toBe('chatbot.sizingBandwidth');
  });

  it('reconnaît la puissance électrique', () => {
    const answer = answerLocally('300 employés, quelle puissance électrique ?', null);
    expect(answer.key).toBe('chatbot.sizingPower');
  });

  it('explique une catégorie d’équipement du catalogue', () => {
    const answer = answerLocally('Qu’est-ce qu’un pare-feu ?', null);
    expect(answer.key).toBe('chatbot.categoryExplained');
    expect(answer.params).toEqual({ category: 'firewall' });
  });

  it('détecte les informations manquantes du besoin exprimé', () => {
    const answer = answerLocally('Est-ce que mon besoin est complet ?', EMPTY_NEED);
    expect(answer.key).toBe('chatbot.needIncomplete');
    expect(answer.steps.length).toBeGreaterThan(0);
  });

  it('confirme un besoin complet sans inventer de manque', () => {
    const complete: RequestNeed = {
      ...EMPTY_NEED,
      location: 'Rabat',
      totalEmployees: 200,
      buildings: [{ name: 'Siège', areaM2: null, floors: 2, description: null }],
      departments: [{ name: 'IT', employees: 10, workstations: 10, location: null, notes: null }],
      serverCount: 4,
      wifi: true,
      vpn: true,
      firewall: true,
      vlan: true,
      vendors: ['cisco'],
    };
    expect(missingNeedSteps(complete)).toEqual([]);
    expect(answerLocally('Mon besoin est-il complet ?', complete).key).toBe('chatbot.needComplete');
  });

  it('propose de transmettre à l’équipe technique quand il ne sait pas répondre — ne décide jamais seul', () => {
    const answer = answerLocally('Quel est le prix total de mon projet ?', null);
    expect(answer.key).toBe('chatbot.fallback');
    expect(answer.shouldEscalate).toBe(true);
  });

  it('un message vide ne casse rien', () => {
    expect(answerLocally('   ', null).key).toBe('chatbot.empty');
  });
});
