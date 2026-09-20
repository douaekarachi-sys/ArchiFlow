/**
 * Moteur de dimensionnement (EF-202, Phase 4) : transforme le besoin exprimé par le client en
 * proposition chiffrée — ports, switches, bande passante, points d'accès, puissance électrique.
 *
 * Fonction pure, zero I/O (ADR 0002) : meme code cote portail ingenieur (retour instantane) et,
 * a terme, cote serveur si une revalidation est necessaire. Chaque resultat expose sa trace de
 * calcul (`steps`), jamais un chiffre seul — regle de qualite du brief (section 9 / Phase 4).
 *
 * Hypotheses d'ingenierie par defaut, documentees ici faute de valeur fournie par le client :
 * marge de croissance 20 %, switch de reference 48 ports, 10 Mb/s par poste, 1 point d'acces
 * pour 25 utilisateurs Wi-Fi. Ajustables plus tard via une preference projet ; fixes pour ce
 * premier jet.
 */

export const DEFAULT_GROWTH_MARGIN = 0.2;
export const DEFAULT_SWITCH_PORT_CAPACITY = 48;
export const DEFAULT_MBPS_PER_WORKSTATION = 10;
export const DEFAULT_USERS_PER_ACCESS_POINT = 25;
export const DEFAULT_WATTS_PER_WORKSTATION = 65;
export const DEFAULT_WATTS_PER_SWITCH = 500;
export const DEFAULT_WATTS_PER_ACCESS_POINT = 25;
export const DEFAULT_WATTS_PER_SERVER = 500;

/** Sous-ensemble du besoin client (RequestNeed / ProjectRequest) necessaire au dimensionnement. */
export interface SizingInput {
  workstationCount: number | null;
  totalEmployees: number | null;
  serverCount: number | null;
  wifi: boolean | null;
}

/**
 * Une ligne de la trace de calcul : `key` est une cle i18n stable (jamais un texte en dur,
 * ENF-03), `params` porte les valeurs a interpoler.
 */
export interface SizingStep {
  key: string;
  params?: Record<string, string | number>;
}

export interface PortSizing {
  workstationCount: number;
  growthMargin: number;
  requiredPorts: number;
  switchPortCapacity: number;
  requiredSwitches: number;
  steps: SizingStep[];
}

export interface BandwidthSizing {
  workstationCount: number;
  mbpsPerWorkstation: number;
  totalMbps: number;
  steps: SizingStep[];
}

export interface AccessPointSizing {
  userCount: number;
  usersPerAccessPoint: number;
  recommendedAccessPoints: number;
  steps: SizingStep[];
}

export interface PowerLineItem {
  key: string;
  count: number;
  unitWatts: number;
  subtotalWatts: number;
}

export interface PowerSizing {
  items: PowerLineItem[];
  totalWatts: number;
  steps: SizingStep[];
}

export interface EngineeringSizing {
  ports: PortSizing;
  bandwidth: BandwidthSizing;
  accessPoints: AccessPointSizing;
  power: PowerSizing;
}

/** EF-202 — ports requis et switches necessaires, avec marge de croissance. */
export function sizePorts(input: SizingInput, growthMargin = DEFAULT_GROWTH_MARGIN, switchPortCapacity = DEFAULT_SWITCH_PORT_CAPACITY): PortSizing {
  const workstationCount = input.workstationCount ?? 0;
  if (workstationCount <= 0) {
    return {
      workstationCount: 0,
      growthMargin,
      requiredPorts: 0,
      switchPortCapacity,
      requiredSwitches: 0,
      steps: [{ key: 'sizing.ports.noData' }],
    };
  }
  const growthPorts = Math.ceil(workstationCount * growthMargin);
  const requiredPorts = workstationCount + growthPorts;
  const requiredSwitches = Math.ceil(requiredPorts / switchPortCapacity);
  return {
    workstationCount,
    growthMargin,
    requiredPorts,
    switchPortCapacity,
    requiredSwitches,
    steps: [
      {
        key: 'sizing.ports.formula',
        params: {
          workstations: workstationCount,
          growthPercent: Math.round(growthMargin * 100),
          totalPorts: requiredPorts,
          switchCount: requiredSwitches,
          switchCapacity: switchPortCapacity,
        },
      },
    ],
  };
}

