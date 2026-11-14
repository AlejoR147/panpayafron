import type { SedeDto, VlanSedeDto } from '../../api/types';
import type { SceneConfig } from './scene.config';
import { SCENE_CONFIG } from './scene.config';
import { crearRng, entre } from './rng';
import type {
  ApPlacement,
  BuildingLayout,
  CableRoute,
  Door,
  DoorOrientation,
  FloorLayout,
  HostConnection,
  HostPlacement,
  LayoutOptions,
  LayoutWarning,
  LayoutWarningCode,
  Rect,
  RoomKind,
  RoomLayout,
  SwitchPlacement,
  Vec2,
  Vec3,
  WallKind,
  WallSegment,
  Waypoint,
  WaypointEdge,
  WaypointGraph,
  WaypointKind,
} from './types';
import {
  clamp,
  compararTexto,
  distancia2D,
  limpiarPuntos,
  normalizarTexto,
  puntoEnRect,
  rectArea,
  rectCentro,
  repartirAnchos,
  repartirEntero,
  slug,
} from './layout.utils';

interface HostDraft {
  id: string;
  categoria: string;
  vlanId: number | null;
  piso: number;
  connection: HostConnection;
}

interface GrupoVlan {
  vlanId: number | null;
  nombre: string;
  drafts: HostDraft[];
}

interface BandPlan {
  key: 'north' | 'south';
  rect: Rect;
  grupos: GrupoVlan[];
  carga: number;
}

interface HostPlanResult {
  north: RoomLayout[];
  south: RoomLayout[];
  draftsPorSala: Map<string, HostDraft[]>;
  servidores: HostDraft[];
}

interface SwitchPlan {
  id: string;
  nombre: string;
  piso: number;
  esCore: boolean;
  estimado: boolean;
}

interface CoreDef {
  nombre: string;
  kind: RoomKind;
}

interface GestorWarnings {
  add(code: LayoutWarningCode, message: string, severity?: 'info' | 'aviso'): void;
  list(): LayoutWarning[];
}

function crearGestorWarnings(): GestorWarnings {
  const mapa = new Map<string, LayoutWarning>();
  return {
    add(code, message, severity = 'info') {
      const clave = `${code}|${message}`;
      if (!mapa.has(clave)) {
        mapa.set(clave, { code, message, severity });
      }
    },
    list() {
      return [...mapa.values()].sort(
        (a, b) => compararTexto(a.code, b.code) || compararTexto(a.message, b.message),
      );
    },
  };
}

function ordenarPorId<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => compararTexto(a.id, b.id));
}

function esConexionWifi(categoria: string, vlanId: number | null): boolean {
  const texto = normalizarTexto(categoria);
  return (
    texto.includes('inalambric') ||
    texto.includes('portatil') ||
    texto.includes('invitado') ||
    vlanId === 60 ||
    vlanId === 70
  );
}

