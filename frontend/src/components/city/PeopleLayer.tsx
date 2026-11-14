import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { CityModel } from '../../lib/scene/cityModel';
import type { Vec2 } from '../../lib/scene/types';
import { crearRng } from '../../lib/scene/rng';
import type { ViewMode } from '../../store/useViewStore';

interface PeopleLayerProps {
  model: CityModel;
  activeFloor: number | null;
  sectionCut: number | null;
  mode: ViewMode;
}

interface AgentRoute {
  points: THREE.Vector3[];
  lengths: number[];
  total: number;
  speed: number;
  color: string;
  floorY: number;
  offset: number;
}

function caminoMasCorto(
  adyacencia: Map<string, string[]>,
  desde: string,
  hasta: string,
): string[] {
  if (desde === hasta) return [desde];
  const cola: string[] = [desde];
  const previo = new Map<string, string>();
  const visto = new Set<string>([desde]);

  while (cola.length > 0) {
    const actual = cola.shift();
    if (!actual) break;
    for (const vecino of adyacencia.get(actual) ?? []) {
      if (visto.has(vecino)) continue;
      visto.add(vecino);
      previo.set(vecino, actual);
      if (vecino === hasta) {
        const ruta: string[] = [hasta];
        let cursor = hasta;
        while (cursor !== desde) {
          const anterior = previo.get(cursor);
          if (!anterior) return [];
          ruta.unshift(anterior);
          cursor = anterior;
        }
        return ruta;
      }
      cola.push(vecino);
    }
  }

  return [];
}

