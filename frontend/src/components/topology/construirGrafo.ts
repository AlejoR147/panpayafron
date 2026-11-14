import type { CSSProperties } from 'react';
import type { Edge, Node } from 'reactflow';
import type { NodoRedDto, TopologiaSnapshotDto } from '../../api/types';
import type { PingStep } from '../../lib/ping/types';
import { formatNumber } from '../../lib/formatters';
import {
  DIMENSIONES,
  ID_NODO_ISP,
  META_TIPO,
  type AristaTipo,
  type TopoEdgeData,
  type TopoNodeData,
} from './tipos';

const {
  nodoAncho: ANCHO,
  nodoAlto: ALTO,
  ispAncho: ISP_ANCHO,
  ispAlto: ISP_ALTO,
  separacionX: SEP_X,
  separacionY: SEP_Y,
  carril: CARRIL,
  arcoWan: ARCO,
} = DIMENSIONES;

const AVANCE = ALTO + SEP_Y;
const Y_ISP = -160;
const POR_FILA = { router: 2, switch: 3, host: 4 };
const UMBRAL_FILA = 40;

export interface ContextoGrafo {
  ruta: string[];
  paso: PingStep | null;
  nodoSeleccionado: string | null;
  enlaceSeleccionado: string | null;
  sedeActiva: string | null;
}

export interface GrafoTopologia {
  nodos: Node<TopoNodeData>[];
  aristas: Edge<TopoEdgeData>[];
}

interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  centroX: number;
  centroY: number;
  fila: number;
}

interface GrupoRed {
  sedeId: string;
  nombre: string;
  esPrincipal: boolean;
}

interface CarrilPlaneado extends GrupoRed {
  izquierda: number;
  ancho: number;
  routers: string[];
  switches: string[];
  hosts: string[];
  padre: Map<string, string | null>;
}

function crearCaja(x: number, y: number, ancho: number, alto: number): Caja {
  return {
    x,
    y,
    ancho,
    alto,
    centroX: x + ancho / 2,
    centroY: y + alto / 2,
    fila: Math.round(y / AVANCE),
  };
}

function anchoFila(ids: string[], porFila: number): number {
  let maximo = 0;
  for (let i = 0; i < ids.length; i += porFila) {
    const cantidad = Math.min(porFila, ids.length - i);
    maximo = Math.max(maximo, cantidad * ANCHO + (cantidad - 1) * SEP_X);
  }
  return maximo;
}

function filasNecesarias(ids: string[], porFila: number): number {
  return ids.length === 0 ? 0 : Math.ceil(ids.length / porFila);
}

function colocarEnFilas(
  ids: string[],
  porFila: number,
  yInicial: number,
  izquierda: number,
  anchoCarril: number,
  centroObjetivo: (chunk: string[]) => number | null,
  cajas: Map<string, Caja>,
): void {
  let y = yInicial;
  for (let i = 0; i < ids.length; i += porFila) {
    const chunk = ids.slice(i, i + porFila);
    const ancho = chunk.length * ANCHO + (chunk.length - 1) * SEP_X;
    const deseado = centroObjetivo(chunk);
    const centro = deseado ?? izquierda + anchoCarril / 2;
    const limite = Math.max(0, anchoCarril - ancho);
    let x = Math.min(Math.max(centro - ancho / 2, izquierda), izquierda + limite);
    for (const id of chunk) {
      cajas.set(id, crearCaja(x, y, ANCHO, ALTO));
      x += ANCHO + SEP_X;
    }
    y += AVANCE;
  }
}

