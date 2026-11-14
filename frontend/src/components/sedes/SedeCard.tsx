import {
  ArrowRight,
  Building2,
  Layers,
  MapPin,
  Router,
  Server,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MetricasSedeDto, SedeDto } from '../../api/types';
import {
  capacidadVlan,
  formatArea,
  formatNumber,
  formatPercent,
  vlanMasUtilizada,
} from '../../lib/formatters';
import { StatusBadge } from '../common/StatusBadge';

interface SedeCardProps {
  sede: SedeDto;
  metrica?: MetricasSedeDto;
}

const ETIQUETAS_CAPACIDAD: Record<string, string> = {
  hub: 'Hub WAN',
  nvr: 'NVR local',
  'servidores-corporativos': 'Servidores corporativos',
  'servidores-locales': 'Servidores locales',
  produccion: 'Producción',
  seguridad: 'Seguridad',
  ventas: 'Ventas',
};

export function SedeCard({ sede, metrica }: SedeCardProps) {
  const hostsActuales = metrica?.hostsActuales ?? sede.totalHostsActuales;
  const hostsCrecimiento = metrica?.hostsConCrecimiento ?? sede.totalHostsConCrecimiento;
  const totalVlans = metrica?.vlans ?? sede.vlans.length;
  const capacidadTotal = sede.vlans.reduce(
    (total, vlan) => total + capacidadVlan(vlan.prefijo),
    0,
  );
  const utilizacion =
    capacidadTotal === 0 ? 0 : (hostsCrecimiento / capacidadTotal) * 100;
  const anchoBarra = Math.min(100, utilizacion);
  const colorBarra =
    utilizacion >= 100
      ? 'bg-rose-400'
      : utilizacion >= 90
        ? 'bg-amber-400'
        : 'bg-emerald-400';
  const colorTexto =
    utilizacion >= 100
      ? 'text-rose-300'
      : utilizacion >= 90
        ? 'text-amber-300'
        : 'text-emerald-300';
  const vlanCritica = vlanMasUtilizada(sede.vlans);
  const colorVlanCritica =
    vlanCritica && vlanCritica.utilizacion >= 100
      ? 'text-rose-300'
      : vlanCritica && vlanCritica.utilizacion >= 90
        ? 'text-amber-300'
        : 'text-slate-300';
  const vlansVisibles = sede.vlans.slice(0, 4);
  const vlansRestantes = sede.vlans.length - vlansVisibles.length;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-amber-400/30 hover:bg-white/[0.07]">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{sede.nombre}</h3>
            <StatusBadge tone={sede.tipo === 'Principal' ? 'warning' : 'neutral'} dot>
              {sede.tipo}
            </StatusBadge>
          </div>
          <p className="mt-1 font-mono text-xs text-amber-300/90">{sede.bloqueCidr}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <Router className="h-3.5 w-3.5" aria-hidden="true" />
            Router: {sede.routerId}
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </span>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Hosts actuales
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-white">
            {formatNumber(hostsActuales)}
          </p>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.07] p-3">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-200/70">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            Con crecimiento
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-amber-300">
            {formatNumber(hostsCrecimiento)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-400">Utilización del direccionamiento</span>
          <span className={`font-semibold tabular-nums ${colorTexto}`}>
            {formatPercent(utilizacion, 1)}
          </span>
        </div>
        <div
          className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label="Utilización del direccionamiento de la sede"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(anchoBarra)}
        >
          <div
            className={`h-full rounded-full ${colorBarra}`}
            style={{ width: `${anchoBarra}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          Capacidad instalada: {formatNumber(capacidadTotal)} hosts
        </p>
        {vlanCritica ? (
          <p className="mt-2 text-[11px] text-slate-500">
            VLAN más exigida:{' '}
            <span className={`font-semibold ${colorVlanCritica}`}>
              VLAN {vlanCritica.vlan.numero} · {formatPercent(vlanCritica.utilizacion, 1)}
            </span>{' '}
            ({formatNumber(vlanCritica.vlan.hostsConCrecimiento)} de{' '}
            {formatNumber(vlanCritica.capacidad)})
          </p>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
          <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Área
          </dt>
          <dd className="mt-0.5 text-sm text-slate-200">{formatArea(sede.areaM2)}</dd>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
          <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            Pisos
          </dt>
          <dd className="mt-0.5 text-sm text-slate-200">{formatNumber(sede.pisos)}</dd>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
          <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            VLANs
          </dt>
          <dd className="mt-0.5 text-sm text-slate-200">{formatNumber(totalVlans)}</dd>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
          <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
            <Server className="h-3.5 w-3.5" aria-hidden="true" />
            Servidores
          </dt>
          <dd className="mt-0.5 text-sm text-slate-200">
            {metrica ? formatNumber(metrica.servidoresLocales) : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          VLAN principales
        </p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {vlansVisibles.map((vlan) => (
            <li
              key={vlan.numero}
              className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded-md border border-white/10 bg-slate-950/50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  VLAN {vlan.numero}
                </span>
                <span className="truncate text-xs text-slate-300">{vlan.nombre}</span>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-slate-400">
                {formatNumber(vlan.hostsConCrecimiento)}
              </span>
            </li>
          ))}
        </ul>
        {vlansRestantes > 0 && (
          <p className="mt-1.5 text-[11px] text-slate-500">
            +{vlansRestantes} VLAN adicionales
          </p>
        )}
      </div>

      {sede.capacidades.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {sede.capacidades.map((capacidad) => (
            <span
              key={capacidad}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300"
            >
              {ETIQUETAS_CAPACIDAD[capacidad] ?? capacidad}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 border-t border-white/10 pt-4">
        <Link
          to={`/inventario?sede=${sede.id}`}
          className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:border-amber-400/40 hover:bg-amber-400/20"
        >
          Ver inventario
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default SedeCard;