function compararVlan(a: number | null, b: number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function nombreVlan(vlans: VlanSedeDto[], vlanId: number | null): string {
  if (vlanId === null) return 'Sin VLAN';
  const vlan = vlans.find((item) => item.numero === vlanId);
  return vlan?.nombre ?? `VLAN ${vlanId}`;
}

function crearHostDrafts(sede: SedeDto, pisos: number, semilla: string): Map<number, HostDraft[]> {
  const porPiso = new Map<number, HostDraft[]>();
  for (let piso = 1; piso <= pisos; piso += 1) {
    porPiso.set(piso, []);
  }

  for (const item of sede.inventario) {
    const cantidad = Math.max(0, Math.floor(item.cantidadActual));
    if (cantidad === 0) continue;

    const esServidor = normalizarTexto(item.categoria).includes('servidor');
    let conteos: number[];
    if (esServidor || item.vlanId === 80) {
      conteos = new Array<number>(pisos).fill(0);
      conteos[0] = cantidad;
    } else {
      const rng = crearRng(
        `${semilla}:inv:${slug(item.categoria)}:${item.vlanId === null ? 'sin' : item.vlanId}`,
      );
      conteos = repartirEntero(cantidad, pisos, rng);
    }

    for (let indicePiso = 0; indicePiso < pisos; indicePiso += 1) {
      const piso = indicePiso + 1;
      const lista = porPiso.get(piso);
      if (!lista) continue;
      for (let indice = 0; indice < conteos[indicePiso]; indice += 1) {
        lista.push({
          id: `host-${sede.id}-${slug(item.categoria)}-p${piso}-${indice + 1}`,
          categoria: item.categoria,
          vlanId: item.vlanId,
          piso,
          connection: esConexionWifi(item.categoria, item.vlanId) ? 'wifi' : 'cableado',
        });
      }
    }
  }

  return porPiso;
}

function calcularAreaPorPiso(
  sede: SedeDto,
  pisos: number,
  draftsPorPiso: Map<number, HostDraft[]>,
  config: SceneConfig,
): { area: number; estimada: boolean } {
  if (Number.isFinite(sede.areaM2) && sede.areaM2 > 0) {
    return { area: sede.areaM2 / pisos, estimada: false };
  }

  let area = config.areaMinimaPisoM2;
  for (let piso = 1; piso <= pisos; piso += 1) {
    const hosts = draftsPorPiso.get(piso)?.length ?? 0;
    const estimada = Math.max(
      config.areaMinimaPisoM2,
      hosts * config.m2PorHost * (1 + config.factorApoyo),
    );
    area = Math.max(area, estimada);
  }
  return { area, estimada: true };
}

function calcularHuella(area: number, rng: () => number, config: SceneConfig): Rect {
  const relacion = entre(rng, config.relacionHuellaMin, config.relacionHuellaMax);
  const profundidad = Math.max(1, Math.sqrt(Math.max(1, area) / relacion));
  const ancho = Math.max(1, relacion * profundidad);
  return { x: -ancho / 2, z: -profundidad / 2, width: ancho, depth: profundidad };
}

function calcularAnchoNucleo(anchoHuella: number): number {
  return Math.min(Math.max(6, anchoHuella * 0.22), Math.max(3.8, anchoHuella * 0.38));
}

function crearBandas(
  footprint: Rect,
  anchoPasillo: number,
): { north: Rect; south: Rect; pasillo: Rect } {
  const profundidadBanda = Math.max(0.1, (footprint.depth - anchoPasillo) / 2);
  return {
    north: { x: footprint.x, z: footprint.z, width: footprint.width, depth: profundidadBanda },
    south: { x: footprint.x, z: anchoPasillo / 2, width: footprint.width, depth: profundidadBanda },
    pasillo: { x: footprint.x, z: -anchoPasillo / 2, width: footprint.width, depth: anchoPasillo },
  };
}

function calcularTotalAps(
  sede: SedeDto,
  pisos: number,
  areaPorPiso: number,
  options: LayoutOptions | undefined,
  config: SceneConfig,
): number {
  const desdeOpciones = options?.apsPorSede?.[sede.id];
  if (desdeOpciones !== undefined) return Math.max(0, Math.floor(desdeOpciones));
  const desdeConfig = config.apsPorSede[sede.id];
  if (desdeConfig !== undefined) return Math.max(0, Math.floor(desdeConfig));
  return Math.max(0, Math.ceil((areaPorPiso * pisos) / config.areaCoberturaApm2));
}

function planificarSwitches(
  sede: SedeDto,
  options: LayoutOptions | undefined,
  pisos: number,
  warnings: GestorWarnings,
): SwitchPlan[] {
  const nodos = (options?.nodos ?? [])
    .filter((nodo) => nodo.sedeId === sede.id && nodo.tipo === 'Switch')
    .sort((a, b) => compararTexto(a.id, b.id));

  if (nodos.length === 0) {
    warnings.add(
      'sin-nodos',
      `No hay switches en los datos de ${sede.nombre}; la ubicación de los equipos activos es estimada.`,
      'info',
    );
    warnings.add(
      'switch-estimado',
      `Se creó un switch core estimado en el piso 1 de ${sede.nombre}.`,
      'aviso',
    );
    return [
      {
        id: `sw-${sede.id}-core-estimado`,
        nombre: `Switch core estimado ${sede.nombre}`,
        piso: 1,
        esCore: true,
        estimado: true,
      },
    ];
  }

  const core = nodos.find((nodo) => normalizarTexto(nodo.nombre).includes('core')) ?? nodos[0];
  const accesos = nodos.filter((nodo) => nodo !== core);
  const planes: SwitchPlan[] = [
    { id: core.id, nombre: core.nombre, piso: 1, esCore: true, estimado: false },
  ];

  let indiceAcceso = 0;
  for (const nodo of accesos) {
    const coincidencia = /piso\s*(\d+)/.exec(normalizarTexto(nodo.nombre));
    let piso = coincidencia ? Number.parseInt(coincidencia[1], 10) : Number.NaN;
    if (!Number.isFinite(piso) || piso < 1 || piso > pisos) {
      piso = pisos > 1 ? 2 + (indiceAcceso % (pisos - 1)) : 1;
    }
    indiceAcceso += 1;
    planes.push({ id: nodo.id, nombre: nodo.nombre, piso, esCore: false, estimado: false });
  }

  return planes.sort((a, b) => compararTexto(a.id, b.id));
}

function crearRoom(
  sedeId: string,
  piso: number,
  sufijo: string,
  nombre: string,
  kind: RoomKind,
  vlanId: number | null,
  rect: Rect,
): RoomLayout {
  return {
    id: `sala-${sedeId}-p${piso}-${sufijo}`,
    nombre,
    kind,
    piso,
    vlanId,
    rect,
    areaM2: rectArea(rect),
    doorIds: [],
    hostIds: [],
    estimada: true,
  };
}

function repartirNucleoEnBanda(
  sedeId: string,
  piso: number,
  defs: CoreDef[],
  banda: Rect,
  coreWidth: number,
  margen: number,
): RoomLayout[] {
  if (defs.length === 0) return [];
  const anchoUtil = Math.max(0.5, coreWidth - margen * (defs.length - 1));
  const anchos = repartirAnchos(
    defs.map(() => 1),
    anchoUtil,
    Math.min(1.2, anchoUtil / defs.length),
  );
  const salas: RoomLayout[] = [];
  let cursor = banda.x;
  for (let i = 0; i < defs.length; i += 1) {
    const def = defs[i];
    salas.push(
      crearRoom(
        sedeId,
        piso,
        `nucleo-${slug(def.nombre)}`,
        def.nombre,
        def.kind,
        null,
        { x: cursor, z: banda.z, width: anchos[i], depth: banda.depth },
      ),
    );
    cursor += anchos[i] + margen;
  }
  return salas;
}

function crearSalasNucleo(
  sedeId: string,
  piso: number,
  norte: Rect,
  sur: Rect,
  coreWidth: number,
  margen: number,
): { north: RoomLayout[]; south: RoomLayout[] } {
  const defsNorte: CoreDef[] = [
    { nombre: 'Escaleras', kind: 'escaleras' },
    { nombre: 'Ascensor', kind: 'ascensor' },
  ];
  const defsSur: CoreDef[] =
    piso === 1
      ? [
          { nombre: 'Baños', kind: 'bano' },
          { nombre: 'Cuarto de telecomunicaciones', kind: 'telecom' },
          { nombre: 'Sala de servidores', kind: 'servidores' },
          { nombre: 'Recepción', kind: 'recepcion' },
        ]
      : [
          { nombre: 'Baños', kind: 'bano' },
          { nombre: 'Cuarto de telecomunicaciones', kind: 'telecom' },
        ];

  return {
    north: repartirNucleoEnBanda(sedeId, piso, defsNorte, norte, coreWidth, margen),
    south: repartirNucleoEnBanda(sedeId, piso, defsSur, sur, coreWidth, margen),
  };
}

function agruparPorVlan(drafts: HostDraft[], vlans: VlanSedeDto[]): GrupoVlan[] {
  const mapa = new Map<string, GrupoVlan>();
  for (const draft of drafts) {
    const clave = draft.vlanId === null ? 'sin' : String(draft.vlanId);
    let grupo = mapa.get(clave);
    if (!grupo) {
      grupo = { vlanId: draft.vlanId, nombre: nombreVlan(vlans, draft.vlanId), drafts: [] };
      mapa.set(clave, grupo);
    }
    grupo.drafts.push(draft);
  }
  return [...mapa.values()];
}

function construirBandaHost(
  sedeId: string,
  piso: number,
  bandRect: Rect,
  grupos: GrupoVlan[],
  conReunion: boolean,
  config: SceneConfig,
  draftsPorSala: Map<string, HostDraft[]>,
): RoomLayout[] {
  const n = grupos.length;
  if (n === 0 && !conReunion) return [];

  const anchoBanda = bandRect.width;
  const anchoReunion = conReunion ? Math.min(4.5, Math.max(2.5, anchoBanda * 0.18)) : 0;
  const huecos = Math.max(0, n + (conReunion ? 1 : 0) - 1);
  const anchoUtil = Math.max(0.1, anchoBanda - anchoReunion - config.margenSalaM * huecos);
  const pesos = grupos.map((grupo) => Math.max(1, grupo.drafts.length));
  const anchos = n > 0 ? repartirAnchos(pesos, anchoUtil, Math.min(1.2, anchoUtil / n)) : [];

  const salas: RoomLayout[] = [];
  let cursor = bandRect.x;
  for (let i = 0; i < n; i += 1) {
    const grupo = grupos[i];
    const sala = crearRoom(
      sedeId,
      piso,
      `vlan-${grupo.vlanId === null ? 'sin' : grupo.vlanId}`,
      grupo.nombre,
      'vlan',
      grupo.vlanId,
      { x: cursor, z: bandRect.z, width: anchos[i], depth: bandRect.depth },
    );
    draftsPorSala.set(sala.id, grupo.drafts);
    salas.push(sala);
    cursor += anchos[i] + config.margenSalaM;
  }

  if (conReunion) {
    salas.push(
      crearRoom(sedeId, piso, 'reunion', 'Sala de reuniones', 'reunion', null, {
        x: cursor,
        z: bandRect.z,
        width: anchoReunion,
        depth: bandRect.depth,
      }),
    );
  }

  return salas;
}

function planificarSalasHost(
  sede: SedeDto,
  piso: number,
  drafts: HostDraft[],
  bandas: { north: Rect; south: Rect; pasillo: Rect },
  coreWidth: number,
  config: SceneConfig,
): HostPlanResult {
  const restanteNorte: Rect = {
    x: bandas.north.x + coreWidth,
    z: bandas.north.z,
    width: Math.max(0.1, bandas.north.width - coreWidth),
    depth: bandas.north.depth,
  };
  const restanteSur: Rect = {
    x: bandas.south.x + coreWidth,
    z: bandas.south.z,
    width: Math.max(0.1, bandas.south.width - coreWidth),
    depth: bandas.south.depth,
  };

  const esServidor = (draft: HostDraft) => normalizarTexto(draft.categoria).includes('servidor');
  const servidores = piso === 1 ? drafts.filter(esServidor) : [];
  const otros = piso === 1 ? drafts.filter((draft) => !esServidor(draft)) : drafts;
  const grupos = agruparPorVlan(otros, sede.vlans);
  const draftsPorSala = new Map<string, HostDraft[]>();

  const bandasPlan: BandPlan[] = [
    { key: 'north', rect: restanteNorte, grupos: [], carga: 0 },
    { key: 'south', rect: restanteSur, grupos: [], carga: 0 },
  ];

  const ordenados = [...grupos].sort(
    (a, b) => b.drafts.length - a.drafts.length || compararVlan(a.vlanId, b.vlanId),
  );
  for (const grupo of ordenados) {
    const destino = bandasPlan[0].carga <= bandasPlan[1].carga ? bandasPlan[0] : bandasPlan[1];
    destino.grupos.push(grupo);
    destino.carga += grupo.drafts.length;
  }
  for (const banda of bandasPlan) {
    banda.grupos.sort((a, b) => compararVlan(a.vlanId, b.vlanId));
  }

  let bandaReunion: 'north' | 'south' | null = null;
  const conGrupos = bandasPlan.filter((banda) => banda.grupos.length > 0);
  if (otros.length > 0 && conGrupos.length > 0) {
    const candidata = [...conGrupos].sort(
      (a, b) => a.grupos.length - b.grupos.length || (a.key === 'north' ? -1 : 1),
    )[0];
    const ancho = candidata.rect.width;
    const anchoReunion = Math.min(4.5, Math.max(2.5, ancho * 0.18));
    const usable = ancho - anchoReunion - config.margenSalaM * candidata.grupos.length;
    if (usable >= candidata.grupos.length * 1.2) {
      bandaReunion = candidata.key;
    }
  }

  return {
    north: construirBandaHost(
      sede.id,
      piso,
      restanteNorte,
      bandasPlan[0].grupos,
      bandaReunion === 'north',
      config,
      draftsPorSala,
    ),
    south: construirBandaHost(
      sede.id,
      piso,
      restanteSur,
      bandasPlan[1].grupos,
      bandaReunion === 'south',
      config,
      draftsPorSala,
    ),
    draftsPorSala,
    servidores,
  };
}

function crearPuerta(
  sala: RoomLayout,
  banda: 'north' | 'south',
  pasillo: Rect,
  piso: number,
  anchoPuerta: number,
): Door {
  const z = banda === 'north' ? pasillo.z : pasillo.z + pasillo.depth;
  const orientation: DoorOrientation = banda === 'north' ? 'sur' : 'norte';
  return {
    id: `puerta-${sala.id}`,
    roomId: sala.id,
    piso,
    position: { x: sala.rect.x + sala.rect.width / 2, z },
    width: Math.min(anchoPuerta, Math.max(0.4, sala.rect.width)),
    orientation,
    conectaPasillo: true,
  };
}

function esSalaNucleo(sala: RoomLayout): boolean {
  return (
    sala.kind !== 'vlan' &&
    sala.kind !== 'reunion' &&
    sala.kind !== 'libre' &&
    sala.kind !== 'pasillo'
  );
}

function agregarSeparadores(
  muros: WallSegment[],
  prefijo: string,
  salas: RoomLayout[],
  banda: Rect,
  pasillo: Rect,
  piso: number,
  grosor: number,
  altura: number,
  lado: 'north' | 'south',
): void {
  for (let i = 0; i < salas.length - 1; i += 1) {
    const izquierda = salas[i];
    const derecha = salas[i + 1];
    const frontera = (izquierda.rect.x + izquierda.rect.width + derecha.rect.x) / 2;
    const extremoExterior = lado === 'north' ? banda.z : banda.z + banda.depth;
    const extremoPasillo = lado === 'north' ? pasillo.z : pasillo.z + pasillo.depth;
    const kind: WallKind =
      esSalaNucleo(izquierda) && esSalaNucleo(derecha) ? 'nucleo' : 'interior';
    muros.push({
      id: `${prefijo}-${i + 1}`,
      piso,
      start: { x: frontera, z: Math.min(extremoExterior, extremoPasillo) },
      end: { x: frontera, z: Math.max(extremoExterior, extremoPasillo) },
      thickness: grosor,
      height: altura,
      kind,
    });
  }
}

function crearMuros(
  sedeId: string,
  piso: number,
  footprint: Rect,
  bandas: { north: Rect; south: Rect; pasillo: Rect },
  salasNorte: RoomLayout[],
  salasSur: RoomLayout[],
  config: SceneConfig,
): WallSegment[] {
  const muros: WallSegment[] = [];
  const grosor = config.espesorParedM;
  const altura = config.alturaParedM;
  const x0 = footprint.x;
  const x1 = footprint.x + footprint.width;
  const z0 = footprint.z;
  const z1 = footprint.z + footprint.depth;
  const agregar = (id: string, start: Vec2, end: Vec2, kind: WallKind) => {
    muros.push({ id, piso, start, end, thickness: grosor, height: altura, kind });
  };

  agregar(
    `muro-${sedeId}-p${piso}-exterior-norte`,
    { x: x0, z: z0 },
    { x: x1, z: z0 },
    'exterior',
  );
  agregar(
    `muro-${sedeId}-p${piso}-exterior-este`,
    { x: x1, z: z0 },
    { x: x1, z: z1 },
    'exterior',
  );
  agregar(
    `muro-${sedeId}-p${piso}-exterior-sur`,
    { x: x1, z: z1 },
    { x: x0, z: z1 },
    'exterior',
  );
  agregar(
    `muro-${sedeId}-p${piso}-exterior-oeste`,
    { x: x0, z: z1 },
    { x: x0, z: z0 },
    'exterior',
  );

  const zPasilloNorte = bandas.pasillo.z;
  const zPasilloSur = bandas.pasillo.z + bandas.pasillo.depth;
  agregar(
    `muro-${sedeId}-p${piso}-pasillo-norte`,
    { x: x0, z: zPasilloNorte },
    { x: x1, z: zPasilloNorte },
    'interior',
  );
  agregar(
    `muro-${sedeId}-p${piso}-pasillo-sur`,
    { x: x0, z: zPasilloSur },
    { x: x1, z: zPasilloSur },
    'interior',
  );

  agregarSeparadores(
    muros,
    `muro-${sedeId}-p${piso}-sep-norte`,
    salasNorte,
    bandas.north,
    bandas.pasillo,
    piso,
    grosor,
    altura,
    'north',
  );
  agregarSeparadores(
    muros,
    `muro-${sedeId}-p${piso}-sep-sur`,
    salasSur,
    bandas.south,
    bandas.pasillo,
    piso,
    grosor,
    altura,
    'south',
  );

  return muros;
}

function buscarSalaDePunto(punto: Vec2, salas: RoomLayout[]): string | null {
  for (const sala of salas) {
    if (puntoEnRect(punto, sala.rect)) return sala.id;
  }
  return null;
}

function crearApsPiso(
  sedeId: string,
  piso: number,
  elevacion: number,
  cantidad: number,
  footprint: Rect,
  config: SceneConfig,
  salas: RoomLayout[],
): ApPlacement[] {
  if (cantidad <= 0) return [];

  const margen = Math.min(2, Math.max(0.5, config.radioCoberturaApM * 0.3));
  const anchoInterior = Math.max(0.5, footprint.width - margen * 2);
  const fondoInterior = Math.max(0.5, footprint.depth - margen * 2);
  const columnas = Math.max(
    1,
    Math.min(cantidad, Math.ceil(Math.sqrt((cantidad * anchoInterior) / fondoInterior))),
  );
  const filas = Math.ceil(cantidad / columnas);
  const pasoX = columnas > 1 ? anchoInterior / (columnas - 1) : 0;
  const pasoZ = filas > 1 ? fondoInterior / (filas - 1) : 0;

  const aps: ApPlacement[] = [];
  for (let i = 0; i < cantidad; i += 1) {
    const columna = i % columnas;
    const fila = Math.floor(i / columnas);
    const enFila = Math.min(columnas, cantidad - fila * columnas);
    const anchoFila = (enFila - 1) * pasoX;
    const inicioX = footprint.x + margen + (anchoInterior - anchoFila) / 2;
    const x = inicioX + columna * pasoX;
    const z =
      filas > 1
        ? footprint.z + margen + fila * pasoZ
        : footprint.z + margen + fondoInterior / 2;
    aps.push({
      id: `ap-${sedeId}-p${piso}-${i + 1}`,
      piso,
      roomId: buscarSalaDePunto({ x, z }, salas),
      position: { x, y: elevacion + config.alturaPisoM - config.alturaApBajoLosaM, z },
      radioCoberturaM: config.radioCoberturaApM,
      areaCoberturaM2: config.areaCoberturaApm2,
      estimado: true,
    });
  }
  return aps;
}

function colocarSwitchesPiso(
  planes: SwitchPlan[],
  piso: number,
  elevacion: number,
  telecom: RoomLayout,
): SwitchPlacement[] {
  const delPiso = planes.filter((plan) => plan.piso === piso);
  if (delPiso.length === 0) return [];

  const centro = rectCentro(telecom.rect);
  const total = delPiso.length;
  const holgura = Math.max(0, telecom.rect.width / 2 - 0.5);
  const separacion = Math.min(0.6, telecom.rect.width / Math.max(2, total));

  return delPiso.map((plan, indice) => {
    const offset = total > 1 ? (indice - (total - 1) / 2) * separacion : 0;
    return {
      id: plan.id,
      nombre: plan.nombre,
      piso,
      roomId: telecom.id,
      position: {
        x: centro.x + clamp(offset, -holgura, holgura),
        y: elevacion + 1,
        z: centro.z,
      },
      esCore: plan.esCore,
      estimado: plan.estimado,
    };
  });
}

function colocarHostsEnSala(
  elevacion: number,
  sala: RoomLayout,
  drafts: HostDraft[],
  config: SceneConfig,
): HostPlacement[] {
  if (drafts.length === 0) return [];

  const innerW = Math.max(0.1, sala.rect.width - config.holguraHostM * 2);
  const innerD = Math.max(0.1, sala.rect.depth - config.holguraHostM * 2);
  const maxCols = Math.max(1, Math.floor(innerW / config.separacionHostXM) + 1);
  const maxRows = Math.max(1, Math.floor(innerD / config.separacionHostZM) + 1);
  const total = drafts.length;

  let columnas: number;
  let filas: number;
  let pasoX = config.separacionHostXM;
  let pasoZ = config.separacionHostZM;

  if (maxCols * maxRows >= total) {
    columnas = Math.min(
      maxCols,
      Math.max(1, Math.ceil(Math.sqrt((total * innerW) / Math.max(innerD, 0.001)))),
    );
    filas = Math.ceil(total / columnas);
    if (filas > maxRows) {
      filas = maxRows;
      columnas = Math.ceil(total / filas);
    }
    if (columnas > maxCols) {
      columnas = maxCols;
      filas = Math.ceil(total / columnas);
    }
  } else {
    columnas = Math.max(
      1,
      Math.ceil(Math.sqrt((total * innerW) / Math.max(innerD, 0.001))),
    );
    filas = Math.ceil(total / columnas);
    pasoX = columnas > 1 ? innerW / (columnas - 1) : 0;
    pasoZ = filas > 1 ? innerD / (filas - 1) : 0;
  }

  const anchoGrilla = (columnas - 1) * pasoX;
  const fondoGrilla = (filas - 1) * pasoZ;
  const inicioX = sala.rect.x + (sala.rect.width - anchoGrilla) / 2;
  const inicioZ = sala.rect.z + (sala.rect.depth - fondoGrilla) / 2;
  const y = elevacion + 0.8;

  return drafts.map((draft, indice) => {
    const columna = indice % columnas;
    const fila = Math.floor(indice / columnas);
    const x = inicioX + columna * pasoX;
    const z = inicioZ + fila * pasoZ;
    return {
      id: draft.id,
      categoria: draft.categoria,
      vlanId: draft.vlanId,
      piso: draft.piso,
      roomId: sala.id,
      connection: draft.connection,
      position: {
        x: clamp(x, sala.rect.x + 0.05, sala.rect.x + sala.rect.width - 0.05),
        y,
        z: clamp(z, sala.rect.z + 0.05, sala.rect.z + sala.rect.depth - 0.05),
      },
      apId: null,
      switchId: null,
      cableId: null,
      estimado: true,
    };
  });
}

function waypointKindSala(kind: RoomKind): WaypointKind {
  switch (kind) {
    case 'escaleras':
      return 'escalera';
    case 'ascensor':
      return 'ascensor';
    case 'telecom':
    case 'servidores':
    case 'recepcion':
    case 'bano':
      return 'nucleo';
    default:
      return 'sala';
  }
}

function buscarWaypointMasCercano(punto: Vec2, nodos: Waypoint[]): Waypoint | null {
  let mejor: Waypoint | null = null;
  let mejorDistancia = Number.POSITIVE_INFINITY;
  for (const nodo of nodos) {
    const distancia = distancia2D(punto, nodo.position);
    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejor = nodo;
    }
  }
  return mejor;
}

