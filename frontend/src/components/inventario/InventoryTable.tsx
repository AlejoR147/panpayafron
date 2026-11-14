import type { SedeDto } from '../../api/types';
import { formatNumber } from '../../lib/formatters';
import { StatusBadge } from '../common/StatusBadge';

export interface FilaInventario {
  categoria: string;
  vlanId: number | null;
  esSupuesto: boolean;
  porSede: Record<string, { actual: number; crecimiento: number }>;
  totalActual: number;
  totalCrecimiento: number;
}

interface InventoryTableProps {
  filas: FilaInventario[];
  sedesVisibles: SedeDto[];
}

interface Totales {
  actual: number;
  crecimiento: number;
}

function totalesVisibles(fila: FilaInventario, sedesVisibles: SedeDto[]): Totales {
  return sedesVisibles.reduce<Totales>(
    (acumulado, sede) => {
      const item = fila.porSede[sede.id];
      if (!item) {
        return acumulado;
      }

      return {
        actual: acumulado.actual + item.actual,
        crecimiento: acumulado.crecimiento + item.crecimiento,
      };
    },
    { actual: 0, crecimiento: 0 },
  );
}

export function InventoryTable({ filas, sedesVisibles }: InventoryTableProps) {
  if (sedesVisibles.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
        Selecciona una sede válida para consultar su inventario.
      </div>
    );
  }

  if (filas.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
        No hay categorías que coincidan con los filtros aplicados.
      </div>
    );
  }

  const ordenadas = [...filas].sort(
    (a, b) =>
      totalesVisibles(b, sedesVisibles).actual - totalesVisibles(a, sedesVisibles).actual,
  );

  const totalesPorSede = new Map<string, Totales>();
  for (const sede of sedesVisibles) {
    let actual = 0;
    let crecimiento = 0;

    for (const fila of ordenadas) {
      const item = fila.porSede[sede.id];
      if (!item) {
        continue;
      }

      actual += item.actual;
      crecimiento += item.crecimiento;
    }

    totalesPorSede.set(sede.id, { actual, crecimiento });
  }

  const granTotal = ordenadas.reduce<Totales>(
    (acumulado, fila) => {
      const totales = totalesVisibles(fila, sedesVisibles);
      return {
        actual: acumulado.actual + totales.actual,
        crecimiento: acumulado.crecimiento + totales.crecimiento,
      };
    },
    { actual: 0, crecimiento: 0 },
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-slate-400">
          <tr>
            <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">
              Categoría
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">
              VLAN
            </th>
            {sedesVisibles.map((sede) => (
              <th
                key={sede.id}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-right font-medium"
              >
                <span className="block">{sede.nombre}</span>
                <span className="block text-[10px] font-normal normal-case tracking-normal text-slate-500">
                  Actual / +20%
                </span>
              </th>
            ))}
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-medium">
              Total actual
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-medium">
              Total +20%
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">
              Supuesto
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {ordenadas.map((fila) => {
            const totales = totalesVisibles(fila, sedesVisibles);

            return (
              <tr
                key={`${fila.categoria}-${fila.vlanId ?? 'sin-vlan'}`}
                className="transition-colors hover:bg-white/[0.04]"
              >
                <td className="whitespace-nowrap px-4 py-3 text-slate-100">{fila.categoria}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {fila.vlanId !== null ? (
                    <span className="inline-flex rounded-md border border-white/10 bg-slate-950/40 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                      VLAN {fila.vlanId}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                {sedesVisibles.map((sede) => {
                  const item = fila.porSede[sede.id];

                  return (
                    <td
                      key={sede.id}
                      className="whitespace-nowrap px-4 py-3 text-right tabular-nums"
                    >
                      {item ? (
                        <>
                          <span className="text-slate-200">{formatNumber(item.actual)}</span>
                          <span className="mx-1 text-slate-600">/</span>
                          <span className="text-amber-300/90">
                            {formatNumber(item.crecimiento)}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-white">
                  {formatNumber(totales.actual)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-amber-300">
                  {formatNumber(totales.crecimiento)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {fila.esSupuesto ? (
                    <StatusBadge tone="warning" dot>
                      Supuesto
                    </StatusBadge>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t border-white/10 bg-white/[0.03]">
          <tr>
            <td className="px-4 py-3 font-medium text-white" colSpan={2}>
              Total
            </td>
            {sedesVisibles.map((sede) => {
              const totales = totalesPorSede.get(sede.id) ?? { actual: 0, crecimiento: 0 };

              return (
                <td
                  key={sede.id}
                  className="whitespace-nowrap px-4 py-3 text-right tabular-nums"
                >
                  <span className="text-white">{formatNumber(totales.actual)}</span>
                  <span className="mx-1 text-slate-600">/</span>
                  <span className="text-amber-300">{formatNumber(totales.crecimiento)}</span>
                </td>
              );
            })}
            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-white">
              {formatNumber(granTotal.actual)}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-amber-300">
              {formatNumber(granTotal.crecimiento)}
            </td>
            <td className="px-4 py-3 text-slate-600">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default InventoryTable;
