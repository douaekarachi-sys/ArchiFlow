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

  it('localise chaque erreur par un chemin precis', () => {
    const result = architectureDocumentSchema.safeParse({
      elements: [el('a')],
      zones: [{ id: 'lan', type: 'LAN', elementIds: ['ghost'] }],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['zones', 0, 'elementIds', 0]);
  });
});
