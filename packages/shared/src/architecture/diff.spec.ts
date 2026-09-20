import { describe, expect, it } from 'vitest';
import type { ArchitectureDocument } from './document.schema.js';
import { diffArchitecture, isArchitectureDiffEmpty } from './diff.js';

const el = (id: string, type: string, equipmentModelId: string | null = null): ArchitectureDocument['elements'][number] => ({
  id,
  type: type as ArchitectureDocument['elements'][number]['type'],
  equipmentModelId,
  label: id,
  position: { x: 0, y: 0 },
  config: {},
});

const doc = (elements: ArchitectureDocument['elements'], connections: ArchitectureDocument['connections'] = [], zones: ArchitectureDocument['zones'] = []): ArchitectureDocument => ({
  elements,
  connections,
  zones,
});

describe('diffArchitecture (EF-405)', () => {
  it("+2 switches, -1 pare-feu : l'exemple du brief", () => {
    const from = doc([el('fw-1', 'firewall'), el('sw-1', 'switch')]);
    const to = doc([el('sw-1', 'switch'), el('sw-2', 'switch'), el('sw-3', 'switch')]);
    const diff = diffArchitecture(from, to);
    expect(diff.elements).toEqual([
      { category: 'firewall', added: 0, removed: 1, changed: 0 },
      { category: 'switch', added: 2, removed: 0, changed: 0 },
    ]);
  });

  it('un élément déplacé (même id, position différente) ne compte pour aucun changement', () => {
    const from = doc([{ ...el('sw-1', 'switch'), position: { x: 0, y: 0 } }]);
    const to = doc([{ ...el('sw-1', 'switch'), position: { x: 500, y: 200 } }]);
    expect(diffArchitecture(from, to).elements).toEqual([]);
  });

  it('un élément dont le modèle catalogue change compte comme « changed », pas ajouté/retiré', () => {
    const from = doc([el('sw-1', 'switch', 'model-a')]);
    const to = doc([el('sw-1', 'switch', 'model-b')]);
    expect(diffArchitecture(from, to).elements).toEqual([{ category: 'switch', added: 0, removed: 0, changed: 1 }]);
  });

  it('compte les connexions et zones ajoutées/retirées par identifiant', () => {
    const from = doc([], [{ id: 'l1', from: 'a', to: 'b', linkType: 'copper' }], [{ id: 'z1', type: 'DMZ', elementIds: [] }]);
    const to = doc([], [{ id: 'l2', from: 'a', to: 'c', linkType: 'copper' }], []);
    const diff = diffArchitecture(from, to);
    expect(diff).toMatchObject({ connectionsAdded: 1, connectionsRemoved: 1, zonesAdded: 0, zonesRemoved: 1 });
  });

  it('deux documents identiques ne produisent aucun changement', () => {
    const document = doc([el('sw-1', 'switch')], [{ id: 'l1', from: 'sw-1', to: 'sw-1', linkType: 'copper' }]);
    expect(isArchitectureDiffEmpty(diffArchitecture(document, document))).toBe(true);
  });

  it('un document vide comparé à lui-même est un diff vide', () => {
    expect(isArchitectureDiffEmpty(diffArchitecture({ elements: [], connections: [], zones: [] }, { elements: [], connections: [], zones: [] }))).toBe(true);
  });
});
