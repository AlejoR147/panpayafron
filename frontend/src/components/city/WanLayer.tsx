import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import type { CityModel, WorldSede } from '../../lib/scene/cityModel';
import type { ViewMode } from '../../store/useViewStore';
import {
  WAN_BACKUP_COLOR,
  WAN_DOWN_COLOR,
  WAN_HUB_COLOR,
  WAN_LINK_COLOR,
  WAN_STATIC_COLOR,
} from './cityVisuals';
import { aplicarInstancias } from './instancing';

interface WanLayerProps {
  model: CityModel;
  mode: ViewMode;
  showLabels: boolean;
}

interface ArcoWan {
  id: string;
  tipo: 'Wan' | 'Respaldo';
  protocolo: 'RipV2' | 'Estatica';
  curva: THREE.QuadraticBezierCurve3;
  puntos: THREE.Vector3[];
  medio: THREE.Vector3;
  capacidad: number;
  latencia: number;
  desde: WorldSede;
  hacia: WorldSede;
  color: string;
  lineWidth: number;
  dashed: boolean;
  caido: boolean;
}

function curvaEntre(
  desde: THREE.Vector3,
  hacia: THREE.Vector3,
  respaldo: boolean,
): THREE.QuadraticBezierCurve3 {
  const distancia = desde.distanceTo(hacia);
  const altura = Math.max(desde.y, hacia.y) + 6 + distancia * (respaldo ? 0.13 : 0.19);
  const control = new THREE.Vector3(
    (desde.x + hacia.x) / 2,
    altura,
    (desde.z + hacia.z) / 2,
  );
  return new THREE.QuadraticBezierCurve3(desde, control, hacia);
}

function etiquetaArco(arco: ArcoWan): string {
  const partes: Array<string | null> = [
    `${arco.desde.nombre} ↔ ${arco.hacia.nombre}`,
    `${arco.capacidad} Mb/s`,
    arco.latencia > 0 ? `${arco.latencia} ms` : null,
    arco.protocolo === 'Estatica' ? 'Estática (sin RIPv2)' : 'RIPv2',
    arco.tipo === 'Respaldo' ? 'respaldo' : null,
    arco.caido ? 'caído' : null,
  ];
  return partes.filter((parte): parte is string => parte !== null).join(' · ');
}

