import type { ProjectStatus } from '@archiflow/shared';
import { describe, expect, it } from 'vitest';
import { statusGroup, statusSegments } from './status-groups';

const label = (group: string) => group;

describe('statusGroup', () => {
  it('classe chaque statut dans exactement un groupe', () => {
    expect(statusGroup('DRAFT')).toBe('draft');
    expect(statusGroup('ENGINEERING')).toBe('inProgress');
    expect(statusGroup('CLIENT_REVIEW')).toBe('awaitingClient');
    expect(statusGroup('CLIENT_COMMENTS')).toBe('awaitingClient');
    expect(statusGroup('CLIENT_APPROVED')).toBe('done');
    expect(statusGroup('COMPLETED')).toBe('done');
  });
});

describe('statusSegments', () => {
  it('la somme des segments vaut toujours le nombre total de projets (mutuellement exclusifs)', () => {
    const statuses: ProjectStatus[] = ['DRAFT', 'SUBMITTED', 'ENGINEERING', 'CLIENT_REVIEW', 'CLIENT_COMMENTS', 'COMPLETED', 'CLIENT_APPROVED'];
    const projects = statuses.map((status) => ({ status }));
    const segments = statusSegments(projects, label);
    expect(segments.reduce((sum, s) => sum + s.value, 0)).toBe(projects.length);
  });

  it('omet les groupes vides plutôt que d’afficher un segment à zéro', () => {
    const segments = statusSegments([{ status: 'DRAFT' }], label);
    expect(segments).toEqual([{ key: 'draft', label: 'draft', value: 1, colorClass: 'bg-line-strong' }]);
  });

  it('une liste vide ne produit aucun segment', () => {
    expect(statusSegments([], label)).toEqual([]);
  });
});