function crearWaypointsPiso(
  sedeId: string,
  piso: number,
  footprint: Rect,
  salas: RoomLayout[],
  puertas: Door[],
): WaypointGraph {
  const nodes: Waypoint[] = [];
  const edges: WaypointEdge[] = [];
  const ids = new Set<string>();
  const clavesAristas = new Set<string>();

  const agregarNodo = (id: string, position: Vec2, kind: WaypointKind) => {
    if (ids.has(id)) return;
    ids.add(id);
    nodes.push({ id, piso, position, kind });
  };

  const agregarArista = (from: string, to: string) => {
    if (from === to) return;
    const clave = from < to ? `${from}|${to}` : `${to}|${from}`;
    if (clavesAristas.has(clave)) return;
    clavesAristas.add(clave);
    edges.push({ from, to });
  };

  const margen = 0.5;
  const util = Math.max(0.5, footprint.width - margen * 2);
  const cantidad = Math.max(2, Math.ceil(util / 3) + 1);
  const pasillo: Waypoint[] = [];
  for (let i = 0; i < cantidad; i += 1) {
    const x = footprint.x + margen + (util * i) / (cantidad - 1);
    const nodo: Waypoint = {
      id: `wp-${sedeId}-p${piso}-pasillo-${i + 1}`,
      piso,
      position: { x, z: 0 },
      kind: 'pasillo',
    };
    pasillo.push(nodo);
    agregarNodo(nodo.id, nodo.position, nodo.kind);
  }

  for (const sala of salas) {
    agregarNodo(`wp-${sala.id}`, rectCentro(sala.rect), waypointKindSala(sala.kind));
  }
  for (const puerta of puertas) {
    agregarNodo(`wp-${puerta.id}`, puerta.position, 'puerta');
  }

  const accesoId = `wp-${sedeId}-p${piso}-acceso`;
  const accesoPosicion = { x: footprint.x + footprint.width - 1, z: 0 };
  if (piso === 1) {
    agregarNodo(accesoId, accesoPosicion, 'acceso');
  }

  const puertasPorSala = new Map<string, Door[]>();
  for (const puerta of puertas) {
    const lista = puertasPorSala.get(puerta.roomId) ?? [];
    lista.push(puerta);
    puertasPorSala.set(puerta.roomId, lista);
  }

  for (const sala of salas) {
    const centroId = `wp-${sala.id}`;
    for (const puerta of puertasPorSala.get(sala.id) ?? []) {
      agregarArista(centroId, `wp-${puerta.id}`);
    }
    if (sala.kind === 'escaleras' || sala.kind === 'ascensor') {
      const cercano = buscarWaypointMasCercano(rectCentro(sala.rect), pasillo);
      if (cercano) agregarArista(centroId, cercano.id);
    }
  }

  for (const puerta of puertas) {
    const cercano = buscarWaypointMasCercano(puerta.position, pasillo);
    if (cercano) agregarArista(`wp-${puerta.id}`, cercano.id);
  }

  if (piso === 1) {
    const cercano = buscarWaypointMasCercano(accesoPosicion, pasillo);
    if (cercano) agregarArista(accesoId, cercano.id);
  }

  nodes.sort((a, b) => compararTexto(a.id, b.id));
  edges.sort((a, b) => compararTexto(a.from, b.from) || compararTexto(a.to, b.to));
  return { nodes, edges };
}

