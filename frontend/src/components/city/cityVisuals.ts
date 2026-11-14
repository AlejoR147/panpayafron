import type { ViewMode } from '../../store/useViewStore';

export type HostShape = 'box' | 'sphere' | 'cylinder';

export interface CategoryVisual {
  color: string;
  shape: HostShape;
  size: number;
  label: string;
}

const CATEGORY_STYLES: Record<string, CategoryVisual> = {
  'PC administrativos': { color: '#3b82f6', shape: 'box', size: 0.34, label: 'PC administrativo' },
  'Estaciones TI/Ingeniería estándar': {
    color: '#6366f1',
    shape: 'box',
    size: 0.36,
    label: 'Estación TI estándar',
  },
  'Estaciones TI/Ingeniería alto desempeño': {
    color: '#a855f7',
    shape: 'box',
    size: 0.4,
    label: 'Estación TI alto desempeño',
  },
  'Estaciones Mercadeo/Diseño': {
    color: '#f472b6',
    shape: 'box',
    size: 0.36,
    label: 'Estación Mercadeo',
  },
  'Terminales Producción/POS': {
    color: '#f59e0b',
    shape: 'box',
    size: 0.32,
    label: 'Terminal POS',
  },
  'Portátiles corporativos': {
    color: '#818cf8',
    shape: 'box',
    size: 0.3,
    label: 'Portátil corporativo',
  },
  'Teléfonos IP': { color: '#22d3ee', shape: 'cylinder', size: 0.2, label: 'Teléfono IP' },
  'Impresoras de red': { color: '#94a3b8', shape: 'box', size: 0.32, label: 'Impresora de red' },
  'Cámaras IP fijas cableadas': {
    color: '#ef4444',
    shape: 'sphere',
    size: 0.2,
    label: 'Cámara fija',
  },
  'Cámaras IP PTZ': { color: '#f97316', shape: 'sphere', size: 0.24, label: 'Cámara PTZ' },
  'Cámaras IP inalámbricas': {
    color: '#fb923c',
    shape: 'sphere',
    size: 0.2,
    label: 'Cámara inalámbrica',
  },
  'Videoporteros / acceso con cámara': {
    color: '#be185d',
    shape: 'box',
    size: 0.24,
    label: 'Videoportero',
  },
  'Controles de acceso simples': {
    color: '#84cc16',
    shape: 'box',
    size: 0.2,
    label: 'Control de acceso',
  },
  'Sensores IoT Ethernet/PoE': {
    color: '#06b6d4',
    shape: 'box',
    size: 0.18,
    label: 'Sensor IoT',
  },
  'Móviles invitados concurrentes': {
    color: '#f43f5e',
    shape: 'sphere',
    size: 0.16,
    label: 'Móvil invitado',
  },
  'Servidores locales': { color: '#38bdf8', shape: 'box', size: 0.44, label: 'Servidor local' },
  'Servidor ERP': { color: '#34d399', shape: 'box', size: 0.44, label: 'Servidor ERP' },
};

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const NORMALIZED_STYLES = new Map(
  Object.entries(CATEGORY_STYLES).map(([clave, valor]) => [normalizar(clave), valor]),
);

const FALLBACK: CategoryVisual = { color: '#94a3b8', shape: 'box', size: 0.28, label: 'Equipo' };

export function categoriaVisual(categoria: string): CategoryVisual {
  const directo = NORMALIZED_STYLES.get(normalizar(categoria));
  if (directo) return directo;

  const texto = normalizar(categoria);
  if (texto.includes('servidor')) {
    return { color: '#38bdf8', shape: 'box', size: 0.44, label: categoria };
  }
  if (texto.includes('camara')) {
    return { color: '#ef4444', shape: 'sphere', size: 0.22, label: categoria };
  }
  if (texto.includes('telefono') && texto.includes('ip')) {
    return { color: '#22d3ee', shape: 'cylinder', size: 0.2, label: categoria };
  }
  if (texto.includes('portatil') || texto.includes('movil') || texto.includes('invitado')) {
    return { color: '#818cf8', shape: 'box', size: 0.28, label: categoria };
  }
  if (texto.includes('sensor') || texto.includes('control')) {
    return { color: '#06b6d4', shape: 'box', size: 0.2, label: categoria };
  }
  return { ...FALLBACK, label: categoria };
}

export function nombreCategoria(categoria: string): string {
  const visual = categoriaVisual(categoria);
  return visual.label;
}

export const VLAN_COLORS: Record<number, string> = {
  10: '#38bdf8',
  20: '#fbbf24',
  30: '#22d3ee',
  40: '#f87171',
  50: '#a78bfa',
  60: '#818cf8',
  70: '#fb7185',
  80: '#34d399',
};

export const VLAN_LEGEND: Array<{ vlan: number; nombre: string }> = [
  { vlan: 10, nombre: 'Administración' },
  { vlan: 20, nombre: 'Producción / POS' },
  { vlan: 30, nombre: 'Telefonía IP' },
  { vlan: 40, nombre: 'CCTV e IoT' },
  { vlan: 50, nombre: 'TI y Mercadeo' },
  { vlan: 60, nombre: 'Portátiles' },
  { vlan: 70, nombre: 'Invitados' },
  { vlan: 80, nombre: 'Servidores' },
];

export function vlanColor(vlanId: number | null): string {
  if (vlanId === null) return '#94a3b8';
  return VLAN_COLORS[vlanId] ?? '#94a3b8';
}

export const CABLE_COLORS = {
  acceso: '#64748b',
  troncal: '#fbbf24',
  fibra: '#22d3ee',
  wan: '#38bdf8',
  respaldo: '#f43f5e',
} as const;

export const CITY_STREETS = [-150, -90, -30, 30, 90, 150];
export const CITY_BLOCKS = [-120, -60, 0, 60, 120];
export const CITY_HALF = 135;
export const BLOCK_HALF = 30;
export const STREET_HALF = 5;
export const SIDEWALK_WIDTH = 3;
export const BUILDABLE_HALF = BLOCK_HALF - STREET_HALF - SIDEWALK_WIDTH;
export const SIDEWALK_HALF = BLOCK_HALF - STREET_HALF;

export const PARK_KEYS = new Set(['0:60', '-120:60', '-120:0']);

export const WAN_HUB_COLOR = '#fbbf24';
export const WAN_LINK_COLOR = '#38bdf8';
export const WAN_BACKUP_COLOR = '#f43f5e';
export const WAN_STATIC_COLOR = '#34d399';
export const WAN_DOWN_COLOR = '#ef4444';
export const COVERAGE_COLOR = '#22d3ee';
export const UNCOVERED_COLOR = '#ef4444';

export function esModoOscuro(mode: ViewMode): boolean {
  return mode !== 'ciudad';
}

export function esModoPlanos(mode: ViewMode): boolean {
  return mode === 'planos';
}

export function mostrarInterior(mode: ViewMode, sectionCut: number | null): boolean {
  return mode !== 'ciudad' || sectionCut !== null;
}
