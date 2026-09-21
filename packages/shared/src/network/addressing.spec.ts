import { describe, expect, it } from 'vitest';
import type { ArchitectureDocument, IpNetwork } from '../architecture/document.schema.js';
import { checkAddressing, cidrsOverlap, isIpInCidr, isValidIpv4, parseCidr } from './addressing.js';

const net = (id: string, overrides: Partial<IpNetwork> = {}): IpNetwork => ({
  id,
  name: id,
  vlanId: 10,
  cidr: '10.0.0.0/24',
  ...overrides,
});

const doc = (networks: IpNetwork[]): ArchitectureDocument => ({ elements: [], connections: [], zones: [], networks });

describe('parseCidr', () => {
  it('calcule adresse reseau, prefixe et taille', () => {
    expect(parseCidr('192.168.1.10/24')).toEqual({ base: (((192 << 24) | (168 << 16) | (1 << 8)) >>> 0), prefix: 24, size: 256 });
  });

  it('rejette un format invalide', () => {
    expect(parseCidr('not-a-cidr')).toBeNull();
    expect(parseCidr('10.0.0.0/33')).toBeNull();
    expect(parseCidr('10.0.0.256/24')).toBeNull();
    expect(parseCidr('10.0.0.0')).toBeNull();
  });
});

describe('isValidIpv4 / isIpInCidr', () => {
  it('valide une adresse IPv4 bien formee', () => {
    expect(isValidIpv4('192.168.1.1')).toBe(true);
    expect(isValidIpv4('999.0.0.1')).toBe(false);
  });

  it('detecte l’appartenance d’une IP a un sous-reseau', () => {
    const cidr = parseCidr('192.168.1.0/24')!;
    expect(isIpInCidr('192.168.1.254', cidr)).toBe(true);
    expect(isIpInCidr('192.168.2.1', cidr)).toBe(false);
  });
});

describe('cidrsOverlap', () => {
  it('detecte deux sous-reseaux disjoints', () => {
    expect(cidrsOverlap(parseCidr('10.0.0.0/24')!, parseCidr('10.0.1.0/24')!)).toBe(false);
  });

  it('detecte un chevauchement (l’un contient l’autre)', () => {
    expect(cidrsOverlap(parseCidr('10.0.0.0/16')!, parseCidr('10.0.5.0/24')!)).toBe(true);
  });
});

describe('checkAddressing (EF-207)', () => {
  it('ne signale rien pour un plan coherent', () => {
    const document = doc([
      net('lan', { name: 'LAN', vlanId: 10, cidr: '192.168.10.0/24', gateway: '192.168.10.1', dhcpRangeStart: '192.168.10.100', dhcpRangeEnd: '192.168.10.200' }),
      net('dmz', { name: 'DMZ', vlanId: 20, cidr: '192.168.20.0/24' }),
    ]);
    expect(checkAddressing(document)).toEqual([]);
  });

  it('signale un CIDR invalide (CRITICAL)', () => {
    const anomalies = checkAddressing(doc([net('n1', { cidr: 'pas-un-cidr' })]));
    expect(anomalies).toContainEqual(expect.objectContaining({ severity: 'CRITICAL', code: 'validation.addressing.invalidCidr' }));
  });

  it('signale un chevauchement de sous-reseaux entre deux reseaux (CRITICAL)', () => {
    const document = doc([net('a', { name: 'A', vlanId: 10, cidr: '10.0.0.0/16' }), net('b', { name: 'B', vlanId: 20, cidr: '10.0.5.0/24' })]);
    const anomalies = checkAddressing(document);
    expect(anomalies).toContainEqual(expect.objectContaining({ severity: 'CRITICAL', code: 'validation.addressing.cidrOverlap' }));
  });

  it('signale un conflit de VLAN entre deux reseaux (CRITICAL)', () => {
    const document = doc([net('a', { name: 'A', vlanId: 10, cidr: '10.0.0.0/24' }), net('b', { name: 'B', vlanId: 10, cidr: '10.1.0.0/24' })]);
    const anomalies = checkAddressing(document);
    expect(anomalies).toContainEqual(expect.objectContaining({ severity: 'CRITICAL', code: 'validation.addressing.vlanConflict' }));
  });

  it('signale une passerelle hors du sous-reseau (WARNING)', () => {
    const anomalies = checkAddressing(doc([net('a', { cidr: '10.0.0.0/24', gateway: '10.0.1.1' })]));
    expect(anomalies).toContainEqual(expect.objectContaining({ severity: 'WARNING', code: 'validation.addressing.gatewayOutOfRange' }));
  });

  it('signale une plage DHCP inversee (WARNING)', () => {
    const anomalies = checkAddressing(doc([net('a', { cidr: '10.0.0.0/24', dhcpRangeStart: '10.0.0.200', dhcpRangeEnd: '10.0.0.100' })]));
    expect(anomalies).toContainEqual(expect.objectContaining({ severity: 'WARNING', code: 'validation.addressing.dhcpRangeInvalid' }));
  });

  it('signale une plage DHCP hors du sous-reseau (WARNING)', () => {
    const anomalies = checkAddressing(doc([net('a', { cidr: '10.0.0.0/24', dhcpRangeStart: '10.0.0.10', dhcpRangeEnd: '10.0.1.10' })]));
    expect(anomalies).toContainEqual(expect.objectContaining({ severity: 'WARNING', code: 'validation.addressing.dhcpRangeOutOfRange' }));
  });

  it('un document sans reseau ne signale rien', () => {
    expect(checkAddressing({ elements: [], connections: [], zones: [] })).toEqual([]);
  });
});
