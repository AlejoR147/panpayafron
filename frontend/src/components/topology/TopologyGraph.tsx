import 'reactflow/dist/style.css';
import './topology.css';

import { useCallback, useEffect, useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type EdgeMouseHandler,
  type FitViewOptions,
  type NodeMouseHandler,
} from 'reactflow';
import { construirGrafo, type ContextoGrafo } from './construirGrafo';
import { construirGrafoWan } from './construirGrafoWan';
import { TopologyNode } from './TopologyNode';
import { WanCityNode } from './WanCityNode';
import { ID_NODO_ISP, ID_NODO_WAN } from './tipos';
import { useNetworkStore } from '../../store/useNetworkStore';
import { usePacketStore } from '../../store/usePacketStore';
import { useViewStore } from '../../store/useViewStore';

const TIPOS_NODO = { topo: TopologyNode, wanCity: WanCityNode };

const AJUSTE: FitViewOptions = { padding: 0.14, minZoom: 0.15, maxZoom: 1.3 };

export interface TopologyGraphProps {
  height?: number | string;
  className?: string;
  mostrarLeyenda?: boolean;
  mostrarMinimapa?: boolean;
  mostrarControles?: boolean;
  vista?: 'wan' | 'detalle';
  onSeleccionarNodo?: (nodoId: string) => void;
}

function GrafoInterno({
  height = 540,
  className = '',
  mostrarLeyenda = true,
  mostrarMinimapa = true,
  mostrarControles = true,
  vista = 'detalle',
  onSeleccionarNodo,
}: TopologyGraphProps) {
  const snapshot = useNetworkStore((state) => state.snapshot);
  const plan = usePacketStore((state) => state.plan);
  const steps = usePacketStore((state) => state.steps);
  const currentStep = usePacketStore((state) => state.currentStep);

  const nodoSeleccionado = useViewStore((state) => state.selectedNodeId);
  const enlaceSeleccionado = useViewStore((state) => state.selectedEnlaceId);
  const sedeActiva = useViewStore((state) => state.activeBranchId);
  const setSelectedNodeId = useViewStore((state) => state.setSelectedNodeId);
  const setSelectedEnlaceId = useViewStore((state) => state.setSelectedEnlaceId);
  const setActiveBranch = useViewStore((state) => state.setActiveBranch);
  const focusNode = useViewStore((state) => state.focusNode);

  const reactFlow = useReactFlow();

  const contexto = useMemo<ContextoGrafo>(
    () => ({
      ruta: plan?.path ?? [],
      paso: steps[currentStep - 1] ?? null,
      nodoSeleccionado,
      enlaceSeleccionado,
      sedeActiva,
    }),
    [plan, steps, currentStep, nodoSeleccionado, enlaceSeleccionado, sedeActiva],
  );

  const { nodos, aristas } = useMemo(() => {
    if (!snapshot) return { nodos: [], aristas: [] };
    return vista === 'wan'
      ? construirGrafoWan(snapshot, contexto)
      : construirGrafo(snapshot, contexto);
  }, [snapshot, contexto, vista]);

  useEffect(() => {
    if (nodos.length === 0) return undefined;
    const temporizador = window.setTimeout(() => {
      void reactFlow.fitView({ ...AJUSTE, duration: 350 });
    }, 90);
    return () => window.clearTimeout(temporizador);
  }, [nodos.length, reactFlow]);

  const alClickNodo: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.id === ID_NODO_ISP || node.id === ID_NODO_WAN) {
        setSelectedNodeId(null);
        setSelectedEnlaceId(null);
        focusNode(null);
        return;
      }
      if (node.id.startsWith('sede-')) {
        const sedeId = node.id.slice('sede-'.length);
        const sede = snapshot?.sedes.find((item) => item.id === sedeId);
        if (sede) {
          setActiveBranch(sedeId);
          focusNode(sede.routerId);
        } else {
          setActiveBranch(null);
          focusNode(null);
        }
        setSelectedNodeId(node.id);
        setSelectedEnlaceId(null);
        onSeleccionarNodo?.(node.id);
        return;
      }
      const sedeId = ((node.data as { sedeId?: string } | undefined)?.sedeId ?? null);
      if (sedeId) setActiveBranch(sedeId);
      setSelectedNodeId(node.id);
      setSelectedEnlaceId(null);
      focusNode(node.id);
      onSeleccionarNodo?.(node.id);
    },
    [setSelectedNodeId, setSelectedEnlaceId, setActiveBranch, focusNode, onSeleccionarNodo, snapshot],
  );

  const alClickArista: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      setSelectedEnlaceId(edge.id);
      setSelectedNodeId(null);
      focusNode(null);
    },
    [setSelectedEnlaceId, setSelectedNodeId, focusNode],
  );

  const alClickFondo = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEnlaceId(null);
    focusNode(null);
  }, [setSelectedNodeId, setSelectedEnlaceId, focusNode]);

  return (
    <div
      className={`topo-lienzo relative overflow-hidden rounded-2xl border border-white/10 ${className}`}
      style={{ height }}
    >
      {nodos.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <p className="text-sm text-slate-400">Sin nodos disponibles en el snapshot.</p>
        </div>
      ) : null}
      <ReactFlow
        nodes={nodos}
        edges={aristas}
        nodeTypes={TIPOS_NODO}
        onNodeClick={alClickNodo}
        onEdgeClick={alClickArista}
        onPaneClick={alClickFondo}
        fitView
        fitViewOptions={AJUSTE}
        minZoom={0.12}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        connectionMode={ConnectionMode.Loose}
        elementsSelectable={false}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        deleteKeyCode={null}
        zoomOnDoubleClick={false}
        panOnScroll
        attributionPosition="bottom-center"
      >
        <Background
          id="topo-fondo"
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.3}
          color="rgba(148,163,184,0.35)"
        />
        {mostrarControles ? <Controls showInteractive={false} fitViewOptions={AJUSTE} /> : null}
        {mostrarMinimapa ? (
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            maskColor="rgba(6,10,19,0.78)"
            nodeColor={(node) => (node.data?.color as string) ?? '#64748b'}
            nodeStrokeColor="transparent"
            nodeBorderRadius={6}
          />
        ) : null}
        {mostrarLeyenda ? (
          <Panel position="top-left">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-white/10 bg-ink-950/85 px-3 py-2 text-[10px] text-slate-400 backdrop-blur">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 bg-slate-500" aria-hidden />
                LAN
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 bg-cyan-400" aria-hidden />
                WAN
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 border-t-2 border-dashed border-rose-400" aria-hidden />
                Respaldo
              </span>
              {vista === 'wan' ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-5 border-t border-dashed border-amber-400" aria-hidden />
                  Planificado
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 bg-amber-400" aria-hidden />
                Ruta del ping
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-300" aria-hidden />
                Paso actual
              </span>
            </div>
          </Panel>
        ) : null}
      </ReactFlow>
    </div>
  );
}

export function TopologyGraph(props: TopologyGraphProps) {
  return (
    <ReactFlowProvider>
      <GrafoInterno {...props} />
    </ReactFlowProvider>
  );
}
