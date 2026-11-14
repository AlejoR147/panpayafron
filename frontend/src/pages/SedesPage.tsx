import { useEffect, useMemo } from 'react';
import { Building2, MapPin, RefreshCw, TrendingUp, Users } from 'lucide-react';
import type { MetricasSedeDto } from '../api/types';
import { useNetworkStore } from '../store/useNetworkStore';
import { formatArea, formatNumber } from '../lib/formatters';
import { SectionHeader } from '../components/common/SectionHeader';
import { KpiCard } from '../components/common/KpiCard';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { SedeCard } from '../components/sedes/SedeCard';

export function SedesPage() {
  const sedes = useNetworkStore((state) => state.sedes);
  const metricas = useNetworkStore((state) => state.metricas);
  const estadoDashboard = useNetworkStore((state) => state.estadoDashboard);
  const errorDashboard = useNetworkStore((state) => state.errorDashboard);
  const cargarDashboard = useNetworkStore((state) => state.cargarDashboard);

  useEffect(() => {
    if (estadoDashboard === 'idle') {
      void cargarDashboard();
    }
  }, [estadoDashboard, cargarDashboard]);

  const metricasPorSede = useMemo(() => {
    const mapa = new Map<string, MetricasSedeDto>();

    for (const metrica of metricas?.porSede ?? []) {
      mapa.set(metrica.sedeId, metrica);
    }

    return mapa;
  }, [metricas]);

  if (sedes.length === 0) {
    if (estadoDashboard === 'error') {
      return (
        <ErrorState
          mensaje={errorDashboard ?? 'No fue posible cargar las sedes.'}
          onReintentar={() => void cargarDashboard()}
        />
      );
    }

    if (estadoDashboard === 'ok') {
      return (
        <EmptyState
          titulo="Sin sedes registradas"
          descripcion="La API respondió correctamente pero no devolvió sedes habilitadas."
          icono={Building2}
        />
      );
    }

    return <LoadingState mensaje="Cargando sedes..." />;
  }

  const sedesActivas = metricas?.sedesActivas ?? sedes.filter((sede) => sede.habilitada).length;
  const areaTotal = sedes.reduce((total, sede) => total + sede.areaM2, 0);
  const nombresSedes = sedes.map((sede) => sede.nombre).join(', ');
  const hostsActuales =
    metricas?.hostsActuales ?? sedes.reduce((total, sede) => total + sede.totalHostsActuales, 0);
  const hostsCrecimiento =
    metricas?.hostsConCrecimiento ??
    sedes.reduce((total, sede) => total + sede.totalHostsConCrecimiento, 0);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        eyebrow="SEDES"
        title="Presencia nacional"
        description={nombresSedes || 'Presencia nacional de la red'}
        actions={
          <button
            type="button"
            onClick={() => void cargarDashboard()}
            disabled={estadoDashboard === 'cargando'}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:border-amber-400/50 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${estadoDashboard === 'cargando' ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Actualizar
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Sedes activas"
          value={formatNumber(sedesActivas)}
          hint={`${sedes.length} sedes registradas`}
          icon={Building2}
          tone="emerald"
        />
        <KpiCard
          label="Área total"
          value={formatArea(areaTotal)}
          hint="Suma de las sedes"
          icon={MapPin}
          tone="sky"
        />
        <KpiCard
          label="Hosts actuales"
          value={formatNumber(hostsActuales)}
          hint="Inventario vigente"
          icon={Users}
          tone="amber"
        />
        <KpiCard
          label="Hosts con crecimiento"
          value={formatNumber(hostsCrecimiento)}
          hint="Proyección a 3 años (+20%)"
          icon={TrendingUp}
          tone="violet"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {sedes.map((sede) => (
          <SedeCard key={sede.id} sede={sede} metrica={metricasPorSede.get(sede.id)} />
        ))}
      </div>
    </div>
  );
}

export default SedesPage;
