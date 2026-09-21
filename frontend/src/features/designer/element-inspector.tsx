import type { LinkType, ZoneType } from '@archiflow/shared';
import { LINK_TYPES, ZONE_TYPES } from '@archiflow/shared';
import { Network, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { DesignerAction } from './designer-actions';
import type { DesignerNetwork, DesignerZone, EquipmentFlowNode, LabeledFlowEdge } from './document-adapter';
import { ZONE_APPEARANCE } from './zone-appearance';

interface Props {
  selectedNode: EquipmentFlowNode | null;
  selectedEdge: LabeledFlowEdge | null;
  zones: DesignerZone[];
  networks: DesignerNetwork[];
  dispatch: (action: DesignerAction) => void;
}

/** Panneau de propriétés : élément sélectionné, connexion sélectionnée, ou gestion des zones/réseaux. */
export function ElementInspector({ selectedNode, selectedEdge, zones, networks, dispatch }: Props) {
  const { t } = useTranslation();

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-line bg-surface p-4">
      {selectedNode ? (
        <NodeInspector node={selectedNode} zones={zones} networks={networks} dispatch={dispatch} />
      ) : selectedEdge ? (
        <EdgeInspector edge={selectedEdge} dispatch={dispatch} />
      ) : (
        <>
          <p className="text-sm text-fg-secondary">{t('designer.inspector.hint')}</p>
          <ZonesManager zones={zones} dispatch={dispatch} />
          <NetworksManager networks={networks} dispatch={dispatch} />
        </>
      )}
    </aside>
  );
}