/** EF-202 — bande passante agregee recommandee. */
export function sizeBandwidth(input: SizingInput, mbpsPerWorkstation = DEFAULT_MBPS_PER_WORKSTATION): BandwidthSizing {
  const workstationCount = input.workstationCount ?? 0;
  if (workstationCount <= 0) {
    return { workstationCount: 0, mbpsPerWorkstation, totalMbps: 0, steps: [{ key: 'sizing.bandwidth.noData' }] };
  }
  const totalMbps = workstationCount * mbpsPerWorkstation;
  return {
    workstationCount,
    mbpsPerWorkstation,
    totalMbps,
    steps: [{ key: 'sizing.bandwidth.formula', params: { workstations: workstationCount, perWorkstation: mbpsPerWorkstation, totalMbps } }],
  };
}

/** EF-202 — nombre de points d'acces Wi-Fi recommande, uniquement si le Wi-Fi est demande. */
export function sizeAccessPoints(input: SizingInput, usersPerAccessPoint = DEFAULT_USERS_PER_ACCESS_POINT): AccessPointSizing {
  if (input.wifi !== true) {
    return { userCount: 0, usersPerAccessPoint, recommendedAccessPoints: 0, steps: [{ key: 'sizing.accessPoints.notRequested' }] };
  }
  const userCount = input.totalEmployees ?? input.workstationCount ?? 0;
  if (userCount <= 0) {
    return { userCount: 0, usersPerAccessPoint, recommendedAccessPoints: 0, steps: [{ key: 'sizing.accessPoints.noData' }] };
  }
  const recommendedAccessPoints = Math.ceil(userCount / usersPerAccessPoint);
  return {
    userCount,
    usersPerAccessPoint,
    recommendedAccessPoints,
    steps: [{ key: 'sizing.accessPoints.formula', params: { users: userCount, perAccessPoint: usersPerAccessPoint, accessPoints: recommendedAccessPoints } }],
  };
}

/** EF-202 — puissance electrique totale estimee : postes + switches + points d'acces + serveurs. */
export function sizePower(
  input: SizingInput,
  ports: PortSizing,
  accessPoints: AccessPointSizing,
  watts: {
    workstation?: number;
    switchUnit?: number;
    accessPoint?: number;
    server?: number;
  } = {},
): PowerSizing {
  const workstationWatts = watts.workstation ?? DEFAULT_WATTS_PER_WORKSTATION;
  const switchWatts = watts.switchUnit ?? DEFAULT_WATTS_PER_SWITCH;
  const apWatts = watts.accessPoint ?? DEFAULT_WATTS_PER_ACCESS_POINT;
  const serverWatts = watts.server ?? DEFAULT_WATTS_PER_SERVER;

  const items: PowerLineItem[] = [];
  const steps: SizingStep[] = [];

  const pushItem = (key: string, count: number, unitWatts: number) => {
    if (count <= 0) return;
    const subtotalWatts = count * unitWatts;
    items.push({ key, count, unitWatts, subtotalWatts });
    steps.push({ key, params: { count, unitWatts, subtotalWatts } });
  };

  pushItem('sizing.power.workstations', ports.workstationCount, workstationWatts);
  pushItem('sizing.power.switches', ports.requiredSwitches, switchWatts);
  pushItem('sizing.power.accessPoints', accessPoints.recommendedAccessPoints, apWatts);
  pushItem('sizing.power.servers', input.serverCount ?? 0, serverWatts);

  const totalWatts = items.reduce((sum, item) => sum + item.subtotalWatts, 0);
  if (items.length === 0) steps.push({ key: 'sizing.power.noData' });
  return { items, totalWatts, steps };
}

/** Calcule l'ensemble des dimensionnements EF-202 pour un besoin client donne. */
export function calculateSizing(input: SizingInput): EngineeringSizing {
  const ports = sizePorts(input);
  const bandwidth = sizeBandwidth(input);
  const accessPoints = sizeAccessPoints(input);
  const power = sizePower(input, ports, accessPoints);
  return { ports, bandwidth, accessPoints, power };
}
