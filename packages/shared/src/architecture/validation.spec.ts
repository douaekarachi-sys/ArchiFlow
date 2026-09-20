import { describe, expect, it } from 'vitest';
import type { ArchitectureDocument } from './document.schema.js';
import { checkCapacity, checkCompatibility, checkGraphAnomalies, validateArchitecture, type EquipmentIndex } from './validation.js';

const el = (id: string, overrides: Partial<ArchitectureDocument['elements'][number]> = {}): ArchitectureDocument['elements'][number] => ({
  id,
  type: 'switch',
  equipmentModelId: null,
  label: id,
  position: { x: 0, y: 0 },
  config: {},
  ...overrides,
});

const link = (
  id: string,
  from: string,
  to: string,
  overrides: Partial<ArchitectureDocument['connections'][number]> = {},
): ArchitectureDocument['connections'][number] => ({ id, from, to, linkType: 'copper', ...overrides });

const doc = (
  elements: ArchitectureDocument['elements'],
  connections: ArchitectureDocument['connections'] = [],
): ArchitectureDocument => ({ elements, connections, zones: [] });

describe('checkCapacity (EF-202)', () => {
  it('signale un dépassement de ports (CRITICAL) quand les connexions excèdent portCount', () => {
    const index: EquipmentIndex = { 'model-sw': { portCount: 1, portType: 'RJ45', throughputMbps: 1000, poeBudgetW: null, powerDrawW: null } };
    const document = doc(
      [el('sw', { equipmentModelId: 'model-sw' }), el('a'), el('b')],
      [link('l1', 'sw', 'a'), link('l2', 'sw', 'b')],
    );
    const anomalies = checkCapacity(document, index);
    expect(anomalies).toContainEqual(
      expect.objectContaining({ severity: 'CRITICAL', code: 'validation.capacity.portOverflow', elementIds: ['sw'] }),
    );
  });

  it("n'signale rien quand les connexions tiennent dans portCount", () => {
    const index: EquipmentIndex = { 'model-sw': { portCount: 2, portType: 'RJ45', throughputMbps: 1000, poeBudgetW: null, powerDrawW: null } };
    const document = doc(
      [el('sw', { equipmentModelId: 'model-sw' }), el('a'), el('b')],
      [link('l1', 'sw', 'a'), link('l2', 'sw', 'b')],
    );
    expect(checkCapacity(document, index)).toEqual([]);
  });

  it('signale un dépassement de budget PoE (WARNING) quand la consommation des équipements reliés excède poeBudgetW', () => {
    const index: EquipmentIndex = {
      'model-sw': { portCount: 4, portType: 'RJ45', throughputMbps: 1000, poeBudgetW: 30, powerDrawW: null },
      'model-ap': { portCount: 1, portType: 'RJ45', throughputMbps: 1000, poeBudgetW: null, powerDrawW: 25 },
    };
    const document = doc(
      [el('sw', { equipmentModelId: 'model-sw' }), el('ap1', { type: 'access-point', equipmentModelId: 'model-ap' }), el('ap2', { type: 'access-point', equipmentModelId: 'model-ap' })],
      [link('l1', 'sw', 'ap1'), link('l2', 'sw', 'ap2')],
    );
    const anomalies = checkCapacity(document, index);
    expect(anomalies).toContainEqual(
      expect.objectContaining({ severity: 'WARNING', code: 'validation.capacity.poeBudgetExceeded', elementIds: ['sw'], params: { draw: 50, budget: 30 } }),
    );
  });

  it('signale un modèle non renseigné (INFO), sauf pour la catégorie internet', () => {
    const document = doc([el('sw'), el('net', { type: 'internet' })]);
    const anomalies = checkCapacity(document, {});
    expect(anomalies).toEqual([{ severity: 'INFO', code: 'validation.capacity.unsizedModel', elementIds: ['sw'], connectionIds: [] }]);
  });
});

describe('checkCompatibility (EF-203)', () => {
  it('signale un lien fibre vers un port qui ne supporte pas la fibre', () => {
    const index: EquipmentIndex = { 'model-a': { portCount: 4, portType: 'RJ45', throughputMbps: 1000, poeBudgetW: null, powerDrawW: null } };
    const document = doc(
      [el('a', { equipmentModelId: 'model-a' }), el('b', { equipmentModelId: 'model-a' })],
      [link('l1', 'a', 'b', { linkType: 'fiber' })],
    );
    const anomalies = checkCompatibility(document, index);
    expect(anomalies).toHaveLength(2); // les deux extrémités ont un port RJ45
    expect(anomalies[0]).toMatchObject({ severity: 'WARNING', code: 'validation.compatibility.portTypeMismatch' });
  });

  it("n'signale rien pour un lien fibre vers un port SFP", () => {
    const index: EquipmentIndex = { 'model-a': { portCount: 4, portType: 'SFP+', throughputMbps: 10000, poeBudgetW: null, powerDrawW: null } };
    const document = doc(
      [el('a', { equipmentModelId: 'model-a' }), el('b', { equipmentModelId: 'model-a' })],
      [link('l1', 'a', 'b', { linkType: 'fiber' })],
    );
    expect(checkCompatibility(document, index)).toEqual([]);
  });

  it('signale un lien sans fil entre deux éléments qui ne sont ni point d’accès ni contrôleur ni poste client', () => {
    const document = doc([el('a', { type: 'switch' }), el('b', { type: 'router' })], [link('l1', 'a', 'b', { linkType: 'wireless' })]);
    const anomalies = checkCompatibility(document, {});
    expect(anomalies).toContainEqual(expect.objectContaining({ severity: 'WARNING', code: 'validation.compatibility.wirelessCategoryMismatch' }));
  });

  it('signale un débit de lien supérieur au débit supporté par un équipement', () => {
    const index: EquipmentIndex = { 'model-a': { portCount: 4, portType: 'RJ45', throughputMbps: 1000, poeBudgetW: null, powerDrawW: null } };
    const document = doc([el('a', { equipmentModelId: 'model-a' }), el('b')], [link('l1', 'a', 'b', { speedMbps: 10000 })]);
    const anomalies = checkCompatibility(document, index);
    expect(anomalies).toContainEqual(
      expect.objectContaining({ severity: 'WARNING', code: 'validation.compatibility.throughputMismatch', elementIds: ['a'], params: { linkSpeed: 10000, supported: 1000 } }),
    );
  });
});

