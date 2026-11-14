export interface SedePosition {
  x: number;
  z: number;
}

const SEDE_LAYOUT: SedePosition[] = [
  { x: 0, z: 8 },
  { x: -24, z: -10 },
  { x: 24, z: -10 },
];

export function getSedePosition(index: number): SedePosition {
  return SEDE_LAYOUT[index] ?? { x: (index - 1) * 26, z: 0 };
}

export function getSedeTopY(pisos: number): number {
  return Math.max(1, pisos) * 1.6 + 0.3;
}
