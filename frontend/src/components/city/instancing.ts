import * as THREE from 'three';
import type { InstanceTransform } from './types';

const dummy = new THREE.Object3D();
const tempColor = new THREE.Color();

export function aplicarInstancias(mesh: THREE.InstancedMesh, items: InstanceTransform[]): void {
  mesh.count = items.length;

  for (let indice = 0; indice < items.length; indice += 1) {
    const item = items[indice];
    dummy.position.set(item.position[0], item.position[1], item.position[2]);
    if (item.rotation) {
      dummy.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2]);
    } else {
      dummy.rotation.set(0, 0, 0);
    }
    if (item.scale) {
      dummy.scale.set(item.scale[0], item.scale[1], item.scale[2]);
    } else {
      dummy.scale.set(1, 1, 1);
    }
    dummy.updateMatrix();
    mesh.setMatrixAt(indice, dummy.matrix);

    if (item.color) {
      mesh.setColorAt(indice, tempColor.set(item.color));
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  mesh.computeBoundingSphere();
}

export function aplicarColores(mesh: THREE.InstancedMesh, colors: string[]): void {
  for (let indice = 0; indice < colors.length; indice += 1) {
    mesh.setColorAt(indice, tempColor.set(colors[indice]));
  }
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}

export function colorAHex(color: THREE.ColorRepresentation): string {
  return `#${new THREE.Color(color).getHexString()}`;
}
