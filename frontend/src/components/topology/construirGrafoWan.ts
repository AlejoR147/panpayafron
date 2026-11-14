import type { CSSProperties } from 'react';
import type { Edge, Node } from 'reactflow';
import type { TopologiaSnapshotDto } from '../../api/types';
import type { ContextoGrafo } from './construirGrafo';
import { ID_NODO_WAN, type WanCityNodeData } from './tipos';

interface SedeWan {
  id: string;
  nombre: string;
  subnet: string;
  x: number;
  y: number;
  w: number;
  h: number;
  principal?: boolean;
}

const SEDES_WAN: SedeWan[] = [
  { id: 'bogota', nombre: 'Bogotá', subnet: '10.20.0.0/20', x: -120, y: -70, w: 240, h: 140, principal: true },
  { id: 'medellin', nombre: 'Medellín', subnet: '10.20.16.0/20', x: -460, y: -330, w: 220, h: 110 },
  { id: 'barranquilla', nombre: 'Barranquilla', subnet: '10.20.48.0/20', x: 240, y: -330, w: 220, h: 110 },
  { id: 'cali', nombre: 'Cali', subnet: '10.20.32.0/20', x: -460, y: 220, w: 220, h: 110 },
  { id: 'bucaramanga', nombre: 'Bucaramanga', subnet: '10.20.64.0/20', x: 240, y: 220, w: 220, h: 110 },
];

const WAN_BLOCK = {
  id: ID_NODO_WAN,
  nombre: 'WAN',
  subnet: '10.20.80.0/20',
  x: 520,
  y: -40,
  w: 180,
  h: 80,
};

const CIUDADES_IZQUIERDA = new Set(['medellin', 'cali']);

function sedeDeNodo(snapshot: TopologiaSnapshotDto, nodoId: string): string | null {
  return snapshot.nodos.find((nodo) => nodo.id === nodoId)?.sedeId ?? null;
}

function manijasWan(origen: string, destino: string): { source: string; target: string } {
  if (origen === 'bogota' && CIUDADES_IZQUIERDA.has(destino)) {
    return { source: 'sl', target: 'tr' };
  }
  if (origen === 'bogota' && !CIUDADES_IZQUIERDA.has(destino)) {
    return { source: 'sr', target: 'tl' };
  }
  if (origen === 'medellin' && destino === 'cali') {
    return { source: 'sb', target: 'tt' };
  }
  return { source: 'sr', target: 'tl' };
}

function estiloWan(tipo: 'Wan' | 'Respaldo', esEstatica: boolean): CSSProperties {
  if (tipo === 'Respaldo') {
    return { stroke: '#fb7185', strokeWidth: 2, strokeDasharray: '8 6', opacity: 0.85 };
  }
  if (esEstatica) {
    return { stroke: '#34d399', strokeWidth: 2.2, opacity: 0.9 };
  }
  return { stroke: '#22d3ee', strokeWidth: 2.2, opacity: 0.9 };
}

export interface GrafoWan {
  nodos: Node<WanCityNodeData>[];
  aristas: Edge[];
}

export function construirGrafoWan(snapshot: TopologiaSnapshotDto, contexto: ContextoGrafo): GrafoWan {
  const sedesEnRuta = new Set<string>();
  for (const nodoId of contexto.ruta) {
    const sedeId = sedeDeNodo(snapshot, nodoId);
    if (sedeId) sedesEnRuta.add(sedeId);
  }

  const pasoSedes = new Set<string>();
  for (const nodoId of [contexto.paso?.from, contexto.paso?.to, ...(contexto.paso?.focus ?? [])]) {
    if (!nodoId) continue;
    const sedeId = sedeDeNodo(snapshot, nodoId);
    if (sedeId) pasoSedes.add(sedeId);
  }

  const nodos: Node<WanCityNodeData>[] = SEDES_WAN.map((sede) => {
    const sedeReal = snapshot.sedes.find((item) => item.id === sede.id);
    const nodeId = `sede-${sede.id}`;
    return {
      id: nodeId,
      type: 'wanCity',
      position: { x: sede.x, y: sede.y },
      style: { width: sede.w, height: sede.h },
      data: {
        nombre: sede.nombre,
        subnet: sedeReal?.bloqueCidr ?? sede.subnet,
        esPrincipal: Boolean(sede.principal),
        sinDatos: !sedeReal,
        enRuta: sedesEnRuta.has(sede.id),
        enPaso: pasoSedes.has(sede.id),
        seleccionado: contexto.nodoSeleccionado === nodeId,
        sedeActiva: contexto.sedeActiva === sede.id,
        esWan: false,
      },
    };
  });

  nodos.push({
    id: WAN_BLOCK.id,
    type: 'wanCity',
    position: { x: WAN_BLOCK.x, y: WAN_BLOCK.y },
    style: { width: WAN_BLOCK.w, height: WAN_BLOCK.h },
    data: {
      nombre: WAN_BLOCK.nombre,
      subnet: WAN_BLOCK.subnet,
      esPrincipal: false,
      sinDatos: false,
      enRuta: false,
      enPaso: false,
      seleccionado: contexto.nodoSeleccionado === WAN_BLOCK.id,
      sedeActiva: false,
      esWan: true,
    },
  });

  const aristas: Edge[] = [];
  const nodosPorId = new Map(snapshot.nodos.map((nodo) => [nodo.id, nodo]));

  for (const enlace of snapshot.enlaces) {
    if (enlace.tipo !== 'Wan' && enlace.tipo !== 'Respaldo') continue;
    const origen = nodosPorId.get(enlace.origenId)?.sedeId;
    const destino = nodosPorId.get(enlace.destinoId)?.sedeId;
    if (!origen || !destino) continue;
    const source = `sede-${origen}`;
    const target = `sede-${destino}`;
    const manijas = manijasWan(origen, destino);
    const enRuta = sedesEnRuta.has(origen) && sedesEnRuta.has(destino);
    const enPaso = pasoSedes.has(origen) && pasoSedes.has(destino);
    const esEstatica = enlace.protocoloRouting === 'Estatica';
    aristas.push({
      id: enlace.id,
      source,
      target,
      sourceHandle: manijas.source,
      targetHandle: manijas.target,
      type: 'smoothstep',
      animated: enPaso,
      style: estiloWan(enlace.tipo, esEstatica),
      label: esEstatica
        ? `${enlace.capacidadMbps} Mb/s · ${enlace.latenciaMs} ms · Estática (sin RIPv2)`
        : `${enlace.capacidadMbps} Mb/s · ${enlace.latenciaMs} ms · RIPv2`,
      labelStyle: { fill: esEstatica ? '#6ee7b7' : '#e2e8f0', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: 'rgba(6, 10, 19, 0.9)' },
      labelBgPadding: [6, 4] as [number, number],
      labelBgBorderRadius: 6,
      data: { enlaceId: enlace.id, tipo: enlace.tipo, enRuta, enPaso, caido: enlace.estado === 'Caido' },
    });
  }

  return { nodos, aristas };
}
