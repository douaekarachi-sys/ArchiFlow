import { describe, expect, it } from 'vitest';
import {
  calculateSizing,
  sizeAccessPoints,
  sizeBandwidth,
  sizePorts,
  sizePower,
  type SizingInput,
} from './engineering-sizing.js';

const need = (overrides: Partial<SizingInput> = {}): SizingInput => ({
  workstationCount: null,
  totalEmployees: null,
  serverCount: null,
  wifi: null,
  ...overrides,
});

describe('sizePorts (EF-202)', () => {
  it("580 postes + 20% de croissance = 696 ports -> 15 switches 48 ports", () => {
    const result = sizePorts(need({ workstationCount: 580 }));
    expect(result.requiredPorts).toBe(696);
    expect(result.requiredSwitches).toBe(15);
    expect(result.steps).toEqual([
      { key: 'sizing.ports.formula', params: { workstations: 580, growthPercent: 20, totalPorts: 696, switchCount: 15, switchCapacity: 48 } },
    ]);
  });

  it('un compte de postes exact tenant pile dans les switches ne sur-arrondit pas', () => {
    // 40 postes + 20% = 48 -> exactement 1 switch 48 ports.
    const result = sizePorts(need({ workstationCount: 40 }));
    expect(result.requiredPorts).toBe(48);
    expect(result.requiredSwitches).toBe(1);
  });

  it('aucun poste renseigné : zéro port, zéro switch, une explication plutôt qu’un chiffre nu', () => {
    const result = sizePorts(need());
    expect(result).toMatchObject({ requiredPorts: 0, requiredSwitches: 0, steps: [{ key: 'sizing.ports.noData' }] });
  });
});

describe('sizeBandwidth (EF-202)', () => {
  it('580 postes x 10 Mb/s = 5800 Mb/s', () => {
    const result = sizeBandwidth(need({ workstationCount: 580 }));
    expect(result.totalMbps).toBe(5800);
    expect(result.steps).toEqual([{ key: 'sizing.bandwidth.formula', params: { workstations: 580, perWorkstation: 10, totalMbps: 5800 } }]);
  });

  it('sans poste renseigné, la bande passante est nulle et expliquée', () => {
    expect(sizeBandwidth(need())).toMatchObject({ totalMbps: 0, steps: [{ key: 'sizing.bandwidth.noData' }] });
  });
});

describe('sizeAccessPoints (EF-202)', () => {
  it('580 employés / 25 par point d’accès = 24 points d’accès (arrondi supérieur)', () => {
    const result = sizeAccessPoints(need({ wifi: true, totalEmployees: 580 }));
    expect(result.recommendedAccessPoints).toBe(24);
    expect(result.steps).toEqual([{ key: 'sizing.accessPoints.formula', params: { users: 580, perAccessPoint: 25, accessPoints: 24 } }]);
  });

  it('utilise le nombre de postes si les effectifs ne sont pas renseignés', () => {
    const result = sizeAccessPoints(need({ wifi: true, workstationCount: 100 }));
    expect(result.recommendedAccessPoints).toBe(4);
  });

  it('Wi-Fi non demandé : aucun point d’accès proposé, jamais un silence sur pourquoi', () => {
    expect(sizeAccessPoints(need({ wifi: false, totalEmployees: 580 }))).toMatchObject({
      recommendedAccessPoints: 0,
      steps: [{ key: 'sizing.accessPoints.notRequested' }],
    });
    expect(sizeAccessPoints(need({ wifi: null, totalEmployees: 580 }))).toMatchObject({
      recommendedAccessPoints: 0,
      steps: [{ key: 'sizing.accessPoints.notRequested' }],
    });
  });
});

describe('sizePower (EF-202)', () => {
  it('agrège postes, switches, points d’accès et serveurs, chacun en ligne détaillée', () => {
    const ports = sizePorts(need({ workstationCount: 580 }));
    const accessPoints = sizeAccessPoints(need({ wifi: true, totalEmployees: 580 }));
    const result = sizePower(need({ workstationCount: 580, serverCount: 4 }), ports, accessPoints);

    expect(result.items).toEqual([
      { key: 'sizing.power.workstations', count: 580, unitWatts: 65, subtotalWatts: 37700 },
      { key: 'sizing.power.switches', count: 15, unitWatts: 500, subtotalWatts: 7500 },
      { key: 'sizing.power.accessPoints', count: 24, unitWatts: 25, subtotalWatts: 600 },
      { key: 'sizing.power.servers', count: 4, unitWatts: 500, subtotalWatts: 2000 },
    ]);
    expect(result.totalWatts).toBe(37700 + 7500 + 600 + 2000);
  });

  it('omet les lignes à zéro plutôt que de les afficher vides', () => {
    const ports = sizePorts(need());
    const accessPoints = sizeAccessPoints(need());
    const result = sizePower(need(), ports, accessPoints);
    expect(result.items).toEqual([]);
    expect(result.totalWatts).toBe(0);
    expect(result.steps).toEqual([{ key: 'sizing.power.noData' }]);
  });
});

describe('calculateSizing', () => {
  it('combine les quatre dimensionnements pour un besoin complet', () => {
    const result = calculateSizing({ workstationCount: 580, totalEmployees: 580, serverCount: 4, wifi: true });
    expect(result.ports.requiredSwitches).toBe(15);
    expect(result.bandwidth.totalMbps).toBe(5800);
    expect(result.accessPoints.recommendedAccessPoints).toBe(24);
    expect(result.power.totalWatts).toBeGreaterThan(0);
  });

  it('un besoin vide ne casse rien et explique chaque zéro', () => {
    const result = calculateSizing({ workstationCount: null, totalEmployees: null, serverCount: null, wifi: null });
    expect(result.ports.requiredSwitches).toBe(0);
    expect(result.bandwidth.totalMbps).toBe(0);
    expect(result.accessPoints.recommendedAccessPoints).toBe(0);
    expect(result.power.totalWatts).toBe(0);
  });
});
