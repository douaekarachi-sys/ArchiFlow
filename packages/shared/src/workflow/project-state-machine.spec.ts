import { describe, expect, it } from 'vitest';
import { ROLES } from '../rbac/roles.js';
import {
  PROJECT_STATUSES,
  PROJECT_TRANSITIONS,
  availableTransitions,
  canTransition,
  findTransition,
  type ProjectStatus,
} from './project-state-machine.js';

/** Chemin nominal complet, du brouillon a la cloture, avec le role qui fait chaque pas. */
const HAPPY_PATH = [
  ['DRAFT', 'SUBMITTED', 'CLIENT'],
  ['SUBMITTED', 'PENDING_ASSIGNMENT', 'ADMIN'],
  ['PENDING_ASSIGNMENT', 'ASSIGNED', 'ADMIN'],
  ['ASSIGNED', 'ENGINEERING', 'ENGINEER'],
  ['ENGINEERING', 'ARCHITECTURE', 'ENGINEER'],
  ['ARCHITECTURE', 'INTERNAL_REVIEW', 'ARCHITECT'],
  ['INTERNAL_REVIEW', 'COMMERCIAL_REVIEW', 'PROJECT_MANAGER'],
  ['COMMERCIAL_REVIEW', 'CLIENT_REVIEW', 'SALES'],
  ['CLIENT_REVIEW', 'CLIENT_APPROVED', 'CLIENT'],
  ['CLIENT_APPROVED', 'COMPLETED', 'PROJECT_MANAGER'],
] as const;

const FULL_TEAM = ['ENGINEER', 'ARCHITECT', 'PROJECT_MANAGER', 'SALES'] as const;

describe('table de transitions — invariants', () => {
  it('ne declare aucune transition en double', () => {
    const keys = PROJECT_TRANSITIONS.map((t) => `${t.from}->${t.to}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('ne declare aucune transition vers soi-meme', () => {
    expect(PROJECT_TRANSITIONS.filter((t) => t.from === t.to)).toEqual([]);
  });

  it('chaque statut, sauf COMPLETED, a au moins une sortie', () => {
    for (const status of PROJECT_STATUSES) {
      const exits = PROJECT_TRANSITIONS.filter((t) => t.from === status);
      if (status === 'COMPLETED') expect(exits).toEqual([]);
      else expect(exits.length, status).toBeGreaterThan(0);
    }
  });

  it('chaque statut, sauf DRAFT, est atteignable depuis DRAFT', () => {
    const reached = new Set<ProjectStatus>(['DRAFT']);
    let grew = true;
    while (grew) {
      grew = false;
      for (const t of PROJECT_TRANSITIONS) {
        if (reached.has(t.from) && !reached.has(t.to)) {
          reached.add(t.to);
          grew = true;
        }
      }
    }
    expect([...reached].sort()).toEqual([...PROJECT_STATUSES].sort());
  });

  it('declare exactement les trois retours nommes de ADR 0005', () => {
    const reverses = PROJECT_TRANSITIONS.filter((t) => t.reverse).map((t) => `${t.from}->${t.to}`);
    expect(reverses.sort()).toEqual(
      ['CLIENT_COMMENTS->REVISION', 'INTERNAL_REVIEW->ARCHITECTURE', 'REVISION->ARCHITECTURE'].sort(),
    );
  });

  it("n'autorise aucune sortie de CLIENT_APPROVED autre que la cloture", () => {
    const exits = PROJECT_TRANSITIONS.filter((t) => t.from === 'CLIENT_APPROVED');
    expect(exits.map((t) => t.to)).toEqual(['COMPLETED']);
  });
});

describe('canTransition — chemin nominal', () => {
  it.each(HAPPY_PATH)('%s -> %s par %s', (from, to, role) => {
    const check = canTransition({ from, to, role, assignedRoles: FULL_TEAM });
    expect(check.allowed).toBe(true);
  });
});

describe('canTransition — refus', () => {
  it('refuse une transition absente de la table', () => {
    const check = canTransition({ from: 'DRAFT', to: 'COMPLETED', role: 'ADMIN' });
    expect(check).toMatchObject({ allowed: false, refusal: 'UNKNOWN_TRANSITION' });
  });

  it('refuse un saut direct de la conception a la validation client', () => {
    const check = canTransition({ from: 'ARCHITECTURE', to: 'CLIENT_APPROVED', role: 'ARCHITECT' });
    expect(check).toMatchObject({ allowed: false, refusal: 'UNKNOWN_TRANSITION' });
  });

  it('refuse un role non autorise, ADMIN compris', () => {
    const check = canTransition({ from: 'CLIENT_REVIEW', to: 'CLIENT_APPROVED', role: 'ADMIN' });
    expect(check).toMatchObject({ allowed: false, refusal: 'ROLE_NOT_ALLOWED' });
  });

  it('seul le client valide une proposition', () => {
    for (const role of ROLES) {
      const check = canTransition({ from: 'CLIENT_REVIEW', to: 'CLIENT_APPROVED', role });
      expect(check.allowed, role).toBe(role === 'CLIENT');
    }
  });

  it('refuse de confirmer les affectations sans ingenieur ni architecte', () => {
    const check = canTransition({
      from: 'PENDING_ASSIGNMENT',
      to: 'ASSIGNED',
      role: 'ADMIN',
      assignedRoles: ['ENGINEER'],
    });
    expect(check).toMatchObject({ allowed: false, refusal: 'MISSING_ASSIGNMENTS', detail: 'ARCHITECT' });
  });

  it('refuse un retour en arriere sans motif', () => {
    for (const reason of [undefined, '', '   ']) {
      const check = canTransition({
        from: 'INTERNAL_REVIEW',
        to: 'ARCHITECTURE',
        role: 'PROJECT_MANAGER',
        reason,
      });
      expect(check).toMatchObject({ allowed: false, refusal: 'REASON_REQUIRED' });
    }
  });

  it('accepte un retour en arriere motive', () => {
    const check = canTransition({
      from: 'INTERNAL_REVIEW',
      to: 'ARCHITECTURE',
      role: 'PROJECT_MANAGER',
      reason: 'Redondance du coeur de reseau absente',
    });
    expect(check.allowed).toBe(true);
  });

  it("verifie le role avant le motif : un intrus n'apprend pas qu'un motif manque", () => {
    const check = canTransition({ from: 'INTERNAL_REVIEW', to: 'ARCHITECTURE', role: 'SALES' });
    expect(check).toMatchObject({ allowed: false, refusal: 'ROLE_NOT_ALLOWED' });
  });
});

describe('availableTransitions', () => {
  it("propose au chef de projet les deux issues de la revue interne", () => {
    const targets = availableTransitions('INTERNAL_REVIEW', 'PROJECT_MANAGER').map((t) => t.to);
    expect(targets.sort()).toEqual(['ARCHITECTURE', 'COMMERCIAL_REVIEW']);
  });

  it('ne propose rien au commercial pendant la conception', () => {
    expect(availableTransitions('ARCHITECTURE', 'SALES')).toEqual([]);
  });

  it('retrouve une transition par ses extremites', () => {
    expect(findTransition('REVISION', 'ARCHITECTURE')?.reverse).toBe(true);
  });
});