function agregarAristaGrafo(graph: WaypointGraph, from: string, to: string): void {
  if (from === to) return;
  const existe = graph.edges.some(
    (edge) =>
      (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from),
  );
  if (existe) return;
  graph.edges.push({ from, to });
  graph.edges.sort((a, b) => compararTexto(a.from, b.from) || compararTexto(a.to, b.to));
}

function conectarWaypointsEntrePisos(floors: FloorLayout[]): void {
  const porPiso = new Map<number, FloorLayout>();
  const escaleras = new Map<number, string>();
  const ascensores = new Map<number, string>();

  for (const floor of floors) {
    porPiso.set(floor.piso, floor);
    for (const nodo of floor.waypoints.nodes) {
      if (nodo.kind === 'escalera' && !escaleras.has(floor.piso)) {
        escaleras.set(floor.piso, nodo.id);
      }
      if (nodo.kind === 'ascensor' && !ascensores.has(floor.piso)) {
        ascensores.set(floor.piso, nodo.id);
      }
    }
  }

  const conectar = (mapa: Map<number, string>) => {
    for (const [piso, desde] of mapa) {
      const hacia = mapa.get(piso + 1);
      const actual = porPiso.get(piso);
      const siguiente = porPiso.get(piso + 1);
      if (!hacia || !actual || !siguiente) continue;
      agregarAristaGrafo(actual.waypoints, desde, hacia);
      agregarAristaGrafo(siguiente.waypoints, desde, hacia);
    }
  };

  conectar(escaleras);
  conectar(ascensores);
}

