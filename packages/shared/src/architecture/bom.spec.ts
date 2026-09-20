import { describe, expect, it } from 'vitest';
import type { ArchitectureDocument } from './document.schema.js';
import { buildBom } from './bom.js';

const el = (
  id: string,
  type: string,
  equipmentModelId: string | null,
  frozenSpec?: ArchitectureDocument['elements'][number]['frozenSpec'],
): ArchitectureDocument['elements'][number] => ({
  id,
  type: type as ArchitectureDocument['elements'][number]['type'],
  equipmentModelId,
  label: id,
  position: { x: 0, y: 0 },
  config: {},
  frozenSpec,
});

const spec = (overrides: Partial<NonNullable<ArchitectureDocument['elements'][number]['frozenSpec']>> = {}) => ({
  name: 'Catalyst 9300-48P',
  reference: 'C9300-48P-E',
  indicativePrice: 68000,
  currency: 'MAD',
  ...overrides,
});

describe('buildBom (EF-302, EF-303)', () => {
  it('regroupe les éléments par modèle et multiplie par la quantité', () => {
    const document: ArchitectureDocument = {
      elements: [
        el('sw-1', 'switch', 'model-sw', spec()),
        el('sw-2', 'switch', 'model-sw', spec()),
        el('fw-1', 'firewall', 'model-fw', spec({ name: 'FortiGate 60F', reference: 'FG-60F', indicativePrice: 21000 })),
      ],
      connections: [],
      zones: [],
    };
    const bom = buildBom(document);
    expect(bom.lines).toEqual([
      expect.objectContaining({ equipmentModelId: 'model-sw', quantity: 2, unitPrice: 68000, subtotal: 136000 }),
      expect.objectContaining({ equipmentModelId: 'model-fw', quantity: 1, unitPrice: 21000, subtotal: 21000 }),
    ]);
    expect(bom.materialTotal).toBe(21000 + 136000);
    expect(bom.grandTotal).toBe(bom.materialTotal);
    expect(bom.unpricedElementCount).toBe(0);
  });

  it('ajoute le coût de licence annuel séparément du matériel (EF-303)', () => {
    const document: ArchitectureDocument = {
      elements: [el('fw-1', 'firewall', 'model-fw', spec({ licenseAnnualCost: 5000 }))],
      connections: [],
      zones: [],
    };
    const bom = buildBom(document);
    expect(bom.lines[0]).toMatchObject({ licenseAnnualCost: 5000, licenseSubtotal: 5000 });
    expect(bom.licenseTotal).toBe(5000);
    expect(bom.grandTotal).toBe(bom.materialTotal + 5000);
  });

  it('un élément sans modèle catalogue ne casse rien et n’est jamais compté en silence', () => {
    const document: ArchitectureDocument = {
      elements: [el('generic', 'internet', null)],
      connections: [],
      zones: [],
    };
    const bom = buildBom(document);
    expect(bom.lines).toEqual([]);
    expect(bom.unpricedElementCount).toBe(1);
    expect(bom.materialTotal).toBe(0);
  });

  it('un modèle sans prix renseigné est signalé, jamais compté comme zéro silencieusement', () => {
    const document: ArchitectureDocument = {
      elements: [el('sw-1', 'switch', 'model-sw', spec({ indicativePrice: undefined }))],
      connections: [],
      zones: [],
    };
    const bom = buildBom(document);
    expect(bom.lines[0]).toMatchObject({ unitPrice: null, subtotal: null });
    expect(bom.unpricedElementCount).toBe(1);
    expect(bom.materialTotal).toBe(0);
  });

  it('un document vide donne un BOM vide, sans division par zéro ni erreur', () => {
    const bom = buildBom({ elements: [], connections: [], zones: [] });
    expect(bom).toMatchObject({ lines: [], unpricedElementCount: 0, materialTotal: 0, licenseTotal: 0, grandTotal: 0, currency: null });
  });
});
