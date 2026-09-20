import type { ProjectStatus } from '@archiflow/shared';
import { PROJECT_STATUSES } from '@archiflow/shared';
import { describe, expect, it } from 'vitest';
import { CLIENT_STAGES, clientStage, clientStageIndex } from './client-progress';

describe('clientStage', () => {
  it('associe chaque statut interne à une étape du langage client', () => {
    expect(clientStage('DRAFT')).toBe('request');
    expect(clientStage('SUBMITTED')).toBe('request');
    expect(clientStage('ENGINEERING')).toBe('analysis');
    expect(clientStage('ARCHITECTURE')).toBe('design');
    expect(clientStage('CLIENT_REVIEW')).toBe('validation');
    expect(clientStage('COMPLETED')).toBe('validation');
  });

  it('couvre les 13 statuts du workflow, sans exception qui romprait le rendu', () => {
    for (const status of PROJECT_STATUSES as readonly ProjectStatus[]) {
      expect(CLIENT_STAGES).toContain(clientStage(status));
    }
  });

  it('la progression est monotone le long du chemin nominal', () => {
    const happyPath: ProjectStatus[] = [
      'DRAFT', 'SUBMITTED', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'ENGINEERING',
      'ARCHITECTURE', 'INTERNAL_REVIEW', 'COMMERCIAL_REVIEW', 'CLIENT_REVIEW',
      'CLIENT_APPROVED', 'COMPLETED',
    ];
    let previous = -1;
    for (const status of happyPath) {
      const index = clientStageIndex(status);
      expect(index).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
  });
});
