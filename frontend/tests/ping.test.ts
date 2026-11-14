import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { TopologiaSnapshotDto } from '../src/api/types';
import { buildPingPlan } from '../src/lib/ping/engine';
import type { PingPlan, PingStep } from '../src/lib/ping/types';

const rutaSeed = fileURLToPath(new URL('../../backend/data/seed/topologia.json', import.meta.url));
const seed = JSON.parse(readFileSync(rutaSeed, 'utf8')) as TopologiaSnapshotDto;

function latenciaEnlace(seed: TopologiaSnapshotDto, desde: string, hasta: string): number {
  const enlace = seed.enlaces.find(
    (item) =>
      (item.origenId === desde && item.destinoId === hasta) ||
      (item.destinoId === desde && item.origenId === hasta),
  );
  return enlace?.latenciaMs ?? 1;
}

function pasoEsAdyacente(plan: PingPlan, paso: PingStep): boolean {
  if (paso.kind === 'response' || paso.kind === 'fail') return true;
  const indiceDesde = paso.from === null ? -1 : plan.path.indexOf(paso.from);
  const indiceHasta = paso.to === null ? -1 : plan.path.indexOf(paso.to);
  if (indiceDesde < 0 || indiceHasta < 0) return false;
  return Math.abs(indiceDesde - indiceHasta) <= 1;
}

describe('buildPingPlan Medellín → Bogotá', () => {
  const plan = buildPingPlan(seed, 'pc-med-admin-01', 'pc-bog-admin-01');

  it('construye un plan exitoso con la ruta completa', () => {
    expect(plan.exito).toBe(true);
    expect(plan.originId).toBe('pc-med-admin-01');
    expect(plan.destId).toBe('pc-bog-admin-01');
    expect(plan.path[0]).toBe('pc-med-admin-01');
    expect(plan.path[plan.path.length - 1]).toBe('pc-bog-admin-01');
    expect(plan.path).toContain('rtr-med');
    expect(plan.path).toContain('rtr-bog');
    expect(new Set(plan.path).size).toBe(plan.path.length);
  });

  it('emite los tipos de paso en el orden didáctico esperado', () => {
    const kinds = plan.steps.map((paso) => paso.kind);
    const ordenEsperado = ['decision', 'arp', 'switch', 'router', 'wan', 'delivery', 'response'];
    const primeraAparicion = ordenEsperado.map((kind) => kinds.indexOf(kind));

    for (const [kind, indice] of ordenEsperado.map((kind, i) => [kind, primeraAparicion[i]] as const)) {
      expect(indice, `Falta el paso ${kind}`).toBeGreaterThanOrEqual(0);
    }
    expect([...primeraAparicion].sort((a, b) => a - b)).toEqual(primeraAparicion);
    expect(kinds[kinds.length - 1]).toBe('response');
  });

  it('mantiene la decisión y el ARP estacionarios en el origen', () => {
    const decision = plan.steps[0];
    expect(decision.kind).toBe('decision');
    expect(decision.from).toBe('pc-med-admin-01');
    expect(decision.to).toBe('pc-med-admin-01');

    const arp = plan.steps.find((paso) => paso.kind === 'arp');
    expect(arp).toBeDefined();
    expect(arp?.from).toBe('pc-med-admin-01');
    expect(arp?.to).toBe('pc-med-admin-01');
    expect(arp?.frame.l2?.macDestino).toBe('ff:ff:ff:ff:ff:ff');
    expect(arp?.frame.arp?.operacion).toBe('solicitud');
    expect(arp?.flood).not.toBeNull();
    expect(arp?.flood?.length).toBeGreaterThan(0);
    expect(arp?.flood?.every((par) => par[0] === 'pc-med-admin-01')).toBe(true);
  });

  it('solo usa saltos adyacentes en la ruta (salvo el Echo Reply final)', () => {
    for (const paso of plan.steps) {
      expect(pasoEsAdyacente(plan, paso), `Paso ${paso.idx} (${paso.kind}) no es adyacente`).toBe(true);
      expect(paso.path).toEqual(plan.path);
    }
  });

  it('cierra con la respuesta ICMP desde el destino hacia el origen', () => {
    const response = plan.steps[plan.steps.length - 1];
    expect(response.kind).toBe('response');
    expect(response.phase).toBe('Exitoso');
    expect(response.from).toBe('pc-bog-admin-01');
    expect(response.to).toBe('pc-med-admin-01');
    expect(response.frame.icmp?.tipo).toBe('respuesta');
    expect(response.frame.l3?.ttl).toBe(64);
  });

  it('calcula el RTT como el doble de la latencia de ida', () => {
    const latenciaIda = plan.path.reduce((total, nodoId, indice) => {
      if (indice === 0) return total;
      return total + latenciaEnlace(seed, plan.path[indice - 1], nodoId);
    }, 0);

    expect(plan.rttMs).toBe(latenciaIda * 2);
  });
});

