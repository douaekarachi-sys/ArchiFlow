import type { EquipmentCategory } from '@archiflow/shared';

/** Mêmes teintes que les jetons `--cat-*` de tokens.css (hex, requis par Three.js). */
export const CATEGORY_HEX: Record<EquipmentCategory, string> = {
  firewall: '#E11D48',
  router: '#7C3AED',
  switch: '#0284C7',
  'access-point': '#0891B2',
  'wifi-controller': '#0D9488',
  server: '#059669',
  storage: '#D97706',
  'load-balancer': '#DB2777',
  ups: '#64748B',
  rack: '#475569',
  workstation: '#94A3B8',
  internet: '#111827',
};
