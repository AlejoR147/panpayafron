import type { NodoRedDto, TopologiaSnapshotDto } from '../../api/types';
import { CITY_CONFIG } from './cityConfig';
import { generateBuildingLayout } from './generateBuildingLayout';
import { SCENE_CONFIG } from './scene.config';
import type { BuildingLayout, CableRoute, FloorLayout, HostPlacement } from './types';

export interface WorldVec3 {
  x: number;
  y: number;
  z: number;
}

export interface WorldHost {
  id: string;
  categoria: string;
  vlanId: number | null;
  piso: number;
  roomId: string;
  connection: 'cableado' | 'wifi';
  position: WorldVec3;
  apId: string | null;
  switchId: string | null;
  cableId: string | null;
  estimado: boolean;
}

export interface WorldAp {
  id: string;
  piso: number;
  roomId: string | null;
  position: WorldVec3;
  radioCoberturaM: number;
  areaCoberturaM2: number;
  estimado: boolean;
}

export interface WorldSwitch {
  id: string;
  nombre: string;
  piso: number;
  roomId: string;
  position: WorldVec3;
  esCore: boolean;
  estimado: boolean;
}

export interface WorldCable {
  id: string;
  hostId: string;
  switchId: string;
  vlanId: number | null;
  tipo: CableRoute['tipo'];
  points: WorldVec3[];
}

export interface WorldSede {
  id: string;
  nombre: string;
  origin: { x: number; z: number };
  layout: BuildingLayout;
  footprint: { x: number; z: number; width: number; depth: number };
  height: number;
  center: WorldVec3;
  hosts: WorldHost[];
  aps: WorldAp[];
  switches: WorldSwitch[];
  cables: WorldCable[];
  floors: FloorLayout[];
  warnings: BuildingLayout['warnings'];
}

export interface WorldWanLink {
  id: string;
  origenId: string;
  destinoId: string;
  sedeOrigenId: string;
  sedeDestinoId: string;
  tipo: 'Wan' | 'Respaldo';
  protocoloRouting?: 'RipV2' | 'Estatica';
  capacidadMbps: number;
  latenciaMs: number;
  estado: 'Activo' | 'Caido';
  from: WorldVec3;
  to: WorldVec3;
}

export interface WorldLink {
  id: string;
  origenId: string;
  destinoId: string;
  tipo: 'Lan' | 'Wan' | 'Respaldo';
  protocoloRouting?: 'RipV2' | 'Estatica';
  capacidadMbps: number;
  latenciaMs: number;
  estado: 'Activo' | 'Caido';
  from: WorldVec3;
  to: WorldVec3;
}

export interface NodeWorldPosition {
  position: WorldVec3;
  aproximado: boolean;
}

export interface CityModel {
  sedes: WorldSede[];
  wanHub: WorldVec3;
  wanLinks: WorldWanLink[];
  links: WorldLink[];
  config: typeof CITY_CONFIG;
  getSede: (sedeId: string) => WorldSede | undefined;
  getSedeByNodeId: (nodeId: string) => WorldSede | undefined;
  getNodeSedeId: (nodeId: string) => string | null;
  getNodeWorldPosition: (nodeId: string) => NodeWorldPosition;
  getRouterWorldPosition: (sedeId: string) => WorldVec3;
  getHostWorldPosition: (nodeId: string) => WorldVec3 | null;
  getApWorldPosition: (nodeId: string) => WorldVec3 | null;
  getSwitchWorldPosition: (nodeId: string) => WorldVec3 | null;
  getLinkWorldPoints: (linkId: string) => [WorldVec3, WorldVec3] | null;
  getCityBounds: () => { min: WorldVec3; max: WorldVec3 };
}

const WAN_HUB_VEC3: WorldVec3 = {
  x: CITY_CONFIG.wanHub[0],
  y: CITY_CONFIG.wanHub[1],
  z: CITY_CONFIG.wanHub[2],
};

function toWorld(origin: { x: number; z: number }, local: { x: number; y: number; z: number }): WorldVec3 {
  return { x: origin.x + local.x, y: local.y, z: origin.z + local.z };
}

function findHost(layout: BuildingLayout, nodeId: string, vlanId: number | null, categoria?: string | null): HostPlacement | null {
  const hosts = layout.pisos.flatMap((piso) => piso.hosts);
  if (nodeId) {
    const exact = hosts.find((host) => host.id === nodeId);
    if (exact) return exact;
  }
  if (categoria) {
    const porCategoria = hosts.find((host) => host.categoria === categoria && (vlanId === null || host.vlanId === vlanId));
    if (porCategoria) return porCategoria;
  }
  if (vlanId !== null) {
    const porVlan = hosts.find((host) => host.vlanId === vlanId);
    if (porVlan) return porVlan;
  }
  return hosts[0] ?? null;
}

