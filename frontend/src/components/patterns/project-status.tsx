import type { ProjectStatus } from '@archiflow/shared';
import {
  BadgeCheck,
  Calculator,
  CircleCheckBig,
  ClipboardCheck,
  Eye,
  FilePen,
  MessageSquare,
  Network,
  Receipt,
  RotateCcw,
  Send,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeTone } from '@/components/ui/badge';

/** Couleur + icône + libellé : jamais la couleur seule (brief §9.1). */
export const STATUS_APPEARANCE: Record<ProjectStatus, { tone: BadgeTone; icon: LucideIcon }> = {
  DRAFT: { tone: 'neutral', icon: FilePen },
  SUBMITTED: { tone: 'info', icon: Send },
  PENDING_ASSIGNMENT: { tone: 'warning', icon: UserPlus },
  ASSIGNED: { tone: 'info', icon: Users },
  ENGINEERING: { tone: 'primary', icon: Calculator },
  ARCHITECTURE: { tone: 'primary', icon: Network },
  INTERNAL_REVIEW: { tone: 'warning', icon: ClipboardCheck },
  COMMERCIAL_REVIEW: { tone: 'warning', icon: Receipt },
  CLIENT_REVIEW: { tone: 'info', icon: Eye },
  CLIENT_COMMENTS: { tone: 'warning', icon: MessageSquare },
  REVISION: { tone: 'warning', icon: RotateCcw },
  CLIENT_APPROVED: { tone: 'success', icon: BadgeCheck },
  COMPLETED: { tone: 'success', icon: CircleCheckBig },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useTranslation();
  const { tone, icon: Icon } = STATUS_APPEARANCE[status];
  return (
    <Badge tone={tone} icon={<Icon />}>
      {t(`status.${status}`)}
    </Badge>
  );
}
