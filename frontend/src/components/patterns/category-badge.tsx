import type { EquipmentCategory } from '@archiflow/shared';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

/*
 * Tailwind (v4) détecte les classes par analyse statique du code source : un nom de classe
 * construit dynamiquement (`bg-cat-${category}`) ne serait jamais généré. D'où cette table
 * explicite plutôt qu'une interpolation — chaque classe apparaît ici littéralement.
 */
export const CATEGORY_APPEARANCE: Record<EquipmentCategory, { bg: string; text: string; dot: string }> = {
  firewall: { bg: 'bg-cat-firewall/12', text: 'text-cat-firewall', dot: 'bg-cat-firewall' },
  router: { bg: 'bg-cat-router/12', text: 'text-cat-router', dot: 'bg-cat-router' },
  switch: { bg: 'bg-cat-switch/12', text: 'text-cat-switch', dot: 'bg-cat-switch' },
  'access-point': { bg: 'bg-cat-access-point/12', text: 'text-cat-access-point', dot: 'bg-cat-access-point' },
  'wifi-controller': { bg: 'bg-cat-wifi-controller/12', text: 'text-cat-wifi-controller', dot: 'bg-cat-wifi-controller' },
  server: { bg: 'bg-cat-server/12', text: 'text-cat-server', dot: 'bg-cat-server' },
  storage: { bg: 'bg-cat-storage/12', text: 'text-cat-storage', dot: 'bg-cat-storage' },
  'load-balancer': { bg: 'bg-cat-load-balancer/12', text: 'text-cat-load-balancer', dot: 'bg-cat-load-balancer' },
  ups: { bg: 'bg-cat-ups/12', text: 'text-cat-ups', dot: 'bg-cat-ups' },
  rack: { bg: 'bg-cat-rack/12', text: 'text-cat-rack', dot: 'bg-cat-rack' },
  workstation: { bg: 'bg-cat-workstation/12', text: 'text-cat-workstation', dot: 'bg-cat-workstation' },
  internet: { bg: 'bg-cat-internet/12', text: 'text-cat-internet', dot: 'bg-cat-internet' },
};

/** Pastille + libellé, fond teinté — code couleur constant partout (tokens.css §cat-*). */
export function CategoryBadge({ category, className }: { category: EquipmentCategory; className?: string }) {
  const { t } = useTranslation();
  const a = CATEGORY_APPEARANCE[category];
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-field px-2 text-xs font-medium', a.bg, a.text, className)}>
      <span className={cn('size-2 shrink-0 rounded-full', a.dot)} aria-hidden="true" />
      {t(`equipment.category.${category}`)}
    </span>
  );
}
