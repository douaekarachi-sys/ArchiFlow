import type { ArchitectureDocument } from '@archiflow/shared';
import { describe, expect, it } from 'vitest';
import { fromFlow, toFlow } from './document-adapter';

const SAMPLE: ArchitectureDocument = {
  elements: [
    { id: 'fw-01', type: 'firewall', equipmentModelId: 'model-1', label: 'Pare-feu', position: { x: 0, y: 0 }, config: {} },
    { id: 'sw-01', type: 'switch', equipmentModelId: null, label: 'Switch', position: { x: 200, y: 50 }, config: { note: 'test' } },
  ],
  connections: [{ id: 'link-01', from: 'fw-01', to: 'sw-01', linkType: 'copper', speedMbps: 1000, protocol: 'IP' }],
  zones: [{ id: 'zone-dmz', type: 'DMZ', label: 'DMZ', elementIds: ['fw-01'] }],
};

describe('toFlow / fromFlow', () => {
  it('un aller-retour préserve le document (React Flow n’est jamais la vérité)', () => {
    expect(fromFlow(toFlow(SAMPLE))).toEqual(SAMPLE);
  });

  it('reporte l’appartenance et le type de zone sur le nœud correspondant', () => {
    const { nodes } = toFlow(SAMPLE);
    const fw = nodes.find((n) => n.id === 'fw-01');
    expect(fw?.data.zoneId).toBe('zone-dmz');
    expect(fw?.data.zoneType).toBe('DMZ');
    const sw = nodes.find((n) => n.id === 'sw-01');
    expect(sw?.data.zoneId).toBeNull();
    expect(sw?.data.zoneType).toBeNull();
  });

  it('un élément sans zone associée ne produit aucune zone à la reconstruction', () => {
    const document: ArchitectureDocument = { elements: SAMPLE.elements, connections: [], zones: [] };
    const rebuilt = fromFlow(toFlow(document));
    expect(rebuilt.zones).toEqual([]);
  });

  it('reconstruit elementIds à partir de zoneId même si l’ordre des nœuds change', () => {
    const view = toFlow(SAMPLE);
    const reordered = { ...view, nodes: [...view.nodes].reverse() };
    expect(fromFlow(reordered).zones[0]?.elementIds).toEqual(['fw-01']);
  });

  it('une connexion sans data (arête créée hors adaptateur) retombe sur un type de lien par défaut', () => {
    const view = toFlow(SAMPLE);
    const bare = { ...view, edges: [{ id: 'raw', source: 'fw-01', target: 'sw-01', type: 'labeled' as const }] };
    expect(fromFlow(bare).connections[0]).toMatchObject({ id: 'raw', from: 'fw-01', to: 'sw-01', linkType: 'copper' });
  });

  it('reporte le plan d’adressage (EF-207) et le rattachement réseau sur le nœud correspondant', () => {
    const withAddressing: ArchitectureDocument = {
      ...SAMPLE,
      elements: [{ ...SAMPLE.elements[0]!, networkId: 'lan-01' }, SAMPLE.elements[1]!],
      networks: [{ id: 'lan-01', name: 'LAN', vlanId: 10, cidr: '10.0.0.0/24' }],
    };
    const { nodes, networks } = toFlow(withAddressing);
    expect(networks).toEqual([{ id: 'lan-01', name: 'LAN', vlanId: 10, cidr: '10.0.0.0/24' }]);
    expect(nodes.find((n) => n.id === 'fw-01')?.data.networkId).toBe('lan-01');
    expect(nodes.find((n) => n.id === 'sw-01')?.data.networkId).toBeNull();
    expect(fromFlow(toFlow(withAddressing))).toEqual(withAddressing);
  });

  it('reporte la construction physique (schéma physique EF-205) et le placement d’un élément', () => {
    const withPlacement: ArchitectureDocument = {
      ...SAMPLE,
      elements: [{ ...SAMPLE.elements[0]!, placement: { rackId: 'rack-01', roomId: 'room-01', floorId: 'floor-01', buildingId: 'bldg-01', unit: 12 } }, SAMPLE.elements[1]!],
      buildings: [{ id: 'bldg-01', name: 'Siège' }],
      floors: [{ id: 'floor-01', buildingId: 'bldg-01', name: 'RDC' }],
      rooms: [{ id: 'room-01', floorId: 'floor-01', name: 'Salle' }],
      racks: [{ id: 'rack-01', roomId: 'room-01', name: 'Baie A', totalUnits: 42 }],
    };
    const { nodes, racks } = toFlow(withPlacement);
    expect(racks).toEqual([{ id: 'rack-01', roomId: 'room-01', name: 'Baie A', totalUnits: 42 }]);
    expect(nodes.find((n) => n.id === 'fw-01')?.data.placement).toEqual({ rackId: 'rack-01', roomId: 'room-01', floorId: 'floor-01', buildingId: 'bldg-01', unit: 12 });
    expect(fromFlow(toFlow(withPlacement))).toEqual(withPlacement);
  });
});
