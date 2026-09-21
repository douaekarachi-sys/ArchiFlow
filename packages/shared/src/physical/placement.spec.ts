import { describe, expect, it } from 'vitest';
import type { ArchitectureDocument, Rack } from '../architecture/document.schema.js';
import { checkPlacement } from './placement.js';

const rack = (id: string, overrides: Partial<Rack> = {}): Rack => ({ id, roomId: 'room-01', name: id, totalUnits: 42, ...overrides });

const el = (id: string, placement?: ArchitectureDocument['elements'][number]['placement']): ArchitectureDocument['elements'][number] => ({
  id,
  type: 'switch',
  equipmentModelId: null,
  label: id,
  position: { x: 0, y: 0 },
  config: {},
  placement,
});

const doc = (elements: ArchitectureDocument['elements'], racks: Rack[] = [rack('rack-01')]): ArchitectureDocument => ({
  elements,
  connections: [],
  zones: [],
  racks,
});

describe('checkPlacement (schéma physique, EF-205)', () => {
  it('ne signale rien pour des elements non places', () => {
    expect(checkPlacement(doc([el('a')]))).toEqual([]);
  });

  it('ne signale rien quand chaque position U de la baie est occupee par un seul element', () => {
    const document = doc([el('a', { rackId: 'rack-01', unit: 1 }), el('b', { rackId: 'rack-01', unit: 2 })]);
    expect(checkPlacement(document)).toEqual([]);
  });

  it('signale un conflit quand deux elements occupent la meme position U de la meme baie (CRITICAL)', () => {
    const document = doc([el('a', { rackId: 'rack-01', unit: 5 }), el('b', { rackId: 'rack-01', unit: 5 })]);
    const anomalies = checkPlacement(document);
    expect(anomalies).toContainEqual(
      expect.objectContaining({ severity: 'CRITICAL', code: 'validation.placement.rackUnitConflict', elementIds: ['a', 'b'] }),
    );
  });

  it('ne signale pas de conflit entre deux baies differentes a la meme position U', () => {
    const document = doc(
      [el('a', { rackId: 'rack-01', unit: 5 }), el('b', { rackId: 'rack-02', unit: 5 })],
      [rack('rack-01'), rack('rack-02')],
    );
    expect(checkPlacement(document)).toEqual([]);
  });

  it('signale une position U hors des bornes de la baie (CRITICAL)', () => {
    const document = doc([el('a', { rackId: 'rack-01', unit: 50 })], [rack('rack-01', { totalUnits: 42 })]);
    expect(checkPlacement(document)).toContainEqual(
      expect.objectContaining({ severity: 'CRITICAL', code: 'validation.placement.unitOutOfRange', elementIds: ['a'] }),
    );
  });
});
