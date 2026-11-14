import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import { SCENE_CONFIG } from '../../lib/scene/scene.config';
import { crearRng } from '../../lib/scene/rng';
import type { WorldSede } from '../../lib/scene/cityModel';
import { useViewStore, type ViewMode } from '../../store/useViewStore';
import { InstancedBoxes } from './InstancedBoxes';
import { aplicarInstancias } from './instancing';
import type { InstanceTransform } from './types';
import { vlanColor } from './cityVisuals';

interface PanpayaBuildingProps {
  sede: WorldSede;
  mode: ViewMode;
  interactive: boolean;
  activeFloor: number | null;
  revealInterior: boolean;
  showLabels: boolean;
  clippingPlanes: THREE.Plane[];
  onSelectBranch?: (sedeId: string) => void;
}

function crearVentanas(sede: WorldSede): InstanceTransform[] {
  const rng = crearRng(`${sede.id}:fachadas:v1`);
  const ventanas: InstanceTransform[] = [];
  const alturaPiso = SCENE_CONFIG.alturaPisoM;
  const pisos = Math.max(1, sede.floors.length);
  const encendidas = ['#ffcf87', '#ffd9a8', '#fbbf24', '#ffe7bd'];
  const apagadas = ['#101a2c', '#142138', '#0c1626', '#17233a'];

  const { x, z, width, depth } = sede.footprint;
  const frente = z + depth;
  const fondo = z;
  const izquierda = x;
  const derecha = x + width;
  const centroX = x + width / 2;

  const columnasFrente = Math.max(3, Math.min(16, Math.round(width / 2.7)));
  const margenFrente = Math.min(1.6, width * 0.08);
  const pasoFrente = columnasFrente > 1 ? (width - margenFrente * 2) / (columnasFrente - 1) : 0;

  const columnasLado = Math.max(2, Math.min(10, Math.round(depth / 2.7)));
  const margenLado = Math.min(1.4, depth * 0.1);
  const pasoLado = columnasLado > 1 ? (depth - margenLado * 2) / (columnasLado - 1) : 0;

  for (let piso = 1; piso <= pisos; piso += 1) {
    const y = (piso - 1) * alturaPiso + alturaPiso * 0.56;

    for (let columna = 0; columna < columnasFrente; columna += 1) {
      const xv = x + margenFrente + columna * pasoFrente;
      const esLobby = piso === 1 && Math.abs(xv - centroX) < width * 0.26;
      if (esLobby) continue;
      const color = rng() < 0.46 ? encendidas[Math.floor(rng() * encendidas.length)] : apagadas[Math.floor(rng() * apagadas.length)];
      ventanas.push({ position: [xv, y, frente + 0.055], scale: [0.86, 1.2, 0.08], color });
      const colorFondo = rng() < 0.34 ? encendidas[Math.floor(rng() * encendidas.length)] : apagadas[Math.floor(rng() * apagadas.length)];
      ventanas.push({ position: [xv, y, fondo - 0.055], scale: [0.86, 1.2, 0.08], color: colorFondo });
    }

    for (let columna = 0; columna < columnasLado; columna += 1) {
      const zv = z + margenLado + columna * pasoLado;
      const color = rng() < 0.4 ? encendidas[Math.floor(rng() * encendidas.length)] : apagadas[Math.floor(rng() * apagadas.length)];
      ventanas.push({ position: [izquierda - 0.055, y, zv], scale: [0.08, 1.2, 0.86], color });
      const colorDer = rng() < 0.4 ? encendidas[Math.floor(rng() * encendidas.length)] : apagadas[Math.floor(rng() * apagadas.length)];
      ventanas.push({ position: [derecha + 0.055, y, zv], scale: [0.08, 1.2, 0.86], color: colorDer });
    }
  }

  return ventanas;
}

