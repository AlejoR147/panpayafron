import type { NodoRedDto, SedeDto } from '../../api/types';

export interface Vec2 {
  x: number;
  z: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Rect {
  x: number;
  z: number;
  width: number;
  depth: number;
}

export type RoomKind =
  | 'vlan'
  | 'pasillo'
  | 'nucleo'
  | 'telecom'
  | 'servidores'
  | 'recepcion'
  | 'reunion'
  | 'bano'
  | 'escaleras'
  | 'ascensor'
  | 'libre';

export type WallKind = 'exterior' | 'interior' | 'nucleo';

export type DoorOrientation = 'norte' | 'sur' | 'este' | 'oeste';

export type HostConnection = 'cableado' | 'wifi';

export type CableKind = 'acceso' | 'troncal' | 'fibra' | 'wan';

export type WaypointKind = 'pasillo' | 'puerta' | 'sala' | 'nucleo' | 'acceso' | 'escalera' | 'ascensor';

export type LayoutWarningCode =
  | 'area-estimada'
  | 'ap-estimado'
  | 'switch-estimado'
  | 'host-agregado'
  | 'sin-nodos'
  | 'piso-vacio'
  | 'cobertura-insuficiente';

export interface LayoutWarning {
  code: LayoutWarningCode;
  message: string;
  severity: 'info' | 'aviso';
}

export interface Door {
  id: string;
  roomId: string;
  piso: number;
  position: Vec2;
  width: number;
  orientation: DoorOrientation;
  conectaPasillo: boolean;
}

export interface WallSegment {
  id: string;
  piso: number;
  start: Vec2;
  end: Vec2;
  thickness: number;
  height: number;
  kind: WallKind;
}

export interface RoomLayout {
  id: string;
  nombre: string;
  kind: RoomKind;
  piso: number;
  vlanId: number | null;
  rect: Rect;
  areaM2: number;
  doorIds: string[];
  hostIds: string[];
  estimada: boolean;
}

export interface HostPlacement {
  id: string;
  categoria: string;
  vlanId: number | null;
  piso: number;
  roomId: string;
  connection: HostConnection;
  position: Vec3;
  apId: string | null;
  switchId: string | null;
  cableId: string | null;
  estimado: boolean;
}

export interface ApPlacement {
  id: string;
  piso: number;
  roomId: string | null;
  position: Vec3;
  radioCoberturaM: number;
  areaCoberturaM2: number;
  estimado: boolean;
}

export interface SwitchPlacement {
  id: string;
  nombre: string;
  piso: number;
  roomId: string;
  position: Vec3;
  esCore: boolean;
  estimado: boolean;
}

export interface CableRoute {
  id: string;
  hostId: string;
  switchId: string;
  vlanId: number | null;
  tipo: CableKind;
  points: Vec3[];
}

export interface Waypoint {
  id: string;
  piso: number;
  position: Vec2;
  kind: WaypointKind;
}

export interface WaypointEdge {
  from: string;
  to: string;
}

export interface WaypointGraph {
  nodes: Waypoint[];
  edges: WaypointEdge[];
}

export interface FloorLayout {
  piso: number;
  elevacionM: number;
  areaM2: number;
  footprint: Rect;
  pasillo: Rect;
  rooms: RoomLayout[];
  walls: WallSegment[];
  doors: Door[];
  hosts: HostPlacement[];
  aps: ApPlacement[];
  switches: SwitchPlacement[];
  cables: CableRoute[];
  waypoints: WaypointGraph;
}

export interface BuildingLayout {
  sedeId: string;
  sedeNombre: string;
  semilla: string;
  pisos: FloorLayout[];
  footprint: Rect;
  areaTotalM2: number;
  alturaTotalM: number;
  aps: ApPlacement[];
  switches: SwitchPlacement[];
  warnings: LayoutWarning[];
}

export interface LayoutOptions {
  nodos?: NodoRedDto[];
  apsPorSede?: Record<string, number>;
  semilla?: string;
}

export interface LayoutSource {
  sede: SedeDto;
  options?: LayoutOptions;
}
