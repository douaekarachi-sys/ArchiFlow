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

  it('addNetwork ajoute un réseau au plan d’adressage (EF-207)', () => {
    const next = apply(BASE, { type: 'addNetwork', network: { id: 'lan-01', name: 'LAN', vlanId: 10, cidr: '10.0.0.0/24' } });
    expect(next.networks).toEqual([{ id: 'lan-01', name: 'LAN', vlanId: 10, cidr: '10.0.0.0/24' }]);
  });

  it('updateElementNetwork rattache un équipement à un réseau', () => {
    const withNetwork = apply(BASE, { type: 'addNetwork', network: { id: 'lan-01', name: 'LAN', vlanId: 10, cidr: '10.0.0.0/24' } });
    const next = apply(withNetwork, { type: 'updateElementNetwork', elementId: 'fw-01', networkId: 'lan-01' });
    expect(next.elements.find((e) => e.id === 'fw-01')?.networkId).toBe('lan-01');
  });

  it('deleteNetwork retire le réseau et détache les équipements qui y étaient rattachés', () => {
    const withNetwork = apply(BASE, { type: 'addNetwork', network: { id: 'lan-01', name: 'LAN', vlanId: 10, cidr: '10.0.0.0/24' } });
    const attached = apply(withNetwork, { type: 'updateElementNetwork', elementId: 'fw-01', networkId: 'lan-01' });
    const next = apply(attached, { type: 'deleteNetwork', networkId: 'lan-01' });
    expect(next.networks).toEqual([]);
    expect(next.elements.find((e) => e.id === 'fw-01')?.networkId).toBeUndefined();
  });

  it('addSite crée la chaîne bâtiment → étage → salle → baie (schéma physique EF-205)', () => {
    const next = apply(BASE, { type: 'addSite', buildingName: 'Siège', floorName: 'RDC', roomName: 'Salle serveurs', rackName: 'Baie A', totalUnits: 42 });
    expect(next.buildings).toHaveLength(1);
    expect(next.floors).toHaveLength(1);
    expect(next.rooms).toHaveLength(1);
    expect(next.racks).toHaveLength(1);
    expect(next.racks?.[0]).toMatchObject({ name: 'Baie A', totalUnits: 42 });
  });

  it('addSite réutilise bâtiment/étage/salle déjà nommés au lieu d’en créer des doublons', () => {
    const withFirstRack = apply(BASE, { type: 'addSite', buildingName: 'Siège', floorName: 'RDC', roomName: 'Salle serveurs', rackName: 'Baie A', totalUnits: 42 });
    const next = apply(withFirstRack, { type: 'addSite', buildingName: 'Siège', floorName: 'RDC', roomName: 'Salle serveurs', rackName: 'Baie B', totalUnits: 12 });
    expect(next.buildings).toHaveLength(1);
    expect(next.floors).toHaveLength(1);
    expect(next.rooms).toHaveLength(1);
    expect(next.racks).toHaveLength(2);
  });

  it('updateElementPlacement rattache un équipement à une baie et derive bâtiment/étage/salle', () => {
    const withSite = apply(BASE, { type: 'addSite', buildingName: 'Siège', floorName: 'RDC', roomName: 'Salle serveurs', rackName: 'Baie A', totalUnits: 42 });
    const rackId = withSite.racks![0]!.id;
    const next = apply(withSite, { type: 'updateElementPlacement', elementId: 'fw-01', rackId, unit: 10 });
    const placement = next.elements.find((e) => e.id === 'fw-01')?.placement;
    expect(placement).toMatchObject({ rackId, unit: 10 });
    expect(placement?.buildingId).toBe(withSite.buildings![0]!.id);
    expect(placement?.floorId).toBe(withSite.floors![0]!.id);
    expect(placement?.roomId).toBe(withSite.rooms![0]!.id);
  });

  it('updateElementPlacement avec rackId null retire le placement', () => {
    const withSite = apply(BASE, { type: 'addSite', buildingName: 'Siège', floorName: 'RDC', roomName: 'Salle', rackName: 'Baie A', totalUnits: 42 });
    const placed = apply(withSite, { type: 'updateElementPlacement', elementId: 'fw-01', rackId: withSite.racks![0]!.id, unit: 3 });
    const next = apply(placed, { type: 'updateElementPlacement', elementId: 'fw-01', rackId: null, unit: null });
    expect(next.elements.find((e) => e.id === 'fw-01')?.placement).toBeUndefined();
  });

  it('deleteRack retire la baie et détache les équipements qui y étaient placés', () => {
    const withSite = apply(BASE, { type: 'addSite', buildingName: 'Siège', floorName: 'RDC', roomName: 'Salle', rackName: 'Baie A', totalUnits: 42 });
    const rackId = withSite.racks![0]!.id;
    const placed = apply(withSite, { type: 'updateElementPlacement', elementId: 'fw-01', rackId, unit: 3 });
    const next = apply(placed, { type: 'deleteRack', rackId });
    expect(next.racks).toEqual([]);
    expect(next.elements.find((e) => e.id === 'fw-01')?.placement).toBeUndefined();
  });

  it('une action sur un identifiant inconnu est un no-op silencieux', () => {
    const next = apply(BASE, { type: 'moveElement', elementId: 'inconnu', position: { x: 1, y: 1 } });
    expect(next).toEqual(BASE);
  });
});
