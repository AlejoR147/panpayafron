import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges, Line } from '@react-three/drei';
import { useNetworkStore } from '../../store/useNetworkStore';
import { useViewStore } from '../../store/useViewStore';
import { Packet3D } from '../packet/Packet3D';
import type { SedeDto } from '../../api/types';
import { formatNumber } from '../../lib/formatters';
import { getSedePosition, getSedeTopY } from '../../lib/sedeLayout';

const CATEGORY_STYLE: Record<string, { color: string; shape: 'box' | 'sphere' | 'cylinder'; size: number }> = {
  'PC administrativos': { color: '#3b82f6', shape: 'box', size: 0.3 },
  'Estaciones TI/Ingeniería estándar': { color: '#6366f1', shape: 'box', size: 0.32 },
  'Estaciones TI/Ingeniería alto desempeño': { color: '#a855f7', shape: 'box', size: 0.35 },
  'Estaciones Mercadeo/Diseño': { color: '#f472b6', shape: 'box', size: 0.32 },
  'Terminales Producción/POS': { color: '#f59e0b', shape: 'box', size: 0.28 },
  'Portátiles corporativos': { color: '#818cf8', shape: 'box', size: 0.25 },
  'Teléfonos IP': { color: '#22d3ee', shape: 'cylinder', size: 0.18 },
  'Impresoras de red': { color: '#94a3b8', shape: 'box', size: 0.28 },
  'Cámaras IP fijas cableadas': { color: '#ef4444', shape: 'sphere', size: 0.18 },
  'Cámaras IP PTZ': { color: '#f97316', shape: 'sphere', size: 0.22 },
  'Cámaras IP inalámbricas': { color: '#fb923c', shape: 'sphere', size: 0.18 },
  Videoporteros: { color: '#be185d', shape: 'box', size: 0.22 },
  'Controles de acceso simples': { color: '#84cc16', shape: 'box', size: 0.18 },
  'Sensores IoT Ethernet/PoE': { color: '#06b6d4', shape: 'box', size: 0.16 },
  'Teléfonos móviles de invitados concurrentes': { color: '#f43f5e', shape: 'sphere', size: 0.14 },
  Servidores: { color: '#64748b', shape: 'box', size: 0.4 },
};

function getStyle(categoria: string) {
  return CATEGORY_STYLE[categoria] ?? { color: '#94a3b8', shape: 'box', size: 0.28 };
}

interface DeviceInstance {
  id: string;
  categoria: string;
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
  shape: 'box' | 'sphere' | 'cylinder';
}

function crearDispositivos(sede: SedeDto, xBase: number): DeviceInstance[] {
  const dispositivos: DeviceInstance[] = [];
  const pisos = sede.pisos;
  const grupos = sede.inventario.reduce((map, item) => {
    map.set(item.categoria, (map.get(item.categoria) ?? 0) + item.cantidadActual);
    return map;
  }, new Map<string, number>());
  const categorias = Array.from(grupos.entries());

  categorias.forEach(([categoria, total], ci) => {
    const style = getStyle(categoria);
    const porPiso = Math.max(1, Math.ceil(total / Math.max(1, pisos)));
    const sector = (Math.PI * 2) / Math.max(1, categorias.length);
    const baseAngle = ci * sector;

    for (let piso = 0; piso < Math.max(1, pisos); piso++) {
      const y = piso * 1.6 + 0.8;

      for (let i = 0; i < porPiso; i++) {
        const angle = baseAngle + (i / Math.max(1, porPiso)) * sector * 0.85;
        const radius = 3.4 + (i % 2) * 1.4;
        dispositivos.push({
          id: `${sede.id}-${categoria}-${piso}-${i}`,
          categoria,
          x: xBase + Math.cos(angle) * radius,
          y: y + (i % 3) * 0.05,
          z: Math.sin(angle) * radius,
          color: style.color,
          size: style.size,
          shape: style.shape,
        });
      }
    }
  });

  return dispositivos;
}

interface Building3DProps {
  sede?: SedeDto;
  index?: number;
  dispositivos?: DeviceInstance[];
  dispositivosActivos?: Set<string>;
  onSelect?: () => void;
}

