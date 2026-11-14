import type { EnlaceRedDto, NodoRedDto, TopologiaSnapshotDto } from '../../api/types';
import type { PingFrame, PingOptions, PingPlan, PingStep, PingStepKind } from './types';

const TTL_INICIAL = 64;

interface RutaActiva {
  nodos: Map<string, NodoRedDto>;
  enlaces: EnlaceRedDto[];
}

function construirRed(snapshot: TopologiaSnapshotDto, options: PingOptions): RutaActiva {
  const nodos = new Map(
    snapshot.nodos
      .filter((nodo) => !options.nodosCaidos?.includes(nodo.id))
      .map((nodo) => [nodo.id, nodo]),
  );
  const enlaces = snapshot.enlaces.filter(
    (enlace) =>
      enlace.estado === 'Activo' &&
      !options.enlacesCaidos?.includes(enlace.id) &&
      nodos.has(enlace.origenId) &&
      nodos.has(enlace.destinoId),
  );
  return { nodos, enlaces };
}

function calcularRuta(red: RutaActiva, origenId: string, destinoId: string): string[] | null {
  const distancias = new Map<string, number>();
  const anteriores = new Map<string, string>();
  const pendientes = new Set<string>();

  distancias.set(origenId, 0);
  pendientes.add(origenId);

  while (pendientes.size > 0) {
    let actual: string | null = null;
    let mejorDistancia = Number.POSITIVE_INFINITY;
    for (const nodoId of pendientes) {
      const distancia = distancias.get(nodoId) ?? Number.POSITIVE_INFINITY;
      if (distancia < mejorDistancia) {
        mejorDistancia = distancia;
        actual = nodoId;
      }
    }
    if (actual === null) break;
    pendientes.delete(actual);

    if (actual === destinoId) break;

    const vecinos = red.enlaces.filter(
      (enlace) => enlace.origenId === actual || enlace.destinoId === actual,
    );
    for (const enlace of vecinos) {
      const vecino = enlace.origenId === actual ? enlace.destinoId : enlace.origenId;
      const distancia = (distancias.get(actual) ?? Number.POSITIVE_INFINITY) + enlace.metricaRip;
      if (distancia < (distancias.get(vecino) ?? Number.POSITIVE_INFINITY)) {
        distancias.set(vecino, distancia);
        anteriores.set(vecino, actual);
        pendientes.add(vecino);
      }
    }
  }

  if (!distancias.has(destinoId)) return null;

  const ruta: string[] = [destinoId];
  let actual = destinoId;
  while (actual !== origenId) {
    const anterior = anteriores.get(actual);
    if (!anterior) return null;
    ruta.unshift(anterior);
    actual = anterior;
  }
  return ruta;
}

function buscarEnlace(red: RutaActiva, desde: string, hasta: string): EnlaceRedDto | null {
  return (
    red.enlaces.find(
      (enlace) =>
        (enlace.origenId === desde && enlace.destinoId === hasta) ||
        (enlace.origenId === hasta && enlace.destinoId === desde),
    ) ?? null
  );
}

function latenciaEntre(red: RutaActiva, desde: string, hasta: string): number {
  return buscarEnlace(red, desde, hasta)?.latenciaMs ?? 1;
}

function nombreDe(red: RutaActiva, nodoId: string): string {
  return red.nodos.get(nodoId)?.nombre ?? nodoId;
}

function macDeDestino(red: RutaActiva, nodoId: string | null): string {
  if (!nodoId) return 'MAC del siguiente salto';
  const nodo = red.nodos.get(nodoId);
  if (nodo?.mac) return nodo.mac;
  if (nodo?.tipo === 'Router') return 'MAC del gateway';
  return 'MAC del siguiente salto';
}

function macParaPaso(
  kind: PingStepKind,
  red: RutaActiva,
  hastaId: string,
  macGateway: string,
  macDestino: string,
): string {
  if (kind === 'wan' || kind === 'router') return macDeDestino(red, hastaId);
  if (kind === 'switch') return macGateway;
  if (kind === 'delivery') return macDestino;
  return macDeDestino(red, hastaId);
}

