import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import type { CityModel } from '../../lib/scene/cityModel';
import { useViewStore, type ViewMode } from '../../store/useViewStore';
import { aplicarInstancias } from './instancing';
import type { InstanceTransform } from './types';
import { categoriaVisual, vlanColor } from './cityVisuals';

interface DeviceLayerProps {
  model: CityModel;
  mode: ViewMode;
  activeFloor: number | null;
  revealInterior: boolean;
  interactive: boolean;
  routerBySede: Map<string, string>;
  sectionCut: number | null;
}

interface HostItem extends InstanceTransform {
  id: string;
  sedeId: string;
  categoria: string;
  vlanId: number | null;
  piso: number;
  color: string;
  shape: 'box' | 'sphere' | 'cylinder';
}

interface ApItem {
  id: string;
  sedeId: string;
  piso: number;
  position: [number, number, number];
}

const sinRaycast = () => null;

function HostGroup({
  shape,
  items,
  mode,
  interactive,
}: {
  shape: 'box' | 'sphere' | 'cylinder';
  items: HostItem[];
  mode: ViewMode;
  interactive: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const selectedNodeId = useViewStore((state) => state.selectedNodeId);
  const hoveredNodeId = useViewStore((state) => state.hoveredNodeId);
  const setSelectedNodeId = useViewStore((state) => state.setSelectedNodeId);
  const setHoveredNodeId = useViewStore((state) => state.setHoveredNodeId);
  const setActiveBranch = useViewStore((state) => state.setActiveBranch);
  const focusNode = useViewStore((state) => state.focusNode);

  useLayoutEffect(() => {
    if (ref.current) {
      aplicarInstancias(
        ref.current,
        items.map((item) => ({ ...item, color: item.color })),
      );
    }
  }, [items]);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    for (let indice = 0; indice < items.length; indice += 1) {
      const item = items[indice];
      if (item.id === selectedNodeId) color.set('#fbbf24');
      else if (item.id === hoveredNodeId) color.set('#fde68a');
      else color.set(item.color);
      mesh.setColorAt(indice, color);
    }
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [items, selectedNodeId, hoveredNodeId]);

  if (items.length === 0) return null;

  const manejarClick = (evento: ThreeEvent<MouseEvent>) => {
    evento.stopPropagation();
    if (!interactive || evento.instanceId === undefined) return;
    const item = items[evento.instanceId];
    if (!item) return;
    setSelectedNodeId(item.id);
    setActiveBranch(item.sedeId);
  };

  const manejarDobleClick = (evento: ThreeEvent<MouseEvent>) => {
    evento.stopPropagation();
    if (!interactive || evento.instanceId === undefined) return;
    const item = items[evento.instanceId];
    if (!item) return;
    setSelectedNodeId(item.id);
    setActiveBranch(item.sedeId);
    focusNode(item.id);
  };

  const manejarOver = (evento: ThreeEvent<PointerEvent>) => {
    if (!interactive || evento.instanceId === undefined) return;
    const item = items[evento.instanceId];
    if (item) setHoveredNodeId(item.id);
  };

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, Math.max(1, items.length)]}
      frustumCulled={false}
      onClick={manejarClick}
      onDoubleClick={manejarDobleClick}
      onPointerOver={manejarOver}
      onPointerOut={() => setHoveredNodeId(null)}
      raycast={interactive ? undefined : sinRaycast}
    >
      {shape === 'box' ? <boxGeometry args={[1, 0.82, 1]} /> : null}
      {shape === 'sphere' ? <sphereGeometry args={[0.5, 12, 10]} /> : null}
      {shape === 'cylinder' ? <cylinderGeometry args={[0.5, 0.5, 1, 12]} /> : null}
      {mode === 'planos' ? (
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      ) : (
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.42}
          metalness={0.22}
          emissive="#0b1220"
          emissiveIntensity={mode === 'estructura' ? 0.35 : 0.18}
        />
      )}
    </instancedMesh>
  );
}

