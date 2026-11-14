import { Html } from '@react-three/drei';
import type { CityModel } from '../../lib/scene/cityModel';
import type { ViewMode } from '../../store/useViewStore';

interface CityLabelsProps {
  model: CityModel;
  mode: ViewMode;
  activeBranchId: string | null;
  onSelectBranch: (sedeId: string | null) => void;
}

const ROL: Record<string, string> = {
  bogota: 'Sede principal',
  medellin: 'Sede regional',
  cali: 'Sede regional',
};

export function CityLabels({ model, mode, activeBranchId, onSelectBranch }: CityLabelsProps) {
  return (
    <group>
      {model.sedes.map((sede) => {
        const activa = activeBranchId === sede.id;
        const altura = mode === 'planos' ? 8 : sede.height + 9;
        return (
          <Html
            key={sede.id}
            position={[sede.center.x, altura, sede.center.z]}
            center
            distanceFactor={mode === 'planos' ? 100 : 80}
            zIndexRange={[40, 10]}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelectBranch(activa ? null : sede.id);
              }}
              className={`pointer-events-auto w-44 -translate-y-full rounded-2xl border px-3 py-2 text-left shadow-2xl backdrop-blur transition ${
                activa
                  ? 'border-amber-400/80 bg-ink-900/95 ring-1 ring-amber-400/40'
                  : 'border-white/10 bg-ink-950/80 hover:border-amber-400/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                  {sede.nombre}
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${activa ? 'bg-emerald-400' : 'bg-emerald-400/50'}`}
                  title="Sede en línea"
                />
              </div>
              <p className="mt-0.5 text-[9px] uppercase tracking-wide text-slate-400">
                {ROL[sede.id] ?? 'Sede'}
              </p>
              <div className="mt-1.5 grid grid-cols-3 gap-1 border-t border-white/10 pt-1.5 text-center">
                <div>
                  <p className="text-[11px] font-bold leading-none text-slate-100">{sede.floors.length}</p>
                  <p className="mt-0.5 text-[7px] uppercase tracking-wider text-slate-500">Pisos</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold leading-none text-slate-100">{sede.hosts.length}</p>
                  <p className="mt-0.5 text-[7px] uppercase tracking-wider text-slate-500">Hosts</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold leading-none text-slate-100">{sede.aps.length}</p>
                  <p className="mt-0.5 text-[7px] uppercase tracking-wider text-slate-500">APs</p>
                </div>
              </div>
              <p className="mt-1.5 text-center text-[8px] text-amber-200/70">
                {activa ? 'Clic para quitar selección' : 'Clic para inspeccionar'}
              </p>
            </button>
          </Html>
        );
      })}
    </group>
  );
}
