import type { EquipmentCategory } from '@archiflow/shared';

export const EQUIPMENT_DRAG_MIME = 'application/x-archiflow-equipment';

export interface EquipmentDragPayload {
  category: EquipmentCategory;
  label: string;
  equipmentModelId: string | null;
}