export function WanLayer({ model, mode, showLabels }: WanLayerProps) {
  const hubRef = useRef<THREE.Group>(null);
  const pulsesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());

  const arcos = useMemo<ArcoWan[]>(() => {
    const resultado: ArcoWan[] = [];
    for (const enlace of model.wanLinks) {
      const desde = model.getSede(enlace.sedeOrigenId);
      const hacia = model.getSede(enlace.sedeDestinoId);
      if (!desde || !hacia) continue;
      const inicio = model.getRouterWorldPosition(desde.id);
      const fin = model.getRouterWorldPosition(hacia.id);
      const a = new THREE.Vector3(inicio.x, inicio.y, inicio.z);
      const b = new THREE.Vector3(fin.x, fin.y, fin.z);
      const respaldo = enlace.tipo === 'Respaldo';
      const caido = enlace.estado === 'Caido';
      const protocolo = enlace.protocoloRouting ?? 'RipV2';
      const curva = curvaEntre(a, b, respaldo);
      const color = caido
        ? WAN_DOWN_COLOR
        : respaldo
          ? WAN_BACKUP_COLOR
          : protocolo === 'Estatica'
            ? WAN_STATIC_COLOR
            : WAN_LINK_COLOR;
      resultado.push({
        id: enlace.id,
        tipo: enlace.tipo,
        protocolo,
        curva,
        puntos: curva.getPoints(64),
        medio: curva.getPointAt(0.5),
        capacidad: enlace.capacidadMbps,
        latencia: enlace.latenciaMs,
        desde,
        hacia,
        color,
        lineWidth: caido ? 1.2 : respaldo ? 1.6 : 2.2,
        dashed: respaldo,
        caido,
      });
    }
    return resultado;
  }, [model]);

  const conectoresHub = useMemo(() => {
    const items: Array<{ id: string; puntos: THREE.Vector3[] }> = [];
    for (const sede of model.sedes) {
      const router = model.getRouterWorldPosition(sede.id);
      items.push({
        id: `hub-${sede.id}`,
        puntos: [
          new THREE.Vector3(model.wanHub.x, model.wanHub.y, model.wanHub.z),
          new THREE.Vector3(router.x, router.y, router.z),
        ],
      });
    }
    return items;
  }, [model]);

  const pulsos = useMemo(
    () =>
      arcos.flatMap((arco, indiceArco) =>
        [0, 0.5].map((desfase, indice) => ({
          id: `${arco.id}-${indice}`,
          arco,
          desfase,
          velocidad: 0.11 + indiceArco * 0.015,
          color: arco.color,
        })),
      ),
    [arcos],
  );

  useFrame((state) => {
    const hub = hubRef.current;
    if (hub) {
      hub.rotation.y = state.clock.elapsedTime * 0.25;
    }
    const mesh = pulsesRef.current;
    if (!mesh || pulsos.length === 0) return;
    const obj = dummy.current;
    for (let indice = 0; indice < pulsos.length; indice += 1) {
      const pulso = pulsos[indice];
      const t = (pulso.desfase + state.clock.elapsedTime * pulso.velocidad) % 1;
      const punto = pulso.arco.curva.getPointAt(t);
      obj.position.copy(punto);
      obj.scale.setScalar(0.32);
      obj.rotation.set(0, 0, 0);
      obj.updateMatrix();
      mesh.setMatrixAt(indice, obj.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  useLayoutEffect(() => {
    if (!pulsesRef.current) return;
    aplicarInstancias(
      pulsesRef.current,
      pulsos.map((pulso) => ({
        position: [0, -100, 0],
        scale: [0.32, 0.32, 0.32],
        color: pulso.color,
      })),
    );
  }, [pulsos]);

  if (arcos.length === 0) return null;

  const opacidad = mode === 'planos' ? 0.9 : 0.72;

  return (
    <group>
      {arcos.map((arco) => (
        <group key={arco.id}>
          <Line
            points={arco.puntos}
            color={arco.color}
            lineWidth={arco.lineWidth}
            transparent
            opacity={arco.caido ? opacidad * 0.35 : opacidad}
            dashed={arco.dashed}
            dashSize={1.2}
            gapSize={0.8}
          />
          {showLabels ? (
            <Html position={[arco.medio.x, arco.medio.y + 1.6, arco.medio.z]} center distanceFactor={60} pointerEvents="none">
              <div
                className={
                  arco.caido
                    ? 'whitespace-nowrap rounded border border-rose-400/40 bg-ink-950/80 px-2 py-0.5 text-[9px] font-semibold text-rose-200 shadow'
                    : arco.protocolo === 'Estatica'
                      ? 'whitespace-nowrap rounded border border-emerald-400/40 bg-ink-950/80 px-2 py-0.5 text-[9px] font-semibold text-emerald-200 shadow'
                      : 'whitespace-nowrap rounded border border-sky-400/40 bg-ink-950/80 px-2 py-0.5 text-[9px] font-semibold text-sky-200 shadow'
                }
              >
                {etiquetaArco(arco)}
              </div>
            </Html>
          ) : null}
        </group>
      ))}

      {conectoresHub.map((conector) => (
        <Line
          key={conector.id}
          points={conector.puntos}
          color={WAN_HUB_COLOR}
          lineWidth={0.8}
          dashed
          dashSize={1.5}
          gapSize={1.5}
          transparent
          opacity={0.22}
        />
      ))}

      <group position={[model.wanHub.x, model.wanHub.y, model.wanHub.z]}>
        <mesh>
          <icosahedronGeometry args={[1.1, 1]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={2.2}
            metalness={0.2}
            roughness={0.3}
            toneMapped={false}
          />
        </mesh>
        <group ref={hubRef}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.1, 0.06, 8, 48]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.7} toneMapped={false} />
          </mesh>
          <mesh rotation={[Math.PI / 2.4, 0.4, 0]}>
            <torusGeometry args={[2.7, 0.04, 8, 48]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.5} toneMapped={false} />
          </mesh>
        </group>
        <pointLight color="#fbbf24" intensity={16} distance={40} />
        {showLabels ? (
          <Html position={[0, 3.2, 0]} center distanceFactor={55} pointerEvents="none">
            <div className="whitespace-nowrap rounded-xl border border-amber-400/50 bg-ink-950/85 px-3 py-1.5 text-center shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">Red WAN</p>
              <p className="text-[9px] text-slate-300">Nube / ISP · hub nacional</p>
            </div>
          </Html>
        ) : null}
      </group>

      <instancedMesh
        ref={pulsesRef}
        args={[undefined, undefined, Math.max(1, pulsos.length)]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
