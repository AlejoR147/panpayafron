import { useEffect } from 'react';
import { Activity, Building2, Cable, Network, Waypoints } from 'lucide-react';
import type { TipoEnlace, TipoNodo } from '../api/types';
import { formatDateTime, formatNumber } from '../lib/formatters';
import { useNetworkStore } from '../store/useNetworkStore';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { KpiCard } from '../components/common/KpiCard';
import { LoadingState } from '../components/common/LoadingState';
import { SectionHeader } from '../components/common/SectionHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { TopologyGraph } from '../components/topology/TopologyGraph';

const ETIQUETAS_NODO: Record<TipoNodo, string> = {
  Router: 'Router',
  Switch: 'Switch',
  Pc: 'PC',
  Servidor: 'Servidor',
  Ap: 'Access Point',
  Telefono: 'Teléfono IP',
  Camara: 'Cámara',
  Impresora: 'Impresora',
  Pos: 'POS',
  Nvr: 'NVR',
  Wan: 'WAN',
};

const ETIQUETAS_ENLACE: Record<TipoEnlace, string> = {
  Lan: 'LAN',
  Wan: 'WAN',
  Respaldo: 'Respaldo',
};

export function TopologiaPage() {
  const snapshot = useNetworkStore((state) => state.snapshot);
  const estadoTopologia = useNetworkStore((state) => state.estadoTopologia);
  const errorTopologia = useNetworkStore((state) => state.errorTopologia);
  const cargarTopologia = useNetworkStore((state) => state.cargarTopologia);

  useEffect(() => {
    if (estadoTopologia === 'idle') {
      void cargarTopologia();
    }
  }, [estadoTopologia, cargarTopologia]);

  if (!snapshot) {
    if (estadoTopologia === 'error') {
      return (
        <ErrorState
          mensaje={errorTopologia ?? 'No fue posible consultar la topología de la red.'}
          onReintentar={() => void cargarTopologia()}
        />
      );
    }

    if (estadoTopologia === 'ok') {
      return (
        <EmptyState
          titulo="Sin topología disponible"
          descripcion="La API respondió correctamente pero no devolvió un snapshot de la red."
          icono={Network}
        />
      );
    }

    return <LoadingState mensaje="Cargando la topología nacional..." />;
  }

  const nodosActivos = snapshot.nodos.filter((nodo) => nodo.estado === 'Activo').length;
  const enlacesActivos = snapshot.enlaces.filter((enlace) => enlace.estado === 'Activo').length;
  const nombres = new Map(snapshot.nodos.map((nodo) => [nodo.id, nodo.nombre]));
  const nodosVisibles = snapshot.nodos.slice(0, 8);
  const enlacesVisibles = snapshot.enlaces.slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        eyebrow="Fase 4 · Visualización"
        title="Topología de la red"
        description="Estructura nacional de nodos, enlaces y sedes. El grafo interactivo con React Flow se sincroniza con la ciudad 3D y con la ruta del simulador de ping."
        actions={<StatusBadge tone="neutral">Snapshot {snapshot.version}</StatusBadge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Nodos"
          value={formatNumber(snapshot.nodos.length)}
          hint={`${formatNumber(nodosActivos)} activos`}
          icon={Network}
          tone="amber"
        />
        <KpiCard
          label="Enlaces"
          value={formatNumber(snapshot.enlaces.length)}
          hint={`${formatNumber(enlacesActivos)} activos`}
          icon={Cable}
          tone="sky"
        />
        <KpiCard
          label="Sedes"
          value={formatNumber(snapshot.sedes.length)}
          hint="Bogotá como hub nacional"
          icon={Building2}
          tone="emerald"
        />
        <KpiCard
          label="Hosts con crecimiento"
          value={formatNumber(snapshot.metricas.hostsConCrecimiento)}
          hint="Proyección a tres años con +20 %"
          icon={Activity}
          tone="violet"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-panpaya-500/15 text-panpaya-300 ring-1 ring-panpaya-400/25">
              <Waypoints className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">Grafo interactivo con React Flow</h2>
              <p className="text-xs text-slate-400">
                Lienzo de las tres sedes con enlaces LAN, WAN y de respaldo, sincronizado con la ciudad 3D.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="info" dot>
              Datos del snapshot
            </StatusBadge>
            <span className="text-[11px] text-slate-500">
              Generado el {formatDateTime(snapshot.generadoEn)}
            </span>
          </div>
        </div>

        <div className="p-5">
          <TopologyGraph height={620} vista="wan" />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-base font-semibold text-white">Detalle del snapshot</h2>
          <p className="text-xs text-slate-400">
            Inventario de nodos y enlaces que alimentan el grafo interactivo y la ciudad 3D.
          </p>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Nodos
              </h3>
              <span className="text-[11px] text-slate-500">
                {nodosVisibles.length} de {snapshot.nodos.length}
              </span>
            </div>
            <ul className="mt-3 divide-y divide-white/5">
              {nodosVisibles.map((nodo) => (
                <li key={nodo.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300">
                      <Network className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{nodo.nombre}</p>
                      <p className="truncate text-[11px] text-slate-500">
                        {ETIQUETAS_NODO[nodo.tipo]} · {nodo.ip ?? 'Sin IP'}
                        {nodo.vlanId ? ` · VLAN ${nodo.vlanId}` : ''}
                      </p>
                    </div>
                  </div>
                  <StatusBadge tone={nodo.estado === 'Activo' ? 'ok' : 'danger'} dot>
                    {nodo.estado}
                  </StatusBadge>
                </li>
              ))}
            </ul>
            {snapshot.nodos.length > nodosVisibles.length ? (
              <p className="mt-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-500">
                Se muestran los primeros {nodosVisibles.length} nodos. Usa el grafo superior para explorar los{' '}
                {snapshot.nodos.length} nodos del snapshot.
              </p>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Enlaces
              </h3>
              <span className="text-[11px] text-slate-500">
                {enlacesVisibles.length} de {snapshot.enlaces.length}
              </span>
            </div>
            <ul className="mt-3 divide-y divide-white/5">
              {enlacesVisibles.map((enlace) => (
                <li key={enlace.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm text-slate-200">
                      {nombres.get(enlace.origenId) ?? enlace.origenId}
                      <span className="mx-1.5 text-slate-500">a</span>
                      {nombres.get(enlace.destinoId) ?? enlace.destinoId}
                    </p>
                    <StatusBadge tone={enlace.estado === 'Activo' ? 'ok' : 'danger'} dot>
                      {enlace.estado}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {ETIQUETAS_ENLACE[enlace.tipo]} · {formatNumber(enlace.capacidadMbps)} Mb/s ·
                    métrica RIP {enlace.metricaRip} · {enlace.latenciaMs} ms
                  </p>
                </li>
              ))}
            </ul>
            {snapshot.enlaces.length > enlacesVisibles.length ? (
              <p className="mt-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-500">
                Se muestran los primeros {enlacesVisibles.length} enlaces de {snapshot.enlaces.length}.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