describe('checkGraphAnomalies (EF-204)', () => {
  it('ne signale rien sur un arbre simple (aucune boucle)', () => {
    const document = doc([el('a'), el('b'), el('c')], [link('l1', 'a', 'b'), link('l2', 'b', 'c')]);
    expect(checkGraphAnomalies(document).filter((a) => a.code === 'validation.anomaly.loopDetected')).toEqual([]);
  });

  it('détecte une boucle triangulaire (CRITICAL)', () => {
    const document = doc([el('a'), el('b'), el('c')], [link('l1', 'a', 'b'), link('l2', 'b', 'c'), link('l3', 'c', 'a')]);
    const loops = checkGraphAnomalies(document).filter((a) => a.code === 'validation.anomaly.loopDetected');
    expect(loops).toHaveLength(1);
    expect(loops[0]?.severity).toBe('CRITICAL');
  });

  it('détecte une boucle formée par deux liens parallèles entre les mêmes éléments', () => {
    const document = doc([el('a'), el('b'), el('c')], [link('l1', 'a', 'b'), link('l2', 'a', 'b'), link('l3', 'b', 'c')]);
    const loops = checkGraphAnomalies(document).filter((a) => a.code === 'validation.anomaly.loopDetected');
    expect(loops).toHaveLength(1);
  });

  it('signale un élément isolé (INFO) quand le plan compte au moins deux éléments connectables', () => {
    const document = doc([el('a'), el('b'), el('isolated')], [link('l1', 'a', 'b')]);
    expect(checkGraphAnomalies(document)).toContainEqual(
      expect.objectContaining({ severity: 'INFO', code: 'validation.anomaly.isolatedElement', elementIds: ['isolated'] }),
    );
  });

  it("n'signale pas l'isolement pour un onduleur ou une baie (non connectables par nature)", () => {
    const document = doc([el('a'), el('b'), el('ups1', { type: 'ups' })], [link('l1', 'a', 'b')]);
    expect(checkGraphAnomalies(document).filter((a) => a.code === 'validation.anomaly.isolatedElement')).toEqual([]);
  });

  it('détecte un point unique de défaillance sur une topologie en ligne (≥ 3 éléments)', () => {
    // a - b - c : b est le seul chemin entre a et c.
    const document = doc([el('a'), el('b'), el('c')], [link('l1', 'a', 'b'), link('l2', 'b', 'c')]);
    const spofs = checkGraphAnomalies(document).filter((a) => a.code === 'validation.anomaly.singlePointOfFailure');
    expect(spofs.map((a) => a.elementIds[0])).toEqual(['b']);
  });

  it('un chemin redondant supprime le point unique de défaillance', () => {
    const document = doc(
      [el('a'), el('b'), el('c')],
      [link('l1', 'a', 'b'), link('l2', 'b', 'c'), link('l3', 'a', 'c')],
    );
    expect(checkGraphAnomalies(document).filter((a) => a.code === 'validation.anomaly.singlePointOfFailure')).toEqual([]);
  });

  it("ne signale aucun SPOF pour un lien unique entre deux éléments seulement", () => {
    const document = doc([el('a'), el('b')], [link('l1', 'a', 'b')]);
    expect(checkGraphAnomalies(document).filter((a) => a.code === 'validation.anomaly.singlePointOfFailure')).toEqual([]);
  });
});

describe('validateArchitecture', () => {
  it('compatible=false dès qu’une anomalie CRITICAL existe', () => {
    const document = doc([el('a'), el('b'), el('c')], [link('l1', 'a', 'b'), link('l2', 'b', 'c'), link('l3', 'c', 'a')]);
    expect(validateArchitecture(document, {}).compatible).toBe(false);
  });

  it('compatible=true quand seules des anomalies WARNING/INFO existent', () => {
    const document = doc([el('a'), el('b')], [link('l1', 'a', 'b')]);
    const result = validateArchitecture(document, {});
    expect(result.compatible).toBe(true);
    expect(result.anomalies.some((a) => a.severity === 'CRITICAL')).toBe(false);
  });

  it('un document vide est compatible et sans anomalie', () => {
    expect(validateArchitecture(doc([]), {})).toEqual({ anomalies: [], compatible: true });
  });
});
