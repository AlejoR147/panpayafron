import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { CityModel } from '../../lib/scene/cityModel';
import { packetRuntime } from '../../lib/ping/packetRuntime';
import { usePacketStore } from '../../store/usePacketStore';
import { useViewStore } from '../../store/useViewStore';

interface CityCameraRigProps {
  model: CityModel;
  focusBranch: boolean;
}

interface CameraGoal {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const OFFSET_PACKET = new THREE.Vector3(9, 7, 12);

export function CityCameraRig({ model, focusBranch }: CityCameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const goalPosition = useRef(new THREE.Vector3(0, 96, 132));
  const goalTarget = useRef(new THREE.Vector3(0, 8, -8));
  const animando = useRef(true);
  const objetivoFrame = useRef(new THREE.Vector3());
  const destinoFrame = useRef(new THREE.Vector3());
  const { camera } = useThree();

  const viewMode = useViewStore((state) => state.viewMode);
  const activeBranchId = useViewStore((state) => state.activeBranchId);
  const focusNodeId = useViewStore((state) => state.focusNodeId);
  const followPacket = useViewStore((state) => state.followPacket);
  const plan = usePacketStore((state) => state.plan);

  const goal = useMemo<CameraGoal>(() => {
    if (followPacket && plan) {
      const objetivo = packetRuntime.position.clone();
      return {
        position: objetivo.clone().add(OFFSET_PACKET),
        target: objetivo,
      };
    }

    if (focusNodeId) {
      const nodo = model.getNodeWorldPosition(focusNodeId);
      const objetivo = new THREE.Vector3(nodo.position.x, nodo.position.y + 1, nodo.position.z);
      return {
        position: objetivo.clone().add(new THREE.Vector3(11, 8, 12)),
        target: objetivo,
      };
    }

    if (viewMode === 'planos') {
      return {
        position: new THREE.Vector3(0, 152, 96),
        target: new THREE.Vector3(0, 0, -6),
      };
    }

    if (focusBranch && activeBranchId) {
      const sede = model.getSede(activeBranchId);
      if (sede) {
        const distancia = Math.max(36, sede.height * 2.1);
        return {
          position: new THREE.Vector3(
            sede.center.x + distancia * 0.68,
            sede.height + distancia * 0.95,
            sede.center.z + distancia * 0.92,
          ),
          target: new THREE.Vector3(sede.center.x, sede.height * 0.35, sede.center.z),
        };
      }
    }

    return {
      position: new THREE.Vector3(0, 100, 136),
      target: new THREE.Vector3(0, 10, -8),
    };
  }, [
    activeBranchId,
    focusBranch,
    focusNodeId,
    followPacket,
    model,
    plan,
    viewMode,
  ]);

  useEffect(() => {
    goalPosition.current.copy(goal.position);
    goalTarget.current.copy(goal.target);
    animando.current = true;
  }, [goal]);

  useEffect(() => {
    camera.position.copy(goalPosition.current);
    const controls = controlsRef.current;
    if (controls) controls.target.copy(goalTarget.current);
  }, [camera]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (followPacket && plan) {
      const objetivo = objetivoFrame.current.copy(packetRuntime.position);
      const destino = destinoFrame.current.copy(packetRuntime.position).add(OFFSET_PACKET);
      const suavizado = 1 - Math.exp(-delta * 3.2);
      camera.position.lerp(destino, suavizado);
      controls.target.lerp(objetivo, suavizado);
      controls.update();
      return;
    }

    if (animando.current) {
      const suavizado = 1 - Math.exp(-delta * 2.8);
      camera.position.lerp(goalPosition.current, suavizado);
      controls.target.lerp(goalTarget.current, suavizado);
      if (
        camera.position.distanceTo(goalPosition.current) < 0.15 &&
        controls.target.distanceTo(goalTarget.current) < 0.15
      ) {
        animando.current = false;
      }
    }

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={8}
      maxDistance={260}
      maxPolarAngle={Math.PI / 2 - 0.04}
      onStart={() => {
        animando.current = false;
      }}
    />
  );
}
