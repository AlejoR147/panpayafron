import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { aplicarInstancias } from './instancing';
import type { InstanceTransform } from './types';

interface InstancedBoxesProps {
  items: InstanceTransform[];
  color?: string;
  opacity?: number;
  transparent?: boolean;
  depthWrite?: boolean;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  wireframe?: boolean;
  map?: THREE.Texture | null;
  emissiveMap?: THREE.Texture | null;
  clippingPlanes?: THREE.Plane[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export function InstancedBoxes({
  items,
  color = '#ffffff',
  opacity = 1,
  transparent = false,
  depthWrite = true,
  metalness = 0.05,
  roughness = 0.85,
  emissive = '#000000',
  emissiveIntensity = 0,
  wireframe = false,
  map = null,
  emissiveMap = null,
  clippingPlanes,
  castShadow = false,
  receiveShadow = false,
}: InstancedBoxesProps) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (ref.current) {
      aplicarInstancias(ref.current, items);
    }
  }, [items]);

  if (items.length === 0) return null;

  const planos = clippingPlanes && clippingPlanes.length > 0 ? clippingPlanes : undefined;

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, Math.max(1, items.length)]}
      frustumCulled={false}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        map={map ?? undefined}
        emissiveMap={emissiveMap ?? undefined}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        metalness={metalness}
        roughness={roughness}
        transparent={transparent}
        opacity={opacity}
        depthWrite={depthWrite}
        wireframe={wireframe}
        clippingPlanes={planos}
        toneMapped
      />
    </instancedMesh>
  );
}
