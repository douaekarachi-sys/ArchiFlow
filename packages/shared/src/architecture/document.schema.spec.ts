import { describe, expect, it } from 'vitest';
import { architectureDocumentSchema, type ArchitectureDocument } from './document.schema.js';

const el = (id: string, type: ArchitectureDocument['elements'][number]['type'] = 'switch') => ({
  id,
  type,
  equipmentModelId: null,
  label: id.toUpperCase(),
  position: { x: 0, y: 0 },
});

const messages = (input: unknown): string[] => {
  const result = architectureDocumentSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe('document d’architecture', () => {
  it('accepte un document coherent', () => {
    const doc = {
      elements: [el('fw-01', 'firewall'), el('sw-01'), el('pc-01', 'workstation')],
      connections: [{ id: 'c1', from: 'fw-01', to: 'sw-01', linkType: 'fiber', speedMbps: 10000 }],
      zones: [{ id: 'dmz', type: 'DMZ', elementIds: ['fw-01'] }],
    };
    expect(messages(doc)).toEqual([]);
  });

  it('accepte les postes clients et le controleur Wi-Fi', () => {
    const doc = { elements: [el('pc-01', 'workstation'), el('wlc-01', 'wifi-controller')] };
    expect(messages(doc)).toEqual([]);
  });

  it('refuse un identifiant d’element duplique', () => {
    expect(messages({ elements: [el('a'), el('a')] })).toContain("identifiant d'element duplique : a");
  });

  it('refuse un identifiant de connexion duplique', () => {
    const doc = {
      elements: [el('a'), el('b'), el('c')],
      connections: [
        { id: 'c1', from: 'a', to: 'b', linkType: 'copper' },
        { id: 'c1', from: 'b', to: 'c', linkType: 'copper' },
      ],
    };
    expect(messages(doc)).toContain('identifiant de connexion duplique : c1');
  });

  it('refuse une connexion vers un element inconnu', () => {
    const doc = { elements: [el('a')], connections: [{ id: 'c1', from: 'a', to: 'x', linkType: 'fiber' }] };
    expect(messages(doc)).toContain('connexion c1 : element cible inconnu x');
  });

  it('refuse une connexion d’un element vers lui-meme', () => {
    const doc = { elements: [el('a')], connections: [{ id: 'c1', from: 'a', to: 'a', linkType: 'copper' }] };
    expect(messages(doc)).toContain('connexion c1 : un element ne peut pas etre relie a lui-meme');
  });

  it('refuse une zone qui reference un element inconnu', () => {
    const doc = { elements: [el('a')], zones: [{ id: 'lan', type: 'LAN', elementIds: ['a', 'ghost'] }] };
    expect(messages(doc)).toContain('zone lan : element inconnu ghost');
  });

  it('refuse un identifiant de zone duplique', () => {
    const doc = {
      zones: [
        { id: 'z', type: 'LAN', elementIds: [] },
        { id: 'z', type: 'WAN', elementIds: [] },
      ],
    };
    expect(messages(doc)).toContain('identifiant de zone duplique : z');
  });

  it('accepte un reseau IP/VLAN rattache a un element', () => {
    const doc = {
      elements: [{ ...el('fw-01', 'firewall'), networkId: 'lan-01' }],
      networks: [{ id: 'lan-01', name: 'LAN utilisateurs', vlanId: 10, cidr: '192.168.10.0/24', gateway: '192.168.10.1' }],
    };
    expect(messages(doc)).toEqual([]);
  });

  it('refuse un identifiant de reseau duplique', () => {
    const doc = {
      networks: [
        { id: 'n1', name: 'A', vlanId: 10, cidr: '10.0.0.0/24' },
        { id: 'n1', name: 'B', vlanId: 20, cidr: '10.0.1.0/24' },
      ],
    };
    expect(messages(doc)).toContain('identifiant de reseau duplique : n1');
  });

  it('refuse un rattachement d’element vers un reseau inconnu', () => {
    const doc = { elements: [{ ...el('a'), networkId: 'ghost' }] };
    expect(messages(doc)).toContain('element a : reseau inconnu ghost');
  });

  it('refuse un VLAN hors bornes IEEE 802.1Q (1-4094)', () => {
    expect(messages({ networks: [{ id: 'n1', name: 'A', vlanId: 0, cidr: '10.0.0.0/24' }] }).length).toBeGreaterThan(0);
    expect(messages({ networks: [{ id: 'n1', name: 'A', vlanId: 4095, cidr: '10.0.0.0/24' }] }).length).toBeGreaterThan(0);
  });

  it('accepte une construction physique coherente et le placement d’un element', () => {
    const doc = {
      elements: [{ ...el('fw-01', 'firewall'), placement: { rackId: 'rack-01', unit: 10 } }],
      buildings: [{ id: 'bldg-01', name: 'Siège' }],
      floors: [{ id: 'floor-01', buildingId: 'bldg-01', name: 'RDC' }],
      rooms: [{ id: 'room-01', floorId: 'floor-01', name: 'Salle serveurs' }],
      racks: [{ id: 'rack-01', roomId: 'room-01', name: 'Baie A', totalUnits: 42 }],
    };
    expect(messages(doc)).toEqual([]);
  });

  it('refuse un etage rattache a un batiment inconnu', () => {
    const doc = { floors: [{ id: 'f1', buildingId: 'ghost', name: 'RDC' }] };
    expect(messages(doc)).toContain('etage f1 : batiment inconnu ghost');
  });

  it('refuse une salle rattachee a un etage inconnu', () => {
    const doc = { rooms: [{ id: 'r1', floorId: 'ghost', name: 'Salle' }] };
    expect(messages(doc)).toContain('salle r1 : etage inconnu ghost');
  });

  it('refuse une baie rattachee a une salle inconnue', () => {
    const doc = { racks: [{ id: 'rk1', roomId: 'ghost', name: 'Baie' }] };
    expect(messages(doc)).toContain('baie rk1 : salle inconnue ghost');
  });

  it('refuse le placement d’un element dans une baie inconnue', () => {
    const doc = { elements: [{ ...el('a'), placement: { rackId: 'ghost' } }] };
    expect(messages(doc)).toContain('element a : baie inconnue ghost');
  });

  it('localise chaque erreur par un chemin precis', () => {
    const result = architectureDocumentSchema.safeParse({
      elements: [el('a')],
      zones: [{ id: 'lan', type: 'LAN', elementIds: ['ghost'] }],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['zones', 0, 'elementIds', 0]);
  });
});
