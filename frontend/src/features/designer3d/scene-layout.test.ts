import type { ArchitectureDocument } from '@archiflow/shared';
import { describe, expect, it } from 'vitest';
import { buildScene3D } from './scene-layout';

const el = (id: string, type: string, x: number, y: number): ArchitectureDocument['elements'][number] => ({
  id,
  type: type as ArchitectureDocument['elements'][number]['type'],
  equipmentModelId: null,
  label: id,
  position: { x, y },
  config: {},
});

describe('buildScene3D', () => {
  it('un document vide donne une scène vide, sans erreur (division par zéro évitée)', () => {
    expect(buildScene3D({ elements: [], connections: [], zones: [] })).toEqual({ nodes: [], edges: [], hasPhysicalPlacement: false });
  });

  it('centre les positions autour de zéro, en conservant les proportions relatives', () => {
    const scene = buildScene3D({ elements: [el('a', 'switch', 0, 0), el('b', 'switch', 600, 0)], connections: [], zones: [] });
    expect(scene.nodes[0]!.x).toBeCloseTo(-5); // -300 * 1/60
    expect(scene.nodes[1]!.x).toBeCloseTo(5);
  });

  it('attribue une couleur par catégorie, reprise des jetons tokens.css', () => {
    const scene = buildScene3D({ elements: [el('fw', 'firewall', 0, 0)], connections: [], zones: [] });
    expect(scene.nodes[0]!.color).toBe('#E11D48');
  });

  it('reporte les connexions telles quelles (mêmes identifiants que le document 2D)', () => {
    const document: ArchitectureDocument = {
      elements: [el('a', 'switch', 0, 0), el('b', 'switch', 100, 0)],
      connections: [{ id: 'l1', from: 'a', to: 'b', linkType: 'copper' }],
      zones: [],
    };
    expect(buildScene3D(document).edges).toEqual([{ id: 'l1', from: 'a', to: 'b', linkType: 'copper' }]);
  });

  it('signale honnêtement l’absence de placement physique (Phase 6 non livrée) plutôt que de l’inventer', () => {
    const scene = buildScene3D({ elements: [el('a', 'switch', 0, 0)], connections: [], zones: [] });
    expect(scene.hasPhysicalPlacement).toBe(false);
  });

  it('détecte un placement physique quand il existe', () => {
    const withPlacement: ArchitectureDocument['elements'][number] = { ...el('a', 'switch', 0, 0), placement: { rackId: 'r1', unit: 3 } };
    expect(buildScene3D({ elements: [withPlacement], connections: [], zones: [] }).hasPhysicalPlacement).toBe(true);
  });
});
