import type { ArchitectureDocument, BillOfMaterials } from '@archiflow/shared';
import { Document, G, Line, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';

/**
 * PDF d'architecture (EF-301). Mise en page volontairement en niveaux de gris : le PDF s'imprime
 * en noir et blanc, donc aucun statut ni catégorie n'y est porté par la couleur seule (brief).
 */

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  h1: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  h2: { fontSize: 13, fontWeight: 700, marginTop: 18, marginBottom: 8, borderBottom: '1pt solid #333', paddingBottom: 4 },
  muted: { color: '#555', fontSize: 9 },
  row: { flexDirection: 'row' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8 },
  infoItem: { minWidth: 140 },
  infoLabel: { fontSize: 8, color: '#666', textTransform: 'uppercase' },
  infoValue: { fontSize: 11, fontWeight: 700 },
  table: { marginTop: 4 },
  tableHeaderRow: { flexDirection: 'row', borderBottom: '1pt solid #333', paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: 'row', borderBottom: '0.5pt solid #ccc', paddingVertical: 4 },
  th: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#333' },
  td: { fontSize: 9 },
  colName: { width: '34%' },
  colCategory: { width: '20%' },
  colQty: { width: '12%', textAlign: 'right' },
  colPrice: { width: '17%', textAlign: 'right' },
  colSubtotal: { width: '17%', textAlign: 'right' },
  colNetName: { width: '18%' },
  colNetVlan: { width: '10%', textAlign: 'right' },
  colNetCidr: { width: '18%' },
  colNetGateway: { width: '16%' },
  colNetDhcp: { width: '20%' },
  colNetEquipment: { width: '18%' },
  totalsBlock: { marginTop: 10, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', gap: 12, paddingVertical: 2 },
  totalLabel: { fontSize: 9, color: '#555', width: 100, textAlign: 'right' },
  totalValue: { fontSize: 9, width: 90, textAlign: 'right' },
  grandTotal: { fontSize: 12, fontWeight: 700, width: 90, textAlign: 'right' },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, fontSize: 7, color: '#888', textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendBox: { width: 8, height: 8, border: '1pt solid #333' },
});

const money = (value: number | null, currency: string | null) =>
  value == null ? 'Non chiffré' : `${value.toLocaleString('fr-FR')} ${currency ?? ''}`.trim();

interface ReportData {
  organizationName: string;
  project: { name: string; description: string | null; status: string; clientCompanyName: string };
  document: ArchitectureDocument;
  bom: BillOfMaterials;
  generatedAt: Date;
}

/** Schéma logique simplifié : un rectangle par élément (position du document), un trait par lien. */
function LogicalDiagram({ document }: { document: ArchitectureDocument }) {
  if (document.elements.length === 0) {
    return <Text style={styles.muted}>Aucun élément placé sur le plan.</Text>;
  }
  const width = 520;
  const height = 260;
  const xs = document.elements.map((e) => e.position.x);
  const ys = document.elements.map((e) => e.position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs, minX + 1);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys, minY + 1);
  const pad = 40;
  const scaleX = (x: number) => pad + ((x - minX) / (maxX - minX || 1)) * (width - 2 * pad);
  const scaleY = (y: number) => pad + ((y - minY) / (maxY - minY || 1)) * (height - 2 * pad);
  const byId = new Map(document.elements.map((e) => [e.id, e]));

  return (
    <Svg width={width} height={height} style={{ border: '1pt solid #ccc' }}>
      {document.connections.map((c) => {
        const from = byId.get(c.from);
        const to = byId.get(c.to);
        if (!from || !to) return null;
        return (
          <Line
            key={c.id}
            x1={scaleX(from.position.x)}
            y1={scaleY(from.position.y)}
            x2={scaleX(to.position.x)}
            y2={scaleY(to.position.y)}
            stroke="#666"
            strokeWidth={1}
          />
        );
      })}
      {document.elements.map((el) => {
        const x = scaleX(el.position.x);
        const y = scaleY(el.position.y);
        const w = 64;
        const h = 22;
        return (
          <G key={el.id}>
            <Path d={`M ${x - w / 2} ${y - h / 2} h ${w} v ${h} h ${-w} Z`} stroke="#333" strokeWidth={1} fill="#f2f2f2" />
            <Text x={x} y={y + 3} style={{ fontSize: 6, textAnchor: 'middle' }}>
              {el.label.length > 16 ? `${el.label.slice(0, 15)}…` : el.label}
            </Text>
          </G>
        );
      })}
    </Svg>
  );
}

