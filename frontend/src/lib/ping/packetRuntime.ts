import * as THREE from 'three';

export const packetRuntime = {
  position: new THREE.Vector3(0, 2, 0),
};

export function setPacketRuntimePosition(x: number, y: number, z: number): void {
  packetRuntime.position.set(x, y, z);
}

export function setPacketRuntimeFromTuple(posicion: [number, number, number]): void {
  packetRuntime.position.set(posicion[0], posicion[1], posicion[2]);
}

export function copyPacketRuntimePosition(target: THREE.Vector3): THREE.Vector3 {
  return target.copy(packetRuntime.position);
}