function NodeInspector({
  node,
  zones,
  networks,
  dispatch,
}: {
  node: EquipmentFlowNode;
  zones: DesignerZone[];
  networks: DesignerNetwork[];
  dispatch: (a: DesignerAction) => void;
}) {
  const { t } = useTranslation();
  const [label, setLabel] = useState(node.data.label);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-fg">{t('designer.inspector.element')}</h3>
      <Field label={t('designer.inspector.label')}>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => label.trim() && dispatch({ type: 'updateElementLabel', elementId: node.id, label: label.trim() })}
        />
      </Field>
      <Field label={t('designer.inspector.category')}>
        <Input value={t(`equipment.category.${node.data.category}`)} disabled />
      </Field>
      <Field label={t('designer.inspector.zone')}>
        <select
          className="h-9 w-full rounded-field border border-line bg-inset px-3 text-sm text-fg"
          value={node.data.zoneId ?? ''}
          onChange={(e) => dispatch({ type: 'updateElementZone', elementId: node.id, zoneId: e.target.value || null })}
        >
          <option value="">{t('designer.inspector.noZone')}</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.label || t(`designer.zoneType.${zone.type}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('designer.inspector.network')}>
        <select
          className="h-9 w-full rounded-field border border-line bg-inset px-3 text-sm text-fg"
          value={node.data.networkId ?? ''}
          onChange={(e) => dispatch({ type: 'updateElementNetwork', elementId: node.id, networkId: e.target.value || null })}
        >
          <option value="">{t('designer.inspector.noNetwork')}</option>
          {networks.map((network) => (
            <option key={network.id} value={network.id}>
              {network.name} (VLAN {network.vlanId})
            </option>
          ))}
        </select>
      </Field>
      <Button variant="secondary" size="sm" icon={<Trash2 />} onClick={() => dispatch({ type: 'deleteElement', elementId: node.id })}>
        {t('designer.inspector.delete')}
      </Button>
    </div>
  );
}

function EdgeInspector({ edge, dispatch }: { edge: LabeledFlowEdge; dispatch: (a: DesignerAction) => void }) {
  const { t } = useTranslation();
  const data = edge.data ?? { linkType: 'copper' as LinkType };
  const patch = (fields: Partial<typeof data>) => dispatch({ type: 'updateConnection', connectionId: edge.id, patch: fields });

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-fg">{t('designer.inspector.connection')}</h3>
      <Field label={t('designer.inspector.linkType')}>
        <select
          className="h-9 w-full rounded-field border border-line bg-inset px-3 text-sm text-fg"
          value={data.linkType}
          onChange={(e) => patch({ linkType: e.target.value as LinkType })}
        >
          {LINK_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`designer.linkType.${type}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('designer.inspector.speed')}>
        <Input
          type="number"
          min="0"
          value={data.speedMbps ?? ''}
          onChange={(e) => patch({ speedMbps: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
      </Field>
      <Field label={t('designer.inspector.protocol')}>
        <Input value={data.protocol ?? ''} onChange={(e) => patch({ protocol: e.target.value || undefined })} />
      </Field>
      <Button variant="secondary" size="sm" icon={<Trash2 />} onClick={() => dispatch({ type: 'deleteConnection', connectionId: edge.id })}>
        {t('designer.inspector.delete')}
      </Button>
    </div>
  );
}

function ZonesManager({ zones, dispatch }: { zones: DesignerZone[]; dispatch: (a: DesignerAction) => void }) {
  const { t } = useTranslation();
  const [type, setType] = useState<ZoneType>('LAN');
  const [label, setLabel] = useState('');

  const addZone = () => {
    dispatch({ type: 'addZone', zoneId: crypto.randomUUID(), zoneType: type, label: label.trim() || undefined });
    setLabel('');
  };

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <h3 className="text-sm font-semibold text-fg">{t('designer.inspector.zones')}</h3>
      {zones.length === 0 && <p className="text-xs text-fg-muted">{t('designer.inspector.noZones')}</p>}
      <ul className="flex flex-col gap-1.5">
        {zones.map((zone) => (
          <li key={zone.id} className="flex items-center justify-between gap-2 rounded-field border border-line bg-inset px-2.5 py-1.5">
            <span className="flex min-w-0 items-center gap-2">
              <span className={`size-2.5 shrink-0 rounded-full ${ZONE_APPEARANCE[zone.type].dot}`} aria-hidden="true" />
              <span className="truncate text-sm text-fg">{zone.label || t(`designer.zoneType.${zone.type}`)}</span>
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              icon={<Trash2 />}
              aria-label={t('common.remove')}
              onClick={() => dispatch({ type: 'deleteZone', zoneId: zone.id })}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 rounded-field border border-line bg-inset p-2.5">
        <select
          className="h-9 w-full rounded-field border border-line bg-surface px-3 text-sm text-fg"
          value={type}
          onChange={(e) => setType(e.target.value as ZoneType)}
          aria-label={t('designer.inspector.zoneType')}
        >
          {ZONE_TYPES.map((zoneType) => (
            <option key={zoneType} value={zoneType}>
              {t(`designer.zoneType.${zoneType}`)}
            </option>
          ))}
        </select>
        <Input
          placeholder={t('designer.inspector.zoneLabel')}
          aria-label={t('designer.inspector.zoneLabel')}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Button variant="secondary" size="sm" icon={<Plus />} onClick={addZone}>
          {t('designer.inspector.addZone')}
        </Button>
      </div>
    </div>
  );
}

/** EF-207 — plan d'adressage IP/VLAN : les chevauchements/conflits sont signalés par le panneau de validation. */
function NetworksManager({ networks, dispatch }: { networks: DesignerNetwork[]; dispatch: (a: DesignerAction) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [vlanId, setVlanId] = useState('1');
  const [cidr, setCidr] = useState('');
  const [gateway, setGateway] = useState('');
  const [dhcpStart, setDhcpStart] = useState('');
  const [dhcpEnd, setDhcpEnd] = useState('');

  const canAdd = name.trim() !== '' && cidr.trim() !== '' && Number.isInteger(Number(vlanId));

  const addNetwork = () => {
    if (!canAdd) return;
    dispatch({
      type: 'addNetwork',
      network: {
        id: crypto.randomUUID(),
        name: name.trim(),
        vlanId: Number(vlanId),
        cidr: cidr.trim(),
        gateway: gateway.trim() || undefined,
        dhcpRangeStart: dhcpStart.trim() || undefined,
        dhcpRangeEnd: dhcpEnd.trim() || undefined,
      },
    });
    setName('');
    setVlanId('1');
    setCidr('');
    setGateway('');
    setDhcpStart('');
    setDhcpEnd('');
  };

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <h3 className="text-sm font-semibold text-fg">{t('designer.inspector.networks')}</h3>
      {networks.length === 0 && <p className="text-xs text-fg-muted">{t('designer.inspector.noNetworks')}</p>}
      <ul className="flex flex-col gap-1.5">
        {networks.map((network) => (
          <li key={network.id} className="flex items-center justify-between gap-2 rounded-field border border-line bg-inset px-2.5 py-1.5">
            <span className="flex min-w-0 items-center gap-2">
              <Network className="size-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
              <span className="truncate text-sm text-fg">
                {network.name} <span className="text-fg-muted">— VLAN {network.vlanId} · {network.cidr}</span>
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              icon={<Trash2 />}
              aria-label={t('common.remove')}
              onClick={() => dispatch({ type: 'deleteNetwork', networkId: network.id })}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 rounded-field border border-line bg-inset p-2.5">
        <Input placeholder={t('designer.inspector.networkName')} aria-label={t('designer.inspector.networkName')} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-2">
          <Input
            type="number"
            min="1"
            max="4094"
            placeholder={t('designer.inspector.vlanId')}
            aria-label={t('designer.inspector.vlanId')}
            value={vlanId}
            onChange={(e) => setVlanId(e.target.value)}
          />
          <Input placeholder="192.168.10.0/24" aria-label={t('designer.inspector.cidr')} value={cidr} onChange={(e) => setCidr(e.target.value)} />
        </div>
        <Input
          placeholder={t('designer.inspector.gateway')}
          aria-label={t('designer.inspector.gateway')}
          value={gateway}
          onChange={(e) => setGateway(e.target.value)}
        />
        <div className="flex gap-2">
          <Input
            placeholder={t('designer.inspector.dhcpStart')}
            aria-label={t('designer.inspector.dhcpStart')}
            value={dhcpStart}
            onChange={(e) => setDhcpStart(e.target.value)}
          />
          <Input
            placeholder={t('designer.inspector.dhcpEnd')}
            aria-label={t('designer.inspector.dhcpEnd')}
            value={dhcpEnd}
            onChange={(e) => setDhcpEnd(e.target.value)}
          />
        </div>
        <Button variant="secondary" size="sm" icon={<Plus />} disabled={!canAdd} onClick={addNetwork}>
          {t('designer.inspector.addNetwork')}
        </Button>
      </div>
    </div>
  );
}
