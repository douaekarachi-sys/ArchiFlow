import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { memo } from 'react';
import type { LabeledFlowEdge } from './document-adapter';

/** Style par type de lien (EF-103) : couleur ET tracé, jamais la seule couleur (brief §9.1). */
const LINK_STYLE: Record<string, { className: string; dashArray?: string }> = {
  copper: { className: 'stroke-border-strong' },
  fiber: { className: 'stroke-cat-storage' },
  wireless: { className: 'stroke-cat-access-point', dashArray: '6 4' },
  virtual: { className: 'stroke-primary', dashArray: '2 4' },
};

function speedLabel(speedMbps: number | undefined): string | null {
  if (!speedMbps) return null;
  return speedMbps >= 1000 ? `${speedMbps / 1000} Gbps` : `${speedMbps} Mbps`;
}

/** Arête du concepteur : tracé en marches, libellé flottant (débit, protocole) — EF-103. */
function LabeledEdgeImpl({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps<LabeledFlowEdge>) {
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 8 });
  const style = LINK_STYLE[data?.linkType ?? 'copper'] ?? LINK_STYLE.copper!;
  const speed = speedLabel(data?.speedMbps);
  const label = [speed, data?.protocol].filter(Boolean).join(' · ');

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className={style.className}
        style={{ strokeWidth: selected ? 2.5 : 1.5, strokeDasharray: style.dashArray }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute rounded-field border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium text-fg-secondary shadow-elevated"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'none' }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const LabeledEdge = memo(LabeledEdgeImpl);