function clavePar(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function elegirManijas(a: Caja, b: Caja, todas: Caja[]): { source: string; target: string } {
  const dx = b.centroX - a.centroX;
  const dy = b.centroY - a.centroY;
  if (Math.abs(dy) >= UMBRAL_FILA) {
    return dy > 0 ? { source: 'b', target: 't' } : { source: 't', target: 'b' };
  }
  const min = Math.min(a.centroX, b.centroX);
  const max = Math.max(a.centroX, b.centroX);
  const intercalado = todas.some(
    (c) =>
      c !== a &&
      c !== b &&
      Math.abs(c.fila - a.fila) < 0.5 &&
      c.centroX > min + 1 &&
      c.centroX < max - 1,
  );
  if (intercalado) {
    return a.fila <= 0 ? { source: 't', target: 't' } : { source: 'b', target: 'b' };
  }
  return dx >= 0 ? { source: 'r', target: 'l' } : { source: 'l', target: 'r' };
}

function estiloArista(
  tipo: AristaTipo,
  estado: { enRuta: boolean; enPaso: boolean; caido: boolean },
): CSSProperties {
  const base: CSSProperties = { transition: 'stroke 0.15s ease, stroke-width 0.15s ease' };
  if (estado.enPaso) return { ...base, stroke: '#fde047', strokeWidth: 4 };
  if (estado.enRuta) return { ...base, stroke: '#fbbf24', strokeWidth: 3 };
  if (estado.caido) {
    return { ...base, stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '4 6', opacity: 0.7 };
  }
  if (tipo === 'Wan') return { ...base, stroke: '#22d3ee', strokeWidth: 2.4, opacity: 0.9 };
  if (tipo === 'Respaldo') {
    return { ...base, stroke: '#fb7185', strokeWidth: 2, strokeDasharray: '8 6', opacity: 0.8 };
  }
  if (tipo === 'Isp') {
    return { ...base, stroke: '#22d3ee', strokeWidth: 1.4, strokeDasharray: '6 8', opacity: 0.35 };
  }
  return { ...base, stroke: '#475569', strokeWidth: 1.6, opacity: 0.75 };
}

function direccionDe(nodo: NodoRedDto): string {
  if (nodo.ip) return nodo.ip;
  if (nodo.wanIp) return nodo.wanIp;
  const interfaz = nodo.interfacesVlan?.[0];
  if (interfaz) return `${interfaz.ip}/${interfaz.prefijo}`;
  if (nodo.tipo === 'Switch') {
    return `${nodo.esCore ? 'Core' : 'Acceso'} · ${nodo.vlansTrunk?.length ?? 0} VLANs`;
  }
  return 'Sin IP';
}

function datosDeNodo(
  nodo: NodoRedDto,
  nombreSede: string,
  contexto: ContextoGrafo,
  enRuta: boolean,
  enPaso: boolean,
): TopoNodeData {
  const meta = META_TIPO[nodo.tipo];
  const etiqueta = nodo.vlanId !== null ? `VLAN ${nodo.vlanId}` : meta.etiqueta;
  const linea3 = `${etiqueta} · ${nombreSede}`;
  const linea2 = direccionDe(nodo);
  return {
    nombre: nodo.nombre,
    linea2,
    linea3,
    titulo: `${nodo.nombre} · ${linea2} · ${linea3} · ${nodo.estado}`,
    sedeId: nodo.sedeId,
    color: meta.color,
    forma: meta.forma,
    icono: meta.icono,
    esIsp: false,
    caido: nodo.estado === 'Caido',
    enRuta,
    enPaso,
    sedeActiva: contexto.sedeActiva === nodo.sedeId,
    seleccionado: contexto.nodoSeleccionado === nodo.id,
  };
}

function datosIsp(enlacesExternos: number): TopoNodeData {
  const meta = META_TIPO.Isp;
  const linea2 = `${enlacesExternos} enlaces externos`;
  return {
    nombre: 'Red WAN / ISP',
    linea2,
    linea3: 'Tránsito nacional',
    titulo: `Red WAN / ISP · ${linea2} · Agregador de los enlaces WAN`,
    sedeId: null,
    color: meta.color,
    forma: meta.forma,
    icono: meta.icono,
    esIsp: true,
    caido: false,
    enRuta: false,
    enPaso: false,
    sedeActiva: false,
    seleccionado: false,
  };
}

function ordenarGrupos(grupos: GrupoRed[]): GrupoRed[] {
  const principal = grupos.findIndex((grupo) => grupo.esPrincipal);
  if (principal < 0) return grupos;
  const resto = grupos.filter((_grupo, indice) => indice !== principal);
  const posicion = Math.floor(resto.length / 2);
  return [...resto.slice(0, posicion), grupos[principal], ...resto.slice(posicion)];
}

function construirCarriles(snapshot: TopologiaSnapshotDto, nodosPorId: Map<string, NodoRedDto>): CarrilPlaneado[] {
  const grupos = new Map<string, GrupoRed>();
  for (const sede of snapshot.sedes) {
    if (snapshot.nodos.some((nodo) => nodo.sedeId === sede.id)) {
      grupos.set(sede.id, {
        sedeId: sede.id,
        nombre: sede.nombre,
        esPrincipal: sede.tipo === 'Principal',
      });
    }
  }
  for (const nodo of snapshot.nodos) {
    if (!grupos.has(nodo.sedeId)) {
      grupos.set(nodo.sedeId, { sedeId: nodo.sedeId, nombre: nodo.sedeId, esPrincipal: false });
    }
  }

  const carriles: CarrilPlaneado[] = [];
  for (const grupo of ordenarGrupos([...grupos.values()])) {
    const nodosSede = snapshot.nodos.filter((nodo) => nodo.sedeId === grupo.sedeId);
    const enlaces = snapshot.enlaces.filter((enlace) => {
      const origen = nodosPorId.get(enlace.origenId);
      const destino = nodosPorId.get(enlace.destinoId);
      return (
        enlace.tipo === 'Lan' &&
        origen?.sedeId === grupo.sedeId &&
        destino?.sedeId === grupo.sedeId
      );
    });

    const routers = nodosSede
      .filter((nodo) => nodo.tipo === 'Router')
      .map((nodo) => nodo.id)
      .sort((a, b) => a.localeCompare(b));

    const switches: string[] = [];
    const visitados = new Set<string>(routers);
    const cola = [...routers];
    while (cola.length > 0) {
      const actual = cola.shift() as string;
      for (const enlace of enlaces) {
        const otro =
          enlace.origenId === actual
            ? enlace.destinoId
            : enlace.destinoId === actual
              ? enlace.origenId
              : null;
        if (!otro || visitados.has(otro)) continue;
        const vecino = nodosPorId.get(otro);
        if (!vecino || vecino.tipo !== 'Switch') continue;
        visitados.add(otro);
        switches.push(otro);
        cola.push(otro);
      }
    }
    switches.push(
      ...nodosSede
        .filter((nodo) => nodo.tipo === 'Switch' && !visitados.has(nodo.id))
        .map((nodo) => nodo.id)
        .sort((a, b) => a.localeCompare(b)),
    );

    const hosts = nodosSede
      .filter((nodo) => nodo.tipo !== 'Switch' && nodo.tipo !== 'Router')
      .map((nodo) => nodo.id);
    const padre = new Map<string, string | null>();
    for (const hostId of hosts) {
      let mejor: string | null = null;
      let mejorIndice = Number.MAX_SAFE_INTEGER;
      for (const enlace of enlaces) {
        if (enlace.origenId !== hostId && enlace.destinoId !== hostId) continue;
        const otro = enlace.origenId === hostId ? enlace.destinoId : enlace.origenId;
        const indice = switches.indexOf(otro);
        if (indice >= 0 && indice < mejorIndice) {
          mejor = otro;
          mejorIndice = indice;
        }
      }
      padre.set(hostId, mejor);
    }
    hosts.sort((a, b) => {
      const pa = padre.get(a);
      const pb = padre.get(b);
      const va = pa ? switches.indexOf(pa) : Number.MAX_SAFE_INTEGER;
      const vb = pb ? switches.indexOf(pb) : Number.MAX_SAFE_INTEGER;
      return va !== vb ? va - vb : a.localeCompare(b);
    });

    carriles.push({
      ...grupo,
      izquierda: 0,
      ancho: Math.max(
        anchoFila(routers, POR_FILA.router),
        anchoFila(switches, POR_FILA.switch),
        anchoFila(hosts, POR_FILA.host),
      ),
      routers,
      switches,
      hosts,
      padre,
    });
  }

  let avance = 0;
  for (const carril of carriles) {
    carril.izquierda = avance;
    avance += carril.ancho + CARRIL;
  }
  return carriles;
}

export function construirGrafo(
  snapshot: TopologiaSnapshotDto,
  contexto: ContextoGrafo,
): GrafoTopologia {
  const nodosPorId = new Map(snapshot.nodos.map((nodo) => [nodo.id, nodo]));
  const carriles = construirCarriles(snapshot, nodosPorId);
  const cajas = new Map<string, Caja>();

  const filasRouters = Math.max(0, ...carriles.map((carril) => filasNecesarias(carril.routers, POR_FILA.router)));
  const filasSwitches = Math.max(0, ...carriles.map((carril) => filasNecesarias(carril.switches, POR_FILA.switch)));
  const yRouters = 0;
  const ySwitches = filasRouters * AVANCE;
  const yHosts = ySwitches + filasSwitches * AVANCE;

  for (const carril of carriles) {
    colocarEnFilas(carril.routers, POR_FILA.router, yRouters, carril.izquierda, carril.ancho, () => null, cajas);
    colocarEnFilas(carril.switches, POR_FILA.switch, ySwitches, carril.izquierda, carril.ancho, () => null, cajas);
    colocarEnFilas(
      carril.hosts,
      POR_FILA.host,
      yHosts,
      carril.izquierda,
      carril.ancho,
      (chunk) => {
        const primero = carril.padre.get(chunk[0]);
        if (!primero || !chunk.every((id) => carril.padre.get(id) === primero)) return null;
        const cajaPadre = cajas.get(primero);
        return cajaPadre ? cajaPadre.centroX : null;
      },
      cajas,
    );
  }

  const anchoTotal = carriles.length > 0 ? carriles[carriles.length - 1].izquierda + carriles[carriles.length - 1].ancho : 0;
  if (carriles.length > 0) {
    cajas.set(ID_NODO_ISP, crearCaja(anchoTotal / 2 - ISP_ANCHO / 2, Y_ISP, ISP_ANCHO, ISP_ALTO));
  }

  const nodos: Node<TopoNodeData>[] = [];
  const cajaIsp = cajas.get(ID_NODO_ISP);
  if (cajaIsp) {
    nodos.push({
      id: ID_NODO_ISP,
      type: 'topo',
      position: { x: cajaIsp.x, y: cajaIsp.y },
      style: { width: ISP_ANCHO, height: ISP_ALTO },
      data: datosIsp(snapshot.enlaces.filter((enlace) => enlace.tipo !== 'Lan').length),
      ariaLabel: 'Red WAN / ISP',
    });
  }

  const enRuta = new Set(contexto.ruta);
  const paso = contexto.paso;
  const enPaso = new Set<string>([
    ...(paso?.from ? [paso.from] : []),
    ...(paso?.to ? [paso.to] : []),
    ...(paso?.focus ?? []),
  ]);

  for (const nodo of snapshot.nodos) {
    const caja = cajas.get(nodo.id);
    if (!caja) continue;
    const nombreSede = carriles.find((carril) => carril.sedeId === nodo.sedeId)?.nombre ?? nodo.sedeId;
    nodos.push({
      id: nodo.id,
      type: 'topo',
      position: { x: caja.x, y: caja.y },
      style: { width: ANCHO, height: ALTO },
      data: datosDeNodo(nodo, nombreSede, contexto, enRuta.has(nodo.id), enPaso.has(nodo.id)),
      ariaLabel: nodo.nombre,
    });
  }

  const paresRuta = new Set<string>();
  for (let i = 0; i < contexto.ruta.length - 1; i += 1) {
    paresRuta.add(clavePar(contexto.ruta[i], contexto.ruta[i + 1]));
  }
  const parPaso =
    paso && paso.from && paso.to ? clavePar(paso.from, paso.to) : null;

  const nombres = new Map(snapshot.nodos.map((nodo) => [nodo.id, nodo.nombre]));
  const aristas: Edge<TopoEdgeData>[] = [];
  for (const enlace of snapshot.enlaces) {
    const cajaOrigen = cajas.get(enlace.origenId);
    const cajaDestino = cajas.get(enlace.destinoId);
    if (!cajaOrigen || !cajaDestino) continue;

    const par = clavePar(enlace.origenId, enlace.destinoId);
    const enRutaArista = paresRuta.has(par);
    const enPasoArista = parPaso === par;
    const estado = {
      enRuta: enRutaArista,
      enPaso: enPasoArista,
      caido: enlace.estado === 'Caido',
    };
    const manijas = elegirManijas(cajaOrigen, cajaDestino, [...cajas.values()]);
    const mostrarEtiqueta = enlace.tipo !== 'Lan' || enRutaArista || enPasoArista;

    aristas.push({
      id: enlace.id,
      type: 'smoothstep',
      source: enlace.origenId,
      target: enlace.destinoId,
      sourceHandle: manijas.source,
      targetHandle: manijas.target,
      data: { enlaceId: enlace.id, tipo: enlace.tipo, ...estado },
      style: estiloArista(enlace.tipo, estado),
      pathOptions: { offset: ARCO },
      animated: enPasoArista,
      zIndex: enRutaArista || enPasoArista ? 3 : enlace.tipo === 'Lan' ? 1 : 2,
      ariaLabel: `${enlace.tipo}: ${nombres.get(enlace.origenId) ?? enlace.origenId} a ${
        nombres.get(enlace.destinoId) ?? enlace.destinoId
      }`,
      ...(mostrarEtiqueta
        ? {
            label: `${formatNumber(enlace.capacidadMbps)} Mb/s · ${enlace.latenciaMs} ms`,
            labelStyle: { fill: '#e2e8f0', fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: 'rgba(6, 10, 19, 0.9)' },
            labelBgPadding: [6, 4] as [number, number],
            labelBgBorderRadius: 6,
          }
        : {}),
    });
  }

  return { nodos, aristas };
}
