import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Route,
  Wifi,
} from 'lucide-react';
import type { TopologiaSnapshotDto } from '../api/types';
import { formatNumber } from '../lib/formatters';
import { buildPingPlan } from '../lib/ping/engine';
import { setPacketRuntimeFromTuple } from '../lib/ping/packetRuntime';
import type { PingPlan, PingStepKind } from '../lib/ping/types';
import { useNetworkStore } from '../store/useNetworkStore';
import { usePacketStore } from '../store/usePacketStore';
import { useViewStore } from '../store/useViewStore';
import { DidacticModal } from '../components/modal/DidacticModal';
import { StatusBadge } from '../components/common/StatusBadge';
import { CityScene } from '../components/city/CityScene';
import { obtenerCityModel } from '../components/city/cityModelCache';
import { TopologyGraph } from '../components/topology/TopologyGraph';

const ETIQUETAS_KIND: Record<PingStepKind, string> = {
  decision: 'Decisión',
  arp: 'ARP',
  switch: 'Conmutación',
  router: 'Enrutamiento',
  wan: 'WAN',
  delivery: 'Entrega',
  response: 'Respuesta',
  fail: 'Fallo',
};

const VELOCIDADES = [0.5, 1, 2];

function posicionDe(snapshot: TopologiaSnapshotDto, nodoId: string): [number, number, number] {
  const posicion = obtenerCityModel(snapshot).getNodeWorldPosition(nodoId).position;
  return [posicion.x, posicion.y, posicion.z];
}

