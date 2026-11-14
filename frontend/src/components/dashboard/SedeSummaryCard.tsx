import { Link } from 'react-router-dom';
import { ArrowRight, Layers, MapPin, Network } from 'lucide-react';
import type { MetricasSedeDto, SedeDto } from '../../api/types';
import {
  capacidadVlan,
  formatArea,
  formatNumber,
  formatPercent,
  vlanMasUtilizada,
} from '../../lib/formatters';
import { StatusBadge } from '../common/StatusBadge';

interface SedeSummaryCardProps {
  sede: SedeDto;
  metrica?: MetricasSedeDto;
}

export function SedeSummaryCard({ sede, metrica }: SedeSummaryCardProps) {
  const hostsActuales = metrica?.hostsActuales ?? sede.totalHostsActuales;
  const hostsConCrecimiento = metrica?.hostsConCrecimiento ?? sede.totalHostsConCrecimiento;
  const totalVlans = metrica?.vlans ?? sede.vlans.length;
  const areaM2 = metrica?.areaM2 ?? sede.areaM2;
  const pisos = metrica?.pisos ?? sede.pisos;
  const servidoresLocales =
    metrica?.servidoresLocales ??
    sede.inventario
      .filter((item) => item.vlanId === 80)
      .reduce((total, item) => total + item.cantidadActual, 0);

  const capacidadTotal = sede.vlans.reduce(
    (total, vlan) => total + capacidadVlan(vlan.prefijo),
    0,
  );
  const utilizacion = capacidadTotal === 0 ? 0 : (hostsConCrecimiento / capacidadTotal) * 100;
  const colorBarra =
    utilizacion >= 100 ? 'bg-rose-500' : utilizacion >= 90 ? 'bg-amber-400' : 'bg-emerald-500';
  const colorTexto =
    utilizacion >= 100 ? 'text-rose-300' : utilizacion >= 90 ? 'text-amber-300' : 'text-emerald-300';
  const vlanCritica = vlanMasUtilizada(sede.vlans);
  const colorVlanCritica =
    vlanCritica && vlanCritica.utilizacion >= 100
      ? 'text-rose-300'
      : vlanCritica && vlanCritica.utilizacion >= 90
        ? 'text-amber-300'
        : 'text-slate-300';

  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-amber-400/30 hover:bg-white/[0.07]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{sede.nombre}</h3>
          <p className="mt-1 text-xs text-slate-400">
            {sede.habilitada ? 'Operativa en la WAN' : 'Deshabilitada'}
          </p>
        </div>
        <StatusBadge tone={sede.tipo === 'Principal' ? 'info' : 'neutral'}>
          {sede.tipo}
        </StatusBadge>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span>{formatArea(areaM2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span>
            {formatNumber(pisos)} {pisos === 1 ? 'piso' : 'pisos'}
          </span>
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <Network className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span>Bloque {sede.bloqueCidr}</span>
        </div>
      </dl>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-xs text-slate-400">Hosts actuales</p>
          <p className="mt-1 text-lg font-semibold text-white">{formatNumber(hostsActuales)}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-xs text-slate-400">Con crecimiento</p>
          <p className="mt-1 text-lg font-semibold text-amber-300">
            {formatNumber(hostsConCrecimiento)}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-xs text-slate-400">VLANs</p>
          <p className="mt-1 text-lg font-semibold text-white">{formatNumber(totalVlans)}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-xs text-slate-400">Servidores locales</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {formatNumber(servidoresLocales)}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-400">Utilización con crecimiento</span>
          <span className={`font-semibold ${colorTexto}`}>{formatPercent(utilizacion, 1)}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all ${colorBarra}`}
            style={{ width: `${Math.min(100, utilizacion)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {formatNumber(hostsConCrecimiento)} hosts sobre {formatNumber(capacidadTotal)}{' '}
          direcciones disponibles
        </p>
        {vlanCritica ? (
          <p className="mt-1 text-xs text-slate-500">
            VLAN más exigida:{' '}
            <span className={`font-semibold ${colorVlanCritica}`}>
              VLAN {vlanCritica.vlan.numero} · {formatPercent(vlanCritica.utilizacion, 1)}
            </span>
          </p>
        ) : null}
      </div>

      <Link
        to={`/inventario?sede=${sede.id}`}
        className="group inline-flex items-center gap-2 text-sm font-medium text-amber-300 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
      >
        Ver inventario
        <ArrowRight
          className="size-4 transition group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </article>
  );
}
