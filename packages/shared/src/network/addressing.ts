import type { ArchitectureDocument } from '../architecture/document.schema.js';
import type { Anomaly } from '../architecture/validation.js';

/**
 * Plan d'adressage IP/VLAN (EF-207, partie « plan d'adressage » d'EF-205).
 *
 * Fonctions pures, zero I/O (ADR 0002) : memes regles cote client (retour immediat, ADR 0003) et
 * cote serveur (revalidation a la sauvegarde, meme fonction, meme resultat). IPv4 uniquement —
 * hors perimetre CDC pour IPv6.
 */

export interface ParsedCidr {
  /** Adresse reseau (premier octet applique le masque), entier non signe 32 bits. */
  base: number;
  prefix: number;
  /** Nombre d'adresses couvertes par le prefixe. */
  size: number;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    result = (result << 8) | n;
  }
  return result >>> 0;
}

/** Fonction pure exportee pour reutilisation (formulaires, tests) — pas seulement en interne. */
export function isValidIpv4(ip: string): boolean {
  return ipv4ToInt(ip) !== null;
}

export function parseCidr(cidr: string): ParsedCidr | null {
  const [ipPart, prefixPart] = cidr.split('/');
  if (!ipPart || !prefixPart) return null;
  const prefix = Number(prefixPart);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  const ip = ipv4ToInt(ipPart);
  if (ip === null) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const base = (ip & mask) >>> 0;
  const size = prefix === 32 ? 1 : 2 ** (32 - prefix);
  return { base, prefix, size };
}

function cidrRange(parsed: ParsedCidr): [number, number] {
  return [parsed.base, parsed.base + parsed.size - 1];
}

export function cidrsOverlap(a: ParsedCidr, b: ParsedCidr): boolean {
  const [aStart, aEnd] = cidrRange(a);
  const [bStart, bEnd] = cidrRange(b);
  return aStart <= bEnd && bStart <= aEnd;
}

export function isIpInCidr(ip: string, cidr: ParsedCidr): boolean {
  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) return false;
  const [start, end] = cidrRange(cidr);
  return ipInt >= start && ipInt <= end;
}

/** EF-207 — chevauchements de sous-reseaux, conflits de VLAN, passerelle/plage DHCP hors plan. */
export function checkAddressing(document: ArchitectureDocument): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const networks = document.networks ?? [];
  const parsedById = new Map<string, ParsedCidr | null>();
  for (const network of networks) parsedById.set(network.id, parseCidr(network.cidr));

  for (const network of networks) {
    const parsed = parsedById.get(network.id) ?? null;
    if (!parsed) {
      anomalies.push({
        severity: 'CRITICAL',
        code: 'validation.addressing.invalidCidr',
        elementIds: [],
        connectionIds: [],
        params: { network: network.name, cidr: network.cidr },
      });
      continue;
    }

    if (network.gateway && !isIpInCidr(network.gateway, parsed)) {
      anomalies.push({
        severity: 'WARNING',
        code: 'validation.addressing.gatewayOutOfRange',
        elementIds: [],
        connectionIds: [],
        params: { network: network.name, gateway: network.gateway },
      });
    }

    if (network.dhcpRangeStart || network.dhcpRangeEnd) {
      const startInt = network.dhcpRangeStart ? ipv4ToInt(network.dhcpRangeStart) : null;
      const endInt = network.dhcpRangeEnd ? ipv4ToInt(network.dhcpRangeEnd) : null;
      const startValid = network.dhcpRangeStart == null || startInt !== null;
      const endValid = network.dhcpRangeEnd == null || endInt !== null;
      if (!startValid || !endValid || (startInt != null && endInt != null && startInt > endInt)) {
        anomalies.push({
          severity: 'WARNING',
          code: 'validation.addressing.dhcpRangeInvalid',
          elementIds: [],
          connectionIds: [],
          params: { network: network.name },
        });
      } else if (
        (network.dhcpRangeStart && !isIpInCidr(network.dhcpRangeStart, parsed)) ||
        (network.dhcpRangeEnd && !isIpInCidr(network.dhcpRangeEnd, parsed))
      ) {
        anomalies.push({
          severity: 'WARNING',
          code: 'validation.addressing.dhcpRangeOutOfRange',
          elementIds: [],
          connectionIds: [],
          params: { network: network.name },
        });
      }
    }
  }

  const byVlan = new Map<number, string[]>();
  for (const network of networks) byVlan.set(network.vlanId, [...(byVlan.get(network.vlanId) ?? []), network.name]);
  for (const [vlanId, names] of byVlan) {
    if (names.length > 1) {
      anomalies.push({
        severity: 'CRITICAL',
        code: 'validation.addressing.vlanConflict',
        elementIds: [],
        connectionIds: [],
        params: { vlanId, networks: names.join(', ') },
      });
    }
  }

  const validNetworks = networks.filter((n) => parsedById.get(n.id) != null);
  for (let i = 0; i < validNetworks.length; i += 1) {
    for (let j = i + 1; j < validNetworks.length; j += 1) {
      const a = parsedById.get(validNetworks[i]!.id)!;
      const b = parsedById.get(validNetworks[j]!.id)!;
      if (cidrsOverlap(a, b)) {
        anomalies.push({
          severity: 'CRITICAL',
          code: 'validation.addressing.cidrOverlap',
          elementIds: [],
          connectionIds: [],
          params: { networkA: validNetworks[i]!.name, networkB: validNetworks[j]!.name },
        });
      }
    }
  }

  return anomalies;
}