describe('buildPingPlan Barranquilla → Bucaramanga', () => {
  const plan = buildPingPlan(seed, 'pc-baq-admin-01', 'pc-buc-admin-01');

  it('pasa por Bogotá y usa al menos dos saltos WAN', () => {
    expect(plan.exito).toBe(true);
    expect(plan.path).toContain('rtr-bog');

    const pasosWan = plan.steps.filter((paso) => paso.kind === 'wan');
    expect(pasosWan.length).toBeGreaterThanOrEqual(2);
    expect(pasosWan.every((paso) => paso.text.includes('Estatica'))).toBe(true);
  });

  it('mantiene todos los saltos adyacentes', () => {
    for (const paso of plan.steps) {
      expect(pasoEsAdyacente(plan, paso), `Paso ${paso.idx} (${paso.kind}) no es adyacente`).toBe(true);
    }
  });
});

describe('TTL dinámico', () => {
  it('decrementa el TTL en cada router procesado y lo restaura en la respuesta', () => {
    const plan = buildPingPlan(seed, 'pc-med-admin-01', 'pc-bog-admin-01');
    const routers = plan.steps.filter((paso) => paso.kind === 'router');

    expect(routers.length).toBeGreaterThan(0);
    expect(routers[0].frame.l3?.ttl).toBe(63);

    const ttls = routers.map((paso) => paso.frame.l3?.ttl);
    for (let i = 0; i < ttls.length; i += 1) {
      expect(ttls[i]).toBeLessThan(64);
      if (i > 0) expect(ttls[i]).toBeLessThanOrEqual(ttls[i - 1]);
    }

    const response = plan.steps[plan.steps.length - 1];
    expect(response.frame.l3?.ttl).toBe(64);
  });
});

describe('fallos y opciones', () => {
  it('falla de forma controlada si un ID no existe', () => {
    const plan = buildPingPlan(seed, 'pc-med-admin-01', 'pc-no-existe');

    expect(plan.exito).toBe(false);
    expect(plan.motivoFallo).toBeTruthy();
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].kind).toBe('fail');
    expect(plan.steps[0].phase).toBe('Descartado');
    expect(plan.rttMs).toBe(0);
  });

  it('falla si el origen o el destino está caído', () => {
    const plan = buildPingPlan(seed, 'pc-med-admin-01', 'pc-bog-admin-01', {
      nodosCaidos: ['pc-bog-admin-01'],
    });

    expect(plan.exito).toBe(false);
    expect(plan.motivoFallo).toBeTruthy();
  });

  it('permite ocultar el paso ARP', () => {
    const plan = buildPingPlan(seed, 'pc-med-admin-01', 'pc-bog-admin-01', { mostrarArp: false });

    expect(plan.exito).toBe(true);
    expect(plan.steps.some((paso) => paso.kind === 'arp')).toBe(false);
  });
});
