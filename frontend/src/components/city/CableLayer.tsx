import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { CityModel, WorldVec3 } from '../../lib/scene/cityModel';
import type { ViewMode } from '../../store/useViewStore';
import { CABLE_COLORS, vlanColor } from './cityVisuals';

interface CableLayerProps {
  model: CityModel;
  mode: ViewMode;
  activeFloor: number | null;
  showCables: boolean;
  revealInterior: boolean;
  sectionCut: number | null;
}

interface Segmento {
  from: WorldVec3;
  to: WorldVec3;
  color: string;
}

function crearGeometria(segmentos: Segmento[]): THREE.BufferGeometry {
  const posiciones = new Float32Array(segmentos.length * 6);
  const colores = new Float32Array(segmentos.length * 6);
  const color = new THREE.Color();

  segmentos.forEach((segmento, indice) => {
    const base = indice * 6;
    posiciones[base] = segmento.from.x;
    posiciones[base + 1] = segmento.from.y;
    posiciones[base + 2] = segmento.from.z;
    posiciones[base + 3] = segmento.to.x;
    posiciones[base + 4] = segmento.to.y;
    posiciones[base + 5] = segmento.to.z;

    color.set(segmento.color);
    colores[base] = color.r;
    colores[base + 1] = color.g;
    colores[base + 2] = color.b;
    colores[base + 3] = color.r;
    colores[base + 4] = color.g;
    colores[base + 5] = color.b;
  });

  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  geometria.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  return geometria;
}

function useDisposeGeometria(geometria: THREE.BufferGeometry | null) {
  useEffect(() => {
    return () => {
      geometria?.dispose();
    };
  }, [geometria]);
}

export function CableLayer({
  model,
  mode,
  activeFloor,
  showCables,
  revealInterior,
  sectionCut,
}: CableLayerProps) {
  const acceso = useMemo(() => {
    if (!showCables || !revealInterior) return null;
    const segmentos: Segmento[] = [];
    for (const sede of model.sedes) {
      const pisoPorHost = new Map(sede.hosts.map((host) => [host.id, host.piso]));
      const elevacionPorPiso = new Map(sede.floors.map((piso) => [piso.piso, piso.elevacionM]));
      for (const cable of sede.cables) {
        const piso = pisoPorHost.get(cable.hostId);
        if (activeFloor !== null && piso !== activeFloor) continue;
        const elevacion = piso !== undefined ? elevacionPorPiso.get(piso) : undefined;
        if (sectionCut !== null && elevacion !== undefined && elevacion > sectionCut) continue;
        for (let indice = 0; indice < cable.points.length - 1; indice += 1) {
          segmentos.push({
            from: cable.points[indice],
            to: cable.points[indice + 1],
            color: vlanColor(cable.vlanId),
          });
        }
      }
    }
    return segmentos.length > 0 ? crearGeometria(segmentos) : null;
  }, [model, showCables, revealInterior, activeFloor, sectionCut]);

  const troncales = useMemo(() => {
    if (!showCables || !revealInterior) return null;
    const segmentos: Segmento[] = [];
    for (const sede of model.sedes) {
      const core = sede.switches.find((sw) => sw.esCore) ?? sede.switches[0];
      if (!core) continue;
      for (const sw of sede.switches) {
        if (sw.id === core.id) continue;
        if (sectionCut !== null && Math.min(sw.position.y, core.position.y) > sectionCut) continue;
        const medio: WorldVec3 = {
          x: (sw.position.x + core.position.x) / 2,
          y: Math.max(sw.position.y, core.position.y) + 0.8,
          z: (sw.position.z + core.position.z) / 2,
        };
        segmentos.push({ from: sw.position, to: medio, color: CABLE_COLORS.troncal });
        segmentos.push({ from: medio, to: core.position, color: CABLE_COLORS.troncal });
      }
    }
    return segmentos.length > 0 ? crearGeometria(segmentos) : null;
  }, [model, showCables, revealInterior, sectionCut]);

  const fibra = useMemo(() => {
    if (!showCables || !revealInterior) return null;
    const segmentos: Segmento[] = [];
    for (const sede of model.sedes) {
      const core = sede.switches.find((sw) => sw.esCore) ?? sede.switches[0];
      if (!core) continue;
      if (sectionCut !== null && core.position.y > sectionCut) continue;
      const router: WorldVec3 = { x: sede.center.x, y: sede.height + 2.4, z: sede.center.z };
      const medio: WorldVec3 = {
        x: (core.position.x + router.x) / 2,
        y: (core.position.y + router.y) / 2,
        z: (core.position.z + router.z) / 2,
      };
      segmentos.push({ from: core.position, to: medio, color: CABLE_COLORS.fibra });
      segmentos.push({ from: medio, to: router, color: CABLE_COLORS.fibra });
    }
    return segmentos.length > 0 ? crearGeometria(segmentos) : null;
  }, [model, showCables, revealInterior, sectionCut]);

  useDisposeGeometria(acceso);
  useDisposeGeometria(troncales);
  useDisposeGeometria(fibra);

  if (!revealInterior || !showCables) return null;

  const opacidadAcceso = mode === 'planos' ? 0.9 : 0.58;
  const opacidadTroncal = mode === 'planos' ? 0.85 : 0.5;
  const opacidadFibra = mode === 'planos' ? 0.95 : 0.6;

  return (
    <group renderOrder={2}>
      {acceso ? (
        <lineSegments geometry={acceso}>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={opacidadAcceso}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      ) : null}
      {troncales ? (
        <lineSegments geometry={troncales}>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={opacidadTroncal}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      ) : null}
      {fibra ? (
        <lineSegments geometry={fibra}>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={opacidadFibra}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      ) : null}
    </group>
  );
}