function protocoloDe(enlace: EnlaceRedDto | null): 'RipV2' | 'Estatica' {
  return enlace?.protocoloRouting === 'Estatica' ? 'Estatica' : 'RipV2';
}

function kindDeArista(desde: NodoRedDto | undefined, hasta: NodoRedDto | undefined): PingStepKind {
  if (!desde || !hasta) return 'delivery';
  if (desde.tipo === 'Router' && hasta.tipo === 'Router') return 'wan';
  if (hasta.tipo === 'Router') return 'router';
  if (desde.tipo === 'Router') return 'delivery';
  if (hasta.tipo === 'Switch') return 'switch';
  if (desde.tipo === 'Switch') return 'delivery';
  return 'delivery';
}

function falloPlan(
  snapshot: TopologiaSnapshotDto,
  originId: string,
  destId: string,
  motivo: string,
  rutaParcial: string[] = [],
): PingPlan {
  const origen = snapshot.nodos.find((nodo) => nodo.id === originId);
  const destino = snapshot.nodos.find((nodo) => nodo.id === destId);
  const step: PingStep = {
    idx: 1,
    phase: 'Descartado',
    kind: 'fail',
    title: 'Sin conexión',
    text: motivo,
    from: originId,
    to: null,
    path: rutaParcial.length > 0 ? rutaParcial : [originId],
    flood: null,
    focus: [originId],
    frame: {
      l2: {
        macOrigen: origen?.mac ?? 'No disponible',
        macDestino: destino?.mac ?? 'No disponible',
      },
      l3: {
        ipOrigen: origen?.ip ?? 'No disponible',
        ipDestino: destino?.ip ?? 'No disponible',
        ttl: TTL_INICIAL,
      },
      vlan: origen?.vlanId ?? null,
    },
    effects: [],
    ms: 0,
  };
  return {
    originId,
    destId,
    steps: [step],
    path: step.path,
    rttMs: 0,
    exito: false,
    motivoFallo: motivo,
  };
}

