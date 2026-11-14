import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import type { CityModel } from '../../lib/scene/cityModel';
import type { ViewMode } from '../../store/useViewStore';
import { InstancedBoxes } from './InstancedBoxes';
import type { InstanceTransform } from './types';
import { COVERAGE_COLOR, UNCOVERED_COLOR } from './cityVisuals';

interface CoverageLayerProps {
  model: CityModel;
  mode: ViewMode;
  activeFloor: number | null;
  show: boolean;
  sectionCut: number | null;
}

const PASO_CELDA = 2.6;

export function CoverageLayer({ model, mode, activeFloor, show, sectionCut }: CoverageLayerProps) {
  const anillos = useMemo(() => {
    if (!show) return [];
    const items: Array<{ id: string; points: THREE.Vector3[]; y: number }> = [];
    for (const sede of model.sedes) {
      for (const ap of sede.aps) {
        if (activeFloor !== null && ap.piso !== activeFloor) continue;
        if (sectionCut !== null && ap.position.y > sectionCut) continue;
        const puntos: THREE.Vector3[] = [];
        const segmentos = 56;
        for (let indice = 0; indice <= segmentos; indice += 1) {
          const angulo = (indice / segmentos) * Math.PI * 2;
          puntos.push(
            new THREE.Vector3(
              ap.position.x + Math.cos(angulo) * ap.radioCoberturaM,
              ap.position.y - 0.08,
              ap.position.z + Math.sin(angulo) * ap.radioCoberturaM,
            ),
          );
        }
        items.push({ id: ap.id, points: puntos, y: ap.position.y });
      }
    }
    return items;
  }, [model, show, activeFloor, sectionCut]);

  const sinCobertura = useMemo(() => {
    if (!show || mode === 'ciudad') return [];
    const items: InstanceTransform[] = [];
    for (const sede of model.sedes) {
      for (const piso of sede.floors) {
        if (activeFloor !== null && piso.piso !== activeFloor) continue;
        if (sectionCut !== null && piso.elevacionM > sectionCut) continue;
        const aps = piso.aps;
        const { x, z, width, depth } = piso.footprint;
        const columnas = Math.max(1, Math.floor(width / PASO_CELDA));
        const filas = Math.max(1, Math.floor(depth / PASO_CELDA));
        const pasoX = width / columnas;
        const pasoZ = depth / filas;
        for (let ix = 0; ix < columnas; ix += 1) {
          for (let iz = 0; iz < filas; iz += 1) {
            const cx = x + pasoX * (ix + 0.5);
            const cz = z + pasoZ * (iz + 0.5);
            const cubierto = aps.some(
              (ap) => Math.hypot(ap.position.x - cx, ap.position.z - cz) <= ap.radioCoberturaM,
            );
            if (cubierto) continue;
            items.push({
              position: [sede.origin.x + cx, piso.elevacionM + 0.07, sede.origin.z + cz],
              scale: [pasoX * 0.82, 0.02, pasoZ * 0.82],
              color: UNCOVERED_COLOR,
            });
          }
        }
      }
    }
    return items;
  }, [model, show, activeFloor, mode, sectionCut]);

  if (!show) return null;

  return (
    <group renderOrder={4}>
      {anillos.map((anillo) => (
        <Line
          key={anillo.id}
          points={anillo.points}
          color={COVERAGE_COLOR}
          lineWidth={mode === 'planos' ? 1.6 : 1.1}
          dashed
          dashSize={0.4}
          gapSize={0.4}
          transparent
          opacity={mode === 'planos' ? 0.55 : 0.32}
          depthWrite={false}
        />
      ))}
      {sinCobertura.length > 0 ? (
        <InstancedBoxes
          items={sinCobertura}
          color={UNCOVERED_COLOR}
          transparent
          opacity={mode === 'planos' ? 0.22 : 0.16}
          depthWrite={false}
          emissive={UNCOVERED_COLOR}
          emissiveIntensity={mode === 'planos' ? 0.35 : 0.12}
        />
      ) : null}
    </group>
  );
}