function elegirSwitch(host: HostPlacement, switches: SwitchPlacement[]): SwitchPlacement | null {
  if (switches.length === 0) return null;

  const delPiso = switches.filter((switchItem) => switchItem.piso === host.piso);
  let candidatos: SwitchPlacement[];
  if (delPiso.length > 0) {
    const acceso = delPiso.filter((switchItem) => !switchItem.esCore);
    candidatos = acceso.length > 0 ? acceso : delPiso;
  } else {
    const core = switches.filter((switchItem) => switchItem.esCore);
    candidatos = core.length > 0 ? core : switches;
  }

  let mejor = candidatos[0];
  let mejorDistancia = distancia2D(host.position, mejor.position);
  for (let i = 1; i < candidatos.length; i += 1) {
    const distancia = distancia2D(host.position, candidatos[i].position);
    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejor = candidatos[i];
    }
  }
  return mejor;
}

function buscarApMasCercano(posicion: Vec3, aps: ApPlacement[]): ApPlacement {
  let mejor = aps[0];
  let mejorDistancia = distancia2D(posicion, mejor.position);
  for (let i = 1; i < aps.length; i += 1) {
    const distancia = distancia2D(posicion, aps[i].position);
    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejor = aps[i];
    }
  }
  return mejor;
}

