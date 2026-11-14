import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import type { NodoRedDto, SedeDto } from '../src/api/types';
import { generateBuildingLayout } from '../src/lib/scene/generateBuildingLayout';
import { SCENE_CONFIG } from '../src/lib/scene/scene.config';
import type {
  ApPlacement,
  BuildingLayout,
  CableRoute,
  HostPlacement,
  Rect,
  SwitchPlacement,
  Vec2,
  Vec3,
  Waypoint,
  WaypointKind,
} from '../src/lib/scene/types';

const TOLERANCIA_M = 0.2;
const TOLERANCIA_PUERTA_WAYPOINT_M = 0.01;
const TOLERANCIA_AREA_RELATIVA = 0.02;
const DISTANCIA_PRIMER_PUNTO_M = 2;
const DISTANCIA_ULTIMO_PUNTO_M = 3;
const EPSILON_GEOMETRICO = 1e-6;

const APS_ESPERADOS: Record<string, number> = {
  bogota: 29,
  medellin: 8,
  cali: 8,
  barranquilla: 5,
  bucaramanga: 4,
};

const rutaSeed = fileURLToPath(new URL('../../backend/data/seed/topologia.json', import.meta.url));
const seed = JSON.parse(readFileSync(rutaSeed, 'utf8')) as {
  sedes: SedeDto[];
  nodos: NodoRedDto[];
};

const opciones = { nodos: seed.nodos };
const layouts = new Map<string, BuildingLayout>();

beforeAll(() => {
  for (const sede of seed.sedes) {
    layouts.set(sede.id, generateBuildingLayout(sede, opciones));
  }
});

function layoutDe(sede: SedeDto): BuildingLayout {
  const layout = layouts.get(sede.id);
  if (!layout) {
    throw new Error(`No se generó layout para la sede ${sede.id}`);
  }
  return layout;
}

function hostsDe(layout: BuildingLayout): HostPlacement[] {
  return layout.pisos.flatMap((piso) => piso.hosts);
}

function apsDe(layout: BuildingLayout): ApPlacement[] {
  return layout.pisos.flatMap((piso) => piso.aps);
}

function switchesDe(layout: BuildingLayout): SwitchPlacement[] {
  return layout.pisos.flatMap((piso) => piso.switches);
}

function cablesDe(layout: BuildingLayout): CableRoute[] {
  return layout.pisos.flatMap((piso) => piso.cables);
}

function centro(rect: Rect): Vec2 {
  return {
    x: rect.x + rect.width / 2,
    z: rect.z + rect.depth / 2,
  };
}

function puntoEnRect(punto: { x: number; z: number }, rect: Rect, tolerancia: number): boolean {
  return (
    punto.x >= rect.x - tolerancia &&
    punto.x <= rect.x + rect.width + tolerancia &&
    punto.z >= rect.z - tolerancia &&
    punto.z <= rect.z + rect.depth + tolerancia
  );
}

