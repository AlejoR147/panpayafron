import type {
  EnlaceRedDto,
  InventarioItemDto,
  MetricasNacionalesDto,
  NodoRedDto,
  ResumenInventarioDto,
  SaludDto,
  SedeDto,
  TopologiaSnapshotDto,
} from './types';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const TIEMPO_LIMITE_MS = 12_000;

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function solicitar<T>(ruta: string, signal?: AbortSignal): Promise<T> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);
  const alAbortar = () => control.abort();

  if (signal) {
    if (signal.aborted) {
      control.abort();
    } else {
      signal.addEventListener('abort', alAbortar, { once: true });
    }
  }

  try {
    const respuesta = await fetch(`${API_BASE}${ruta}`, {
      headers: { Accept: 'application/json' },
      signal: control.signal,
    });

    if (!respuesta.ok) {
      let mensaje = `La API respondió con estado ${respuesta.status}.`;
      try {
        const cuerpo = (await respuesta.json()) as { detail?: string; title?: string };
        mensaje = cuerpo.detail ?? cuerpo.title ?? mensaje;
      } catch {
        // El cuerpo de error no siempre es JSON.
      }

      throw new ApiError(mensaje, respuesta.status);
    }

    return (await respuesta.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('La API tardó demasiado en responder.', 0);
    }

    if (error instanceof TypeError) {
      throw new ApiError('No se pudo conectar con la API.', 0);
    }

    throw error;
  } finally {
    clearTimeout(temporizador);
    signal?.removeEventListener('abort', alAbortar);
  }
}

export const api = {
  getSalud: (signal?: AbortSignal) => solicitar<SaludDto>('/api/salud', signal),
  getMetricas: (signal?: AbortSignal) =>
    solicitar<MetricasNacionalesDto>('/api/topologia/metricas', signal),
  getTopologia: (signal?: AbortSignal) =>
    solicitar<TopologiaSnapshotDto>('/api/topologia', signal),
  getNodos: (signal?: AbortSignal) => solicitar<NodoRedDto[]>('/api/topologia/nodos', signal),
  getEnlaces: (signal?: AbortSignal) =>
    solicitar<EnlaceRedDto[]>('/api/topologia/enlaces', signal),
  getSedes: (signal?: AbortSignal) => solicitar<SedeDto[]>('/api/sedes', signal),
  getSede: (sedeId: string, signal?: AbortSignal) =>
    solicitar<SedeDto>(`/api/sedes/${sedeId}`, signal),
  getInventario: (signal?: AbortSignal) =>
    solicitar<ResumenInventarioDto[]>('/api/inventario', signal),
  getInventarioSede: (sedeId: string, signal?: AbortSignal) =>
    solicitar<InventarioItemDto[]>(`/api/inventario/${sedeId}`, signal),
};
