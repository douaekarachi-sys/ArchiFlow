import type { ArchitectureDocument } from '@archiflow/shared';
import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import { applyDesignerAction, type DesignerAction } from './designer-actions';

const BASE: ArchitectureDocument = {
  elements: [
    { id: 'fw-01', type: 'firewall', equipmentModelId: null, label: 'Pare-feu', position: { x: 0, y: 0 }, config: {} },
    { id: 'sw-01', type: 'switch', equipmentModelId: null, label: 'Switch', position: { x: 100, y: 0 }, config: {} },
  ],
  connections: [{ id: 'link-01', from: 'fw-01', to: 'sw-01', linkType: 'copper' }],
  zones: [{ id: 'zone-dmz', type: 'DMZ', label: 'DMZ', elementIds: ['fw-01'] }],
};

function apply(document: ArchitectureDocument, action: DesignerAction): ArchitectureDocument {
  return produce(document, (draft) => applyDesignerAction(draft, action));
}

describe('applyDesignerAction', () => {
  it('addElement ajoute un élément sans toucher au reste', () => {
    const next = apply(BASE, {
      type: 'addElement',
      element: { id: 'srv-01', type: 'server', equipmentModelId: null, label: 'Serveur', position: { x: 300, y: 0 }, config: {} },
    });
    expect(next.elements).toHaveLength(3);
    expect(next.connections).toBe(BASE.connections);
  });

  it('moveElement met à jour uniquement la position de l’élément visé', () => {
    const next = apply(BASE, { type: 'moveElement', elementId: 'fw-01', position: { x: 42, y: 7 } });
    expect(next.elements.find((e) => e.id === 'fw-01')?.position).toEqual({ x: 42, y: 7 });
    expect(next.elements.find((e) => e.id === 'sw-01')?.position).toEqual({ x: 100, y: 0 });
  });

  it('deleteElement supprime aussi ses connexions et son appartenance de zone (pas d’orphelin)', () => {
    const next = apply(BASE, { type: 'deleteElement', elementId: 'fw-01' });
    expect(next.elements.map((e) => e.id)).toEqual(['sw-01']);
    expect(next.connections).toEqual([]);
    expect(next.zones[0]?.elementIds).toEqual([]);
  });

  it('updateElementZone déplace l’élément d’une zone à l’autre sans doublon', () => {
    const withSecondZone = apply(BASE, { type: 'addZone', zoneId: 'zone-lan', zoneType: 'LAN', label: 'LAN' });
    const moved = apply(withSecondZone, { type: 'updateElementZone', elementId: 'fw-01', zoneId: 'zone-lan' });
    expect(moved.zones.find((z) => z.id === 'zone-dmz')?.elementIds).toEqual([]);
    expect(moved.zones.find((z) => z.id === 'zone-lan')?.elementIds).toEqual(['fw-01']);
  });

  it('updateElementZone avec zoneId null retire l’élément de toute zone', () => {
    const next = apply(BASE, { type: 'updateElementZone', elementId: 'fw-01', zoneId: null });
    expect(next.zones[0]?.elementIds).toEqual([]);
  });

  it('deleteZone retire la zone mais laisse les éléments intacts', () => {
    const next = apply(BASE, { type: 'deleteZone', zoneId: 'zone-dmz' });
    expect(next.zones).toEqual([]);
    expect(next.elements).toHaveLength(2);
  });

  it('deleteConnection ne touche pas les éléments', () => {
    const next = apply(BASE, { type: 'deleteConnection', connectionId: 'link-01' });
    expect(next.connections).toEqual([]);
    expect(next.elements).toBe(BASE.elements);
  });

  it('updateConnection fusionne le correctif sans écraser les champs non fournis', () => {
    const next = apply(BASE, { type: 'updateConnection', connectionId: 'link-01', patch: { speedMbps: 10000 } });
    expect(next.connections[0]).toMatchObject({ id: 'link-01', from: 'fw-01', to: 'sw-01', speedMbps: 10000, linkType: 'copper' });
  });

  it('une action sur un identifiant inconnu est un no-op silencieux', () => {
    const next = apply(BASE, { type: 'moveElement', elementId: 'inconnu', position: { x: 1, y: 1 } });
    expect(next).toEqual(BASE);
  });
});