function crearCableAcceso(
  host: HostPlacement,
  switchPlacement: SwitchPlacement,
  hostFloor: FloorLayout,
  floorPorPiso: Map<number, FloorLayout>,
): CableRoute | null {
  const hostRoom = hostFloor.rooms.find((sala) => sala.id === host.roomId);
  const hostDoor = hostRoom
    ? hostFloor.doors.find((puerta) => puerta.roomId === hostRoom.id)
    : undefined;
  const hostTelecom = hostFloor.rooms.find((sala) => sala.kind === 'telecom');
  const switchFloor = floorPorPiso.get(switchPlacement.piso);
  const switchTelecom = switchFloor?.rooms.find((sala) => sala.kind === 'telecom');
  if (!hostRoom || !hostDoor || !hostTelecom || !switchFloor || !switchTelecom) return null;

  const telecomDoor = hostFloor.doors.find((puerta) => puerta.roomId === hostTelecom.id);
  if (!telecomDoor) return null;

  const yHost = hostFloor.elevacionM + 0.1;
  const ySwitch = switchFloor.elevacionM + 0.1;
  const centroTelecomHost = rectCentro(hostTelecom.rect);
  const centroTelecomSwitch = rectCentro(switchTelecom.rect);

  const puntos: Vec3[] = [
    { x: host.position.x, y: yHost, z: host.position.z },
    { x: hostDoor.position.x, y: yHost, z: host.position.z },
    { x: hostDoor.position.x, y: yHost, z: hostDoor.position.z },
    { x: hostDoor.position.x, y: yHost, z: 0 },
    { x: telecomDoor.position.x, y: yHost, z: 0 },
    { x: telecomDoor.position.x, y: yHost, z: telecomDoor.position.z },
    { x: telecomDoor.position.x, y: yHost, z: centroTelecomHost.z },
    { x: centroTelecomHost.x, y: yHost, z: centroTelecomHost.z },
  ];

  if (host.piso === switchPlacement.piso) {
    puntos.push({ x: switchPlacement.position.x, y: yHost, z: centroTelecomHost.z });
    puntos.push({ x: switchPlacement.position.x, y: yHost, z: switchPlacement.position.z });
  } else {
    puntos.push({ x: centroTelecomHost.x, y: ySwitch, z: centroTelecomHost.z });
    puntos.push({ x: centroTelecomSwitch.x, y: ySwitch, z: centroTelecomHost.z });
    puntos.push({ x: centroTelecomSwitch.x, y: ySwitch, z: centroTelecomSwitch.z });
    puntos.push({ x: switchPlacement.position.x, y: ySwitch, z: centroTelecomSwitch.z });
    puntos.push({ x: switchPlacement.position.x, y: ySwitch, z: switchPlacement.position.z });
  }

  const limpios = limpiarPuntos(puntos);
  if (limpios.length < 2) return null;

  return {
    id: `cable-${host.id}`,
    hostId: host.id,
    switchId: switchPlacement.id,
    vlanId: host.vlanId,
    tipo: 'acceso',
    points: limpios,
  };
}

