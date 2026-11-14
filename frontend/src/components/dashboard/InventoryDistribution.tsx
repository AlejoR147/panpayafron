import type { ResumenInventarioDto } from '../../api/types';
import { formatNumber } from '../../lib/formatters';

interface InventoryDistributionProps {
  data: ResumenInventarioDto[];
}

export function InventoryDistribution({ data }: InventoryDistributionProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-slate-400">Sin datos de inventario para mostrar.</p>
      </div>
    );
  }

  const categorias = [...data].sort((a, b) => b.actual - a.actual).slice(0, 8);
  const maximo = Math.max(...categorias.map((item) => item.conCrecimiento), 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-amber-400" aria-hidden="true" />
          Actual
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-amber-200/60" aria-hidden="true" />
          Con crecimiento (+20%)
        </span>
      </div>

      <div className="mt-6 space-y-5">
        {categorias.map((item) => (
          <div key={item.categoria} className="space-y-2">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-slate-200">{item.categoria}</span>
              <span className="shrink-0 text-xs tabular-nums text-slate-400">
                {formatNumber(item.actual)} → {formatNumber(item.conCrecimiento)}
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${(item.actual / maximo) * 100}%` }}
                />
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-amber-200/60"
                  style={{ width: `${(item.conCrecimiento / maximo) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
