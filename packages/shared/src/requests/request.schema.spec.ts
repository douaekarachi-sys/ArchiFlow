import { describe, expect, it } from 'vitest';
import {
  REQUEST_STEPS,
  canSubmitNeed,
  createRequestSchema,
  requestNeedSchema,
  requestProgress,
  requestStepDone,
  summarizeNeed,
} from './request.schema.js';

const named = { name: 'Nouveau siège Rabat' };

describe('canSubmitNeed', () => {
  it('refuse un nom trop court, même avec des employés', () => {
    expect(canSubmitNeed({ name: 'AB', totalEmployees: 200 })).toBe(false);
  });

  it('accepte un besoin formulé en langage client, sans matériel', () => {
    expect(canSubmitNeed({ ...named, freeTextNeed: 'Je veux du Wi-Fi pour 200 employés' })).toBe(true);
    expect(canSubmitNeed({ ...named, workstationCount: 100 })).toBe(true);
    expect(canSubmitNeed({ ...named, serverCount: 10 })).toBe(true);
    expect(canSubmitNeed({ ...named, wifi: true })).toBe(true);
    expect(canSubmitNeed({ ...named, buildings: [{ name: 'Siège' }] })).toBe(true);
  });

  it('refuse un projet nommé sans aucun besoin', () => {
    expect(canSubmitNeed(named)).toBe(false);
  });
});

describe('progression du wizard', () => {
  it('un besoin vide n’a aucune étape cochée', () => {
    const empty = requestNeedSchema.parse({});
    expect(requestProgress(empty)).toEqual({ done: 0, total: REQUEST_STEPS.length });
  });

  it('coche le réseau dès qu’un service est demandé, sans parler de commutateurs', () => {
    const need = requestNeedSchema.parse({ wifi: true, voip: true });
    expect(requestStepDone('network', need)).toBe(true);
    expect(requestStepDone('servers', need)).toBe(false);
  });
});

describe('création', () => {
  it('exige un nom de projet', () => {
    expect(createRequestSchema.safeParse({ name: 'AB' }).success).toBe(false);
    expect(createRequestSchema.safeParse({ name: 'Agence Tanger' }).success).toBe(true);
  });
});

describe('résumé administrateur', () => {
  it('agrège bâtiments et indicateurs visibles dans la file d’attente', () => {
    const need = requestNeedSchema.parse({
      totalEmployees: 650,
      workstationCount: 580,
      serverCount: 18,
      wifi: true,
      voip: true,
      vpn: true,
      buildings: [
        { name: 'A', areaM2: 5000 },
        { name: 'B', areaM2: 4000 },
        { name: 'C', areaM2: 3000 },
      ],
    });
    expect(summarizeNeed(need)).toEqual({
      buildingCount: 3,
      totalAreaM2: 12_000,
      totalEmployees: 650,
      workstationCount: 580,
      serverCount: 18,
      wifi: true,
      voip: true,
      vpn: true,
    });
  });
});
