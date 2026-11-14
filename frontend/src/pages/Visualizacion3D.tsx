import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Building2,
  Cable,
  Car,
  ChevronRight,
  Eye,
  Gauge,
  Landmark,
  Layers,
  Map as MapIcon,
  MapPin,
  Network,
  Play,
  RotateCcw,
  Scissors,
  Server,
  Tag,
  TreePine,
  Users,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { SectionHeader } from '../components/common/SectionHeader';
import { BranchView } from '../components/branch/Building3D';
import { CityScene } from '../components/city/CityScene';
import { VLAN_COLORS, VLAN_LEGEND } from '../components/city/cityVisuals';
import { useNetworkStore } from '../store/useNetworkStore';
import { usePacketStore } from '../store/usePacketStore';
import { useViewStore, type ViewMode } from '../store/useViewStore';

const MODOS: Array<{ id: ViewMode; label: string; icon: LucideIcon }> = [
  { id: 'ciudad', label: 'Ciudad', icon: Building2 },
  { id: 'estructura', label: 'Estructura', icon: Layers },
  { id: 'planos', label: 'Planos', icon: MapIcon },
  { id: 'arquitecto', label: 'Arquitecto', icon: Landmark },
];

const PING_ORIGEN = 'pc-med-admin-01';
const PING_DESTINO = 'pc-bog-admin-01';

function ToggleChip({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left text-[11px] font-semibold transition ${
        active
          ? 'border-panpaya-400/45 bg-panpaya-400/12 text-panpaya-100'
          : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-slate-200'
      }`}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`}
      />
    </button>
  );
}

function LayerSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-panpaya-400/12 text-panpaya-300">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function Visualizacion3D() {
  const navigate = useNavigate();
  const viewMode = useViewStore((state) => state.viewMode);
  const setViewMode = useViewStore((state) => state.setViewMode);
  const activeBranchId = useViewStore((state) => state.activeBranchId);
  const activeFloor = useViewStore((state) => state.activeFloor);
  const setActiveFloor = useViewStore((state) => state.setActiveFloor);
  const showCables = useViewStore((state) => state.showCables);
  const toggleCables = useViewStore((state) => state.toggleCables);
  const showCoverage = useViewStore((state) => state.showCoverage);
  const toggleCoverage = useViewStore((state) => state.toggleCoverage);
  const showLabels = useViewStore((state) => state.showLabels);
  const toggleLabels = useViewStore((state) => state.toggleLabels);
  const showPeople = useViewStore((state) => state.showPeople);
  const togglePeople = useViewStore((state) => state.togglePeople);
  const showTrees = useViewStore((state) => state.showTrees);
  const toggleTrees = useViewStore((state) => state.toggleTrees);
  const showDecor = useViewStore((state) => state.showDecor);
  const toggleDecor = useViewStore((state) => state.toggleDecor);
  const sectionCut = useViewStore((state) => state.sectionCut);
  const setSectionCut = useViewStore((state) => state.setSectionCut);
  const requestPing = useViewStore((state) => state.requestPing);

  const snapshot = useNetworkStore((state) => state.snapshot);
  const estadoTopologia = useNetworkStore((state) => state.estadoTopologia);

  const isSimulating = usePacketStore((state) => state.isSimulating);
  const isCompleted = usePacketStore((state) => state.isCompleted);
  const currentStep = usePacketStore((state) => state.currentStep);
  const totalSteps = usePacketStore((state) => state.totalSteps);
  const originNodeName = usePacketStore((state) => state.originNodeName);
  const destNodeName = usePacketStore((state) => state.destNodeName);
  const rttMs = usePacketStore((state) => state.rttMs);
  const packetLoss = usePacketStore((state) => state.packetLoss);

  const esArquitecto = viewMode === 'arquitecto';
  const modoActivo: 'ciudad' | 'estructura' | 'planos' = esArquitecto ? 'ciudad' : viewMode;
  const activeSede = snapshot?.sedes.find((sede) => sede.id === activeBranchId);
  const pisos = activeSede?.pisos ?? 1;
  const alturaSede = Math.max(12, pisos * 3.4 + 1.5);
  const progreso = totalSteps > 0 ? Math.min(100, Math.round((currentStep / totalSteps) * 100)) : 0;
  const advertencias = snapshot?.metricas.advertencias ?? [];

  const cambiarModo = (modo: ViewMode) => {
    setViewMode(modo);
    setActiveFloor(null);
  };

  if (esArquitecto) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader
          eyebrow="Fase 4 · Visualización 3D y Modos"
          title="Centro de Control 3D Pan Pa' Ya!"
          description="Recorre la red nacional, inspecciona la estructura interna de cada sede y sigue el paquete de un ping de extremo a extremo."
          actions={
            <div className="flex rounded-xl border border-white/10 bg-ink-900/70 p-1">
              {MODOS.map((modo) => {
                const Icon = modo.icon;
                const activo = viewMode === modo.id;
                return (
                  <button
                    key={modo.id}
                    type="button"
                    onClick={() => cambiarModo(modo.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                      activo
                        ? 'bg-panpaya-500 text-ink-950 shadow-lg shadow-panpaya-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {modo.label}
                  </button>
                );
              })}
            </div>
          }
        />
        <BranchView />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 xl:h-[calc(100vh-7.5rem)] xl:min-h-[720px]">
      <SectionHeader
        eyebrow="Fase 4 · Visualización 3D y Modos"
        title="Centro de Control 3D Pan Pa' Ya!"
        description="Recorre la red nacional, inspecciona la estructura interna de cada sede y sigue el paquete de un ping de extremo a extremo."
        actions={
          <div className="flex rounded-xl border border-white/10 bg-ink-900/70 p-1">
            {MODOS.map((modo) => {
              const Icon = modo.icon;
              const activo = modoActivo === modo.id;
              return (
                <button
                  key={modo.id}
                  type="button"
                  onClick={() => cambiarModo(modo.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                    activo
                      ? 'bg-panpaya-500 text-ink-950 shadow-lg shadow-panpaya-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {modo.label}
                </button>
              );
            })}
          </div>
        }
      />

      <div className="flex min-h-[580px] flex-1 flex-col gap-3 xl:flex-row">
        <div className="relative min-h-[520px] flex-1 overflow-hidden rounded-3xl border border-white/10 bg-ink-950 shadow-2xl shadow-black/40">
          <CityScene viewMode={modoActivo} showPacket={isSimulating || isCompleted} />

          <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-2">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-950/82 px-3 py-2 shadow-xl backdrop-blur-md">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-panpaya-400/15 text-panpaya-300">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-panpaya-300">
                  {MODOS.find((modo) => modo.id === modoActivo)?.label ?? 'Ciudad'}
                </p>
                <p className="text-[11px] font-semibold text-white">
                  {activeSede?.nombre ?? 'Vista nacional'}
                  {activeFloor !== null ? ` · Piso ${activeFloor}` : ' · Todos los niveles'}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-ink-950/72 px-2.5 py-1.5 text-[9px] text-slate-400 backdrop-blur">
              Arrastra para orbitar · rueda para zoom · clic en una sede para enfocar
            </div>
          </div>

          <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
              {snapshot ? 'Snapshot en línea' : estadoTopologia === 'error' ? 'API sin conexión' : 'Cargando datos'}
            </span>
            {snapshot ? (
              <span className="rounded-full border border-white/10 bg-ink-950/75 px-2.5 py-1 text-[9px] font-semibold text-slate-300 backdrop-blur">
                {snapshot.sedes.length} sedes · {snapshot.nodos.length} nodos · {snapshot.enlaces.length} enlaces
              </span>
            ) : null}
          </div>

          <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-xl border border-white/8 bg-ink-950/78 px-3 py-2 text-[9px] text-slate-300 backdrop-blur">
            <div className="mb-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Red y cobertura</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1.5">
                <span className="h-[2px] w-4 bg-sky-400" /> WAN
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-[2px] w-4 border-t border-dashed border-rose-400" /> Respaldo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border border-cyan-400/70" /> Cobertura AP
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" /> Paquete
              </span>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-xl border border-white/8 bg-ink-950/78 px-2.5 py-1.5 backdrop-blur">
            <Gauge className="h-3.5 w-3.5 text-cyan-300" />
            <span className="text-[9px] text-slate-400">Escala aprox. 1u = 1 m</span>
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-2.5 xl:w-[318px] xl:overflow-y-auto xl:pr-0.5">
          <section className="rounded-2xl border border-panpaya-400/20 bg-gradient-to-br from-panpaya-500/12 to-transparent p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-panpaya-300" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-panpaya-200">Simulación</h2>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                  isCompleted
                    ? 'bg-emerald-400/15 text-emerald-300'
                    : isSimulating
                      ? 'bg-cyan-400/15 text-cyan-300'
                      : 'bg-white/5 text-slate-400'
                }`}
              >
                {isCompleted ? 'Completada' : isSimulating ? 'En curso' : 'En espera'}
              </span>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-400">
              Medellín → Bogotá · PC administrativo a servidor corporativo.
            </p>
            <button
              type="button"
              onClick={() => {
                requestPing(PING_ORIGEN, PING_DESTINO);
                navigate('/simulacion-paso-paso');
              }}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-panpaya-500 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-ink-950 transition hover:bg-panpaya-400"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Simular ping
            </button>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg bg-ink-950/45 px-1.5 py-1.5">
                <p className="text-[11px] font-bold text-white">{totalSteps > 0 ? currentStep : '—'}</p>
                <p className="text-[7px] uppercase tracking-wider text-slate-500">Paso</p>
              </div>
              <div className="rounded-lg bg-ink-950/45 px-1.5 py-1.5">
                <p className="text-[11px] font-bold text-white">{rttMs !== null ? `${rttMs}` : '—'}</p>
                <p className="text-[7px] uppercase tracking-wider text-slate-500">RTT ms</p>
              </div>
              <div className="rounded-lg bg-ink-950/45 px-1.5 py-1.5">
                <p className="text-[11px] font-bold text-white">{packetLoss > 0 ? `${packetLoss}%` : '0%'}</p>
                <p className="text-[7px] uppercase tracking-wider text-slate-500">Pérdida</p>
              </div>
            </div>
            <p className="mt-2 truncate text-center text-[9px] text-slate-500">
              {originNodeName && destNodeName ? `${originNodeName} → ${destNodeName}` : 'Sin ruta activa'}
            </p>
          </section>

          <LayerSection title="Sede activa" icon={Building2}>
            <div className="rounded-xl border border-white/8 bg-ink-950/40 p-2.5">
              <p className="text-sm font-bold text-white">{activeSede?.nombre ?? 'Sin sede seleccionada'}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-slate-500">
                {activeSede?.tipo === 'Principal' ? 'Sede principal' : activeSede ? 'Sede regional' : 'Snapshot pendiente'}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                <div>
                  <p className="text-xs font-bold text-panpaya-200">{activeSede?.pisos ?? '—'}</p>
                  <p className="text-[7px] uppercase tracking-wider text-slate-500">Pisos</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-panpaya-200">
                    {activeSede?.totalHostsConCrecimiento ?? snapshot?.metricas.hostsConCrecimiento ?? '—'}
                  </p>
                  <p className="text-[7px] uppercase tracking-wider text-slate-500">Hosts +20%</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-panpaya-200">{activeSede?.vlans.length ?? '—'}</p>
                  <p className="text-[7px] uppercase tracking-wider text-slate-500">VLAN</p>
                </div>
              </div>
              <p className="mt-2 truncate font-mono text-[9px] text-cyan-300/80">
                {activeSede?.bloqueCidr ?? '10.20.0.0/16'}
              </p>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setActiveFloor(null)}
                className={`rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition ${
                  activeFloor === null ? 'bg-white/12 text-white' : 'bg-white/[0.03] text-slate-500 hover:text-slate-300'
                }`}
              >
                Todos
              </button>
              {Array.from({ length: pisos }, (_, indice) => indice + 1).map((piso) => (
                <button
                  key={piso}
                  type="button"
                  onClick={() => setActiveFloor(activeFloor === piso ? null : piso)}
                  className={`rounded-lg px-2 py-1 text-[9px] font-bold transition ${
                    activeFloor === piso
                      ? 'bg-panpaya-500 text-ink-950'
                      : 'bg-white/[0.03] text-slate-500 hover:text-slate-300'
                  }`}
                >
                  P{piso}
                </button>
              ))}
            </div>
          </LayerSection>

          <LayerSection title="Capas" icon={Eye}>
            <div className="grid grid-cols-2 gap-1.5">
              <ToggleChip active={showCables} onClick={toggleCables} icon={Cable} label="Cables" />
              <ToggleChip active={showCoverage} onClick={toggleCoverage} icon={Wifi} label="Cobertura" />
              <ToggleChip active={showLabels} onClick={toggleLabels} icon={Tag} label="Etiquetas" />
              <ToggleChip active={showPeople} onClick={togglePeople} icon={Users} label="Personas" />
              <ToggleChip active={showTrees} onClick={toggleTrees} icon={TreePine} label="Árboles" />
              <ToggleChip active={showDecor} onClick={toggleDecor} icon={Car} label="Tráfico" />
            </div>
          </LayerSection>

          <LayerSection title="Corte superior" icon={Scissors}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-slate-400">
                {sectionCut !== null ? `Corte a ${sectionCut.toFixed(1)} m` : 'Edificio completo'}
              </p>
              <button
                type="button"
                onClick={() =>
                  setSectionCut(sectionCut === null ? Number((alturaSede * 0.58).toFixed(1)) : null)
                }
                className={`rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition ${
                  sectionCut !== null
                    ? 'bg-rose-400/15 text-rose-300'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white'
                }`}
              >
                {sectionCut !== null ? 'Quitar' : 'Activar'}
              </button>
            </div>
            <input
              type="range"
              min={2}
              max={alturaSede}
              step={0.5}
              value={sectionCut ?? alturaSede}
              disabled={sectionCut === null}
              onChange={(event) => setSectionCut(Number(event.target.value))}
              className="mt-2 w-full accent-panpaya-500 disabled:opacity-30"
            />
            <div className="mt-1 flex justify-between text-[7px] uppercase tracking-wider text-slate-600">
              <span>2 m</span>
              <span>{alturaSede.toFixed(0)} m</span>
            </div>
          </LayerSection>

          <LayerSection title="VLAN por color" icon={Network}>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {VLAN_LEGEND.map((vlan) => (
                <div key={vlan.vlan} className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: VLAN_COLORS[vlan.vlan] }}
                  />
                  <span className="truncate text-[8px] text-slate-400">
                    <span className="font-mono text-slate-500">{vlan.vlan}</span> {vlan.nombre}
                  </span>
                </div>
              ))}
            </div>
          </LayerSection>

          <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Advertencias</h2>
              </div>
              <span className="rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-bold text-amber-300">
                {advertencias.length}
              </span>
            </div>
            {advertencias.length > 0 ? (
              <ul className="space-y-1.5">
                {advertencias.slice(0, 4).map((advertencia) => (
                  <li key={advertencia} className="flex gap-1.5 text-[9px] leading-relaxed text-slate-400">
                    <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/70" />
                    {advertencia}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[9px] leading-relaxed text-slate-500">
                Sin advertencias reportadas en el snapshot actual.
              </p>
            )}
          </section>

          <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] px-2.5 py-2 text-[8px] uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-1.5">
              <Server className="h-3 w-3" /> 3 sedes · hub Bogotá
            </span>
            <span className="flex items-center gap-1.5">
              <RotateCcw className="h-3 w-3" /> RIPv2
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