function crearEstructura(sede: WorldSede) {
  const { x, z, width, depth } = sede.footprint;
  const centroX = x + width / 2;
  const centroZ = z + depth / 2;
  const losas: InstanceTransform[] = [];
  const muros: InstanceTransform[] = [];
  const salas: InstanceTransform[] = [];

  for (const piso of sede.floors) {
    losas.push({
      position: [centroX, piso.elevacionM - SCENE_CONFIG.espesorLosaM / 2, centroZ],
      scale: [width + 0.5, SCENE_CONFIG.espesorLosaM, depth + 0.5],
    });

    for (const muro of piso.walls) {
      const dx = muro.end.x - muro.start.x;
      const dz = muro.end.z - muro.start.z;
      const longitud = Math.hypot(dx, dz);
      if (longitud < 0.05) continue;
      const angulo = Math.atan2(-dz, dx);
      muros.push({
        position: [
          sede.origin.x + (muro.start.x + muro.end.x) / 2,
          piso.elevacionM + muro.height / 2 + 0.02,
          sede.origin.z + (muro.start.z + muro.end.z) / 2,
        ],
        rotation: [0, angulo, 0],
        scale: [longitud, muro.height, muro.thickness],
      });
    }

    for (const sala of piso.rooms) {
      if (sala.rect.width < 0.3 || sala.rect.depth < 0.3) continue;
      salas.push({
        position: [
          sede.origin.x + sala.rect.x + sala.rect.width / 2,
          piso.elevacionM + 0.035,
          sede.origin.z + sala.rect.z + sala.rect.depth / 2,
        ],
        scale: [sala.rect.width - 0.08, 0.035, sala.rect.depth - 0.08],
        color:
          sala.kind === 'telecom'
            ? '#fbbf24'
            : sala.kind === 'servidores'
              ? '#34d399'
              : sala.kind === 'vlan'
                ? vlanColor(sala.vlanId)
                : '#64748b',
      });
    }
  }

  return { losas, muros, salas };
}

