import type { TipoEnlace, TipoNodo } from '../../api/types';

export const ID_NODO_ISP = 'topo-isp';
export const ID_NODO_WAN = 'wan-block';

export const DIMENSIONES = {
  nodoAncho: 208,
  nodoAlto: 76,
  ispAncho: 460,
  ispAlto: 54,
  separacionX: 24,
  separacionY: 46,
  carril: 100,
  arcoWan: 36,
} as const;

export type FormaNodo = 'hexagono' | 'octagono' | 'circulo' | 'rectangulo' | 'redondeado' | 'pastilla';

export type IconoClave =
  | 'router'
  | 'switch'
  | 'pc'
  | 'servidor'
  | 'ap'
  | 'telefono'
  | 'camara'
  | 'impresora'
  | 'pos'
  | 'nvr'
  | 'wan'
  | 'isp';

export interface MetaTipoNodo {
  etiqueta: string;
  color: string;
  forma: FormaNodo;
  icono: IconoClave;
}

export const META_TIPO: Record<TipoNodo | 'Isp', MetaTipoNodo> = {
  Router: { etiqueta: 'Router', color: '#38bdf8', forma: 'hexagono', icono: 'router' },
  Switch: { etiqueta: 'Switch', color: '#2dd4bf', forma: 'octagono', icono: 'switch' },
  Pc: { etiqueta: 'PC', color: '#34d399', forma: 'redondeado', icono: 'pc' },
  Servidor: { etiqueta: 'Servidor', color: '#a78bfa', forma: 'rectangulo', icono: 'servidor' },
  Ap: { etiqueta: 'AP', color: '#f472b6', forma: 'circulo', icono: 'ap' },
  Telefono: { etiqueta: 'Teléfono', color: '#60a5fa', forma: 'pastilla', icono: 'telefono' },
  Camara: { etiqueta: 'Cámara', color: '#fb7185', forma: 'redondeado', icono: 'camara' },
  Impresora: { etiqueta: 'Impresora', color: '#facc15', forma: 'rectangulo', icono: 'impresora' },
  Pos: { etiqueta: 'POS', color: '#f59e0b', forma: 'rectangulo', icono: 'pos' },
  Nvr: { etiqueta: 'NVR', color: '#c084fc', forma: 'rectangulo', icono: 'nvr' },
  Wan: { etiqueta: 'WAN', color: '#22d3ee', forma: 'octagono', icono: 'wan' },
  Isp: { etiqueta: 'Red WAN / ISP', color: '#22d3ee', forma: 'pastilla', icono: 'isp' },
};

export interface TopoNodeData {
  nombre: string;
  linea2: string;
  linea3: string;
  titulo: string;
  sedeId: string | null;
  color: string;
  forma: FormaNodo;
  icono: IconoClave;
  esIsp: boolean;
  caido: boolean;
  enRuta: boolean;
  enPaso: boolean;
  sedeActiva: boolean;
  seleccionado: boolean;
}

export interface WanCityNodeData {
  nombre: string;
  subnet: string;
  esPrincipal: boolean;
  sinDatos: boolean;
  enRuta: boolean;
  enPaso: boolean;
  seleccionado: boolean;
  sedeActiva: boolean;
  esWan: boolean;
}

export type AristaTipo = TipoEnlace | 'Isp';

export interface TopoEdgeData {
  enlaceId: string | null;
  tipo: AristaTipo;
  enRuta: boolean;
  enPaso: boolean;
  caido: boolean;
}