function buildWorldSede(sede: TopologiaSnapshotDto['sedes'][number], nodos: NodoRedDto[]): WorldSede {
  const origin = CITY_CONFIG.origins[sede.id] ?? { x: 0, z: 0 };
  const layout = generateBuildingLayout(sede, {
    nodos,
    apsPorSede: SCENE_CONFIG.apsPorSede,
  });

  const hosts: WorldHost[] = layout.pisos.flatMap((piso) =>
    piso.hosts.map((host) => ({
      id: host.id,
      categoria: host.categoria,
      vlanId: host.vlanId,
      piso: host.piso,
      roomId: host.roomId,
      connection: host.connection,
      position: toWorld(origin, host.position),
      apId: host.apId,
      switchId: host.switchId,
      cableId: host.cableId,
      estimado: host.estimado,
    })),
  );

  const aps: WorldAp[] = layout.aps.map((ap) => ({
    id: ap.id,
    piso: ap.piso,
    roomId: ap.roomId,
    position: toWorld(origin, ap.position),
    radioCoberturaM: ap.radioCoberturaM,
    areaCoberturaM2: ap.areaCoberturaM2,
    estimado: ap.estimado,
  }));

  const switches: WorldSwitch[] = layout.switches.map((sw) => ({
    id: sw.id,
    nombre: sw.nombre,
    piso: sw.piso,
    roomId: sw.roomId,
    position: toWorld(origin, sw.position),
    esCore: sw.esCore,
    estimado: sw.estimado,
  }));

  const cables: WorldCable[] = layout.pisos.flatMap((piso) =>
    piso.cables.map((cable) => ({
      id: cable.id,
      hostId: cable.hostId,
      switchId: cable.switchId,
      vlanId: cable.vlanId,
      tipo: cable.tipo,
      points: cable.points.map((point) => toWorld(origin, point)),
    })),
  );

  const center = toWorld(origin, {
    x: layout.footprint.x + layout.footprint.width / 2,
    y: layout.alturaTotalM,
    z: layout.footprint.z + layout.footprint.depth / 2,
  });

  return {
    id: sede.id,
    nombre: sede.nombre,
    origin,
    layout,
    footprint: {
      x: origin.x + layout.footprint.x,
      z: origin.z + layout.footprint.z,
      width: layout.footprint.width,
      depth: layout.footprint.depth,
    },
    height: layout.alturaTotalM,
    center,
    hosts,
    aps,
    switches,
    cables,
    floors: layout.pisos,
    warnings: layout.warnings,
  };
}

