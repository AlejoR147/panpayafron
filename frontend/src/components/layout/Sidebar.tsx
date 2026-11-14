import { Boxes, Building2, LayoutDashboard, Monitor, Network, PlayCircle, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useNetworkStore } from '../../store/useNetworkStore';

interface SidebarProps {
  onNavegar?: () => void;
}

interface EnlaceNav {
  to: string;
  label: string;
  descripcion: string;
  icon: LucideIcon;
}

const enlaces: EnlaceNav[] = [
  { to: '/', label: 'Dashboard', descripcion: 'Resumen nacional', icon: LayoutDashboard },
  { to: '/inventario', label: 'Inventario', descripcion: 'Equipos y crecimiento', icon: Boxes },
  { to: '/sedes', label: 'Sedes', descripcion: 'Bloques y VLAN', icon: Building2 },
  { to: '/topologia', label: 'Topología', descripcion: 'Nodos y enlaces', icon: Network },
  { to: '/simulacion', label: 'Simulación', descripcion: 'Flujo de paquetes', icon: PlayCircle },
  { to: '/visualizacion-3d', label: 'Visualización 3D', descripcion: 'Sucursales en 3D', icon: Monitor },
  { to: '/simulacion-paso-paso', label: 'Ping paso a paso', descripcion: 'Simulación de conectividad', icon: Zap },
];

export function Sidebar({ onNavegar }: SidebarProps) {
  const sedesActivas = useNetworkStore(
    (state) => state.metricas?.sedesActivas ?? state.sedes.length,
  );

  return (
    <div className="flex h-full flex-col border-r border-white/10 bg-ink-900/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-panpaya-400 to-panpaya-600 text-lg font-black text-ink-950 shadow-lg shadow-panpaya-900/40">
          P
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight text-white">Pan Pa' Ya</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">Red Nacional</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Navegación
        </p>
        {enlaces.map(({ to, label, descripcion, icon: Icono }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavegar}
            className={({ isActive }) =>
              [
                'group flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'border-panpaya-400/30 bg-panpaya-500/10 text-panpaya-100'
                  : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-slate-100',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                    isActive
                      ? 'border-panpaya-400/30 bg-panpaya-500/15 text-panpaya-300'
                      : 'border-white/5 bg-white/5 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <Icono className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium leading-5">{label}</span>
                  <span
                    className={`block truncate text-[11px] leading-4 ${
                      isActive ? 'text-panpaya-200/70' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  >
                    {descripcion}
                  </span>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-5">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          RIPv2 · {sedesActivas} {sedesActivas === 1 ? 'sede activa' : 'sedes activas'}
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-slate-600">Fase 4</p>
      </div>
    </div>
  );
}