function asignarConectividad(
  floors: FloorLayout[],
  todosAps: ApPlacement[],
  todosSwitches: SwitchPlacement[],
  pisosSinCobertura: Set<number>,
): void {
  const apsPorPiso = new Map<number, ApPlacement[]>();
  for (const ap of todosAps) {
    const lista = apsPorPiso.get(ap.piso) ?? [];
    lista.push(ap);
    apsPorPiso.set(ap.piso, lista);
  }

  const floorPorPiso = new Map<number, FloorLayout>();
  for (const floor of floors) {
    floorPorPiso.set(floor.piso, floor);
  }

  for (const floor of floors) {
    const cables: CableRoute[] = [];
    for (const host of floor.hosts) {
      if (host.connection === 'wifi') {
        const candidatos = apsPorPiso.get(host.piso) ?? [];
        if (candidatos.length === 0) {
          host.apId = null;
          host.switchId = null;
          host.cableId = null;
          pisosSinCobertura.add(host.piso);
          continue;
        }
        host.apId = buscarApMasCercano(host.position, candidatos).id;
        host.switchId = null;
        host.cableId = null;
        continue;
      }

      const switchElegido = elegirSwitch(host, todosSwitches);
      if (!switchElegido) {
        host.switchId = null;
        host.cableId = null;
        continue;
      }

      host.switchId = switchElegido.id;
      host.cableId = `cable-${host.id}`;
      const cable = crearCableAcceso(host, switchElegido, floor, floorPorPiso);
      if (cable) {
        cables.push(cable);
      } else {
        host.cableId = null;
      }
    }
    floor.cables = cables.sort((a, b) => compararTexto(a.id, b.id));
  }
}