/** EF-207 — tableau d'adressage : un réseau par ligne, équipements rattachés par nom. */
function AddressingTable({ document }: { document: ArchitectureDocument }) {
  const networks = document.networks ?? [];
  if (networks.length === 0) {
    return <Text style={styles.muted}>Aucun réseau défini sur cette architecture.</Text>;
  }

  const labelsByNetworkId = new Map<string, string[]>();
  for (const element of document.elements) {
    if (!element.networkId) continue;
    labelsByNetworkId.set(element.networkId, [...(labelsByNetworkId.get(element.networkId) ?? []), element.label]);
  }

  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.th, styles.colNetName]}>Réseau</Text>
        <Text style={[styles.th, styles.colNetVlan]}>VLAN</Text>
        <Text style={[styles.th, styles.colNetCidr]}>Sous-réseau</Text>
        <Text style={[styles.th, styles.colNetGateway]}>Passerelle</Text>
        <Text style={[styles.th, styles.colNetDhcp]}>Plage DHCP</Text>
        <Text style={[styles.th, styles.colNetEquipment]}>Équipements</Text>
      </View>
      {networks.map((network) => (
        <View key={network.id} style={styles.tableRow}>
          <Text style={[styles.td, styles.colNetName]}>{network.name}</Text>
          <Text style={[styles.td, styles.colNetVlan]}>{network.vlanId}</Text>
          <Text style={[styles.td, styles.colNetCidr]}>{network.cidr}</Text>
          <Text style={[styles.td, styles.colNetGateway]}>{network.gateway ?? '—'}</Text>
          <Text style={[styles.td, styles.colNetDhcp]}>
            {network.dhcpRangeStart && network.dhcpRangeEnd ? `${network.dhcpRangeStart} – ${network.dhcpRangeEnd}` : '—'}
          </Text>
          <Text style={[styles.td, styles.colNetEquipment]}>{labelsByNetworkId.get(network.id)?.join(', ') || '—'}</Text>
        </View>
      ))}
    </View>
  );
}

export function ArchitectureReport({ organizationName, project, document, bom, generatedAt }: ReportData) {
  return (
    <Document title={`Architecture — ${project.name}`} author={organizationName}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{project.name}</Text>
        <Text style={styles.muted}>{organizationName} — proposition d'architecture réseau</Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Client</Text>
            <Text style={styles.infoValue}>{project.clientCompanyName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Statut du projet</Text>
            <Text style={styles.infoValue}>{project.status}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date d'édition</Text>
            <Text style={styles.infoValue}>{generatedAt.toLocaleDateString('fr-FR')}</Text>
          </View>
        </View>
        {project.description && <Text style={{ marginTop: 10, fontSize: 9 }}>{project.description}</Text>}

        <Text style={styles.h2}>Schéma logique</Text>
        <LogicalDiagram document={document} />
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={styles.legendBox} />
            <Text style={styles.muted}>Équipement (trait = liaison réseau)</Text>
          </View>
        </View>

        <Text style={styles.h2}>Équipements ({document.elements.length})</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colName]}>Équipement</Text>
            <Text style={[styles.th, styles.colCategory]}>Catégorie</Text>
            <Text style={[styles.th, styles.colQty]}>Qté</Text>
            <Text style={[styles.th, styles.colPrice]}>Prix unit.</Text>
            <Text style={[styles.th, styles.colSubtotal]}>Sous-total</Text>
          </View>
          {bom.lines.length === 0 ? (
            <Text style={styles.muted}>Aucun équipement chiffré.</Text>
          ) : (
            bom.lines.map((line) => (
              <View key={line.equipmentModelId} style={styles.tableRow}>
                <Text style={[styles.td, styles.colName]}>{line.name} ({line.reference})</Text>
                <Text style={[styles.td, styles.colCategory]}>{line.category}</Text>
                <Text style={[styles.td, styles.colQty]}>{line.quantity}</Text>
                <Text style={[styles.td, styles.colPrice]}>{money(line.unitPrice, line.currency)}</Text>
                <Text style={[styles.td, styles.colSubtotal]}>{money(line.subtotal, line.currency)}</Text>
              </View>
            ))
          )}
        </View>
        {bom.unpricedElementCount > 0 && (
          <Text style={{ ...styles.muted, marginTop: 4 }}>
            {bom.unpricedElementCount} élément(s) sans modèle catalogue ou sans prix renseigné, exclus des totaux.
          </Text>
        )}

        <Text style={styles.h2}>Plan d'adressage IP/VLAN</Text>
        <AddressingTable document={document} />

        <Text style={styles.h2}>Coûts</Text>
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Matériel</Text>
            <Text style={styles.totalValue}>{money(bom.materialTotal, bom.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Licences (annuel)</Text>
            <Text style={styles.totalValue}>{money(bom.licenseTotal, bom.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Mise en œuvre</Text>
            <Text style={styles.totalValue}>Non estimée</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.grandTotal}>Total</Text>
            <Text style={styles.grandTotal}>{money(bom.grandTotal, bom.currency)}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          ArchiFlow — document généré automatiquement le {generatedAt.toLocaleString('fr-FR')} — prix indicatifs, DEMO DATA le cas échéant.
        </Text>
      </Page>
    </Document>
  );
}
