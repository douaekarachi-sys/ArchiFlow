import type { LinkType, ZoneType } from '@archiflow/shared';
import { LINK_TYPES, ZONE_TYPES } from '@archiflow/shared';
import { Building2, Network, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { DesignerAction } from './designer-actions';
import type { DesignerNetwork, DesignerZone, EquipmentFlowNode, FlowView, LabeledFlowEdge } from './document-adapter';
import { ZONE_APPEARANCE } from './zone-appearance';

interface Props {
  selectedNode: EquipmentFlowNode | null;
  selectedEdge: LabeledFlowEdge | null;
  zones: DesignerZone[];
  networks: DesignerNetwork[];
  racks: FlowView['racks'];
  rooms: FlowView['rooms'];
  floors: FlowView['floors'];
  buildings: FlowView['buildings'];
  dispatch: (action: DesignerAction) => void;
}

/** Panneau de propriétés : élément sélectionné, connexion sélectionnée, ou gestion des zones/réseaux/sites. */
export function ElementInspector({ selectedNode, selectedEdge, zones, networks, racks, rooms, floors, buildings, dispatch }: Props) {
  const { t } = useTranslation();

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-line bg-surface p-4">
      {selectedNode ? (
        <NodeInspector node={selectedNode} zones={zones} networks={networks} racks={racks} rooms={rooms} floors={floors} buildings={buildings} dispatch={dispatch} />
      ) : selectedEdge ? (
        <EdgeInspector edge={selectedEdge} dispatch={dispatch} />
      ) : (
        <>
          <p className="text-sm text-fg-secondary">{t('designer.inspector.hint')}</p>
          <ZonesManager zones={zones} dispatch={dispatch} />
          <NetworksManager networks={networks} dispatch={dispatch} />
          <PhysicalSitesManager racks={racks} rooms={rooms} floors={floors} buildings={buildings} dispatch={dispatch} />
        </>
      )}
    </aside>
  );
}

/** Étiquette « Bâtiment / Étage / Salle / Baie » pour une baie — dérivée, jamais stockée. */
function rackBreadcrumb(rack: FlowView['racks'][number], rooms: FlowView['rooms'], floors: FlowView['floors'], buildings: FlowView['buildings']): string {
  const room = rooms.find((r) => r.id === rack.roomId);
  const floor = room ? floors.find((f) => f.id === room.floorId) : undefined;
  const building = floor ? buildings.find((b) => b.id === floor.buildingId) : undefined;
  return [building?.name, floor?.name, room?.name, rack.name].filter(Boolean).join(' / ');
}