export function PingPasoAPaso() {
  const snapshot = useNetworkStore((state) => state.snapshot);
  const estadoTopologia = useNetworkStore((state) => state.estadoTopologia);
  const cargarTopologia = useNetworkStore((state) => state.cargarTopologia);

  const plan = usePacketStore((state) => state.plan);
  const steps = usePacketStore((state) => state.steps);
  const currentStep = usePacketStore((state) => state.currentStep);
  const totalSteps = usePacketStore((state) => state.totalSteps);
  const isSimulating = usePacketStore((state) => state.isSimulating);
  const isCompleted = usePacketStore((state) => state.isCompleted);
  const isPlaying = usePacketStore((state) => state.isPlaying);
  const playbackMode = usePacketStore((state) => state.playbackMode);
  const speed = usePacketStore((state) => state.speed);
  const rttMs = usePacketStore((state) => state.rttMs);
  const packetLoss = usePacketStore((state) => state.packetLoss);
  const originNodeName = usePacketStore((state) => state.originNodeName);
  const destNodeName = usePacketStore((state) => state.destNodeName);

  const pingOriginId = useViewStore((state) => state.pingOriginId);
  const pingDestId = useViewStore((state) => state.pingDestId);
  const pingRequestToken = useViewStore((state) => state.pingRequestToken);
  const clearPingRequest = useViewStore((state) => state.clearPingRequest);
  const followPacket = useViewStore((state) => state.followPacket);
  const setFollowPacket = useViewStore((state) => state.setFollowPacket);

  const [origenId, setOrigenId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [repeticion, setRepeticion] = useState(0);
  const [planRepeticion, setPlanRepeticion] = useState<PingPlan | null>(null);

  useEffect(() => {
    if (!snapshot && estadoTopologia !== 'cargando') {
      void cargarTopologia();
    }
  }, [snapshot, estadoTopologia, cargarTopologia]);

  const iniciar = useCallback(
    (nuevoOrigen: string, nuevoDestino: string) => {
      if (!snapshot || !nuevoOrigen || !nuevoDestino || nuevoOrigen === nuevoDestino) return;
      const planNuevo = buildPingPlan(snapshot, nuevoOrigen, nuevoDestino);
      const nombreOrigen = snapshot.nodos.find((nodo) => nodo.id === nuevoOrigen)?.nombre ?? nuevoOrigen;
      const nombreDestino = snapshot.nodos.find((nodo) => nodo.id === nuevoDestino)?.nombre ?? nuevoDestino;
      const anterior = usePacketStore.getState();
      const modoPrevio = anterior.playbackMode;
      const velocidadPrevia = anterior.speed;

      anterior.loadPingPlan(planNuevo, nombreOrigen, nombreDestino);
      const posicionOrigen = posicionDe(snapshot, nuevoOrigen);
      setPacketRuntimeFromTuple(posicionOrigen);
      const store = usePacketStore.getState();
      store.setPacketPosition(posicionOrigen);
      store.setSpeed(velocidadPrevia);
      store.setPacketLoss(planNuevo.exito ? 0 : 100);
      store.setPacketColor(planNuevo.exito ? '#fbbf24' : '#fb7185');
      useViewStore.getState().setFollowPacket(true);
      if (modoPrevio === 'auto') {
        store.setPlaybackMode('auto');
        store.play();
      }
    },
    [snapshot],
  );

  const pcs = useMemo(
    () => (snapshot ? snapshot.nodos.filter((nodo) => nodo.tipo === 'Pc') : []),
    [snapshot],
  );

  const origenPreferido = pingOriginId ?? 'pc-med-admin-01';
  const destinoPreferido = pingDestId ?? 'pc-bog-admin-01';
  const origenEfectivo =
    origenId || pcs.find((pc) => pc.id === origenPreferido)?.id || pcs[0]?.id || '';
  const destinoEfectivo =
    destinoId ||
    pcs.find((pc) => pc.id === destinoPreferido && pc.id !== origenEfectivo)?.id ||
    pcs.find((pc) => pc.id !== origenEfectivo)?.id ||
    '';
  const repeticionEfectiva = planRepeticion === plan ? repeticion : 0;

  useEffect(() => {
    if (pingRequestToken === 0 || !pingOriginId || !pingDestId || !snapshot) return;
    iniciar(pingOriginId, pingDestId);
    clearPingRequest();
  }, [pingRequestToken, pingOriginId, pingDestId, snapshot, iniciar, clearPingRequest]);

  useEffect(() => {
    if (!snapshot || !plan || steps.length === 0) return;
    const paso = steps[Math.min(currentStep, steps.length) - 1];
    if (!paso) return;

    const modelo = obtenerCityModel(snapshot);
    const posicionDeNodo = (nodoId: string): [number, number, number] => {
      const punto = modelo.getNodeWorldPosition(nodoId).position;
      return [punto.x, punto.y, punto.z];
    };

    const idxFrom = paso.from ? plan.path.indexOf(paso.from) : -1;
    const idxTo = paso.to ? plan.path.indexOf(paso.to) : -1;
    let tramo: string[];
    if (idxFrom >= 0 && idxTo >= 0 && idxFrom !== idxTo) {
      const [inicio, fin] = idxFrom < idxTo ? [idxFrom, idxTo] : [idxTo, idxFrom];
      tramo = plan.path.slice(inicio, fin + 1);
      if (idxFrom > idxTo) tramo = [...tramo].reverse();
    } else {
      const base = idxFrom >= 0 ? plan.path[idxFrom] : (paso.from ?? paso.to ?? plan.path[0]);
      tramo = base ? [base, base] : [];
    }

    let puntos = tramo.map(posicionDeNodo);
    if (puntos.length === 1) puntos = [puntos[0], puntos[0]];
    if (puntos.length >= 2 && repeticionEfectiva % 2 === 1) {
      puntos = [...puntos.slice(0, -1), puntos[puntos.length - 1], puntos[puntos.length - 1]];
    }
    if (puntos.length < 2) return;

    const store = usePacketStore.getState();
    store.setPacketColor(paso.phase === 'Descartado' ? '#fb7185' : '#fbbf24');
    store.setPacketPath(puntos);
    store.setPacketTarget(puntos[puntos.length - 1]);
    store.setPacketMoving(true);
  }, [snapshot, plan, steps, currentStep, repeticionEfectiva]);

  useEffect(() => {
    if (playbackMode !== 'auto' || !isPlaying || !plan) return undefined;
    const temporizador = window.setTimeout(() => {
      const store = usePacketStore.getState();
      if (store.currentStep >= store.totalSteps) store.completeSimulation();
      else store.nextStep();
    }, Math.max(700, 1500) / Math.max(0.25, speed));
    return () => window.clearTimeout(temporizador);
  }, [playbackMode, isPlaying, plan, currentStep, totalSteps, speed]);

  const resumen = useMemo(() => {
    if (!snapshot || !plan) return null;
    const nombre = (nodoId: string) => snapshot.nodos.find((nodo) => nodo.id === nodoId)?.nombre ?? nodoId;
    return plan.path.map((nodoId, indice) => {
      if (indice === 0) return { nodo: nombre(nodoId), enlace: null as string | null };
      const anterior = plan.path[indice - 1];
      const enlace = snapshot.enlaces.find(
        (item) =>
          (item.origenId === anterior && item.destinoId === nodoId) ||
          (item.destinoId === anterior && item.origenId === nodoId),
      );
      const etiqueta = enlace
        ? `${enlace.tipo === 'Respaldo' ? 'Respaldo' : enlace.tipo === 'Wan' ? 'WAN' : 'LAN'} · ${formatNumber(
            enlace.capacidadMbps,
          )} Mb/s · ${enlace.latenciaMs} ms`
        : 'Enlace directo';
      return { nodo: nombre(nodoId), enlace: etiqueta };
    });
  }, [snapshot, plan]);

  const alSiguiente = useCallback(() => {
    const store = usePacketStore.getState();
    if (!store.plan || store.isCompleted) return;
    if (store.currentStep >= store.totalSteps) store.completeSimulation();
    else store.nextStep();
  }, []);

  const alAnterior = useCallback(() => {
    usePacketStore.getState().previousStep();
    setModalAbierto(false);
  }, []);

  useEffect(() => {
    const onKey = (evento: KeyboardEvent) => {
      const destino = evento.target;
      if (
        destino instanceof HTMLInputElement ||
        destino instanceof HTMLSelectElement ||
        destino instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (evento.key === 'ArrowRight') {
        evento.preventDefault();
        alSiguiente();
      }
      if (evento.key === 'ArrowLeft') {
        evento.preventDefault();
        alAnterior();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [alSiguiente, alAnterior]);

  if (!snapshot) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-panpaya-400" />
        <p className="text-sm text-slate-400">Cargando topología de la red...</p>
      </div>
    );
  }

  const sedeDe = (nodoId: string) =>
    snapshot.sedes.find((sede) => sede.id === snapshot.nodos.find((nodo) => nodo.id === nodoId)?.sedeId)?.nombre ??
    'Sede';
  const origen = pcs.find((pc) => pc.id === origenEfectivo);
  const destino = pcs.find((pc) => pc.id === destinoEfectivo);
  const paso = steps[currentStep - 1];
  const seleccionValida = Boolean(origen && destino && origen.id !== destino.id);
  const seleccionCambia = Boolean(
    plan && (plan.originId !== origenEfectivo || plan.destId !== destinoEfectivo),
  );
  const progreso = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  const alAlternarModo = (modo: 'manual' | 'auto') => {
    const store = usePacketStore.getState();
    if (modo === 'auto') {
      store.setPlaybackMode('auto');
      if (store.plan) store.play();
    } else {
      store.setPlaybackMode('manual');
      store.pause();
    }
  };

  const alRepetir = () => {
    setPlanRepeticion(plan);
    setRepeticion((valor) => valor + 1);
  };

  const alReiniciar = () => {
    const previo = usePacketStore.getState();
    const origenPrevio = previo.originNodeId;
    previo.resetSimulation();
    if (origenPrevio) {
      const punto = posicionDe(snapshot, origenPrevio);
      const store = usePacketStore.getState();
      store.setPacketPath([punto, punto]);
      store.setPacketTarget(punto);
      store.setPacketPosition(punto);
      store.setPacketMoving(false);
      store.setPacketColor('#fbbf24');
    }
    setModalAbierto(false);
    setRepeticion(0);
    setPlanRepeticion(null);
  };

  const alReproducir = () => {
    if (!plan || seleccionCambia) {
      if (!seleccionValida) return;
      iniciar(origenEfectivo, destinoEfectivo);
      const store = usePacketStore.getState();
      store.setPlaybackMode('auto');
      store.play();
      setFollowPacket(true);
      setRepeticion(0);
      setPlanRepeticion(null);
      setModalAbierto(false);
      return;
    }
    const store = usePacketStore.getState();
    if (store.isPlaying) store.pause();
    else store.play();
  };

  const tonoEstado = isCompleted
    ? plan?.exito
      ? 'ok'
      : 'danger'
    : isSimulating
      ? 'info'
      : 'neutral';
  const textoEstado = isCompleted
    ? plan?.exito
      ? 'Completado'
      : 'Sin ruta'
    : isSimulating
      ? `Paso ${currentStep} de ${totalSteps}`
      : 'Listo';

  return (
    <div className="flex flex-col gap-6 bg-[radial-gradient(70%_45%_at_50%_-10%,rgba(251,139,18,0.06),transparent_70%)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wifi className="size-5 text-panpaya-400" aria-hidden />
          <div>
            <h2 className="text-lg font-bold text-white">Simulador de Ping paso a paso</h2>
            <p className="text-[11px] text-slate-400">
              Prueba de extremo a extremo sobre el plan local de rutas, con animación 3D y grafo sincronizados.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={tonoEstado} dot>
            {textoEstado}
          </StatusBadge>
          {plan ? (
            <StatusBadge tone="neutral">
              RTT {formatNumber(rttMs ?? plan.rttMs)} ms · Pérdida {packetLoss}%
            </StatusBadge>
          ) : null}
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-56 flex-1 flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400" htmlFor="ping-origen">
              PC Origen
            </label>
            <select
              id="ping-origen"
              value={origenEfectivo}
              onChange={(evento) => setOrigenId(evento.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-panpaya-400"
            >
              <option value="">Seleccionar PC origen</option>
              {pcs.map((pc) => (
                <option key={pc.id} value={pc.id}>
                  {pc.nombre} ({sedeDe(pc.id)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-56 flex-1 flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400" htmlFor="ping-destino">
              PC Destino
            </label>
            <select
              id="ping-destino"
              value={destinoEfectivo}
              onChange={(evento) => setDestinoId(evento.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-panpaya-400"
            >
              <option value="">Seleccionar PC destino</option>
              {pcs
                .filter((pc) => pc.id !== origenEfectivo)
                .map((pc) => (
                  <option key={pc.id} value={pc.id}>
                    {pc.nombre} ({sedeDe(pc.id)})
                  </option>
                ))}
            </select>
          </div>

          <button
            type="button"
            onClick={alReproducir}
            disabled={!seleccionValida}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-400/20 disabled:opacity-50"
          >
            {!plan || seleccionCambia ? (
              <Play className="size-4" aria-hidden />
            ) : isPlaying ? (
              <Pause className="size-4" aria-hidden />
            ) : (
              <Play className="size-4" aria-hidden />
            )}
            {!plan
              ? 'Iniciar simulación'
              : seleccionCambia
                ? 'Reiniciar simulación'
                : isPlaying
                  ? 'Pausar'
                  : 'Reproducir'}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => alAlternarModo('manual')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                playbackMode === 'manual' ? 'bg-panpaya-500 text-ink-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => alAlternarModo('auto')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                playbackMode === 'auto' ? 'bg-panpaya-500 text-ink-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Automático
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Velocidad</span>
            {VELOCIDADES.map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => usePacketStore.getState().setSpeed(valor)}
                className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                  speed === valor
                    ? 'border-amber-400/40 bg-amber-400/15 text-amber-200'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {valor}×
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setFollowPacket(!followPacket)}
            aria-pressed={followPacket}
            title="La cámara sigue al paquete en tiempo real"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
              followPacket
                ? 'border-amber-400/40 bg-amber-400/15 text-amber-200'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Route className="size-3.5" aria-hidden />
            Seguir paquete
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={alAnterior}
              disabled={!plan || currentStep <= 1}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronLeft className="size-4" aria-hidden />
              Anterior
            </button>
            <button
              type="button"
              onClick={alSiguiente}
              disabled={!plan || isCompleted}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={alRepetir}
              disabled={!paso}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
            >
              <Repeat className="size-4" aria-hidden />
              Repetir paso
            </button>
            <button
              type="button"
              onClick={alReiniciar}
              disabled={!plan}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
            >
              <RotateCcw className="size-4" aria-hidden />
              Reiniciar
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-panpaya-500 to-amber-300 transition-all duration-300"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            {plan ? `${currentStep}/${totalSteps} · ${progreso}%` : 'Sin plan cargado'}
          </span>
        </div>

        {plan ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {steps.map((paso) => (
              <button
                key={paso.idx}
                type="button"
                onClick={() => usePacketStore.getState().goToStep(paso.idx)}
                className={`min-w-8 rounded-lg border px-2 py-1 font-mono text-[10px] transition ${
                  paso.idx === currentStep
                    ? 'border-amber-400/50 bg-amber-400/15 text-amber-200'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200'
                }`}
                title={paso.title}
              >
                {paso.idx}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="relative h-[460px] overflow-hidden rounded-2xl border border-white/10 bg-ink-950">
          <CityScene viewMode="estructura" showPacket />
          <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-slate-400 backdrop-blur">
            Arrastra para rotar · Scroll para zoom
          </div>
          <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-1 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-[10px] text-slate-300 backdrop-blur">
            <span>
              Origen: <span className="text-amber-300">{originNodeName ?? origen?.nombre ?? '—'}</span>
            </span>
            <span>
              Destino: <span className="text-amber-300">{destNodeName ?? destino?.nombre ?? '—'}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {plan ? `Paso ${currentStep} de ${totalSteps}` : 'Panel de paso'}
            </p>
            {paso ? (
              <StatusBadge
                tone={paso.phase === 'Exitoso' ? 'ok' : paso.phase === 'Descartado' ? 'danger' : 'info'}
                dot
              >
                {ETIQUETAS_KIND[paso.kind]}
              </StatusBadge>
            ) : (
              <StatusBadge tone="neutral">En espera</StatusBadge>
            )}
          </div>

          {!plan || !paso ? (
            <div className="flex flex-1 flex-col items-start justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4">
              <p className="text-sm font-semibold text-slate-200">Selecciona los equipos y pulsa Iniciar</p>
              <p className="text-xs leading-relaxed text-slate-400">
                El motor local calcula la ruta con RIPv2 sobre el snapshot y genera un paso a paso con ARP,
                conmutación, enrutamiento WAN y respuesta ICMP.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm font-semibold text-white">{paso.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{paso.text}</p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Activity className="size-3.5" aria-hidden />
                  Duración acumulada
                </span>
                <span className="font-mono text-amber-300">+{paso.ms} ms</span>
              </div>

              {paso.effects.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {paso.effects.map((efecto) => (
                    <li
                      key={efecto}
                      className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-100"
                    >
                      <ArrowRight className="mt-0.5 size-3 shrink-0 text-amber-300" aria-hidden />
                      {efecto}
                    </li>
                  ))}
                </ul>
              ) : null}

              <dl className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-ink-950/70 p-3 text-[11px]">
                {paso.frame.l2 ? (
                  <div className="flex gap-2">
                    <dt className="w-8 shrink-0 font-semibold uppercase text-slate-500">L2</dt>
                    <dd className="min-w-0 break-all font-mono text-slate-300">
                      {paso.frame.l2.macOrigen} → {paso.frame.l2.macDestino}
                    </dd>
                  </div>
                ) : null}
                {paso.frame.l3 ? (
                  <div className="flex gap-2">
                    <dt className="w-8 shrink-0 font-semibold uppercase text-slate-500">L3</dt>
                    <dd className="min-w-0 break-all font-mono text-slate-300">
                      {paso.frame.l3.ipOrigen} → {paso.frame.l3.ipDestino} · TTL {paso.frame.l3.ttl}
                    </dd>
                  </div>
                ) : null}
                {paso.frame.vlan !== null && paso.frame.vlan !== undefined ? (
                  <div className="flex gap-2">
                    <dt className="w-8 shrink-0 font-semibold uppercase text-slate-500">VLAN</dt>
                    <dd className="font-mono text-slate-300">{paso.frame.vlan}</dd>
                  </div>
                ) : null}
                {paso.frame.arp ? (
                  <div className="flex gap-2">
                    <dt className="w-8 shrink-0 font-semibold uppercase text-slate-500">ARP</dt>
                    <dd className="min-w-0 break-all font-mono text-slate-300">
                      {paso.frame.arp.operacion === 'solicitud' ? 'Request' : 'Reply'} · {paso.frame.arp.ipObjetivo}
                    </dd>
                  </div>
                ) : null}
                {paso.frame.icmp ? (
                  <div className="flex gap-2">
                    <dt className="w-8 shrink-0 font-semibold uppercase text-slate-500">ICMP</dt>
                    <dd className="font-mono text-slate-300">
                      {paso.frame.icmp.tipo === 'solicitud' ? 'Echo Request' : 'Echo Reply'}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {isCompleted ? (
                <div
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                    plan?.exito
                      ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                      : 'border-rose-400/25 bg-rose-500/10 text-rose-200'
                  }`}
                >
                  {plan?.exito ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                  ) : (
                    <Activity className="mt-0.5 size-4 shrink-0" aria-hidden />
                  )}
                  <span>
                    {plan?.exito
                      ? `Ping completado: RTT ${formatNumber(rttMs ?? plan.rttMs)} ms · Pérdida ${packetLoss}%`
                      : `Ping fallido: ${plan?.motivoFallo ?? 'sin ruta activa'}`}
                  </span>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setModalAbierto(true)}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-panpaya-400/30 bg-panpaya-500/10 px-3 py-2 text-xs font-semibold text-panpaya-200 transition hover:bg-panpaya-500/20"
              >
                <Route className="size-4" aria-hidden />
                Ver explicación didáctica
              </button>
            </>
          )}
        </div>
      </section>

      {resumen && resumen.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Ruta calculada por RIPv2
            </p>
            <span className="text-[11px] text-slate-500">
              {originNodeName ?? origen?.nombre} → {destNodeName ?? destino?.nombre} · {resumen.length} saltos
            </span>
          </div>
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
            {resumen.map((elemento, indice) => (
              <li key={`${elemento.nodo}-${indice}`} className="flex items-center gap-2">
                {indice > 0 ? (
                  <span className="flex flex-col items-center gap-0.5">
                    <ArrowRight className="size-3.5 text-amber-400" aria-hidden />
                    <span className="whitespace-nowrap rounded border border-white/10 bg-ink-950/70 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-400">
                      {elemento.enlace}
                    </span>
                  </span>
                ) : null}
                <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-100">
                  {elemento.nodo}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <TopologyGraph height={560} vista="wan" />

      <DidacticModal isOpen={modalAbierto} onClose={() => setModalAbierto(false)} />
    </div>
  );
}
