import * as signalR from '@microsoft/signalr';
import { usePacketStore } from '../store/usePacketStore';

/**
 * Contrato SignalR con el hub de backend `SimulacionHub` (C# / ASP.NET Core).
 *
 * Eventos que el servidor invoca sobre el canal del cliente (definidos en `ISimulacionClient`):
 * - `SimulacionIniciada`: se crea la simulacion (`SimulacionIniciadaEvento`).
 * - `PasoSimulacion`: el paquete avanza a un nuevo salto (`PasoSimulacion`).
 * - `RutaRecalculada`: la ruta cambio por caida de enlace (`RutaRecalculadaEvento`).
 * - `EstadoEnlaceCambiado`: enlace caido/restaurado (`EnlaceEstadoEvento`).
 * - `SimulacionFinalizada`: el flujo termino con exito o no (`SimulacionFinalizadaEvento`).
 * - `ErrorSimulacion`: fallo durante la simulacion (`ErrorSimulacionEvento`).
 * - `EstadoSimulacion`: estado consultado por el cliente (`EstadoSimulacionEvento`).
 *
 * Metodos del hub aceptados desde el cliente:
 * - `IniciarSimulacion(SolicitudSimulacion)`
 * - `PausarSimulacion`, `ReanudarSimulacion`, `CancelarSimulacion`, `SolicitarEstado`
 * - `SimularCaidaEnlace`, `RestaurarEnlace`
 */

export interface MetricasPaso {
  costoAcumulado: number;
  saltos: number;
}

export interface PaqueteSimulacion {
  id: string;
  simulacionId: string;
  tipo: string;
  origenId: string;
  destinoId: string;
  ipOrigen: string;
  ipDestino: string;
  macOrigen: string | null;
  macDestino: string | null;
  ttlInicial: number;
  tamanoBytes: number;
  estado: string;
  pasoActual: number;
}

export interface PasoSimulacion {
  paqueteId: string;
  simulacionId: string;
  secuencia: number;
  numeroPaso: number;
  totalPasos: number;
  nodoActual: string;
  siguienteSalto: string;
  estado: string;
  tipoEvento: string;
  explicacionDidactica: string;
  detalleTecnico?: string | null;
  duracionMs?: number;
  rutaRestante?: string[] | null;
  metricas?: MetricasPaso | null;
}

export interface SolicitudSimulacion {
  origenId: string;
  destinoId: string;
  tipo?: string;
  incluirArp?: boolean;
  simularRespuesta?: boolean;
  velocidad?: number;
}

export interface SimulacionIniciadaEvento {
  simulacionId: string;
  paquete: PaqueteSimulacion;
  rutaCompleta: string[];
  pasosTotales: number;
  mensaje: string;
}

export interface RutaRecalculadaEvento {
  simulacionId: string;
  motivo: string;
  rutaAnterior: string[];
  rutaNueva: string[];
  costoAnterior: number;
  costoNuevo: number;
  explicacionDidactica: string;
}

export interface EnlaceEstadoEvento {
  enlaceId: string;
  origenId: string;
  destinoId: string;
  estado: string;
  explicacionDidactica: string;
}

export interface SimulacionFinalizadaEvento {
  simulacionId: string;
  paqueteId: string;
  exito: boolean;
  resumen: string;
  duracionTotalMs: number;
  motivo?: string | null;
}

export interface ErrorSimulacionEvento {
  simulacionId: string | null;
  codigo: string;
  mensaje: string;
  explicacionDidactica?: string | null;
}

export interface EstadoSimulacionEvento {
  simulacionId: string;
  paquete: PaqueteSimulacion;
  pasoActual: PasoSimulacion | null;
  historial: PasoSimulacion[];
  enlaces: EnlaceEstadoEvento[];
  finalizada: boolean;
}

let hubConnection: signalR.HubConnection | null = null;

export async function conectarSignalR(callback: (paso: PasoSimulacion) => void) {
  if (hubConnection) {
    return hubConnection;
  }

  const apiUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const hubUrl = apiUrl + '/hubs/simulacion';

  const hub = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      skipNegotiation: true,
      transport: signalR.HttpTransportType.WebSockets,
    })
    .withAutomaticReconnect()
    .build();

  hub.on('SimulacionIniciada', (evento: SimulacionIniciadaEvento) => {
    console.debug('SimulacionIniciada', evento.simulacionId);
  });

  hub.on('PasoSimulacion', (paso: PasoSimulacion) => {
    callback(paso);
  });

  hub.on('RutaRecalculada', (evento: RutaRecalculadaEvento) => {
    console.debug('RutaRecalculada', evento.simulacionId, evento.motivo);
  });

  hub.on('EstadoEnlaceCambiado', (evento: EnlaceEstadoEvento) => {
    console.debug('EstadoEnlaceCambiado', evento.enlaceId, evento.estado);
  });

  hub.on('SimulacionFinalizada', (evento: SimulacionFinalizadaEvento) => {
    console.debug('SimulacionFinalizada', evento.simulacionId, evento.exito, evento.resumen);
    setTimeout(() => {
      usePacketStore.getState().completeSimulation();
    }, 1000);
  });

  hub.on('ErrorSimulacion', (evento: ErrorSimulacionEvento) => {
    console.warn('ErrorSimulacion', evento.codigo, evento.mensaje);
  });

  hub.on('EstadoSimulacion', (evento: EstadoSimulacionEvento) => {
    console.debug('EstadoSimulacion', evento.simulacionId, evento.finalizada);
  });

  hubConnection = hub;

  await hub.start()
    .then(() => {
      console.log('SignalR conectado:', hubConnection?.connectionId);
    })
    .catch((err) => {
      console.warn('SignalR no disponible (modo simulacion local):', err);
      hubConnection = null;
    });

  return hub;
}

export function desconectarSignalR() {
  if (hubConnection) {
    hubConnection.stop().catch(() => {});
    hubConnection = null;
  }
}

export function enviarSimulacion(origenId: string, destinoId: string) {
  if (!hubConnection) {
    return Promise.reject(new Error('SignalR no conectado'));
  }

  const solicitud: SolicitudSimulacion = {
    origenId,
    destinoId,
    tipo: 'Icmp',
    incluirArp: true,
    simularRespuesta: true,
    velocidad: 1,
  };

  return hubConnection.send('IniciarSimulacion', solicitud);
}
