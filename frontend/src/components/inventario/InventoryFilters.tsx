import { Filter, Search, X } from 'lucide-react';
import type { SedeDto } from '../../api/types';

export interface InventoryFiltersProps {
  busqueda: string;
  onBusqueda: (v: string) => void;
  sedeFiltro: string;
  onSedeFiltro: (v: string) => void;
  categoriaFiltro: string;
  onCategoriaFiltro: (v: string) => void;
  sedes: SedeDto[];
  categorias: string[];
}

const estiloControl =
  'h-11 w-full rounded-xl border border-white/10 bg-slate-950/40 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20';

const estiloEtiqueta =
  'text-[11px] font-semibold uppercase tracking-wider text-slate-500';

export function InventoryFilters({
  busqueda,
  onBusqueda,
  sedeFiltro,
  onSedeFiltro,
  categoriaFiltro,
  onCategoriaFiltro,
  sedes,
  categorias,
}: InventoryFiltersProps) {
  const hayFiltros = busqueda !== '' || sedeFiltro !== '' || categoriaFiltro !== '';

  const limpiar = () => {
    onBusqueda('');
    onSedeFiltro('');
    onCategoriaFiltro('');
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-busqueda" className={estiloEtiqueta}>
            Buscar
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              id="filtro-busqueda"
              type="search"
              value={busqueda}
              onChange={(event) => onBusqueda(event.target.value)}
              placeholder="Buscar categoría del inventario"
              className={`${estiloControl} pl-10 pr-10`}
            />
            {busqueda !== '' && (
              <button
                type="button"
                onClick={() => onBusqueda('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-sede" className={estiloEtiqueta}>
            Sede
          </label>
          <div className="relative">
            <Filter
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <select
              id="filtro-sede"
              value={sedeFiltro}
              onChange={(event) => onSedeFiltro(event.target.value)}
              className={`${estiloControl} pl-10 pr-3 [&>option]:bg-slate-900 [&>option]:text-slate-100`}
            >
              <option value="">Todas las sedes</option>
              {sedes.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-categoria" className={estiloEtiqueta}>
            Categoría
          </label>
          <div className="relative">
            <Filter
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <select
              id="filtro-categoria"
              value={categoriaFiltro}
              onChange={(event) => onCategoriaFiltro(event.target.value)}
              className={`${estiloControl} pl-10 pr-3 [&>option]:bg-slate-900 [&>option]:text-slate-100`}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={limpiar}
          disabled={!hayFiltros}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Limpiar
        </button>
      </div>
    </div>
  );
}

export default InventoryFilters;