export function buildCityModel(snapshot: TopologiaSnapshotDto): CityModel {
  const sedes = snapshot.sedes.map((sede) => buildWorldSede(sede, snapshot.nodos));
  const sedeById = new Map(sedes.map((sede) => [sede.id, sede]));
  const nodeById = new Map(snapshot.nodos.map((nodo) => [nodo.id, nodo]));

  const getNodeSedeId = (nodeId: string): string | null => nodeById.get(nodeId)?.sedeId ?? null;

  const getRouterWorldPosition = (sedeId: string): WorldVec3 => {
    const sede = sedeById.get(sedeId);
    if (!sede) return { ...WAN_HUB_VEC3 };
    return {
      x: sede.center.x,
      y: sede.height + 2.4,
      z: sede.center.z,
    };
  };

  const getHostWorldPosition = (nodeId: string): WorldVec3 | null => {
    const nodo = nodeById.get(nodeId);
    if (!nodo) return null;
    const sede = sedeById.get(nodo.sedeId);
    if (!sede) return null;
    const host = findHost(sede.layout, nodo.id, nodo.vlanId, nodo.categoria ?? null);
    return host ? toWorld(sede.origin, host.position) : null;
  };

  const getApWorldPosition = (nodeId: string): WorldVec3 | null => {
    const nodo = nodeById.get(nodeId);
    if (!nodo) return null;
    const sede = sedeById.get(nodo.sedeId);
    if (!sede) return null;
    const ap = sede.layout.aps.find((item) => item.id === nodeId) ?? sede.layout.aps[0];
    return ap ? toWorld(sede.origin, ap.position) : null;
  };

  const getSwitchWorldPosition = (nodeId: string): WorldVec3 | null => {
    const nodo = nodeById.get(nodeId);
    if (!nodo) return null;
    const sede = sedeById.get(nodo.sedeId);
    if (!sede) return null;
    const sw = sede.layout.switches.find((item) => item.id === nodeId) ?? sede.layout.switches[0];
    return sw ? toWorld(sede.origin, sw.position) : null;
  };

  const getNodeWorldPosition = (nodeId: string): NodeWorldPosition => {
    const nodo = nodeById.get(nodeId);
    if (!nodo) return { position: { ...WAN_HUB_VEC3 }, aproximado: true };
    const sede = sedeById.get(nodo.sedeId);
    if (!sede) return { position: { ...WAN_HUB_VEC3 }, aproximado: true };

    if (nodo.tipo === 'Router') {
      return { position: getRouterWorldPosition(sede.id), aproximado: false };
    }
    if (nodo.tipo === 'Switch') {
      const position = getSwitchWorldPosition(nodo.id);
      return { position: position ?? sede.center, aproximado: !position };
    }
    if (nodo.tipo === 'Ap') {
      const position = getApWorldPosition(nodo.id);
      return { position: position ?? sede.center, aproximado: true };
    }

    const position = getHostWorldPosition(nodo.id);
    return { position: position ?? sede.center, aproximado: true };
  };

  const linkWorldPoints = (origenId: string, destinoId: string): [WorldVec3, WorldVec3] => {
    const origen = getNodeWorldPosition(origenId);
    const destino = getNodeWorldPosition(destinoId);
    return [origen.position, destino.position];
  };

  const links: WorldLink[] = snapshot.enlaces.map((enlace) => {
    const [from, to] = linkWorldPoints(enlace.origenId, enlace.destinoId);
    return {
      id: enlace.id,
      origenId: enlace.origenId,
      destinoId: enlace.destinoId,
      tipo: enlace.tipo,
      protocoloRouting: enlace.protocoloRouting,
      capacidadMbps: enlace.capacidadMbps,
      latenciaMs: enlace.latenciaMs,
      estado: enlace.estado,
      from,
      to,
    };
  });

  const wanLinks: WorldWanLink[] = [];
  for (const link of links) {
    if (link.tipo !== 'Wan' && link.tipo !== 'Respaldo') continue;
    const sedeOrigenId = getNodeSedeId(link.origenId);
    const sedeDestinoId = getNodeSedeId(link.destinoId);
    if (!sedeOrigenId || !sedeDestinoId) continue;
    wanLinks.push({
      id: link.id,
      origenId: link.origenId,
      destinoId: link.destinoId,
      sedeOrigenId,
      sedeDestinoId,
      tipo: link.tipo,
      protocoloRouting: link.protocoloRouting,
      capacidadMbps: link.capacidadMbps,
      latenciaMs: link.latenciaMs,
      estado: link.estado,
      from: link.from,
      to: link.to,
    });
  }

  const getSedeByNodeId = (nodeId: string): WorldSede | undefined => {
    const nodo = nodeById.get(nodeId);
    return nodo ? sedeById.get(nodo.sedeId) : undefined;
  };

  const getCityBounds = () => {
    const min: WorldVec3 = { x: Number.POSITIVE_INFINITY, y: 0, z: Number.POSITIVE_INFINITY };
    const max: WorldVec3 = { x: Number.NEGATIVE_INFINITY, y: 0, z: Number.NEGATIVE_INFINITY };
    for (const sede of sedes) {
      min.x = Math.min(min.x, sede.footprint.x);
      min.z = Math.min(min.z, sede.footprint.z);
      max.x = Math.max(max.x, sede.footprint.x + sede.footprint.width);
      max.z = Math.max(max.z, sede.footprint.z + sede.footprint.depth);
      max.y = Math.max(max.y, sede.height);
    }
    return { min, max };
  };

  return {
    sedes,
    wanHub: { ...WAN_HUB_VEC3 },
    wanLinks,
    links,
    config: CITY_CONFIG,
    getSede: (sedeId) => sedeById.get(sedeId),
    getSedeByNodeId,
    getNodeSedeId,
    getNodeWorldPosition,
    getRouterWorldPosition,
    getHostWorldPosition,
    getApWorldPosition,
    getSwitchWorldPosition,
    getLinkWorldPoints: (linkId) => {
      const link = links.find((item) => item.id === linkId);
      return link ? [link.from, link.to] : null;
    },
    getCityBounds,
  };
}