function ApInstances({
  items,
  mode,
  interactive,
}: {
  items: ApItem[];
  mode: ViewMode;
  interactive: boolean;
}) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const ledRef = useRef<THREE.InstancedMesh>(null);
  const setSelectedNodeId = useViewStore((state) => state.setSelectedNodeId);
  const setActiveBranch = useViewStore((state) => state.setActiveBranch);

  const bodies = useMemo<InstanceTransform[]>(
    () =>
      items.map((item) => ({
        position: [item.position[0], item.position[1] - 0.12, item.position[2]],
        scale: [0.95, 0.9, 0.95],
      })),
    [items],
  );

  const leds = useMemo<InstanceTransform[]>(
    () =>
      items.map((item) => ({
        position: [item.position[0], item.position[1] - 0.29, item.position[2]],
        scale: [0.22, 0.22, 0.22],
      })),
    [items],
  );

  useLayoutEffect(() => {
    if (bodyRef.current) aplicarInstancias(bodyRef.current, bodies);
    if (ledRef.current) aplicarInstancias(ledRef.current, leds);
  }, [bodies, leds]);

  if (items.length === 0) return null;

  const seleccionar = (evento: ThreeEvent<MouseEvent>) => {
    evento.stopPropagation();
    if (!interactive || evento.instanceId === undefined) return;
    const item = items[evento.instanceId];
    if (!item) return;
    setSelectedNodeId(item.id);
    setActiveBranch(item.sedeId);
  };

  return (
    <group>
      <instancedMesh
        ref={bodyRef}
        args={[undefined, undefined, Math.max(1, items.length)]}
        frustumCulled={false}
        onClick={seleccionar}
        raycast={interactive ? undefined : sinRaycast}
      >
        <cylinderGeometry args={[0.55, 0.42, 0.16, 20]} />
        <meshStandardMaterial
          color={mode === 'planos' ? '#a5f3fc' : '#e2e8f0'}
          roughness={0.4}
          metalness={0.3}
          emissive={mode === 'planos' ? '#22d3ee' : '#000000'}
          emissiveIntensity={mode === 'planos' ? 0.7 : 0}
          toneMapped={mode !== 'planos'}
        />
      </instancedMesh>
      <instancedMesh
        ref={ledRef}
        args={[undefined, undefined, Math.max(1, items.length)]}
        frustumCulled={false}
        raycast={sinRaycast}
      >
        <sphereGeometry args={[0.5, 10, 8]} />
        <meshBasicMaterial color="#22d3ee" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function SwitchBox({
  position,
  core,
  selected,
  interactive,
  onSelect,
}: {
  position: [number, number, number];
  core: boolean;
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
}) {
  const color = selected ? '#fbbf24' : core ? '#f59e0b' : '#64748b';
  return (
    <group position={position}>
      <mesh
        onClick={(evento) => {
          evento.stopPropagation();
          if (interactive) onSelect();
        }}
        raycast={interactive ? undefined : sinRaycast}
      >
        <boxGeometry args={[1.25, 0.32, 0.72]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.35} />
        <Edges color="#0f172a" />
      </mesh>
      <mesh position={[0, 0.2, 0.16]}>
        <boxGeometry args={[0.9, 0.04, 0.04]} />
        <meshBasicMaterial color={core ? '#fbbf24' : '#22d3ee'} toneMapped={false} />
      </mesh>
      <mesh position={[-0.52, 0.02, 0.37]}>
        <boxGeometry args={[0.12, 0.12, 0.03]} />
        <meshBasicMaterial color="#34d399" toneMapped={false} />
      </mesh>
    </group>
  );
}

function RouterBox({
  position,
  selected,
  interactive,
  onSelect,
}: {
  position: [number, number, number];
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
}) {
  const color = selected ? '#fbbf24' : '#1e293b';
  return (
    <group position={position}>
      <mesh
        onClick={(evento) => {
          evento.stopPropagation();
          if (interactive) onSelect();
        }}
        raycast={interactive ? undefined : sinRaycast}
        castShadow
      >
        <boxGeometry args={[1.7, 0.45, 1.15]} />
        <meshStandardMaterial color={color} metalness={0.65} roughness={0.3} emissive="#f59e0b" emissiveIntensity={0.12} />
        <Edges color="#f59e0b" />
      </mesh>
      {[
        [-0.55, 0.9],
        [0, 1.15],
        [0.55, 0.9],
      ].map(([dx, altura]) => (
        <mesh key={dx} position={[dx, altura, 0]}>
          <cylinderGeometry args={[0.035, 0.035, altura * 2, 6]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.28, 0.58]}>
        <boxGeometry args={[1.2, 0.05, 0.05]} />
        <meshBasicMaterial color="#fbbf24" toneMapped={false} />
      </mesh>
    </group>
  );
}

export function DeviceLayer({
  model,
  mode,
  activeFloor,
  revealInterior,
  interactive,
  routerBySede,
  sectionCut,
}: DeviceLayerProps) {
  const selectedNodeId = useViewStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useViewStore((state) => state.setSelectedNodeId);
  const setActiveBranch = useViewStore((state) => state.setActiveBranch);

  const grupos = useMemo(() => {
    const map: Record<'box' | 'sphere' | 'cylinder', HostItem[]> = {
      box: [],
      sphere: [],
      cylinder: [],
    };
    if (!revealInterior) return map;

    for (const sede of model.sedes) {
      for (const host of sede.hosts) {
        if (activeFloor !== null && host.piso !== activeFloor) continue;
        if (sectionCut !== null && host.position.y > sectionCut) continue;
        const visual = categoriaVisual(host.categoria);
        const color = mode === 'planos' ? vlanColor(host.vlanId) : visual.color;
        const escala = mode === 'planos' ? visual.size * 1.15 : visual.size;
        map[visual.shape].push({
          id: host.id,
          sedeId: sede.id,
          categoria: host.categoria,
          vlanId: host.vlanId,
          piso: host.piso,
          color,
          shape: visual.shape,
          position: [host.position.x, host.position.y, host.position.z],
          scale:
            visual.shape === 'cylinder'
              ? [escala, escala * 1.35, escala]
              : visual.shape === 'sphere'
                ? [escala, escala, escala]
                : [escala, escala * 0.82, escala],
        });
      }
    }
    return map;
  }, [model, mode, activeFloor, revealInterior, sectionCut]);

  const aps = useMemo<ApItem[]>(() => {
    if (!revealInterior) return [];
    const items: ApItem[] = [];
    for (const sede of model.sedes) {
      for (const ap of sede.aps) {
        if (activeFloor !== null && ap.piso !== activeFloor) continue;
        if (sectionCut !== null && ap.position.y > sectionCut) continue;
        items.push({
          id: ap.id,
          sedeId: sede.id,
          piso: ap.piso,
          position: [ap.position.x, ap.position.y, ap.position.z],
        });
      }
    }
    return items;
  }, [model, activeFloor, revealInterior, sectionCut]);

  const switches = useMemo(() => {
    if (!revealInterior) return [];
    return model.sedes.flatMap((sede) =>
      sede.switches
        .filter((sw) => activeFloor === null || sw.piso === activeFloor)
        .filter((sw) => sectionCut === null || sw.position.y <= sectionCut)
        .map((sw) => ({ sedeId: sede.id, sw })),
    );
  }, [model, activeFloor, revealInterior, sectionCut]);

  const routers = useMemo(
    () =>
      model.sedes
        .filter((sede) => sectionCut === null || sede.height + 0.9 <= sectionCut)
        .map((sede) => ({ sede, id: routerBySede.get(sede.id) ?? null })),
    [model, routerBySede, sectionCut],
  );

  if (!revealInterior) return null;

  return (
    <group>
      <HostGroup shape="box" items={grupos.box} mode={mode} interactive={interactive} />
      <HostGroup shape="sphere" items={grupos.sphere} mode={mode} interactive={interactive} />
      <HostGroup shape="cylinder" items={grupos.cylinder} mode={mode} interactive={interactive} />
      <ApInstances items={aps} mode={mode} interactive={interactive} />

      {switches.map(({ sedeId, sw }) => (
        <SwitchBox
          key={sw.id}
          position={[sw.position.x, sw.position.y, sw.position.z]}
          core={sw.esCore}
          selected={selectedNodeId === sw.id}
          interactive={interactive}
          onSelect={() => {
            setSelectedNodeId(sw.id);
            setActiveBranch(sedeId);
          }}
        />
      ))}

      {routers.map(({ sede, id }) => (
        <RouterBox
          key={sede.id}
          position={[sede.center.x, sede.height + 0.9, sede.center.z]}
          selected={id !== null && selectedNodeId === id}
          interactive={interactive && id !== null}
          onSelect={() => {
            if (!id) return;
            setSelectedNodeId(id);
            setActiveBranch(sede.id);
          }}
        />
      ))}
    </group>
  );
}
