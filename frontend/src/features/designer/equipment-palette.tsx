import { EQUIPMENT_CATEGORIES, type EquipmentCategory } from '@archiflow/shared';
import { useQuery } from '@tanstack/react-query';
import { Globe, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EquipmentItem } from '@/api/endpoints';
import { catalogApi } from '@/api/endpoints';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { errorMessage } from '@/utils/errors';
import { CATEGORY_ICONS } from './category-icons';
import { EQUIPMENT_DRAG_MIME, type EquipmentDragPayload } from './drag-payload';

function startDrag(event: React.DragEvent, payload: EquipmentDragPayload) {
  event.dataTransfer.setData(EQUIPMENT_DRAG_MIME, JSON.stringify(payload));
  event.dataTransfer.effectAllowed = 'copy';
}

/** Source de glisser-déposer (EF-101) : le catalogue de l'organisation, filtré sur archivedAt IS NULL. */
export function EquipmentPalette() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const equipment = useQuery({
    queryKey: ['catalog', 'equipment', 'palette'],
    queryFn: () => catalogApi.equipment({ pageSize: 100 }),
  });

  const grouped = useMemo(() => {
    const items = equipment.data?.data ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? items.filter((i) => `${i.name} ${i.reference} ${i.brand.name}`.toLowerCase().includes(q))
      : items;
    const byCategory = new Map<EquipmentCategory, EquipmentItem[]>();
    for (const item of filtered) {
      const code = item.category.code as EquipmentCategory;
      byCategory.set(code, [...(byCategory.get(code) ?? []), item]);
    }
    return byCategory;
  }, [equipment.data, search]);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-line bg-surface">
      <div className="border-b border-line p-3">
        <Input
          icon={<Search className="size-4" />}
          placeholder={t('designer.palette.search')}
          aria-label={t('designer.palette.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <PaletteItem
          draggable
          onDragStart={(e) => startDrag(e, { category: 'internet', label: t('equipment.category.internet'), equipmentModelId: null })}
          icon={<Globe className="size-4" />}
          label={t('equipment.category.internet')}
          hint={t('designer.palette.generic')}
        />
        {equipment.isPending ? (
          <div className="mt-3 flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        ) : equipment.isError ? (
          <ErrorState message={errorMessage(t, equipment.error)} onRetry={() => void equipment.refetch()} className="px-0 py-6" />
        ) : grouped.size === 0 ? (
          <EmptyState
            icon={<Search />}
            title={t('designer.palette.empty')}
            description={t('designer.palette.emptyHint')}
            className="px-0 py-6"
          />
        ) : (
          EQUIPMENT_CATEGORIES.filter((c) => grouped.has(c)).map((category) => (
            <section key={category} className="mt-4 first:mt-3">
              <h3 className="mb-1.5 px-1 text-xs font-semibold text-fg-muted">{t(`equipment.category.${category}`)}</h3>
              <div className="flex flex-col gap-1">
                {grouped.get(category)!.map((item) => {
                  const Icon = CATEGORY_ICONS[category];
                  return (
                    <PaletteItem
                      key={item.id}
                      draggable
                      onDragStart={(e) => startDrag(e, { category, label: item.name, equipmentModelId: item.id })}
                      icon={<Icon className="size-4" />}
                      label={item.name}
                      hint={item.brand.name}
                    />
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}

function PaletteItem({
  icon,
  label,
  hint,
  draggable,
  onDragStart,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  draggable: boolean;
  onDragStart: (event: React.DragEvent) => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className="flex cursor-grab items-center gap-2 rounded-field border border-line bg-inset px-2.5 py-2 text-left transition-colors hover:border-primary active:cursor-grabbing"
    >
      <span className="flex size-7 shrink-0 items-center justify-center text-fg-secondary" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-fg">{label}</span>
        <span className="block truncate text-xs text-fg-muted">{hint}</span>
      </span>
    </div>
  );
}