function construirRutasExteriores(model: CityModel): AgentRoute[] {
  const rutas: AgentRoute[] = [];
  const paleta = ['#f59e0b', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'];

  for (const sede of model.sedes) {
    const margen = 3;
    const x0 = sede.footprint.x - margen;
    const x1 = sede.footprint.x + sede.footprint.width + margen;
    const z0 = sede.footprint.z - margen;
    const z1 = sede.footprint.z + sede.footprint.depth + margen;
    const porLado = 4;
    const puntos: Vec2[] = [];

    for (let i = 0; i < porLado; i += 1) {
      puntos.push({ x: x0 + ((x1 - x0) * i) / porLado, z: z0 });
    }
    for (let i = 0; i < porLado; i += 1) {
      puntos.push({ x: x1, z: z0 + ((z1 - z0) * i) / porLado });
    }
    for (let i = 0; i < porLado; i += 1) {
      puntos.push({ x: x1 - ((x1 - x0) * i) / porLado, z: z1 });
    }
    for (let i = 0; i < porLado; i += 1) {
      puntos.push({ x: x0, z: z1 - ((z1 - z0) * i) / porLado });
    }

    const points = puntos.map((punto) => new THREE.Vector3(punto.x, 0.05, punto.z));
    const lengths: number[] = [];
    let total = 0;
    for (let punto = 0; punto < points.length - 1; punto += 1) {
      const longitud = points[punto].distanceTo(points[punto + 1]);
      lengths.push(longitud);
      total += longitud;
    }
    if (total < 1) continue;

    const cantidad = Math.min(10, Math.max(4, Math.round(sede.hosts.length * 0.02)));
    for (let indice = 0; indice < cantidad; indice += 1) {
      const rng = crearRng(`${sede.id}:externo:${indice}`);
      rutas.push({
        points,
        lengths,
        total,
        speed: 0.8 + rng() * 0.5,
        color: paleta[Math.floor(rng() * paleta.length)],
        floorY: 0.05,
        offset: rng() * total,
      });
    }
  }

  return rutas;
}

function construirRutas(
  model: CityModel,
  activeFloor: number | null,
  sectionCut: number | null,
  mode: ViewMode,
): AgentRoute[] {
  if (mode === 'ciudad') return construirRutasExteriores(model);

  const rutas: AgentRoute[] = [];

  for (const sede of model.sedes) {
    for (const piso of sede.floors) {
      if (activeFloor !== null && piso.piso !== activeFloor) continue;
      if (sectionCut !== null && piso.elevacionM > sectionCut) continue;
      const nodos = piso.waypoints.nodes;
      if (nodos.length < 2) continue;

      const porId = new Map(nodos.map((nodo) => [nodo.id, nodo]));
      const adyacencia = new Map<string, string[]>();
      for (const nodo of nodos) adyacencia.set(nodo.id, []);
      for (const arista of piso.waypoints.edges) {
        if (!porId.has(arista.from) || !porId.has(arista.to)) continue;
        adyacencia.get(arista.from)?.push(arista.to);
        adyacencia.get(arista.to)?.push(arista.from);
      }

      const conectados = nodos.filter((nodo) => (adyacencia.get(nodo.id)?.length ?? 0) > 0);
      if (conectados.length < 2) continue;

      const cantidad = Math.min(12, Math.max(2, Math.round(piso.hosts.length * 0.055)));
      const paleta = ['#f59e0b', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'];

      for (let indice = 0; indice < cantidad; indice += 1) {
        const rng = crearRng(`${sede.id}:p${piso.piso}:agente:${indice}`);
        const inicio = conectados[Math.floor(rng() * conectados.length)];
        const recorrido: Vec2[] = [inicio.position];
        let actual = inicio;

        const pasos = 2 + Math.floor(rng() * 3);
        for (let paso = 0; paso < pasos; paso += 1) {
          const vecinos = (adyacencia.get(actual.id) ?? [])
            .map((id) => porId.get(id))
            .filter((nodo): nodo is NonNullable<typeof nodo> => Boolean(nodo));
          if (vecinos.length === 0) break;
          const siguiente = vecinos[Math.floor(rng() * vecinos.length)];
          if (siguiente.id === actual.id) continue;
          recorrido.push(siguiente.position);
          actual = siguiente;
        }

        const ida = caminoMasCorto(adyacencia, actual.id, inicio.id);
        for (let paso = 1; paso < ida.length; paso += 1) {
          const nodo = porId.get(ida[paso]);
          if (nodo) recorrido.push(nodo.position);
        }

        if (recorrido.length < 2) continue;

        const points = recorrido.map(
          (punto) => new THREE.Vector3(sede.origin.x + punto.x, piso.elevacionM, sede.origin.z + punto.z),
        );
        const lengths: number[] = [];
        let total = 0;
        for (let punto = 0; punto < points.length - 1; punto += 1) {
          const longitud = points[punto].distanceTo(points[punto + 1]);
          lengths.push(longitud);
          total += longitud;
        }
        if (total < 0.8) continue;

        rutas.push({
          points,
          lengths,
          total,
          speed: 0.55 + rng() * 0.55,
          color: paleta[Math.floor(rng() * paleta.length)],
          floorY: piso.elevacionM,
          offset: 0,
        });
      }
    }
  }

  return rutas;
}

export function PeopleLayer({ model, activeFloor, sectionCut, mode }: PeopleLayerProps) {
  const rutas = useMemo(
    () => construirRutas(model, activeFloor, sectionCut, mode),
    [model, activeFloor, sectionCut, mode],
  );
  const cuerposRef = useRef<THREE.InstancedMesh>(null);
  const cabezasRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());
  const progreso = useMemo(() => new Float32Array(rutas.length), [rutas]);
  const velocidades = useMemo(() => new Float32Array(rutas.map((ruta) => ruta.speed)), [rutas]);
  const color = useMemo(() => new THREE.Color(), []);
  const colorPiel = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const cuerpos = cuerposRef.current;
    const cabezas = cabezasRef.current;
    if (!cuerpos || !cabezas) return;

    rutas.forEach((ruta, indice) => {
      cuerpos.setColorAt(indice, color.set(ruta.color));
      cabezas.setColorAt(indice, colorPiel.set(indice % 3 === 0 ? '#f1c27d' : indice % 3 === 1 ? '#c68642' : '#ffdbac'));
      progreso[indice] = ruta.offset;
    });
    if (cuerpos.instanceColor) cuerpos.instanceColor.needsUpdate = true;
    if (cabezas.instanceColor) cabezas.instanceColor.needsUpdate = true;
  }, [rutas, progreso, color, colorPiel]);

  useFrame((_, delta) => {
    const cuerpos = cuerposRef.current;
    const cabezas = cabezasRef.current;
    if (!cuerpos || !cabezas || rutas.length === 0) return;

    const obj = dummy.current;
    const paso = Math.min(delta, 0.12);

    for (let indice = 0; indice < rutas.length; indice += 1) {
      const ruta = rutas[indice];
      let distancia = progreso[indice] + velocidades[indice] * paso;
      if (distancia >= ruta.total) distancia %= ruta.total;
      progreso[indice] = distancia;

      let acumulado = 0;
      let segmento = 0;
      while (
        segmento < ruta.lengths.length - 1 &&
        acumulado + ruta.lengths[segmento] < distancia
      ) {
        acumulado += ruta.lengths[segmento];
        segmento += 1;
      }

      const longitud = ruta.lengths[segmento] || 1;
      const t = Math.min(1, Math.max(0, (distancia - acumulado) / longitud));
      const desde = ruta.points[segmento];
      const hasta = ruta.points[segmento + 1] ?? desde;
      const px = desde.x + (hasta.x - desde.x) * t;
      const pz = desde.z + (hasta.z - desde.z) * t;

      obj.position.set(px, ruta.floorY + 0.32, pz);
      obj.rotation.set(0, Math.atan2(hasta.x - desde.x, hasta.z - desde.z), 0);
      obj.scale.set(0.34, 0.62, 0.34);
      obj.updateMatrix();
      cuerpos.setMatrixAt(indice, obj.matrix);

      obj.position.set(px, ruta.floorY + 0.78, pz);
      obj.scale.set(0.27, 0.3, 0.27);
      obj.updateMatrix();
      cabezas.setMatrixAt(indice, obj.matrix);
    }

    cuerpos.instanceMatrix.needsUpdate = true;
    cabezas.instanceMatrix.needsUpdate = true;
  });

  if (rutas.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={cuerposRef}
        args={[undefined, undefined, Math.max(1, rutas.length)]}
        frustumCulled={false}
        castShadow
      >
        <cylinderGeometry args={[0.5, 0.5, 1, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} metalness={0.05} />
      </instancedMesh>
      <instancedMesh
        ref={cabezasRef}
        args={[undefined, undefined, Math.max(1, rutas.length)]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} metalness={0.02} />
      </instancedMesh>
    </group>
  );
}
