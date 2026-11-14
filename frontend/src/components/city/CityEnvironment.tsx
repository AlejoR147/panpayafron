import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { CityModel } from '../../lib/scene/cityModel';
import type { ViewMode } from '../../store/useViewStore';
import { crearRng } from '../../lib/scene/rng';
import { aplicarInstancias } from './instancing';
import { InstancedBoxes } from './InstancedBoxes';
import type { InstanceTransform } from './types';
import {
  BUILDABLE_HALF,
  CITY_BLOCKS,
  CITY_STREETS,
  PARK_KEYS,
  SIDEWALK_HALF,
  STREET_HALF,
} from './cityVisuals';

interface EnvironmentProps {
  model: CityModel;
  mode: ViewMode;
  showTrees: boolean;
  showDecor: boolean;
}

type BlockKind = 'sede' | 'park' | 'fill';

interface BlockSpec {
  bx: number;
  bz: number;
  kind: BlockKind;
}

interface CarData {
  axis: 'x' | 'z';
  lane: number;
  offset: number;
  speed: number;
  direction: 1 | -1;
  color: string;
}

function rectsSeCruzan(
  a: { x: number; z: number; width: number; depth: number },
  b: { x: number; z: number; width: number; depth: number },
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.z < b.z + b.depth &&
    a.z + a.depth > b.z
  );
}

function crearTexturaFachada(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const rng = crearRng('panpaya:relleno:textura');
  ctx.fillStyle = '#0b1322';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const columnas = 6;
  const filas = 13;
  const ancho = canvas.width / columnas;
  const alto = canvas.height / filas;

  for (let fila = 0; fila < filas; fila += 1) {
    for (let columna = 0; columna < columnas; columna += 1) {
      const encendida = rng() < 0.32;
      ctx.fillStyle = encendida
        ? rng() < 0.5
          ? '#f3c17a'
          : '#ffd9a3'
        : rng() < 0.5
          ? '#121d31'
          : '#0e1728';
      ctx.fillRect(
        columna * ancho + ancho * 0.18,
        fila * alto + alto * 0.22,
        ancho * 0.64,
        alto * 0.5,
      );
    }
  }

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  textura.needsUpdate = true;
  return textura;
}

function FillerBuildings({
  items,
  mode,
  textura,
}: {
  items: InstanceTransform[];
  mode: ViewMode;
  textura: THREE.Texture | null;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (ref.current) aplicarInstancias(ref.current, items);
  }, [items]);

  if (items.length === 0) return null;

  if (mode === 'planos') {
    return (
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, Math.max(1, items.length)]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#1e3a5f" transparent opacity={0.28} wireframe depthWrite={false} />
      </instancedMesh>
    );
  }

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, Math.max(1, items.length)]}
      frustumCulled={false}
      castShadow={mode === 'ciudad'}
      receiveShadow={mode === 'ciudad'}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        attach="material-0"
        color="#cbd5e1"
        map={textura ?? undefined}
        emissiveMap={textura ?? undefined}
        emissive="#f59e0b"
        emissiveIntensity={0.32}
        roughness={0.72}
        metalness={0.18}
      />
      <meshStandardMaterial
        attach="material-1"
        color="#cbd5e1"
        map={textura ?? undefined}
        emissiveMap={textura ?? undefined}
        emissive="#f59e0b"
        emissiveIntensity={0.32}
        roughness={0.72}
        metalness={0.18}
      />
      <meshStandardMaterial attach="material-2" color="#0b1220" roughness={0.9} metalness={0.1} />
      <meshStandardMaterial attach="material-3" color="#0b1220" roughness={0.9} metalness={0.1} />
      <meshStandardMaterial
        attach="material-4"
        color="#cbd5e1"
        map={textura ?? undefined}
        emissiveMap={textura ?? undefined}
        emissive="#f59e0b"
        emissiveIntensity={0.32}
        roughness={0.72}
        metalness={0.18}
      />
      <meshStandardMaterial
        attach="material-5"
        color="#cbd5e1"
        map={textura ?? undefined}
        emissiveMap={textura ?? undefined}
        emissive="#f59e0b"
        emissiveIntensity={0.32}
        roughness={0.72}
        metalness={0.18}
      />
    </instancedMesh>
  );
}

function Trees({ items }: { items: Array<InstanceTransform & { canopy: string }> }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);

  const trunks = useMemo(
    () =>
      items.map((item) => ({
        position: [item.position[0], 1.25, item.position[2]] as [number, number, number],
        scale: [0.16, 2.5, 0.16] as [number, number, number],
      })),
    [items],
  );

  const canopies = useMemo(
    () =>
      items.map((item) => ({
        position: [item.position[0], 2.9, item.position[2]] as [number, number, number],
        scale: [
          1.3 + (item.scale?.[0] ?? 1) * 0.5,
          2.1 + (item.scale?.[1] ?? 1) * 0.4,
          1.3 + (item.scale?.[2] ?? 1) * 0.5,
        ] as [number, number, number],
        color: item.canopy,
      })),
    [items],
  );

  useLayoutEffect(() => {
    if (trunkRef.current) aplicarInstancias(trunkRef.current, trunks);
    if (canopyRef.current) aplicarInstancias(canopyRef.current, canopies);
  }, [trunks, canopies]);

  if (items.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, Math.max(1, trunks.length)]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.5, 0.62, 1, 7]} />
        <meshStandardMaterial color="#5b3b22" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={canopyRef}
        args={[undefined, undefined, Math.max(1, canopies.length)]}
        frustumCulled={false}
        castShadow
      >
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshStandardMaterial color="#ffffff" roughness={0.82} metalness={0.02} />
      </instancedMesh>
    </group>
  );
}