export function buildPingPlan(
  snapshot: TopologiaSnapshotDto,
  originId: string,
  destId: string,
  options: PingOptions = {},
): PingPlan {
  const origen = snapshot.nodos.find((nodo) => nodo.id === originId);
  const destino = snapshot.nodos.find((nodo) => nodo.id === destId);

  if (!origen || !destino) {
    return falloPlan(snapshot, originId, destId, 'El origen o el destino no existen en la topología.');
  }
  if (origen.id === destino.id) {
    return falloPlan(snapshot, originId, destId, 'El origen y el destino son el mismo equipo.');
  }
  if (options.nodosCaidos?.includes(origen.id) || options.nodosCaidos?.includes(destino.id)) {
    return falloPlan(snapshot, originId, destId, 'El origen o el destino está apagado o fuera de servicio.');
  }

  const red = construirRed(snapshot, options);
  const ruta = calcularRuta(red, originId, destId);
  if (!ruta) {
    return falloPlan(
      snapshot,
      originId,
      destId,
      'No hay una ruta activa entre el origen y el destino. Revisa los enlaces caídos o bloqueados.',
    );
  }

  const mismoSede = origen.sedeId === destino.sedeId;
  const mismaVlan = origen.vlanId !== null && origen.vlanId === destino.vlanId;
  const gateway =
    origen.gateway ??
    snapshot.sedes
      .find((sede) => sede.id === origen.sedeId)
      ?.vlans.find((vlan) => vlan.numero === origen.vlanId)?.gateway ??
    'Gateway de la VLAN';

  const macOrigen = origen.mac ?? 'No disponible';
  const macDestino = destino.mac ?? 'No disponible';
  const routerOrigenId = ruta.find((nodoId) => red.nodos.get(nodoId)?.tipo === 'Router') ?? null;
  const macGateway = routerOrigenId
    ? (red.nodos.get(routerOrigenId)?.mac ?? 'MAC del gateway')
    : macDestino;
  const ipOrigen = origen.ip ?? 'No disponible';
  const ipDestino = destino.ip ?? 'No disponible';
  const vlanOrigen = origen.vlanId;
  const vlanDestino = destino.vlanId;
  const nombreOrigen = origen.nombre;
  const nombreDestino = destino.nombre;

  const steps: PingStep[] = [];
  let indice = 1;
  let ttl = TTL_INICIAL;

  const agregar = (
    kind: PingStepKind,
    title: string,
    text: string,
    from: string | null,
    to: string | null,
    focus: string[],
    frame: PingFrame,
    effects: string[],
    ms: number,
    phase: PingStep['phase'] = 'Procesando',
  ) => {
    steps.push({
      idx: indice++,
      phase,
      kind,
      title,
      text,
      from,
      to,
      path: ruta,
      flood: null,
      focus,
      frame,
      effects,
      ms,
    });
  };

  const frameSolicitud = (macDestino: string, vlan: number | null, ttlValor: number): PingFrame => ({
    l2: { macOrigen, macDestino },
    l3: { ipOrigen, ipDestino, ttl: ttlValor },
    vlan,
  });

  agregar(
    'decision',
    'Decisión en el host',
    mismaVlan && mismoSede
      ? 'El destino está en la misma VLAN y la misma sede: el paquete sale directo por el switch.'
      : 'El destino está en otra VLAN o en otra sede: el paquete debe salir por el gateway.',
    originId,
    originId,
    [originId],
    frameSolicitud(mismaVlan && mismoSede ? macDestino : macGateway, vlanOrigen, ttl),
    [],
    0,
  );

  if (options.mostrarArp !== false) {
    const clientesMismaVlan = snapshot.nodos
      .filter(
        (nodo) =>
          nodo.id !== originId &&
          nodo.sedeId === origen.sedeId &&
          nodo.vlanId === origen.vlanId,
      )
      .map((nodo) => nodo.id);
    const flood = [originId, ...clientesMismaVlan].map((nodoId) => [originId, nodoId]);
    const ipObjetivoArp = mismaVlan && mismoSede ? ipDestino : gateway;
    agregar(
      'arp',
      'Resolución ARP',
      mismaVlan && mismoSede
        ? `El host consulta la MAC de ${nombreDestino} (${ipObjetivoArp}) mediante una solicitud ARP por difusión en la VLAN ${vlanOrigen ?? 'desconocida'}.`
        : `El host consulta la MAC del gateway ${ipObjetivoArp} mediante una solicitud ARP por difusión en la VLAN ${vlanOrigen ?? 'desconocida'}.`,
      originId,
      originId,
      [originId],
      {
        l2: { macOrigen, macDestino: 'ff:ff:ff:ff:ff:ff' },
        l3: { ipOrigen, ipDestino, ttl },
        vlan: vlanOrigen,
        arp: { operacion: 'solicitud', ipObjetivo: ipObjetivoArp },
      },
      [`Solicitud ARP por difusión → ${ipObjetivoArp}`],
      1,
    );
    steps[steps.length - 1].flood = flood;
  }

  for (let i = 0; i < ruta.length - 1; i += 1) {
    const desdeId = ruta[i];
    const hastaId = ruta[i + 1];
    const desde = red.nodos.get(desdeId);
    const hasta = red.nodos.get(hastaId);
    const enlace = buscarEnlace(red, desdeId, hastaId);
    const kind = kindDeArista(desde, hasta);
    const nombreDesde = nombreDe(red, desdeId);
    const nombreHasta = nombreDe(red, hastaId);
    const latencia = latenciaEntre(red, desdeId, hastaId);

    if (kind === 'router') {
      ttl = Math.max(0, ttl - 1);
      agregar(
        'router',
        'Enrutamiento en el router',
        `El router ${nombreHasta} recibe la trama, decrementa el TTL a ${ttl} y consulta su tabla de enrutamiento hacia ${nombreDestino}.`,
        desdeId,
        hastaId,
        [desdeId, hastaId],
        frameSolicitud(macParaPaso(kind, red, hastaId, macGateway, macDestino), vlanOrigen, ttl),
        [`TTL decrementado a ${ttl}`, `Ruta hacia ${nombreDestino}`],
        latencia,
      );
      continue;
    }

    if (kind === 'wan') {
      const protocolo = protocoloDe(enlace);
      agregar(
        'wan',
        'Tránsito por la WAN',
        `El paquete cruza el enlace WAN (${protocolo}) de ${enlace?.capacidadMbps ?? '—'} Mb/s hacia ${nombreHasta}.`,
        desdeId,
        hastaId,
        [desdeId, hastaId],
        frameSolicitud(macParaPaso(kind, red, hastaId, macGateway, macDestino), vlanOrigen, ttl),
        [
          `WAN: ${enlace?.capacidadMbps ?? '—'} Mb/s · ${enlace?.latenciaMs ?? '—'} ms · ${protocolo}`,
        ],
        latencia,
      );
      ttl = Math.max(0, ttl - 1);
      agregar(
        'router',
        'Enrutamiento en el router',
        `El router ${nombreHasta} recibe la trama por WAN, decrementa el TTL a ${ttl} y busca la ruta hacia ${nombreDestino}.`,
        hastaId,
        hastaId,
        [hastaId],
        frameSolicitud(macParaPaso(kind, red, hastaId, macGateway, macDestino), vlanOrigen, ttl),
        [`TTL decrementado a ${ttl}`, `${protocolo}: ruta hacia ${nombreDestino}`],
        0,
      );
      continue;
    }

    if (kind === 'switch') {
      agregar(
        'switch',
        'Conmutación en el switch',
        desde?.tipo === 'Switch'
          ? `La trama atraviesa el switch ${nombreHasta} por el troncal y se reenvía por el puerto de salida.`
          : `La trama del host ${nombreDesde} llega al switch ${nombreHasta} y se reenvía por el puerto de salida.`,
        desdeId,
        hastaId,
        [desdeId, hastaId],
        frameSolicitud(macParaPaso(kind, red, hastaId, macGateway, macDestino), vlanOrigen, ttl),
        [`MAC de ${nombreDesde} aprendida en ${nombreHasta}`],
        latencia,
      );
      continue;
    }

    agregar(
      'delivery',
      'Entrega de la trama',
      desde?.tipo === 'Switch'
        ? `El switch ${nombreDesde} entrega la trama al equipo ${nombreHasta}.`
        : `El router ${nombreDesde} entrega la trama al switch ${nombreHasta} por la interfaz de la VLAN ${vlanDestino ?? 'desconocida'}.`,
      desdeId,
      hastaId,
      [desdeId, hastaId],
      frameSolicitud(macParaPaso(kind, red, hastaId, macGateway, macDestino), vlanDestino, ttl),
      [`MAC de ${nombreHasta} entregada en ${nombreDesde}`],
      latencia,
    );
  }

  const ultimoPaso = steps[steps.length - 1];
  agregar(
    'response',
    'Respuesta del destino',
    'El destino responde con un Echo Reply y el ping se completa.',
    destino.id,
    originId,
    [destino.id, originId],
    {
      l2: { macOrigen: macDestino, macDestino: macOrigen },
      l3: { ipOrigen: ipDestino, ipDestino: ipOrigen, ttl: TTL_INICIAL },
      vlan: vlanDestino,
      icmp: { tipo: 'respuesta' },
    },
    [`Echo Reply de ${nombreDestino} → ${nombreOrigen}`],
    Math.max(1, ultimoPaso?.ms ?? 1),
    'Exitoso',
  );

  const rttMs = Math.max(
    1,
    ruta.reduce((total, nodoId, indice) => {
      if (indice === 0) return total;
      return total + latenciaEntre(red, ruta[indice - 1], nodoId);
    }, 0) * 2,
  );

  return {
    originId,
    destId,
    steps,
    path: ruta,
    rttMs,
    exito: true,
  };
}