export function Building3D({ sede, index, dispositivos, dispositivosActivos, onSelect }: Building3DProps) {
  const allSedes = useNetworkStore((state) => state.sedes);
  const targetSede = sede ?? allSedes[0];
  const targetIndex = index ?? 0;
  const targetDispositivos = dispositivos ?? crearDispositivos(targetSede, 0);
  const targetActivos = dispositivosActivos ?? new Set<string>();

  const pisos = targetSede.pisos;
  const { x: xBase, z: zBase } = getSedePosition(targetIndex);
  const buildingWidth = 16;
  const buildingDepth = 16;
  const floorHeight = 1.6;

  return (
    <group
      position={[xBase, 0, zBase]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      onPointerOver={() => {
        if (onSelect) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        if (onSelect) document.body.style.cursor = 'auto';
      }}
    >
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[10, 10, 0.4, 40]} />
        <meshStandardMaterial color="#0b0f19" roughness={0.9} metalness={0.1} />
      </mesh>

      {Array.from({ length: Math.max(1, pisos) }).map((_, piso) => {
        const y = piso * floorHeight + 0.6;
        return (
          <React.Fragment key={piso}>
            <mesh position={[0, y, buildingDepth / 2]}>
              <boxGeometry args={[buildingWidth, floorHeight - 0.1, 0.12]} />
              <meshStandardMaterial color="#94a3b8" transparent opacity={0.22} side={THREE.DoubleSide} />
              <Edges color="#64748b" />
            </mesh>
            <mesh position={[0, y, -buildingDepth / 2]}>
              <boxGeometry args={[buildingWidth, floorHeight - 0.1, 0.12]} />
              <meshStandardMaterial color="#94a3b8" transparent opacity={0.22} side={THREE.DoubleSide} />
              <Edges color="#64748b" />
            </mesh>
            <mesh position={[-buildingWidth / 2, y, 0]}>
              <boxGeometry args={[0.12, floorHeight - 0.1, buildingDepth]} />
              <meshStandardMaterial color="#94a3b8" transparent opacity={0.22} side={THREE.DoubleSide} />
              <Edges color="#64748b" />
            </mesh>
            <mesh position={[buildingWidth / 2, y, 0]}>
              <boxGeometry args={[0.12, floorHeight - 0.1, buildingDepth]} />
              <meshStandardMaterial color="#94a3b8" transparent opacity={0.22} side={THREE.DoubleSide} />
              <Edges color="#64748b" />
            </mesh>
            <mesh position={[0, y + 0.75, 0]}>
              <cylinderGeometry args={[8.7, 8.7, 0.12, 40]} />
              <meshStandardMaterial color="#1e293b" transparent opacity={0.72} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, y + 0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[8.6, 0.06, 8, 48]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={0.55} />
            </mesh>
          </React.Fragment>
        );
      })}

      {[
        [-6.5, -6.5],
        [6.5, -6.5],
        [-6.5, 6.5],
        [6.5, 6.5],
      ].map(([cx, cz], i) => {
        const height = Math.max(1, pisos) * floorHeight + 1.2;
        return (
          <mesh key={i} position={[cx, height / 2, cz]}>
            <cylinderGeometry args={[0.14, 0.14, height, 10]} />
            <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
          </mesh>
        );
      })}

      {targetDispositivos.map((d) => {
        const activo = targetActivos.has(d.id);
        const colorActivo = activo ? '#fbbf24' : d.color;
        return (
          <mesh key={d.id} position={[d.x, d.y, d.z]}>
            {d.shape === 'box' && <boxGeometry args={[d.size, d.size, d.size]} />}
            {d.shape === 'sphere' && <sphereGeometry args={[d.size, 8, 8]} />}
            {d.shape === 'cylinder' && <cylinderGeometry args={[d.size * 0.5, d.size * 0.5, d.size * 1.2, 8]} />}
            <meshStandardMaterial
              color={colorActivo}
              emissive={new THREE.Color(colorActivo).multiplyScalar(activo ? 0.9 : 0.35)}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function LabelProjector({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const sedes = useNetworkStore((state) => state.sedes);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const vector = useRef(new THREE.Vector3());

  useFrame(() => {
    const labels = containerRef.current?.querySelectorAll<HTMLElement>('[data-sede-label]');
    if (!labels) return;

    sedes.forEach((sede, i) => {
      const el = labels[i];
      if (!el) return;

      const { x: sedeX, z: sedeZ } = getSedePosition(i);
      vector.current.set(sedeX, Math.max(1, sede.pisos) * 1.6 + 2.4, sedeZ);
      vector.current.project(camera);

      const px = (vector.current.x * 0.5 + 0.5) * size.width;
      const py = (-vector.current.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
      el.style.opacity = vector.current.z > 1 ? '0' : '1';
    });
  });

  return null;
}

export function CameraController() {
  const activeBranchId = useViewStore((state) => state.activeBranchId);
  const sedes = useNetworkStore((state) => state.sedes);
  const targetRef = useRef(new THREE.Vector3(0, 3, -1));
  const desiredRef = useRef(new THREE.Vector3(0, 30, 60));
  const animatingRef = useRef(true);

  useEffect(() => {
    const index = activeBranchId ? sedes.findIndex((s) => s.id === activeBranchId) : -1;
    if (index >= 0) {
      const { x, z } = getSedePosition(index);
      targetRef.current.set(x, 3, z);
      desiredRef.current.set(x, 12, z + 26);
    } else {
      targetRef.current.set(0, 3, -1);
      desiredRef.current.set(0, 30, 60);
    }
    animatingRef.current = true;
  }, [activeBranchId, sedes]);

  useFrame((state, delta) => {
    if (!animatingRef.current) return;

    const factor = Math.min(1, delta * 2.6);
    state.camera.position.lerp(desiredRef.current, factor);
    state.camera.lookAt(targetRef.current);

    const controls = state.controls as unknown as { target?: THREE.Vector3 } | null;
    if (controls?.target) {
      controls.target.lerp(targetRef.current, factor);
    }

    if (state.camera.position.distanceTo(desiredRef.current) < 0.25) {
      animatingRef.current = false;
    }
  });

  return null;
}

interface NetworkSceneProps {
  showPacket?: boolean;
  followActiveBranch?: boolean;
  onlyBranchId?: string | null;
  dispositivosActivos?: Set<string>;
  onSelectBranch?: (sedeId: string) => void;
}

export function NetworkScene({
  showPacket = false,
  followActiveBranch = false,
  onlyBranchId = null,
  dispositivosActivos,
  onSelectBranch,
}: NetworkSceneProps) {
  const sedes = useNetworkStore((state) => state.sedes);

  const dispositivosPorSede = React.useMemo(() => {
    const mapa = new Map<string, DeviceInstance[]>();
    sedes.forEach((sede) => {
      mapa.set(sede.id, crearDispositivos(sede, 0));
    });
    return mapa;
  }, [sedes]);

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[15, 25, 15]} intensity={1.1} castShadow />
      <pointLight position={[-15, 5, -15]} intensity={0.5} />
      <OrbitControls makeDefault target={[0, 3, -1]} enablePan minDistance={8} maxDistance={140} />
      {followActiveBranch && <CameraController />}
      {sedes.map((sede, i) => {
        if (onlyBranchId && onlyBranchId !== sede.id) return null;
        return (
          <Building3D
            key={sede.id}
            sede={sede}
            index={i}
            dispositivos={dispositivosPorSede.get(sede.id) ?? []}
            dispositivosActivos={dispositivosActivos}
            onSelect={onSelectBranch ? () => onSelectBranch(sede.id) : undefined}
          />
        );
      })}
      {!onlyBranchId &&
        sedes.slice(1).map((sede, i) => {
          const hub = getSedePosition(0);
          const spoke = getSedePosition(i + 1);
          const hubTop = getSedeTopY(sedes[0]?.pisos ?? 1);
          const spokeTop = getSedeTopY(sede.pisos);
          return (
            <Line
              key={`wan-${sede.id}`}
              points={[
                [hub.x, hubTop, hub.z],
                [spoke.x, spokeTop, spoke.z],
              ]}
              color="#f59e0b"
              lineWidth={1.2}
              transparent
              opacity={0.5}
              dashed
              dashSize={0.7}
              gapSize={0.4}
            />
          );
        })}
      {showPacket && <Packet3D />}
    </>
  );
}

export function BranchView() {
  const sedes = useNetworkStore((state) => state.sedes);
  const setActiveBranch = useViewStore((state) => state.setActiveBranch);
  const activeBranchId = useViewStore((state) => state.activeBranchId);
  const [dispositivosActivos, setDispositivosActivos] = React.useState<Set<string>>(new Set());
  const labelsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const dispositivosPorSede = React.useMemo(() => {
    const mapa = new Map<string, DeviceInstance[]>();
    sedes.forEach((sede) => {
      mapa.set(sede.id, crearDispositivos(sede, 0));
    });
    return mapa;
  }, [sedes]);

  return (
    <div className="relative h-[72vh] w-full bg-[radial-gradient(70%_45%_at_50%_-10%,rgba(251,139,18,0.08),transparent_70%)]">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        <span className="px-3 py-1 rounded bg-white/5 text-[11px] text-slate-400 border border-white/10 backdrop-blur">
          Control: Arrastra para rotar · Scroll para Zoom · Clic en edificio para seleccionar
        </span>
      </div>

      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 rounded-xl border border-white/10 bg-black/40 p-2 backdrop-blur">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Sedes
        </p>
        {sedes.map((sede) => (
          <button
            key={sede.id}
            onClick={() => setActiveBranch(sede.id)}
            className={`rounded-lg px-2 py-1 text-left text-[11px] transition ${
              activeBranchId === sede.id
                ? 'bg-amber-500/15 text-amber-200'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <span className="block font-semibold">{sede.nombre}</span>
            <span className="text-[10px] text-slate-500">
              {sede.pisos} piso{sede.pisos === 1 ? '' : 's'} · {formatNumber(sede.totalHostsActuales)} hosts
            </span>
          </button>
        ))}
      </div>

      <Canvas camera={{ position: [0, 30, 60], fov: 60 }} shadows>
        <NetworkScene
          followActiveBranch
          onlyBranchId={activeBranchId}
          dispositivosActivos={dispositivosActivos}
          onSelectBranch={setActiveBranch}
        />
        <LabelProjector containerRef={labelsRef} />
      </Canvas>

      <div ref={labelsRef} className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {sedes.map((sede) => (
          <div
            key={sede.id}
            data-sede-label
            style={{ display: activeBranchId && activeBranchId !== sede.id ? 'none' : undefined }}
            className="absolute left-0 top-0 flex flex-col items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-2 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition-opacity"
          >
            <div className="flex items-center gap-1">
              <span className="flex size-2 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/20 text-amber-400">
                ●
              </span>
              {sede.nombre}
            </div>
            <div className="text-[10px] text-slate-300">
              {sede.pisos} piso{sede.pisos === 1 ? '' : 's'} · {formatNumber(sede.totalHostsActuales)} hosts
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 z-20">
        <span className="px-2 py-1 rounded bg-white/5 text-[10px] text-slate-400 border border-white/10 backdrop-blur">
          Seleccionar sucursal
        </span>
        <button
          onClick={() => setActiveBranch(null)}
          className={`px-3 py-1 rounded border text-[11px] font-medium transition ${
            activeBranchId === null
              ? 'bg-amber-500 border-amber-400 text-ink-950'
              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
          }`}
        >
          Vista general
        </button>
        {sedes.map((sede) => (
          <button
            key={sede.id}
            onClick={() => setActiveBranch(sede.id)}
            className={`px-3 py-1 rounded border text-[11px] font-medium transition ${
              activeBranchId === sede.id
                ? 'bg-amber-500 border-amber-400 text-ink-950'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            {sede.nombre}
          </button>
        ))}
        <button
          onClick={() => {
            const ids = sedes.flatMap((s) => dispositivosPorSede.get(s.id)?.map((d) => d.id) ?? []);
            setDispositivosActivos(new Set(ids.slice(0, 5)));
            setTimeout(() => navigate('/simulacion-paso-paso'), 350);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-400/20"
        >
          <span className="flex size-3.5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-400/30">
            ●
          </span>
          Simular Ping
        </button>
      </div>
    </div>
  );
}
