import { useEffect } from 'react';
import {
  Building2,
  Cable,
  Network,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useNetworkStore } from '../store/useNetworkStore';
import { formatDateTime, formatNumber } from '../lib/formatters';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { KpiCard } from '../components/common/KpiCard';
import { LoadingState } from '../components/common/LoadingState';
import { SectionHeader } from '../components/common/SectionHeader';
import { InventoryDistribution } from '../components/dashboard/InventoryDistribution';
import { QuickActions } from '../components/dashboard/QuickActions';
import { SedeSummaryCard } from '../components/dashboard/SedeSummaryCard';
import { WarningsPanel } from '../components/dashboard/WarningsPanel';

export function DashboardPage() {
  const metricas = useNetworkStore((state) => state.metricas);
  const sedes = useNetworkStore((state) => state.sedes);
  const estadoDashboard = useNetworkStore((state) => state.estadoDashboard);
  const errorDashboard = useNetworkStore((state) => state.errorDashboard);
  const ultimaActualizacion = useNetworkStore((state) => state.ultimaActualizacion);
  const cargarDashboard = useNetworkStore((state) => state.cargarDashboard);

  useEffect(() => {
    if (estadoDashboard === 'idle') {
      void cargarDashboard();
    }
  }, [estadoDashboard, cargarDashboard]);

  if (!metricas) {
    if (estadoDashboard === 'error') {
      return (
        <ErrorState
          mensaje={errorDashboard ?? 'No fue posible cargar las métricas de la red.'}
          onReintentar={() => void cargarDashboard()}
        />
      );
    }

    return <LoadingState mensaje="Consultando la red nacional..." />;
  }

  const metricaPorSede = new Map(metricas.porSede.map((metrica) => [metrica.sedeId, metrica]));
  const actualizando = estadoDashboard === 'cargando';
  const nombresSedes = sedes.map((sede) => sede.nombre).join(', ');

  return (
    <div className="flex flex-col gap-10">
      <SectionHeader
        eyebrow="PANORAMA NACIONAL"
        title="Panel de control de la red"
        description={`${nombresSedes || 'Sedes'} conectadas con RIPv2`}
        actions={
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <span className="text-xs text-slate-400">
              Última actualización: {formatDateTime(ultimaActualizacion)}
            </span>
            <button
              type="button"
              onClick={() => void cargarDashboard()}
              disabled={actualizando}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`size-4 ${actualizando ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Actualizar
            </button>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Hosts actuales"
          value={formatNumber(metricas.hostsActuales)}
          hint="Inventario base de la red"
          icon={Users}
          tone="amber"
        />
        <KpiCard
          label="Hosts con crecimiento"
          value={formatNumber(metricas.hostsConCrecimiento)}
          hint="+20% a 3 años"
          icon={TrendingUp}
          tone="emerald"
        />
        <KpiCard
          label="Sedes activas"
          value={formatNumber(metricas.sedesActivas)}
          hint={`${formatNumber(sedes.length)} sedes registradas`}
          icon={Building2}
          tone="sky"
        />
        <KpiCard
          label="Subredes / VLANs"
          value={formatNumber(metricas.subredes)}
          hint="Plan de direccionamiento"
          icon={Network}
          tone="violet"
        />
        <KpiCard
          label="Enlaces WAN"
          value={formatNumber(metricas.enlacesWan)}
          hint="Conexiones entre sedes"
          icon={Cable}
          tone="rose"
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          eyebrow="TOPOLOGÍA"
          title="Sedes conectadas"
          description="Resumen de hosts, VLANs y direccionamiento por sede."
        />
        {sedes.length === 0 ? (
          <EmptyState
            titulo="Sin sedes registradas"
            descripcion="La API no devolvió sedes para mostrar en el panorama nacional."
            icono={Building2}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sedes.map((sede) => (
              <SedeSummaryCard
                key={sede.id}
                sede={sede}
                metrica={metricaPorSede.get(sede.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          eyebrow="INVENTARIO"
          title="Distribución del inventario"
          description="Comparativo entre el inventario actual y la proyección con crecimiento del 20 %."
        />
        <InventoryDistribution data={metricas.equiposPorTipo} />
        <p className="text-xs text-slate-500">
          Los totales incluyen 3 servidores locales por sede como supuesto del equipo y los
          clientes WLAN del inventario.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          eyebrow="DIRECCIONAMIENTO"
          title="Alertas de direccionamiento"
          description="Hallazgos detectados sobre el plan IPv4 y las VLAN de la red."
        />
        <WarningsPanel advertencias={metricas.advertencias} />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader
          eyebrow="NAVEGACIÓN"
          title="Accesos rápidos"
          description="Entra directamente a los módulos principales del simulador."
        />
        <QuickActions />
      </section>
    </div>
  );
}
