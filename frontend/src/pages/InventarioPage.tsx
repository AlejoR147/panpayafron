import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Info, Layers, Package, RefreshCw, TrendingUp } from 'lucide-react';
import { useNetworkStore } from '../store/useNetworkStore';
import { formatDateTime, formatNumber } from '../lib/formatters';
import { SectionHeader } from '../components/common/SectionHeader';
import { KpiCard } from '../components/common/KpiCard';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { InventoryFilters } from '../components/inventario/InventoryFilters';
import { InventoryTable } from '../components/inventario/InventoryTable';
import type { FilaInventario } from '../components/inventario/InventoryTable';

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function InventarioPage() {
  const sedes = useNetworkStore((state) => state.sedes);
  const inventarioResumen = useNetworkStore((state) => state.inventarioResumen);
  const estadoInventario = useNetworkStore((state) => state.estadoInventario);
  const errorInventario = useNetworkStore((state) => state.errorInventario);
  const ultimaActualizacion = useNetworkStore((state) => state.ultimaActualizacion);
  const cargarInventario = useNetworkStore((state) => state.cargarInventario);

  const [searchParams, setSearchParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const sedeFiltro = searchParams.get('sede') ?? '';
  const sedeFiltroValida = sedes.some((sede) => sede.id === sedeFiltro) ? sedeFiltro : '';

  useEffect(() => {
    if (estadoInventario === 'idle') {
      void cargarInventario();
    }
  }, [estadoInventario, cargarInventario]);

  useEffect(() => {
    if (sedeFiltro === '' || sedes.length === 0) {
      return;
    }

    if (!sedes.some((sede) => sede.id === sedeFiltro)) {
      const siguientes = new URLSearchParams(searchParams);
      siguientes.delete('sede');
      setSearchParams(siguientes, { replace: true });
    }
  }, [sedeFiltro, sedes, searchParams, setSearchParams]);

  const filas = useMemo<FilaInventario[]>(() => {
    const mapa = new Map<string, FilaInventario>();
    const items = sedes.flatMap((sede) =>
      sede.inventario.map((item) => ({ ...item, sedeId: sede.id })),
    );

    for (const item of items) {
      const clave = `${item.categoria}|${item.vlanId ?? 'sin-vlan'}`;
      const fila = mapa.get(clave) ?? {
        categoria: item.categoria,
        vlanId: item.vlanId,
        esSupuesto: false,
        porSede: {},
        totalActual: 0,
        totalCrecimiento: 0,
      };

      fila.esSupuesto = fila.esSupuesto || item.esSupuesto;
      fila.porSede[item.sedeId] = {
        actual: item.cantidadActual,
        crecimiento: item.cantidadConCrecimiento,
      };
      fila.totalActual += item.cantidadActual;
      fila.totalCrecimiento += item.cantidadConCrecimiento;
      mapa.set(clave, fila);
    }

    return [...mapa.values()];
  }, [sedes]);

  const categorias = useMemo(
    () =>
      Array.from(new Set(filas.map((fila) => fila.categoria))).sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [filas],
  );

  const filasFiltradas = useMemo(() => {
    const texto = normalizar(busqueda.trim());

    return filas.filter((fila) => {
      const coincideSede =
        sedeFiltroValida === '' || fila.porSede[sedeFiltroValida] !== undefined;
      const coincideCategoria = categoriaFiltro === '' || fila.categoria === categoriaFiltro;
      const coincideTexto = texto === '' || normalizar(fila.categoria).includes(texto);
      return coincideSede && coincideCategoria && coincideTexto;
    });
  }, [filas, busqueda, sedeFiltroValida, categoriaFiltro]);

  const sedesVisibles = useMemo(
    () =>
      sedeFiltroValida === ''
        ? sedes
        : sedes.filter((sede) => sede.id === sedeFiltroValida),
    [sedes, sedeFiltroValida],
  );

  const resumenVista = useMemo(() => {
    let actual = 0;
    let crecimiento = 0;

    for (const fila of filasFiltradas) {
      for (const sede of sedesVisibles) {
        const item = fila.porSede[sede.id];
        if (item) {
          actual += item.actual;
          crecimiento += item.crecimiento;
        }
      }
    }

    return {
      actual,
      crecimiento,
      categorias: new Set(filasFiltradas.map((fila) => fila.categoria)).size,
      supuestos: filasFiltradas.filter((fila) => fila.esSupuesto).length,
    };
  }, [filasFiltradas, sedesVisibles]);

  const totalActual = resumenVista.actual;
  const totalCrecimiento = resumenVista.crecimiento;
  const totalCategorias = resumenVista.categorias;
  const totalSupuestos = resumenVista.supuestos;
  const hayFiltros =
    busqueda.trim() !== '' || categoriaFiltro !== '' || sedeFiltroValida !== '';

  const actualizarSedeEnUrl = (valor: string) => {
    const siguientes = new URLSearchParams(searchParams);

    if (valor === '') {
      siguientes.delete('sede');
    } else {
      siguientes.set('sede', valor);
    }

    setSearchParams(siguientes, { replace: true });
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoriaFiltro('');
    actualizarSedeEnUrl('');
  };

  const sinDatos = sedes.length === 0 || inventarioResumen.length === 0;

  if (sinDatos && estadoInventario === 'error') {
    return (
      <ErrorState
        mensaje={errorInventario ?? 'No fue posible cargar el inventario nacional.'}
        onReintentar={() => void cargarInventario()}
      />
    );
  }

  if (sinDatos && estadoInventario !== 'ok') {
    return <LoadingState mensaje="Cargando inventario nacional..." />;
  }

  if (sinDatos) {
    return (
      <EmptyState
        titulo="Sin inventario disponible"
        descripcion="La API respondió correctamente pero no devolvió categorías de inventario para las sedes."
        icono={Package}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        eyebrow="INVENTARIO"
        title={hayFiltros ? 'Inventario filtrado de dispositivos' : 'Inventario nacional de dispositivos'}
        description={
          hayFiltros
            ? 'Conteos de la vista filtrada con proyección de crecimiento del 20%'
            : 'Conteos actuales y proyectados con crecimiento del 20%'
        }
        actions={
          <button
            type="button"
            onClick={() => void cargarInventario()}
            disabled={estadoInventario === 'cargando'}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:border-amber-400/50 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${estadoInventario === 'cargando' ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Actualizar
          </button>
        }
      />

      {estadoInventario === 'error' && errorInventario !== null && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <span>{errorInventario}</span>
          <button
            type="button"
            onClick={() => void cargarInventario()}
            className="rounded-lg border border-rose-300/30 px-3 py-1 text-xs font-medium text-rose-100 transition hover:bg-rose-400/10"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total actual"
          value={formatNumber(totalActual)}
          hint={hayFiltros ? 'Vista filtrada' : `Actualizado: ${formatDateTime(ultimaActualizacion)}`}
          icon={Package}
          tone="amber"
        />
        <KpiCard
          label="Total con crecimiento"
          value={formatNumber(totalCrecimiento)}
          hint={hayFiltros ? 'Vista filtrada · +20%' : 'Proyección a 3 años (+20%)'}
          icon={TrendingUp}
          tone="emerald"
        />
        <KpiCard
          label="Categorías"
          value={formatNumber(totalCategorias)}
          hint={hayFiltros ? 'Categorías visibles' : 'Consolidadas a nivel nacional'}
          icon={Layers}
          tone="sky"
        />
        <KpiCard
          label="Ítems supuestos"
          value={formatNumber(totalSupuestos)}
          hint="Líneas de inventario asumidas"
          icon={Info}
          tone="violet"
        />
      </div>

      <InventoryFilters
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        sedeFiltro={sedeFiltroValida}
        onSedeFiltro={actualizarSedeEnUrl}
        categoriaFiltro={categoriaFiltro}
        onCategoriaFiltro={setCategoriaFiltro}
        sedes={sedes}
        categorias={categorias}
      />

      {filasFiltradas.length === 0 ? (
        <EmptyState
          titulo="Sin resultados"
          descripcion="Ajusta la búsqueda o los filtros para ver categorías del inventario."
          icono={Package}
          accion={
            <button
              type="button"
              onClick={limpiarFiltros}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            >
              Limpiar filtros
            </button>
          }
        />
      ) : (
        <InventoryTable filas={filasFiltradas} sedesVisibles={sedesVisibles} />
      )}
    </div>
  );
}

export default InventarioPage;
