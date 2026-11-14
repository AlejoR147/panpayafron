import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { CityCameraRig } from './CityCameraRig';
import { CityEnvironment } from './CityEnvironment';
import { CityLabels } from './CityLabels';
import { PanpayaBuilding } from './PanpayaBuilding';
import { CableLayer } from './CableLayer';
import { CoverageLayer } from './CoverageLayer';
import { DeviceLayer } from './DeviceLayer';
import { PeopleLayer } from './PeopleLayer';
import { WanLayer } from './WanLayer';
import { obtenerCityModel } from './cityModelCache';
import { Packet3D } from '../packet/Packet3D';
import { useNetworkStore } from '../../store/useNetworkStore';
import { useViewStore, type ViewMode } from '../../store/useViewStore';
import { mostrarInterior } from './cityVisuals';
import type { WorldSede } from '../../lib/scene/cityModel';

interface CitySceneProps {
  viewMode?: ViewMode;
  showPacket?: boolean;
  interactive?: boolean;
  onSelectBranch?: (sedeId: string) => void;
}

function HaloSede({ sede, activa }: { sede: WorldSede; activa: boolean }) {
  if (!activa) return null;
  const radio = Math.max(sede.footprint.width, sede.footprint.depth) * 0.62;
  return (
    <mesh
      position={[sede.footprint.x + sede.footprint.width / 2, 0.06, sede.footprint.z + sede.footprint.depth / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[radio, radio + 0.35, 72]} />
      <meshBasicMaterial
        color="#fbbf24"
        transparent
        opacity={0.55}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

export function CityScene({ viewMode, showPacket = true, interactive = true, onSelectBranch }: CitySceneProps) {
  const snapshot = useNetworkStore((state) => state.snapshot);
  const estadoTopologia = useNetworkStore((state) => state.estadoTopologia);
  const errorTopologia = useNetworkStore((state) => state.errorTopologia);
  const cargarTopologia = useNetworkStore((state) => state.cargarTopologia);

  const modoStore = useViewStore((state) => state.viewMode);
  const activeBranchId = useViewStore((state) => state.activeBranchId);
  const setActiveBranch = useViewStore((state) => state.setActiveBranch);
  const activeFloor = useViewStore((state) => state.activeFloor);
  const setSelectedNodeId = useViewStore((state) => state.setSelectedNodeId);
  const focusNode = useViewStore((state) => state.focusNode);
  const showCables = useViewStore((state) => state.showCables);
  const showCoverage = useViewStore((state) => state.showCoverage);
  const showLabels = useViewStore((state) => state.showLabels);
  const showPeople = useViewStore((state) => state.showPeople);
  const showTrees = useViewStore((state) => state.showTrees);
  const showDecor = useViewStore((state) => state.showDecor);
  const sectionCut = useViewStore((state) => state.sectionCut);

  const mode: ViewMode = (viewMode ?? modoStore) === 'arquitecto' ? 'ciudad' : (viewMode ?? modoStore);
  const model = useMemo(() => (snapshot ? obtenerCityModel(snapshot) : null), [snapshot]);
  const routerBySede = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const nodo of snapshot?.nodos ?? []) {
      if (nodo.tipo === 'Router') mapa.set(nodo.sedeId, nodo.id);
    }
    return mapa;
  }, [snapshot]);

  useEffect(() => {
    if (!snapshot && estadoTopologia === 'idle') {
      void cargarTopologia();
    }
  }, [cargarTopologia, estadoTopologia, snapshot]);

  const seleccionarSede = (sedeId: string | null) => {
    setActiveBranch(sedeId);
    setSelectedNodeId(null);
    focusNode(null);
    if (sedeId) onSelectBranch?.(sedeId);
  };

  const clippingPlanes = useMemo(
    () => (sectionCut !== null ? [new THREE.Plane(new THREE.Vector3(0, -1, 0), sectionCut)] : []),
    [sectionCut],
  );

  const interior = mostrarInterior(mode, sectionCut);
  const focusBranch = mode !== 'ciudad' || Boolean(activeBranchId);

  if (!snapshot || !model) {
    const conError = estadoTopologia === 'error';
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-ink-950 text-slate-200">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-amber-400/20 border-t-amber-400" />
          <p className="text-sm font-semibold">Preparando la ciudad 3D</p>
          <p className="mt-1 text-xs text-slate-400">
            {conError
              ? errorTopologia ?? 'No fue posible cargar la topología.'
              : 'Generando edificios, pisos, hosts y enlaces desde el snapshot de red.'}
          </p>
          {conError ? (
            <button
              type="button"
              onClick={() => void cargarTopologia()}
              className="mt-4 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-ink-950 hover:bg-amber-400"
            >
              Reintentar
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const colorFondo = mode === 'planos' ? '#02050b' : '#050912';

  return (
    <div className="absolute inset-0 bg-ink-950">
      <Canvas
        shadows={mode !== 'planos'}
        dpr={[1, 1.75]}
        camera={{ position: [0, 100, 136], fov: 46, near: 0.5, far: 520 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
        onPointerMissed={() => setSelectedNodeId(null)}
      >
        <color attach="background" args={[colorFondo]} />
        <fog attach="fog" args={[colorFondo, mode === 'planos' ? 200 : 120, 380]} />

        <ambientLight intensity={mode === 'planos' ? 0.9 : 0.62} />
        <hemisphereLight args={['#bfdbfe', '#0b1220', mode === 'planos' ? 0.4 : 0.32]} />
        <directionalLight
          position={[72, 118, 54]}
          intensity={mode === 'planos' ? 1.4 : 2.3}
          color="#fff4d6"
          castShadow={mode !== 'planos'}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-150}
          shadow-camera-right={150}
          shadow-camera-top={150}
          shadow-camera-bottom={-150}
          shadow-camera-near={1}
          shadow-camera-far={320}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[-70, 48, -58]} intensity={mode === 'planos' ? 0.5 : 0.85} color="#38bdf8" />

        <CityEnvironment model={model} mode={mode} showTrees={showTrees} showDecor={showDecor} />

        {model.sedes.map((sede) => (
          <group key={sede.id}>
            <HaloSede sede={sede} activa={sede.id === activeBranchId} />
            <PanpayaBuilding
              sede={sede}
              mode={mode}
              interactive={interactive}
              activeFloor={activeFloor}
              revealInterior={interior}
              showLabels={showLabels}
              clippingPlanes={clippingPlanes}
              onSelectBranch={seleccionarSede}
            />
          </group>
        ))}

        <CableLayer
          model={model}
          mode={mode}
          activeFloor={activeFloor}
          showCables={showCables}
          revealInterior={interior}
          sectionCut={sectionCut}
        />

        <DeviceLayer
          model={model}
          mode={mode}
          activeFloor={activeFloor}
          revealInterior={interior}
          interactive={interactive}
          routerBySede={routerBySede}
          sectionCut={sectionCut}
        />

        {showPeople ? (
          <PeopleLayer model={model} activeFloor={activeFloor} sectionCut={sectionCut} mode={mode} />
        ) : null}

        <CoverageLayer
          model={model}
          mode={mode}
          activeFloor={activeFloor}
          show={showCoverage}
          sectionCut={sectionCut}
        />

        <WanLayer model={model} mode={mode} showLabels={showLabels} />

        {showLabels ? (
          <CityLabels
            model={model}
            mode={mode}
            activeBranchId={activeBranchId}
            onSelectBranch={seleccionarSede}
          />
        ) : null}

        {showPacket ? <Packet3D /> : null}

        <CityCameraRig model={model} focusBranch={focusBranch} />
      </Canvas>
    </div>
  );
}