export function generateBuildingLayout(
  sede: SedeDto,
  options?: LayoutOptions,
): BuildingLayout {
  const config = SCENE_CONFIG;
  const pisos = Math.max(1, Math.floor(sede.pisos));
  const semilla = options?.semilla ?? `${config.salSemilla}:${sede.id}`;
  const warnings = crearGestorWarnings();

  const draftsPorPiso = crearHostDrafts(sede, pisos, semilla);
  const areaInfo = calcularAreaPorPiso(sede, pisos, draftsPorPiso, config);
  const footprint = calcularHuella(areaInfo.area, crearRng(`${semilla}:huella`), config);
  const anchoPasillo = Math.min(config.anchoPasilloM, Math.max(1, footprint.depth * 0.4));
  const coreWidth = calcularAnchoNucleo(footprint.width);
  const bandas = crearBandas(footprint, anchoPasillo);

  if (areaInfo.estimada) {
    warnings.add(
      'area-estimada',
      `El área por piso de ${sede.nombre} se estimó a partir del inventario porque la sede no reporta área construida.`,
      'aviso',
    );
  }
  warnings.add(
    'host-agregado',
    `Los hosts mostrados representan el inventario agregado de ${sede.nombre}; no son equipos individuales reales.`,
    'info',
  );

  const totalAps = calcularTotalAps(sede, pisos, areaInfo.area, options, config);
  const apCounts = repartirEntero(totalAps, pisos, crearRng(`${semilla}:aps`));
  if (totalAps > 0) {
    warnings.add(
      'ap-estimado',
      `La cantidad y la posición de los ${totalAps} AP de ${sede.nombre} son estimadas y no provienen de la API.`,
      'aviso',
    );
  }

  const switchPlans = planificarSwitches(sede, options, pisos, warnings);

  const floors: FloorLayout[] = [];
  const todosAps: ApPlacement[] = [];
  const todosSwitches: SwitchPlacement[] = [];
  const pisosSinCobertura = new Set<number>();

  for (let piso = 1; piso <= pisos; piso += 1) {
    const elevacion = (piso - 1) * config.alturaPisoM;
    const drafts = draftsPorPiso.get(piso) ?? [];
    const nucleo = crearSalasNucleo(
      sede.id,
      piso,
      bandas.north,
      bandas.south,
      coreWidth,
      config.margenSalaM,
    );
    const planHost = planificarSalasHost(sede, piso, drafts, bandas, coreWidth, config);

    const salaServidores = nucleo.south.find((sala) => sala.kind === 'servidores');
    if (salaServidores && planHost.servidores.length > 0) {
      planHost.draftsPorSala.set(salaServidores.id, planHost.servidores);
    }

    const salasNorte = [...nucleo.north, ...planHost.north];
    const salasSur = [...nucleo.south, ...planHost.south];
    const salas = [...salasNorte, ...salasSur];

    const puertas: Door[] = [];
    for (const sala of salasNorte) {
      const puerta = crearPuerta(sala, 'north', bandas.pasillo, piso, config.anchoPuertaM);
      sala.doorIds = [puerta.id];
      puertas.push(puerta);
    }
    for (const sala of salasSur) {
      const puerta = crearPuerta(sala, 'south', bandas.pasillo, piso, config.anchoPuertaM);
      sala.doorIds = [puerta.id];
      puertas.push(puerta);
    }

    const muros = crearMuros(sede.id, piso, footprint, bandas, salasNorte, salasSur, config);

    const apsPiso = crearApsPiso(
      sede.id,
      piso,
      elevacion,
      apCounts[piso - 1] ?? 0,
      footprint,
      config,
      salas,
    );
    if (apsPiso.length * config.areaCoberturaApm2 + 1e-6 < areaInfo.area) {
      pisosSinCobertura.add(piso);
    }
    todosAps.push(...apsPiso);

    const telecom = salasSur.find((sala) => sala.kind === 'telecom');
    const switchesPiso = telecom
      ? colocarSwitchesPiso(switchPlans, piso, elevacion, telecom)
      : [];
    todosSwitches.push(...switchesPiso);

    const hostsPiso: HostPlacement[] = [];
    for (const sala of salas) {
      const draftsSala = planHost.draftsPorSala.get(sala.id) ?? [];
      const colocados = colocarHostsEnSala(elevacion, sala, draftsSala, config);
      sala.hostIds = colocados.map((host) => host.id).sort(compararTexto);
      hostsPiso.push(...colocados);
    }

    const waypoints = crearWaypointsPiso(sede.id, piso, footprint, salas, puertas);
    if (drafts.length === 0) {
      warnings.add(
        'piso-vacio',
        `El piso ${piso} de ${sede.nombre} no tiene hosts asignados.`,
        'info',
      );
    }

    floors.push({
      piso,
      elevacionM: elevacion,
      areaM2: areaInfo.area,
      footprint: { ...footprint },
      pasillo: { ...bandas.pasillo },
      rooms: ordenarPorId(salas),
      walls: ordenarPorId(muros),
      doors: ordenarPorId(puertas),
      hosts: ordenarPorId(hostsPiso),
      aps: ordenarPorId(apsPiso),
      switches: ordenarPorId(switchesPiso),
      cables: [],
      waypoints,
    });
  }

  asignarConectividad(floors, todosAps, todosSwitches, pisosSinCobertura);
  conectarWaypointsEntrePisos(floors);

  if (pisosSinCobertura.size > 0) {
    const lista = [...pisosSinCobertura].sort((a, b) => a - b).join(', ');
    warnings.add(
      'cobertura-insuficiente',
      `La cobertura Wi-Fi estimada no cubre por completo los pisos ${lista} de ${sede.nombre}.`,
      'aviso',
    );
  }

  return {
    sedeId: sede.id,
    sedeNombre: sede.nombre,
    semilla,
    pisos: floors,
    footprint: { ...footprint },
    areaTotalM2: areaInfo.area * pisos,
    alturaTotalM: pisos * config.alturaPisoM,
    aps: ordenarPorId(todosAps),
    switches: ordenarPorId(todosSwitches),
    warnings: warnings.list(),
  };
}
