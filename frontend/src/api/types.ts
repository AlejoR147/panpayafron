export type TipoNodo =
  | 'Router'
  | 'Switch'
  | 'Pc'
  | 'Servidor'
  | 'Ap'
  | 'Telefono'
  | 'Camara'
  | 'Impresora'
  | 'Pos'
  | 'Nvr'
  | 'Wan';

export type EstadoNodo = 'Activo' | 'Caido';
export type TipoEnlace = 'Lan' | 'Wan' | 'Respaldo';
export type EstadoEnlace = 'Activo' | 'Caido';
export type TipoSede = 'Principal' | 'Regional';

export interface Posicion2D {
  x: number;
  y: number;
}

export interface RangoIp {
  inicio: string;
  fin: string;
}

export interface InterfazVlanDto {
  vlanId: number;
  ip: string;
  prefijo: number;
  red: string;
}

export interface NodoRedDto {
  id: string;
  nombre: string;
  tipo: TipoNodo;
  sedeId: string;
  vlanId: number | null;
  ip: string | null;
  mac: string | null;
  posicion2D: Posicion2D;
  estado: EstadoNodo;
  esInfraestructura: boolean;
  gateway?: string | null;
  categoria?: string | null;
  wanIp?: string | null;
  interfacesVlan?: InterfazVlanDto[] | null;
  esCore?: boolean | null;
  vlansTrunk?: number[] | null;
}

export interface EnlaceRedDto {
  id: string;
  origenId: string;
  destinoId: string;
  tipo: TipoEnlace;
  capacidadMbps: number;
  metricaRip: number;
  estado: EstadoEnlace;
  latenciaMs: number;
  protocoloRouting?: 'RipV2' | 'Estatica';
}

export interface VlanSedeDto {
  numero: number;
  nombre: string;
  funcion: string;
  prefijo: number;
  red: string;
  rangoUtilizable: RangoIp;
  broadcast: string;
  gateway: string;
  hostsActuales: number;
  hostsConCrecimiento: number;
}

export interface InventarioItemDto {
  categoria: string;
  cantidadActual: number;
  cantidadConCrecimiento: number;
  vlanId: number | null;
  esSupuesto: boolean;
}

export interface SedeDto {
  id: string;
  nombre: string;
  tipo: TipoSede;
  habilitada: boolean;
  capacidades: string[];
  layoutId: string;
  bloqueCidr: string;
  broadcastBloque: string;
  areaM2: number;
  pisos: number;
  routerId: string;
  vlans: VlanSedeDto[];
  inventario: InventarioItemDto[];
  totalHostsActuales: number;
  totalHostsConCrecimiento: number;
}

export interface ResumenInventarioDto {
  categoria: string;
  actual: number;
  conCrecimiento: number;
}

export interface MetricasSedeDto {
  sedeId: string;
  nombre: string;
  hostsActuales: number;
  hostsConCrecimiento: number;
  subredes: number;
  vlans: number;
  areaM2: number;
  pisos: number;
  servidoresLocales: number;
  inventario: InventarioItemDto[];
}

export interface MetricasNacionalesDto {
  sedesActivas: number;
  hostsActuales: number;
  hostsConCrecimiento: number;
  subredes: number;
  enlacesWan: number;
  equiposPorTipo: ResumenInventarioDto[];
  porSede: MetricasSedeDto[];
  advertencias: string[];
}

export interface TopologiaSnapshotDto {
  version: string;
  generadoEn: string;
  sedes: SedeDto[];
  nodos: NodoRedDto[];
  enlaces: EnlaceRedDto[];
  metricas: MetricasNacionalesDto;
}

export interface SaludDto {
  estado: string;
  fecha: string;
}

export interface ApiErrorBody {
  title?: string;
  detail?: string;
  status?: number;
}
