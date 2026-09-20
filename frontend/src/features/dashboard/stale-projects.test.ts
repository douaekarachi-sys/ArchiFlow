import { describe, expect, it } from 'vitest';
import { staleProjects } from './stale-projects';

const NOW = new Date('2026-09-20T00:00:00.000Z').getTime();
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

describe('staleProjects', () => {
  it('classe par ancienneté décroissante, le plus ancien en tête', () => {
    const result = staleProjects(
      [
        { id: 'a', name: 'A', status: 'ENGINEERING', updatedAt: daysAgo(3) },
        { id: 'b', name: 'B', status: 'ENGINEERING', updatedAt: daysAgo(40) },
        { id: 'c', name: 'C', status: 'ENGINEERING', updatedAt: daysAgo(10) },
      ],
      NOW,
    );
    expect(result.map((r) => r.key)).toEqual(['b', 'c', 'a']);
    expect(result[0]).toMatchObject({ value: 40, percent: 100, colorClass: 'bg-critical' });
  });

  it('exclut les projets terminés ou approuvés : leur ancienneté n’est pas un signal', () => {
    const result = staleProjects([
      { id: 'a', name: 'A', status: 'COMPLETED', updatedAt: daysAgo(90) },
      { id: 'b', name: 'B', status: 'CLIENT_APPROVED', updatedAt: daysAgo(90) },
      { id: 'c', name: 'C', status: 'DRAFT', updatedAt: daysAgo(2) },
    ], NOW);
    expect(result.map((r) => r.key)).toEqual(['c']);
  });

  it('respecte la limite et ne renvoie rien pour une liste vide', () => {
    expect(staleProjects([], NOW)).toEqual([]);
    const many = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, status: 'DRAFT' as const, updatedAt: daysAgo(i) }));
    expect(staleProjects(many, NOW, 3)).toHaveLength(3);
  });
});