function EquiposTecho({ width, depth, height, mode }: { width: number; depth: number; height: number; mode: ViewMode }) {
  const rng = useMemo(() => crearRng(`techo:${width}:${depth}`), [width, depth]);
  const beacon = useRef<THREE.Mesh>(null);

  const unidades = useMemo(() => {
    const items: InstanceTransform[] = [];
    const cantidad = 3;
    for (let indice = 0; indice < cantidad; indice += 1) {
      const ancho = 1.8 + rng() * 1.4;
      const fondo = 1.4 + rng() * 1.2;
      const xv = (rng() - 0.5) * Math.max(1, width - 4);
      const zv = (rng() - 0.5) * Math.max(1, depth - 4);
      items.push({ position: [xv, height + 0.75, zv], scale: [ancho, 1.1, fondo] });
    }
    return items;
  }, [width, depth, height, rng]);

  useFrame((state) => {
    if (beacon.current) {
      const pulso = 1 + Math.sin(state.clock.elapsedTime * 3.4) * 0.18;
      beacon.current.scale.setScalar(pulso);
    }
  });

  const opacidad = mode === 'ciudad' ? 1 : mode === 'planos' ? 0.25 : 0.55;

  return (
    <group>
      <InstancedBoxes
        items={unidades}
        color="#94a3b8"
        metalness={0.45}
        roughness={0.4}
        transparent={opacidad < 1}
        opacity={opacidad}
      />
      <mesh position={[width * 0.3, height + 2.4, -depth * 0.25]} castShadow={mode === 'ciudad'}>
        <cylinderGeometry args={[0.09, 0.12, 4.8, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[width * 0.3, height + 4.1, -depth * 0.25]}>
        <boxGeometry args={[1.4, 0.06, 0.06]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[width * 0.3, height + 3.6, -depth * 0.25]}>
        <boxGeometry args={[1, 0.06, 0.06]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh ref={beacon} position={[width * 0.3, height + 4.9, -depth * 0.25]}>
        <sphereGeometry args={[0.17, 10, 10]} />
        <meshStandardMaterial color="#f87171" emissive="#ef4444" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh position={[-width * 0.28, height + 0.9, depth * 0.18]} rotation={[Math.PI / 3, 0, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.14, 20]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.5} />
      </mesh>
    </group>
  );
}

export function PanpayaBuilding({
  sede,
  mode,
  interactive,
  activeFloor,
  revealInterior,
  showLabels,
  clippingPlanes,
  onSelectBranch,
}: PanpayaBuildingProps) {
  const setActiveBranch = useViewStore((state) => state.setActiveBranch);
  const setSelectedNodeId = useViewStore((state) => state.setSelectedNodeId);

  const { x, z, width, depth } = sede.footprint;
  const height = sede.height;
  const centroX = x + width / 2;
  const centroZ = z + depth / 2;
  const frente = z + depth;

  const ventanas = useMemo(() => crearVentanas(sede), [sede]);
  const estructura = useMemo(() => crearEstructura(sede), [sede]);
  const planos = clippingPlanes.length > 0 ? clippingPlanes : undefined;
  const cortado = mode === 'ciudad' && revealInterior;
  const mostrarTecho = mode === 'ciudad' ? !cortado : activeFloor === null;
  const opacidadCascaron = cortado ? 0.16 : mode === 'ciudad' ? 1 : mode === 'planos' ? 0.07 : 0.12;
  const opacidadMuros = mode === 'planos' ? 0.18 : mode === 'estructura' ? 0.34 : 0.24;

  const seleccionar = (evento: ThreeEvent<MouseEvent>) => {
    evento.stopPropagation();
    if (!interactive) return;
    setActiveBranch(sede.id);
    setSelectedNodeId(null);
    onSelectBranch?.(sede.id);
  };

  const anchoLobby = Math.min(width * 0.48, 15);
  const anchoPlaca = Math.min(width * 0.5, 11);

  return (
    <group onClick={interactive ? seleccionar : undefined}>
      <mesh
        position={[centroX, height / 2, centroZ]}
        castShadow={mode === 'ciudad'}
        receiveShadow={mode === 'ciudad'}
        raycast={mode === 'ciudad' ? undefined : () => null}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={mode === 'ciudad' ? '#111c31' : '#7dd3fc'}
          metalness={mode === 'ciudad' ? 0.32 : 0.1}
          roughness={mode === 'ciudad' ? 0.58 : 0.2}
          transparent={opacidadCascaron < 1}
          opacity={opacidadCascaron}
          depthWrite={opacidadCascaron >= 1}
          side={mode === 'ciudad' && !cortado ? THREE.FrontSide : THREE.DoubleSide}
          clippingPlanes={planos}
          emissive={mode === 'ciudad' ? '#050a14' : '#0ea5e9'}
          emissiveIntensity={mode === 'ciudad' ? 0.3 : 0.12}
        />
        {mode !== 'ciudad' ? <Edges color={mode === 'planos' ? '#38bdf8' : '#7dd3fc'} /> : null}
      </mesh>

      <mesh
        position={[centroX, 0.09, centroZ]}
        raycast={mode === 'ciudad' ? () => null : undefined}
        onClick={interactive ? seleccionar : undefined}
      >
        <boxGeometry args={[width + 1.2, 0.18, depth + 1.2]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.001} depthWrite={false} />
      </mesh>

      {mode === 'ciudad' ? <VentanasInstancias items={ventanas} /> : null}

      <mesh position={[centroX, 1.65, frente + 0.11]}>
        <boxGeometry args={[anchoLobby, 3.1, 0.16]} />
        <meshStandardMaterial
          color="#7dd3fc"
          transparent
          opacity={mode === 'ciudad' ? 0.3 : 0.2}
          depthWrite={false}
          metalness={0.35}
          roughness={0.08}
          emissive="#0ea5e9"
          emissiveIntensity={0.22}
        />
      </mesh>
      {[-0.36, -0.12, 0.12, 0.36].map((fraccion) => (
        <mesh key={fraccion} position={[centroX + anchoLobby * fraccion, 1.65, frente + 0.2]}>
          <boxGeometry args={[0.08, 3.1, 0.06]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[centroX, 1.35, frente + 0.22]}>
        <boxGeometry args={[1.8, 2.5, 0.08]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.4} metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[centroX, 3.35, frente + 1.25]} castShadow={mode === 'ciudad'}>
        <boxGeometry args={[anchoLobby + 2.4, 0.18, 2.6]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
      </mesh>

      <mesh position={[centroX, 4.55, frente + 0.16]}>
        <boxGeometry args={[anchoPlaca, 0.95, 0.14]} />
        <meshStandardMaterial color="#0b1220" emissive="#f59e0b" emissiveIntensity={0.5} metalness={0.3} roughness={0.4} />
      </mesh>

      {showLabels && mode !== 'planos' ? (
        <Html
          position={[centroX, 4.58, frente + 0.55]}
          center
          distanceFactor={26}
          pointerEvents="none"
          zIndexRange={[20, 0]}
        >
          <div className="whitespace-nowrap rounded border border-amber-400/60 bg-ink-950/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300 shadow-lg">
            Pan Pa' Ya · {sede.nombre}
          </div>
        </Html>
      ) : null}

      <mesh position={[centroX, height + 0.12, centroZ]}>
        <boxGeometry args={[width + 0.8, 0.24, depth + 0.8]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.2}
          roughness={0.75}
          transparent={mode !== 'ciudad'}
          opacity={mode === 'ciudad' ? 1 : 0.55}
          depthWrite={mode === 'ciudad'}
        />
      </mesh>

      <InstancedBoxes
        items={[
          { position: [centroX, height + 0.55, z - 0.12], scale: [width + 0.9, 0.9, 0.35] },
          { position: [centroX, height + 0.55, frente + 0.12], scale: [width + 0.9, 0.9, 0.35] },
          { position: [x - 0.12, height + 0.55, centroZ], scale: [0.35, 0.9, depth + 0.9] },
          { position: [x + width + 0.12, height + 0.55, centroZ], scale: [0.35, 0.9, depth + 0.9] },
        ]}
        color={mode === 'ciudad' ? '#334155' : '#38bdf8'}
        transparent={mode !== 'ciudad'}
        opacity={mode === 'ciudad' ? 1 : mode === 'planos' ? 0.18 : 0.45}
        depthWrite={mode === 'ciudad'}
      />

      {mostrarTecho ? (
        <group position={[centroX, 0, centroZ]}>
          <EquiposTecho width={width} depth={depth} height={height} mode={mode} />
        </group>
      ) : null}

      {revealInterior ? (
        <>
          <InstancedBoxes
            items={estructura.losas}
            color="#5b7c9e"
            transparent
            opacity={mode === 'planos' ? 0.22 : 0.48}
            depthWrite={false}
            metalness={0.15}
            roughness={0.7}
            clippingPlanes={planos}
          />
          <InstancedBoxes
            items={estructura.muros}
            color="#cbd5e1"
            transparent
            opacity={opacidadMuros}
            depthWrite={false}
            metalness={0.1}
            roughness={0.6}
            emissive="#38bdf8"
            emissiveIntensity={mode === 'planos' ? 0.12 : 0.04}
            clippingPlanes={planos}
          />
          <InstancedBoxes
            items={estructura.salas}
            transparent
            opacity={mode === 'planos' ? 0.24 : 0.36}
            depthWrite={false}
            metalness={0.05}
            roughness={0.8}
            clippingPlanes={planos}
          />
        </>
      ) : null}
    </group>
  );
}

function VentanasInstancias({ items }: { items: InstanceTransform[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (ref.current) {
      aplicarInstancias(ref.current, items);
    }
  }, [items]);

  if (items.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, Math.max(1, items.length)]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </instancedMesh>
  );
}