function Cars() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());
  const color = useMemo(() => new THREE.Color(), []);

  const cars = useMemo<CarData[]>(() => {
    const rng = crearRng('panpaya:autos:v1');
    const paleta = ['#e2e8f0', '#f59e0b', '#38bdf8', '#f43f5e', '#94a3b8', '#22d3ee'];
    const items: CarData[] = [];
    const calles = [-90, -30, 30, 90];
    for (const calle of calles) {
      for (const direction of [1, -1] as const) {
        for (let indice = 0; indice < 2; indice += 1) {
          items.push({
            axis: 'z',
            lane: calle + direction * 2.2,
            offset: rng() * 240,
            speed: 7 + rng() * 6,
            direction,
            color: paleta[Math.floor(rng() * paleta.length)],
          });
          items.push({
            axis: 'x',
            lane: calle + direction * 2.2,
            offset: rng() * 240,
            speed: 7 + rng() * 6,
            direction,
            color: paleta[Math.floor(rng() * paleta.length)],
          });
        }
      }
    }
    return items;
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const obj = dummy.current;
    cars.forEach((car, indice) => {
      obj.position.set(0, -100, 0);
      obj.rotation.set(0, car.axis === 'x' ? Math.PI / 2 : 0, 0);
      obj.scale.set(1, 1, 1);
      obj.updateMatrix();
      mesh.setMatrixAt(indice, obj.matrix);
      mesh.setColorAt(indice, color.set(car.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [cars, color]);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const obj = dummy.current;
    const tiempo = state.clock.elapsedTime;
    for (let indice = 0; indice < cars.length; indice += 1) {
      const car = cars[indice];
      const recorrido = 240;
      const bruto = car.offset + car.speed * tiempo * car.direction;
      const posicion = (((bruto + 120) % recorrido) + recorrido) % recorrido - 120;
      if (car.axis === 'z') {
        obj.position.set(car.lane, 0.42, posicion);
        obj.rotation.set(0, 0, 0);
      } else {
        obj.position.set(posicion, 0.42, car.lane);
        obj.rotation.set(0, Math.PI / 2, 0);
      }
      obj.scale.set(1, 1, 1);
      obj.updateMatrix();
      mesh.setMatrixAt(indice, obj.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, Math.max(1, cars.length)]}
      frustumCulled={false}
      castShadow
    >
      <boxGeometry args={[1.5, 0.62, 3.2]} />
      <meshStandardMaterial color="#ffffff" roughness={0.35} metalness={0.55} />
    </instancedMesh>
  );
}

export function CityEnvironment({ model, mode, showTrees, showDecor }: EnvironmentProps) {
  const textura = useMemo(() => crearTexturaFachada(), []);

  useEffect(() => {
    return () => {
      textura?.dispose();
    };
  }, [textura]);

  const blocks = useMemo<BlockSpec[]>(() => {
    const items: BlockSpec[] = [];
    for (const bx of CITY_BLOCKS) {
      for (const bz of CITY_BLOCKS) {
        const rect = {
          x: bx - BUILDABLE_HALF,
          z: bz - BUILDABLE_HALF,
          width: BUILDABLE_HALF * 2,
          depth: BUILDABLE_HALF * 2,
        };
        const ocupado = model.sedes.some((sede) =>
          rectsSeCruzan(rect, {
            x: sede.footprint.x - 2,
            z: sede.footprint.z - 2,
            width: sede.footprint.width + 4,
            depth: sede.footprint.depth + 4,
          }),
        );
        const kind: BlockKind = ocupado ? 'sede' : PARK_KEYS.has(`${bx}:${bz}`) ? 'park' : 'fill';
        items.push({ bx, bz, kind });
      }
    }
    return items;
  }, [model]);

  const aceras = useMemo<InstanceTransform[]>(
    () =>
      blocks.map((block) => ({
        position: [block.bx, 0.08, block.bz],
        scale: [SIDEWALK_HALF * 2, 0.16, SIDEWALK_HALF * 2],
        color: block.kind === 'park' ? '#14532d' : '#1a2438',
      })),
    [blocks],
  );

  const relleno = useMemo(() => {
    const items: InstanceTransform[] = [];
    const techos: InstanceTransform[] = [];
    const paleta = ['#cbd5e1', '#b8c7dd', '#dbe7f7', '#a9bdd6'];
    for (const block of blocks) {
      if (block.kind !== 'fill') continue;
      const rngBloque = crearRng(`relleno:${block.bx}:${block.bz}`);
      const subceldas = [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ];
      const usadas = rngBloque() < 0.35 ? 2 : rngBloque() < 0.65 ? 3 : 4;
      for (let indice = 0; indice < usadas; indice += 1) {
        const [sx, sz] = subceldas[indice];
        const ancho = 10 + rngBloque() * 7.5;
        const fondo = 9 + rngBloque() * 7;
        const altura = 7 + rngBloque() * 19;
        const x = block.bx + sx * (BUILDABLE_HALF * 0.5) + (rngBloque() - 0.5) * 2.2;
        const z = block.bz + sz * (BUILDABLE_HALF * 0.5) + (rngBloque() - 0.5) * 2.2;
        items.push({
          position: [x, altura / 2, z],
          scale: [ancho, altura, fondo],
          color: paleta[Math.floor(rngBloque() * paleta.length)],
        });
        if (rngBloque() < 0.55) {
          techos.push({
            position: [x + (rngBloque() - 0.5) * 3, altura + 0.7, z + (rngBloque() - 0.5) * 3],
            scale: [2.2, 1.4, 2],
          });
        }
      }
    }
    return { items, techos };
  }, [blocks]);

  const arboles = useMemo(() => {
    const items: Array<InstanceTransform & { canopy: string }> = [];
    const verdes = ['#2f6b3a', '#3b7d45', '#285c33', '#4a8a4f'];
    const rngArboles = crearRng('arboles:v1');

    const agregar = (x: number, z: number) => {
      items.push({
        position: [x, 0, z],
        scale: [1, 1, 1],
        canopy: verdes[Math.floor(rngArboles() * verdes.length)],
      });
    };

    for (const block of blocks) {
      if (block.kind === 'park') {
        for (let ix = -2; ix <= 2; ix += 1) {
          for (let iz = -2; iz <= 2; iz += 1) {
            if (rngArboles() < 0.25) continue;
            agregar(
              block.bx + ix * 7.5 + (rngArboles() - 0.5) * 2,
              block.bz + iz * 7.5 + (rngArboles() - 0.5) * 2,
            );
          }
        }
        continue;
      }
      const borde = SIDEWALK_HALF - 1.3;
      const lados: Array<[number, number]> = [
        [-borde, -borde],
        [borde, -borde],
        [-borde, borde],
        [borde, borde],
      ];
      for (const [dx, dz] of lados) {
        if (rngArboles() < 0.4) continue;
        agregar(block.bx + dx, block.bz + dz);
      }
    }

    return items;
  }, [blocks]);

  const marcasViales = useMemo(() => {
    const items: InstanceTransform[] = [];
    const calles = CITY_STREETS.filter((valor) => Math.abs(valor) <= 120);
    for (const calle of calles) {
      for (let posicion = -116; posicion <= 116; posicion += 7) {
        items.push({
          position: [calle, 0.025, posicion],
          scale: [0.16, 0.02, 3],
        });
        items.push({
          position: [posicion, 0.025, calle],
          scale: [3, 0.02, 0.16],
        });
      }
    }

    const cruces = [-90, -30, 30, 90];
    for (const x of cruces) {
      for (const z of cruces) {
        for (let indice = -2; indice <= 2; indice += 1) {
          items.push({
            position: [x + indice * 1.5, 0.03, z - (STREET_HALF + 1.9)],
            scale: [0.55, 0.02, 2],
          });
          items.push({
            position: [x + (STREET_HALF + 1.9), 0.03, z + indice * 1.5],
            scale: [2, 0.02, 0.55],
          });
        }
      }
    }

    return items;
  }, []);

  if (mode === 'planos') {
    return (
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
          <planeGeometry args={[340, 340]} />
          <meshBasicMaterial color="#04070f" />
        </mesh>
        <gridHelper args={[360, 72, '#1e3a5f', '#0f1b2a']} position={[0, 0.01, 0]} />
        <FillerBuildings items={relleno.items} mode={mode} textura={textura} />
      </group>
    );
  }

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[340, 340]} />
        <meshStandardMaterial color="#080d18" roughness={0.95} metalness={0.05} />
      </mesh>

      <InstancedBoxes
        items={aceras}
        transparent
        opacity={0.92}
        roughness={0.9}
        metalness={0.05}
        receiveShadow={mode === 'ciudad'}
      />

      <FillerBuildings items={relleno.items} mode={mode} textura={textura} />
      {relleno.techos.length > 0 ? (
        <InstancedBoxes
          items={relleno.techos}
          color="#64748b"
          metalness={0.35}
          roughness={0.55}
          transparent={mode !== 'ciudad'}
          opacity={mode === 'ciudad' ? 1 : 0.55}
        />
      ) : null}

      <InstancedBoxes
        items={marcasViales}
        color="#93a4bd"
        transparent
        opacity={0.55}
        depthWrite={false}
        emissive="#e2e8f0"
        emissiveIntensity={0.08}
      />

      {showTrees ? <Trees items={arboles} /> : null}
      {showDecor && mode === 'ciudad' ? <Cars /> : null}
    </group>
  );
}