function NodeInspector({
  node,
  zones,
  networks,
  racks,
  rooms,
  floors,
  buildings,
  dispatch,
}: {
  node: EquipmentFlowNode;
  zones: DesignerZone[];
  networks: DesignerNetwork[];
  racks: FlowView['racks'];
  rooms: FlowView['rooms'];
  floors: FlowView['floors'];
  buildings: FlowView['buildings'];
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
      <Field label={t('designer.inspector.rack')}>
        <select
          className="h-9 w-full rounded-field border border-line bg-inset px-3 text-sm text-fg"
          value={node.data.placement?.rackId ?? ''}
          onChange={(e) =>
            dispatch({
              type: 'updateElementPlacement',
              elementId: node.id,
              rackId: e.target.value || null,
              unit: e.target.value ? (node.data.placement?.unit ?? 1) : null,
            })
          }
        >
          <option value="">{t('designer.inspector.noRack')}</option>
          {racks.map((rack) => (
            <option key={rack.id} value={rack.id}>
              {rackBreadcrumb(rack, rooms, floors, buildings)}
            </option>
          ))}
        </select>
      </Field>
      {node.data.placement?.rackId && (
        <Field label={t('designer.inspector.unit')}>
          <Input
            type="number"
            min="1"
            max="60"
            value={node.data.placement.unit ?? 1}
            onChange={(e) =>
              dispatch({ type: 'updateElementPlacement', elementId: node.id, rackId: node.data.placement!.rackId!, unit: Number(e.target.value) || 1 })
            }
          />
        </Field>
      )}
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

/**
 * Schéma physique d'EF-205 — construction minimale : bâtiment → étage → salle → baie, pas de
 * câblage détaillé. Un ajout crée toute la chaîne en réutilisant les niveaux déjà nommés
 * (bâtiment/étage/salle) : pas besoin de les créer un par un pour ajouter une seconde baie.
 */
function PhysicalSitesManager({
  racks,
  rooms,
  floors,
  buildings,
  dispatch,
}: {
  racks: FlowView['racks'];
  rooms: FlowView['rooms'];
  floors: FlowView['floors'];
  buildings: FlowView['buildings'];
  dispatch: (a: DesignerAction) => void;
}) {
  const { t } = useTranslation();
  const [buildingName, setBuildingName] = useState('');
  const [floorName, setFloorName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [rackName, setRackName] = useState('');
  const [totalUnits, setTotalUnits] = useState('42');

  const canAdd =
    buildingName.trim() !== '' &&
    floorName.trim() !== '' &&
    roomName.trim() !== '' &&
    rackName.trim() !== '' &&
    Number.isInteger(Number(totalUnits)) &&
    Number(totalUnits) > 0;

  const addSite = () => {
    if (!canAdd) return;
    dispatch({
      type: 'addSite',
      buildingName: buildingName.trim(),
      floorName: floorName.trim(),
      roomName: roomName.trim(),
      rackName: rackName.trim(),
      totalUnits: Number(totalUnits),
    });
    setRackName('');
  };

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <h3 className="text-sm font-semibold text-fg">{t('designer.inspector.sites')}</h3>
      {racks.length === 0 && <p className="text-xs text-fg-muted">{t('designer.inspector.noSites')}</p>}
      <ul className="flex flex-col gap-1.5">
        {racks.map((rack) => (
          <li key={rack.id} className="flex items-center justify-between gap-2 rounded-field border border-line bg-inset px-2.5 py-1.5">
            <span className="flex min-w-0 items-center gap-2">
              <Building2 className="size-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
              <span className="truncate text-sm text-fg" title={rackBreadcrumb(rack, rooms, floors, buildings)}>
                {rackBreadcrumb(rack, rooms, floors, buildings)} <span className="text-fg-muted">({rack.totalUnits} U)</span>
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              icon={<Trash2 />}
              aria-label={t('common.remove')}
              onClick={() => dispatch({ type: 'deleteRack', rackId: rack.id })}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 rounded-field border border-line bg-inset p-2.5">
        <Input placeholder={t('designer.inspector.buildingName')} aria-label={t('designer.inspector.buildingName')} value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
        <Input placeholder={t('designer.inspector.floorName')} aria-label={t('designer.inspector.floorName')} value={floorName} onChange={(e) => setFloorName(e.target.value)} />
        <Input placeholder={t('designer.inspector.roomName')} aria-label={t('designer.inspector.roomName')} value={roomName} onChange={(e) => setRoomName(e.target.value)} />
        <div className="flex gap-2">
          <Input placeholder={t('designer.inspector.rackName')} aria-label={t('designer.inspector.rackName')} value={rackName} onChange={(e) => setRackName(e.target.value)} />
          <Input
            type="number"
            min="1"
            max="60"
            placeholder={t('designer.inspector.totalUnits')}
            aria-label={t('designer.inspector.totalUnits')}
            value={totalUnits}
            onChange={(e) => setTotalUnits(e.target.value)}
          />
        </div>
        <Button variant="secondary" size="sm" icon={<Plus />} disabled={!canAdd} onClick={addSite}>
          {t('designer.inspector.addSite')}
        </Button>
      </div>
    </div>
  );
}
