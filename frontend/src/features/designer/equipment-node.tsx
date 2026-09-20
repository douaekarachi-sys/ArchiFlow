import { Handle, Position, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORY_APPEARANCE } from '@/components/patterns/category-badge';
import { cn } from '@/utils/cn';
import { CATEGORY_ICONS } from './category-icons';
import type { EquipmentFlowNode } from './document-adapter';
import { ZONE_APPEARANCE } from './zone-appearance';

/** Nœud du concepteur (EF-101, EF-102) : icône normalisée par catégorie, poignées de connexion. */
function EquipmentNodeImpl({ data, selected }: NodeProps<EquipmentFlowNode>) {
  const { t } = useTranslation();
  const Icon = CATEGORY_ICONS[data.category];
  const appearance = CATEGORY_APPEARANCE[data.category];

  return (
    <div
      className={cn(
        'flex w-44 items-center gap-2.5 rounded-card border bg-surface px-3 py-2.5 shadow-elevated transition-colors',
        selected ? 'border-primary ring-2 ring-focus/40' : 'border-line',
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-2.5 !border-line-strong !bg-surface" />
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-field', appearance.bg)} aria-hidden="true">
        <Icon className={cn('size-4', appearance.text)} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-fg">{data.label}</span>
        <span className="block truncate text-xs text-fg-muted">{t(`equipment.category.${data.category}`)}</span>
      </span>
      {data.zoneType && <span className={cn('size-2.5 shrink-0 rounded-full', ZONE_APPEARANCE[data.zoneType].dot)} aria-hidden="true" />}
      <Handle type="source" position={Position.Right} className="!size-2.5 !border-line-strong !bg-surface" />
    </div>
  );
}

export const EquipmentNode = memo(EquipmentNodeImpl);
