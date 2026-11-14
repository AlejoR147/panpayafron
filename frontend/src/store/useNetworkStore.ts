import { create } from 'zustand';
import { api } from '../api/client';
import type {
  MetricasNacionalesDto,
  ResumenInventarioDto,
  SedeDto,
  TopologiaSnapshotDto,
} from '../api/types';

export type EstadoCarga = 'idle' | 'cargando' | 'ok' | 'error';

interface NetworkState {
  metricas: MetricasNacionalesDto | null;
  sedes: SedeDto[];
  snapshot: TopologiaSnapshotDto | null;
  inventarioResumen: ResumenInventarioDto[];
  estadoDashboard: EstadoCarga;
  errorDashboard: string | null;
  estadoInventario: EstadoCarga;
  errorInventario: string | null;
  estadoTopologia: EstadoCarga;
  errorTopologia: string | null;
  ultimaActualizacion: string | null;
  cargarDashboard: () => Promise<void>;
  cargarInventario: () => Promise<void>;
  cargarTopologia: () => Promise<void>;
  refrescarTodo: () => Promise<void>;
}

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : 'No fue posible consultar la API.';
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  metricas: null,
  sedes: [],
  snapshot: null,
  inventarioResumen: [],
  estadoDashboard: 'idle',
  errorDashboard: null,
  estadoInventario: 'idle',
  errorInventario: null,
  estadoTopologia: 'idle',
  errorTopologia: null,
  ultimaActualizacion: null,

  cargarDashboard: async () => {
    if (get().estadoDashboard === 'cargando') {
      return;
    }

    set({
      estadoDashboard: 'cargando',
      errorDashboard: null,
    });

    try {
      const [metricas, sedes] = await Promise.all([api.getMetricas(), api.getSedes()]);
      set({
        metricas,
        sedes,
        estadoDashboard: 'ok',
        ultimaActualizacion: new Date().toISOString(),
      });
    } catch (error) {
      const mensaje = mensajeDeError(error);
      set({
        estadoDashboard: 'error',
        errorDashboard: mensaje,
      });
    }
  },

  cargarInventario: async () => {
    if (get().estadoInventario === 'cargando') {
      return;
    }

    set({
      estadoInventario: 'cargando',
      errorInventario: null,
    });

    try {
      const [inventarioResumen, sedes] = await Promise.all([api.getInventario(), api.getSedes()]);
      set({
        inventarioResumen,
        sedes,
        estadoInventario: 'ok',
        ultimaActualizacion: new Date().toISOString(),
      });
    } catch (error) {
      const mensaje = mensajeDeError(error);
      set({
        estadoInventario: 'error',
        errorInventario: mensaje,
      });
    }
  },

  cargarTopologia: async () => {
    if (get().estadoTopologia === 'cargando') {
      return;
    }

    set({
      estadoTopologia: 'cargando',
      errorTopologia: null,
    });

    try {
      const snapshot = await api.getTopologia();
      set({
        snapshot,
        metricas: snapshot.metricas,
        sedes: snapshot.sedes,
        estadoTopologia: 'ok',
        ultimaActualizacion: new Date().toISOString(),
      });
    } catch (error) {
      const mensaje = mensajeDeError(error);
      set({
        estadoTopologia: 'error',
        errorTopologia: mensaje,
      });
    }
  },

  refrescarTodo: async () => {
    if (
      [get().estadoDashboard, get().estadoInventario, get().estadoTopologia].includes('cargando')
    ) {
      return;
    }

    set({
      estadoDashboard: 'cargando',
      errorDashboard: null,
      estadoInventario: 'cargando',
      errorInventario: null,
      estadoTopologia: 'cargando',
      errorTopologia: null,
    });

    try {
      const [metricas, sedes, inventarioResumen, snapshot] = await Promise.all([
        api.getMetricas(),
        api.getSedes(),
        api.getInventario(),
        api.getTopologia(),
      ]);

      set({
        metricas,
        sedes,
        inventarioResumen,
        snapshot,
        estadoDashboard: 'ok',
        estadoInventario: 'ok',
        estadoTopologia: 'ok',
        ultimaActualizacion: new Date().toISOString(),
      });
    } catch (error) {
      const mensaje = mensajeDeError(error);
      set({
        estadoDashboard: 'error',
        errorDashboard: mensaje,
        estadoInventario: 'error',
        errorInventario: mensaje,
        estadoTopologia: 'error',
        errorTopologia: mensaje,
      });
    }
  },
}));

