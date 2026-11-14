import type { Rng } from './rng';
import type { Rect, Vec2, Vec3 } from './types';

export function clamp(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

export function compararTexto(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function slug(texto: string): string {
  const base = normalizarTexto(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.length > 0 ? base : 'sin-nombre';
}

export function rectCentro(rect: Rect): Vec2 {
  return { x: rect.x + rect.width / 2, z: rect.z + rect.depth / 2 };
}

export function rectArea(rect: Rect): number {
  return Math.max(0, rect.width) * Math.max(0, rect.depth);
}

export function puntoEnRect(punto: Vec2, rect: Rect): boolean {
  return (
    punto.x >= rect.x &&
    punto.x <= rect.x + rect.width &&
    punto.z >= rect.z &&
    punto.z <= rect.z + rect.depth
  );
}

export function distancia2D(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function puntosVec3Iguales(a: Vec3, b: Vec3, epsilon = 1e-6): boolean {
  return (
    Math.abs(a.x - b.x) <= epsilon &&
    Math.abs(a.y - b.y) <= epsilon &&
    Math.abs(a.z - b.z) <= epsilon
  );
}

export function limpiarPuntos(puntos: Vec3[]): Vec3[] {
  const limpios: Vec3[] = [];
  for (const punto of puntos) {
    const ultimo = limpios[limpios.length - 1];
    if (!ultimo || !puntosVec3Iguales(ultimo, punto)) {
      limpios.push(punto);
    }
  }
  return limpios;
}

export function repartirEntero(total: number, partes: number, rng: Rng): number[] {
  const n = Math.max(1, Math.floor(partes));
  const t = Math.max(0, Math.floor(total));
  const base = Math.floor(t / n);
  const residuo = t - base * n;
  const resultado = new Array<number>(n).fill(base);
  if (residuo > 0) {
    const indices = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const temporal = indices[i];
      indices[i] = indices[j];
      indices[j] = temporal;
    }
    for (let k = 0; k < residuo; k += 1) {
      resultado[indices[k]] += 1;
    }
  }
  return resultado;
}

export function repartirAnchos(pesos: number[], ancho: number, minWidth: number): number[] {
  const n = pesos.length;
  if (n === 0) return [];
  const seguros = pesos.map((peso) => Math.max(0.0001, peso));
  const total = seguros.reduce((suma, peso) => suma + peso, 0);
  const anchoSeguro = Math.max(0.0001, ancho);
  if (anchoSeguro <= n * minWidth) {
    return new Array<number>(n).fill(anchoSeguro / n);
  }
  const extra = anchoSeguro - n * minWidth;
  return seguros.map((peso) => minWidth + extra * (peso / total));
}
