import type { EquipmentCategory } from '@archiflow/shared';
import { BatteryCharging, Globe, HardDrive, Monitor, Network, Radio, Router, Rows3, Scale, Server, Shield, Wifi, type LucideIcon } from 'lucide-react';

/** Bibliothèque d'icônes normalisées par catégorie (EF-102) — une table statique, pas de choix dynamique en JSX. */
export const CATEGORY_ICONS: Record<EquipmentCategory, LucideIcon> = {
  firewall: Shield,
  router: Router,
  switch: Network,
  'access-point': Wifi,
  'wifi-controller': Radio,
  server: Server,
  storage: HardDrive,
  'load-balancer': Scale,
  ups: BatteryCharging,
  rack: Rows3,
  workstation: Monitor,
  internet: Globe,
};
