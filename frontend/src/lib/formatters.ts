import type { VlanSedeDto } from '../api/types';

const numero = new Intl.NumberFormat('es-CO');

export function formatNumber(value: number): string {
  return numero.format(value);
}

export function formatPercent(value: number, decimals = 0): string {
  return `${new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}%`;
}

export function formatArea(value: number): string {
  return `${formatNumber(value)} m²`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) {
    return 'Sin actualizar';
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function capacidadVlan(prefijo: number): number {
  return Math.max(0, 2 ** (32 - prefijo) - 2);
}

export function utilizacionVlan(hostsConCrecimiento: number, prefijo: number): number {
  const capacidad = capacidadVlan(prefijo);
  return capacidad === 0 ? 0 : (hostsConCrecimiento / capacidad) * 100;
}

export interface VlanCritica {
  vlan: VlanSedeDto;
  capacidad: number;
  utilizacion: number;
}

export function vlanMasUtilizada(vlans: VlanSedeDto[]): VlanCritica | null {
  let critica: VlanCritica | null = null;

  for (const vlan of vlans) {
    const capacidad = capacidadVlan(vlan.prefijo);
    const utilizacion = utilizacionVlan(vlan.hostsConCrecimiento, vlan.prefijo);

    if (!critica || utilizacion > critica.utilizacion) {
      critica = { vlan, capacidad, utilizacion };
    }
  }

  return critica;
}
