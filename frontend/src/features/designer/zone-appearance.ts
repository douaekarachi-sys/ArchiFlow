import type { ZoneType } from '@archiflow/shared';

/*
 * Tailwind (v4) détecte les classes par analyse statique : chaque classe apparaît ici
 * littéralement, jamais construite par interpolation (même principe que CategoryBadge).
 */
export const ZONE_APPEARANCE: Record<ZoneType, { bg: string; text: string; dot: string; border: string }> = {
  DMZ: { bg: 'bg-zone-dmz/12', text: 'text-zone-dmz', dot: 'bg-zone-dmz', border: 'border-zone-dmz' },
  LAN: { bg: 'bg-zone-lan/12', text: 'text-zone-lan', dot: 'bg-zone-lan', border: 'border-zone-lan' },
  WAN: { bg: 'bg-zone-wan/12', text: 'text-zone-wan', dot: 'bg-zone-wan', border: 'border-zone-wan' },
  REMOTE_SITE: { bg: 'bg-zone-remote-site/12', text: 'text-zone-remote-site', dot: 'bg-zone-remote-site', border: 'border-zone-remote-site' },
};
