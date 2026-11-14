import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { usePacketStore } from '../../store/usePacketStore';
import {
  packetRuntime,
  setPacketRuntimeFromTuple,
} from '../../lib/ping/packetRuntime';

const TRAIL_POINTS = 42;

export function Packet3D() {
  const packetPath = usePacketStore((state) => state.packetPath);
  const packetTarget = usePacketStore((state) => state.packetTarget);
  const packetPosition = usePacketStore((state) => state.packetPosition);
  const packetColor = usePacketStore((state) => state.packetColor);
  const packetMoving = usePacketStore((state) => state.packetMoving);
  const speed = usePacketStore((state) => state.speed);

  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const pathPoints = useMemo<[number, number, number][]>(() => {
    if (packetPath.length >= 2) return packetPath;
    return [packetPosition, packetTarget];
  }, [packetPath, packetPosition, packetTarget]);

  const puntos = useMemo(
    () => pathPoints.map((punto) => new THREE.Vector3(punto[0], punto[1], punto[2])),
    [pathPoints],
  );

  const tramos = useMemo(() => {
    const acumulado: number[] = [];
    let total = 0;
    for (let indice = 0; indice < puntos.length - 1; indice += 1) {
      total += puntos[indice].distanceTo(puntos[indice + 1]);
      acumulado.push(total);
    }
    return { acumulado, total };
  }, [puntos]);

  const posicionRef = useRef(new THREE.Vector3(...packetPosition));
  const progresoRef = useRef(0);
  const completadoRef = useRef(false);
  const ultimaRutaRef = useRef<string>('');

  const trailBuffer = useMemo(() => new Float32Array(TRAIL_POINTS * 3), []);
  const trailAtributo = useMemo(() => {
    const atributo = new THREE.BufferAttribute(trailBuffer, 3);
    atributo.setUsage(THREE.DynamicDrawUsage);
    return atributo;
  }, [trailBuffer]);

  const trailGeometria = useMemo(() => {
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', trailAtributo);
    return geometria;
  }, [trailAtributo]);

  const trailMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#fbbf24',
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );

  const trailLinea = useMemo(() => {
    const linea = new THREE.Line(trailGeometria, trailMaterial);
    linea.frustumCulled = false;
    linea.renderOrder = 3;
    return linea;
  }, [trailGeometria, trailMaterial]);

  useEffect(() => {
    trailMaterial.color.set(packetColor);
  }, [packetColor, trailMaterial]);

  useEffect(() => {
    return () => {
      trailGeometria.dispose();
      trailMaterial.dispose();
    };
  }, [trailGeometria, trailMaterial]);

  useEffect(() => {
    if (!packetMoving) {
      posicionRef.current.set(packetPosition[0], packetPosition[1], packetPosition[2]);
      if (groupRef.current) groupRef.current.position.copy(posicionRef.current);
      setPacketRuntimeFromTuple(packetPosition);
    }
  }, [packetMoving, packetPosition]);

  useEffect(() => {
    const primero = packetPath[0] ?? packetPosition;
    const clave = `${packetPath.length}:${primero.join(',')}:${packetTarget.join(',')}:${
      packetPath[packetPath.length - 1]?.join(',') ?? ''
    }`;
    if (clave === ultimaRutaRef.current) return;
    ultimaRutaRef.current = clave;
    progresoRef.current = 0;
    completadoRef.current = false;

    const inicio = puntos[0];
    if (inicio) {
      posicionRef.current.copy(inicio);
      if (groupRef.current) groupRef.current.position.copy(inicio);
      packetRuntime.position.copy(inicio);
      const array = trailAtributo.array as Float32Array;
      for (let indice = 0; indice < TRAIL_POINTS; indice += 1) {
        array[indice * 3] = inicio.x;
        array[indice * 3 + 1] = inicio.y;
        array[indice * 3 + 2] = inicio.z;
      }
      trailAtributo.needsUpdate = true;
    }
  }, [packetPath, packetPosition, packetTarget, puntos, trailAtributo]);

  useFrame((state, delta) => {
    const grupo = groupRef.current;
    if (!grupo) return;

    const tiempo = state.clock.elapsedTime;
    const pulso = 1 + Math.sin(tiempo * 6) * 0.08;
    if (coreRef.current) coreRef.current.scale.setScalar(pulso);
    if (glowRef.current) glowRef.current.scale.setScalar(1.7 + Math.sin(tiempo * 4) * 0.2);

    if (!packetMoving || puntos.length < 2 || tramos.total <= 0) {
      return;
    }

    const duracion = THREE.MathUtils.clamp(tramos.total / 24, 0.45, 2.4) / Math.max(0.25, speed);
    const avance = (tramos.total / duracion) * Math.min(delta, 0.12);
    progresoRef.current = Math.min(tramos.total, progresoRef.current + avance);

    const distancia = progresoRef.current;
    let segmento = 0;
    while (
      segmento < tramos.acumulado.length - 1 &&
      tramos.acumulado[segmento] < distancia
    ) {
      segmento += 1;
    }

    const inicioTramo = segmento === 0 ? 0 : tramos.acumulado[segmento - 1];
    const finTramo = tramos.acumulado[segmento] || 1;
    const t = THREE.MathUtils.clamp((distancia - inicioTramo) / (finTramo - inicioTramo), 0, 1);
    const desde = puntos[segmento];
    const hasta = puntos[segmento + 1] ?? desde;

    posicionRef.current.lerpVectors(desde, hasta, t);
    grupo.position.copy(posicionRef.current);
    packetRuntime.position.copy(posicionRef.current);

    if (lightRef.current) lightRef.current.position.copy(posicionRef.current);

    const atributo = trailAtributo;
    const array = atributo.array as Float32Array;
    array.copyWithin(0, 3);
    array[(TRAIL_POINTS - 1) * 3] = posicionRef.current.x;
    array[(TRAIL_POINTS - 1) * 3 + 1] = posicionRef.current.y;
    array[(TRAIL_POINTS - 1) * 3 + 2] = posicionRef.current.z;
    atributo.needsUpdate = true;

    if (progresoRef.current >= tramos.total && !completadoRef.current) {
      completadoRef.current = true;
      const store = usePacketStore.getState();
      store.setPacketMoving(false);
      store.setPacketPosition([
        posicionRef.current.x,
        posicionRef.current.y,
        posicionRef.current.z,
      ]);
    }
  });

  if (pathPoints.length < 2 && !packetMoving) return null;

  return (
    <group>
      <Line
        points={pathPoints}
        color={packetColor}
        lineWidth={1}
        dashed
        dashSize={0.8}
        gapSize={0.6}
        transparent
        opacity={0.28}
      />

      <primitive object={trailLinea} />

      <group ref={groupRef} position={packetPosition}>
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.42, 16, 12]} />
          <meshBasicMaterial
            color={packetColor}
            transparent
            opacity={0.2}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[0.3, 1]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={packetColor}
            emissiveIntensity={3}
            roughness={0.2}
            metalness={0.1}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.58, 0.025, 8, 32]} />
          <meshBasicMaterial color={packetColor} transparent opacity={0.75} toneMapped={false} />
        </mesh>
        <pointLight ref={lightRef} color={packetColor} intensity={12} distance={10} />
      </group>
    </group>
  );
}
