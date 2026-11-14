import { Menu, RefreshCw } from 'lucide-react';
import { formatDateTime } from '../../lib/formatters';
import { useNetworkStore } from '../../store/useNetworkStore';
import type { EstadoCarga } from '../../store/useNetworkStore';
import { StatusBadge } from '../common/StatusBadge';

interface TopbarProps {
  onAbrirMenu: () => void;
  menuAbierto?: boolean;
}

type TonoBadge = 'ok' | 'warning' | 'danger' | 'neutral' | 'info';

const estadoApi: Record<EstadoCarga, { tone: TonoBadge; texto: string; dot: boolean }> = {
  idle: { tone: 'neutral', texto: 'Sin sincronizar', dot: false },
  cargando: { tone: 'info', texto: 'Sincronizando', dot: true },
  ok: { tone: 'ok', texto: 'API en línea', dot: true },
  error: { tone: 'danger', texto: 'API sin conexión', dot: true },
};

export function Topbar({ onAbrirMenu, menuAbierto = false }: TopbarProps) {
  const estado = useNetworkStore((state) => {
    const estados = [state.estadoDashboard, state.estadoInventario, state.estadoTopologia];

    if (estados.includes('error')) {
      return 'error';
    }

    if (estados.includes('cargando')) {
      return 'cargando';
    }

    if (estados.includes('ok')) {
      return 'ok';
    }

    return 'idle';
  });
  const ultimaActualizacion = useNetworkStore((state) => state.ultimaActualizacion);
  const refrescarTodo = useNetworkStore((state) => state.refrescarTodo);

  const api = estadoApi[estado];
  const estaCargando = estado === 'cargando';

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onAbrirMenu}
          aria-label="Abrir menú de navegación"
          aria-expanded={menuAbierto}
          aria-controls="menu-navegacion-movil"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
        >
          <Menu className="size-5" aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white sm:text-base">Red Nacional Pan Pa' Ya</p>
          <p className="truncate text-[11px] text-slate-500">
            Última actualización: {formatDateTime(ultimaActualizacion)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <StatusBadge tone={api.tone} dot={api.dot}>
            {api.texto}
          </StatusBadge>
          <button
            type="button"
            onClick={() => void refrescarTodo()}
            disabled={estaCargando}
            aria-label="Actualizar datos de la red"
            className="inline-flex items-center gap-2 rounded-xl border border-panpaya-400/30 bg-panpaya-500/10 px-3 py-2 text-xs font-semibold text-panpaya-200 transition hover:border-panpaya-400/50 hover:bg-panpaya-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            <RefreshCw className={`size-4 ${estaCargando ? 'animate-spin' : ''}`} aria-hidden />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