function distancia2D(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function distancia3D(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function distanciaAlBorde(punto: Vec2, rect: Rect): number {
  const x1 = rect.x;
  const x2 = rect.x + rect.width;
  const z1 = rect.z;
  const z2 = rect.z + rect.depth;
  const dentroX = punto.x >= x1 && punto.x <= x2;
  const dentroZ = punto.z >= z1 && punto.z <= z2;
  const dx = Math.min(Math.abs(punto.x - x1), Math.abs(punto.x - x2));
  const dz = Math.min(Math.abs(punto.z - z1), Math.abs(punto.z - z2));
  if (dentroX && dentroZ) {
    return Math.min(dx, dz);
  }
  if (dentroX) {
    return dz;
  }
  if (dentroZ) {
    return dx;
  }
  return Math.hypot(dx, dz);
}

function rectContieneCentro(contenedor: Rect, contenido: Rect): boolean {
  const punto = centro(contenido);
  return (
    punto.x > contenedor.x &&
    punto.x < contenedor.x + contenedor.width &&
    punto.z > contenedor.z &&
    punto.z < contenedor.z + contenedor.depth
  );
}

function mismoCentroYTamano(a: Rect, b: Rect): boolean {
  const centroA = centro(a);
  const centroB = centro(b);
  return (
    Math.abs(centroA.x - centroB.x) < EPSILON_GEOMETRICO &&
    Math.abs(centroA.z - centroB.z) < EPSILON_GEOMETRICO &&
    Math.abs(a.width - b.width) < EPSILON_GEOMETRICO &&
    Math.abs(a.depth - b.depth) < EPSILON_GEOMETRICO
  );
}

function esNodoVertical(kind: WaypointKind): boolean {
  return kind === 'escalera' || kind === 'ascensor';
}

function areaInterseccion(a: Rect, b: Rect): number {
  const ancho = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const fondo = Math.max(0, Math.min(a.z + a.depth, b.z + b.depth) - Math.max(a.z, b.z));
  return ancho * fondo;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const objeto = value as Record<string, unknown>;
    const claves = Object.keys(objeto).sort();
    return `{${claves.map((clave) => `${JSON.stringify(clave)}:${stableStringify(objeto[clave])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

describe.each(seed.sedes)('layout de $nombre ($id)', (sede) => {
  it('es determinista con la misma sede y opciones', () => {
    const primera = generateBuildingLayout(sede, opciones);
    const segunda = generateBuildingLayout(sede, opciones);

    expect(stableStringify(primera)).toBe(stableStringify(segunda));
  });

  it('mantiene la escala del área y la altura declaradas', () => {
    const layout = layoutDe(sede);
    const areaPorPiso = sede.areaM2 / sede.pisos;
    const areaHuella = layout.footprint.width * layout.footprint.depth;
    const desviacion = Math.abs(areaHuella - areaPorPiso) / areaPorPiso;

    expect(layout.pisos).toHaveLength(sede.pisos);
    expect(
      desviacion,
      `Huella ${areaHuella.toFixed(2)} m² frente a ${areaPorPiso.toFixed(2)} m² por piso`,
    ).toBeLessThanOrEqual(TOLERANCIA_AREA_RELATIVA);
    expect(layout.alturaTotalM).toBeCloseTo(sede.pisos * SCENE_CONFIG.alturaPisoM, 6);
  });

  it('conserva el inventario completo de hosts con IDs únicos en pisos válidos', () => {
    const layout = layoutDe(sede);
    const hosts = hostsDe(layout);
    const esperados = sede.inventario.reduce((suma, item) => suma + item.cantidadActual, 0);
    const ids = new Set(hosts.map((host) => host.id));
    const pisosValidos = new Set(layout.pisos.map((piso) => piso.piso));
    const fueraDePiso = hosts.filter((host) => !pisosValidos.has(host.piso)).map((host) => host.id);

    expect(hosts).toHaveLength(esperados);
    expect(ids.size, 'Hay IDs de host repetidos').toBe(hosts.length);
    expect(fueraDePiso, 'Hosts ubicados en pisos inexistentes').toEqual([]);
  });

  it('ubica cada host dentro de una sala existente y sin IDs repetidos', () => {
    const layout = layoutDe(sede);
    const problemas: string[] = [];

    for (const piso of layout.pisos) {
      const salas = new Map(piso.rooms.map((sala) => [sala.id, sala]));
      if (salas.size !== piso.rooms.length) {
        problemas.push(`Piso ${piso.piso}: IDs de sala repetidos`);
      }

      for (const host of piso.hosts) {
        const sala = salas.get(host.roomId);
        if (!sala) {
          problemas.push(`Piso ${piso.piso}: host ${host.id} apunta a sala inexistente ${host.roomId}`);
          continue;
        }
        if (sala.piso !== host.piso) {
          problemas.push(`Host ${host.id}: sala ${sala.id} pertenece al piso ${sala.piso}`);
        }
        if (!puntoEnRect(host.position, sala.rect, TOLERANCIA_M)) {
          problemas.push(
            `Host ${host.id}: posición (${host.position.x.toFixed(2)}, ${host.position.z.toFixed(2)}) fuera de la sala ${sala.id}`,
          );
        }
        if (!sala.hostIds.includes(host.id)) {
          problemas.push(`Host ${host.id}: no aparece en hostIds de su sala ${sala.id}`);
        }
      }

      for (const sala of piso.rooms) {
        const vistos = new Set<string>();
        for (const hostId of sala.hostIds) {
          if (vistos.has(hostId)) {
            problemas.push(`Sala ${sala.id}: hostId ${hostId} repetido`);
          }
          vistos.add(hostId);
          const host = piso.hosts.find((candidato) => candidato.id === hostId);
          if (!host) {
            problemas.push(`Sala ${sala.id}: hostId ${hostId} no existe en el piso ${piso.piso}`);
          } else if (host.roomId !== sala.id) {
            problemas.push(`Sala ${sala.id}: host ${hostId} declara la sala ${host.roomId}`);
          }
        }
      }
    }

    expect(problemas).toEqual([]);
  });

  it('genera puertas en el borde de cada sala y conectadas al pasillo', () => {
    const layout = layoutDe(sede);
    const problemas: string[] = [];

    for (const piso of layout.pisos) {
      const salas = new Map(piso.rooms.map((sala) => [sala.id, sala]));
      const puertas = new Map(piso.doors.map((door) => [door.id, door]));
      if (puertas.size !== piso.doors.length) {
        problemas.push(`Piso ${piso.piso}: IDs de puerta repetidos`);
      }

      for (const sala of piso.rooms) {
        if (sala.doorIds.length === 0) {
          problemas.push(`Sala ${sala.id} (piso ${piso.piso}) sin puertas`);
        }
        for (const doorId of sala.doorIds) {
          const door = puertas.get(doorId);
          if (!door) {
            problemas.push(`Sala ${sala.id}: puerta ${doorId} inexistente`);
          } else if (door.roomId !== sala.id) {
            problemas.push(`Sala ${sala.id}: puerta ${doorId} declara la sala ${door.roomId}`);
          }
        }
      }

      for (const door of piso.doors) {
        if (door.piso !== piso.piso) {
          problemas.push(`Puerta ${door.id}: piso ${door.piso} distinto del piso contenedor ${piso.piso}`);
        }
        const sala = salas.get(door.roomId);
        if (!sala) {
          problemas.push(`Puerta ${door.id}: sala ${door.roomId} inexistente`);
        } else if (distanciaAlBorde(door.position, sala.rect) > TOLERANCIA_M) {
          problemas.push(`Puerta ${door.id}: no está sobre el borde de la sala ${sala.id}`);
        }
        if (door.conectaPasillo !== true) {
          problemas.push(`Puerta ${door.id}: conectaPasillo debe ser true`);
        }
      }
    }

    expect(problemas).toEqual([]);
  });

  it('no presenta salas duplicadas ni centros contenidos por otras salas', () => {
    const layout = layoutDe(sede);
    const problemas: string[] = [];

    for (const piso of layout.pisos) {
      for (let i = 0; i < piso.rooms.length; i += 1) {
        for (let j = i + 1; j < piso.rooms.length; j += 1) {
          const salaA = piso.rooms[i];
          const salaB = piso.rooms[j];
          if (mismoCentroYTamano(salaA.rect, salaB.rect)) {
            problemas.push(`Piso ${piso.piso}: salas ${salaA.id} y ${salaB.id} tienen el mismo centro y tamaño`);
          }
          if (rectContieneCentro(salaA.rect, salaB.rect)) {
            problemas.push(`Piso ${piso.piso}: la sala ${salaA.id} contiene el centro de ${salaB.id}`);
          }
          if (rectContieneCentro(salaB.rect, salaA.rect)) {
            problemas.push(`Piso ${piso.piso}: la sala ${salaB.id} contiene el centro de ${salaA.id}`);
          }
        }
      }
    }

    expect(problemas).toEqual([]);
  });

  it('no superpone salas y las mantiene dentro de la huella del edificio', () => {
    const layout = layoutDe(sede);
    const problemas: string[] = [];

    for (const piso of layout.pisos) {
      for (const sala of piso.rooms) {
        if (
          sala.rect.x < layout.footprint.x - EPSILON_GEOMETRICO ||
          sala.rect.z < layout.footprint.z - EPSILON_GEOMETRICO ||
          sala.rect.x + sala.rect.width > layout.footprint.x + layout.footprint.width + EPSILON_GEOMETRICO ||
          sala.rect.z + sala.rect.depth > layout.footprint.z + layout.footprint.depth + EPSILON_GEOMETRICO
        ) {
          problemas.push(`Piso ${piso.piso}: la sala ${sala.id} excede la huella del edificio`);
        }
      }

      for (let i = 0; i < piso.rooms.length; i += 1) {
        for (let j = i + 1; j < piso.rooms.length; j += 1) {
          const area = areaInterseccion(piso.rooms[i].rect, piso.rooms[j].rect);
          if (area > EPSILON_GEOMETRICO) {
            problemas.push(
              `Piso ${piso.piso}: las salas ${piso.rooms[i].id} y ${piso.rooms[j].id} se superponen en ${area.toFixed(3)} m²`,
            );
          }
        }
      }
    }

    expect(problemas).toEqual([]);
  });

  it('distribuye los AP esperados dentro de la huella y entre piso y techo', () => {
    const layout = layoutDe(sede);
    const aps = apsDe(layout);
    const esperados = APS_ESPERADOS[sede.id];
    const ids = new Set(aps.map((ap) => ap.id));
    const pisos = new Map(layout.pisos.map((piso) => [piso.piso, piso]));
    const problemas: string[] = [];

    expect(aps).toHaveLength(esperados);
    expect(ids.size, 'Hay IDs de AP repetidos').toBe(aps.length);
    expect(layout.aps).toHaveLength(esperados);
    expect(layout.aps.map((ap) => ap.id).sort()).toEqual([...ids].sort());

    for (const ap of aps) {
      const piso = pisos.get(ap.piso);
      if (!piso) {
        problemas.push(`AP ${ap.id}: piso ${ap.piso} inexistente`);
        continue;
      }
      if (!puntoEnRect(ap.position, layout.footprint, 0)) {
        problemas.push(`AP ${ap.id}: posición fuera de la huella del edificio`);
      }
      if (ap.position.y < piso.elevacionM || ap.position.y > piso.elevacionM + SCENE_CONFIG.alturaPisoM) {
        problemas.push(
          `AP ${ap.id}: altura ${ap.position.y} fuera del rango [${piso.elevacionM}, ${piso.elevacionM + SCENE_CONFIG.alturaPisoM}]`,
        );
      }
      if (!(ap.radioCoberturaM > 0)) {
        problemas.push(`AP ${ap.id}: radioCoberturaM debe ser mayor que cero`);
      }
      if (ap.estimado !== true) {
        problemas.push(`AP ${ap.id}: estimado debe ser true`);
      }
    }

    expect(problemas).toEqual([]);
    expect(
      layout.warnings.some((warning) => warning.code === 'ap-estimado'),
      'Falta el warning ap-estimado',
    ).toBe(true);
  });

  it('ubica todos los switches del seed en salas de telecomunicaciones', () => {
    const layout = layoutDe(sede);
    const switches = switchesDe(layout);
    const switchesSeed = seed.nodos.filter((nodo) => nodo.sedeId === sede.id && nodo.tipo === 'Switch');
    const idsLayout = new Set(switches.map((sw) => sw.id));
    const faltantes = switchesSeed.filter((nodo) => !idsLayout.has(nodo.id)).map((nodo) => nodo.id);
    const problemas: string[] = [];

    expect(switches.length).toBeGreaterThan(0);
    expect(switchesSeed.length).toBeGreaterThan(0);
    expect(idsLayout.size, 'Hay IDs de switch repetidos').toBe(switches.length);
    expect(faltantes, 'Switches del seed que no llegaron al layout').toEqual([]);
    expect(layout.switches.map((sw) => sw.id).sort()).toEqual([...idsLayout].sort());

    for (const sw of switches) {
      const piso = layout.pisos.find((candidato) => candidato.piso === sw.piso);
      if (!piso) {
        problemas.push(`Switch ${sw.id}: piso ${sw.piso} inexistente`);
        continue;
      }
      const sala = piso.rooms.find((candidato) => candidato.id === sw.roomId);
      if (!sala) {
        problemas.push(`Switch ${sw.id}: sala ${sw.roomId} inexistente`);
        continue;
      }
      if (sala.kind !== 'telecom') {
        problemas.push(`Switch ${sw.id}: sala ${sala.id} es de tipo ${sala.kind}, no telecom`);
      }
      if (!puntoEnRect(sw.position, sala.rect, TOLERANCIA_M)) {
        problemas.push(`Switch ${sw.id}: posición fuera de la sala ${sala.id}`);
      }
    }

    expect(problemas).toEqual([]);
  });

  it('asigna un cable de acceso a cada host cableado y ninguno a los Wi-Fi', () => {
    const layout = layoutDe(sede);
    const hosts = hostsDe(layout);
    const cableados = hosts.filter((host) => host.connection === 'cableado');
    const wifi = hosts.filter((host) => host.connection === 'wifi');
    const cables = cablesDe(layout);
    const acceso = cables.filter((cable) => cable.tipo === 'acceso');
    const cablePorId = new Map(cables.map((cable) => [cable.id, cable]));
    const switchPorId = new Map(switchesDe(layout).map((sw) => [sw.id, sw]));
    const hostPorId = new Map(hosts.map((host) => [host.id, host]));
    const problemas: string[] = [];

    expect(cablePorId.size, 'Hay IDs de cable repetidos').toBe(cables.length);
    expect(acceso, 'Cables de acceso frente a hosts cableados').toHaveLength(cableados.length);

    for (const host of cableados) {
      if (host.cableId === null) {
        problemas.push(`Host cableado ${host.id}: cableId nulo`);
        continue;
      }
      const cable = cablePorId.get(host.cableId);
      if (!cable) {
        problemas.push(`Host cableado ${host.id}: cable ${host.cableId} inexistente`);
        continue;
      }
      if (cable.tipo !== 'acceso') {
        problemas.push(`Host cableado ${host.id}: cable ${cable.id} es de tipo ${cable.tipo}`);
      }
      if (cable.hostId !== host.id) {
        problemas.push(`Host cableado ${host.id}: cable ${cable.id} pertenece a ${cable.hostId}`);
      }
      if (cable.points.length < 2) {
        problemas.push(`Cable ${cable.id}: ruta con ${cable.points.length} puntos`);
        continue;
      }
      const primerPunto = cable.points[0];
      const ultimoPunto = cable.points[cable.points.length - 1];
      const distanciaHost = distancia3D(primerPunto, host.position);
      if (distanciaHost > DISTANCIA_PRIMER_PUNTO_M) {
        problemas.push(`Cable ${cable.id}: primer punto a ${distanciaHost.toFixed(2)} m del host ${host.id}`);
      }
      const sw = switchPorId.get(cable.switchId);
      if (!sw) {
        problemas.push(`Cable ${cable.id}: switch ${cable.switchId} inexistente`);
      } else {
        const distanciaSwitch = distancia3D(ultimoPunto, sw.position);
        if (distanciaSwitch > DISTANCIA_ULTIMO_PUNTO_M) {
          problemas.push(`Cable ${cable.id}: último punto a ${distanciaSwitch.toFixed(2)} m del switch ${sw.id}`);
        }
      }
    }

    for (const host of wifi) {
      if (host.cableId !== null) {
        problemas.push(`Host Wi-Fi ${host.id}: cableId debe ser null y es ${host.cableId}`);
      }
      if (acceso.some((cable) => cable.hostId === host.id)) {
        problemas.push(`Host Wi-Fi ${host.id}: tiene cable de acceso`);
      }
    }

    for (const cable of acceso) {
      const host = hostPorId.get(cable.hostId);
      if (!host) {
        problemas.push(`Cable ${cable.id}: host ${cable.hostId} inexistente`);
      } else if (host.connection !== 'cableado') {
        problemas.push(`Cable ${cable.id}: host ${host.id} no es cableado`);
      }
      if (!switchPorId.has(cable.switchId)) {
        problemas.push(`Cable ${cable.id}: switch ${cable.switchId} inexistente`);
      }
    }

    expect(problemas).toEqual([]);
  });

  it('construye waypoints de pasillo, puertas y conexiones verticales coherentes', () => {
    const layout = layoutDe(sede);
    const problemas: string[] = [];
    const nodosGlobales = new Map<string, Waypoint>();

    for (const piso of layout.pisos) {
      for (const nodo of piso.waypoints.nodes) {
        if (nodosGlobales.has(nodo.id)) {
          problemas.push(`Waypoint ${nodo.id}: ID repetido entre pisos`);
        }
        nodosGlobales.set(nodo.id, nodo);
        if (nodo.piso !== piso.piso) {
          problemas.push(`Waypoint ${nodo.id}: piso ${nodo.piso} distinto del piso contenedor ${piso.piso}`);
        }
      }

      if (!piso.waypoints.nodes.some((nodo) => nodo.kind === 'pasillo')) {
        problemas.push(`Piso ${piso.piso}: sin waypoints de pasillo`);
      }

      const puertas = piso.waypoints.nodes.filter((nodo) => nodo.kind === 'puerta');
      for (const door of piso.doors) {
        const coincide = puertas.some(
          (nodo) => distancia2D(nodo.position, door.position) <= TOLERANCIA_PUERTA_WAYPOINT_M,
        );
        if (!coincide) {
          problemas.push(`Puerta ${door.id}: sin waypoint de tipo puerta en su posición`);
        }
      }
    }

    const aristas = layout.pisos.flatMap((piso) => piso.waypoints.edges);
    for (const arista of aristas) {
      if (!nodosGlobales.has(arista.from)) {
        problemas.push(`Arista ${arista.from} -> ${arista.to}: nodo origen inexistente`);
      }
      if (!nodosGlobales.has(arista.to)) {
        problemas.push(`Arista ${arista.from} -> ${arista.to}: nodo destino inexistente`);
      }
    }

    const pisosOrdenados = [...layout.pisos].sort((a, b) => a.piso - b.piso);
    for (let i = 0; i < pisosOrdenados.length - 1; i += 1) {
      const pisoActual = pisosOrdenados[i].piso;
      const pisoSiguiente = pisosOrdenados[i + 1].piso;
      const existeVertical = aristas.some((arista) => {
        const origen = nodosGlobales.get(arista.from);
        const destino = nodosGlobales.get(arista.to);
        if (!origen || !destino) {
          return false;
        }
        const pisosConectados =
          (origen.piso === pisoActual && destino.piso === pisoSiguiente) ||
          (origen.piso === pisoSiguiente && destino.piso === pisoActual);
        return pisosConectados && esNodoVertical(origen.kind) && esNodoVertical(destino.kind);
      });
      if (!existeVertical) {
        problemas.push(`Sin arista de escalera/ascensor entre el piso ${pisoActual} y el piso ${pisoSiguiente}`);
      }
    }

    expect(problemas).toEqual([]);
  });
});

describe('resumen visible de escala', () => {
  it('muestra sede, pisos, área por piso, hosts, habitaciones, APs y switches', () => {
    const filas = seed.sedes.map((sede) => {
      const layout = layoutDe(sede);
      return {
        sede: sede.nombre,
        id: sede.id,
        pisos: layout.pisos.length,
        areaPorPisoM2: Number((sede.areaM2 / sede.pisos).toFixed(1)),
        huellaM2: Number((layout.footprint.width * layout.footprint.depth).toFixed(1)),
        hosts: hostsDe(layout).length,
        hostsPorPiso: Number((hostsDe(layout).length / layout.pisos.length).toFixed(1)),
        m2PorHost: Number((sede.areaM2 / hostsDe(layout).length).toFixed(2)),
        habitaciones: layout.pisos.reduce((suma, piso) => suma + piso.rooms.length, 0),
        aps: apsDe(layout).length,
        switches: switchesDe(layout).length,
      };
    });

    console.table(filas);

    expect(filas).toHaveLength(seed.sedes.length);
    for (const fila of filas) {
      expect(fila.hosts).toBeGreaterThan(0);
      expect(fila.habitaciones).toBeGreaterThan(0);
      expect(fila.aps).toBeGreaterThan(0);
      expect(fila.switches).toBeGreaterThan(0);
    }
  });
});
