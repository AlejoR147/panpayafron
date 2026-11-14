import { usePacketStore } from '../../store/usePacketStore';
import type { PingStep } from '../../lib/ping/types';
import { formatNumber } from '../../lib/formatters';

interface DidacticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DidacticModal({ isOpen, onClose }: DidacticModalProps) {
  const currentStep = usePacketStore((state) => state.currentStep);
  const steps = usePacketStore((state) => state.steps);
  const originNodeName = usePacketStore((state) => state.originNodeName);
  const destNodeName = usePacketStore((state) => state.destNodeName);
  const rttMs = usePacketStore((state) => state.rttMs);
  const packetLoss = usePacketStore((state) => state.packetLoss);
  const isCompleted = usePacketStore((state) => state.isCompleted);

  if (!isOpen) return null;

  const step = steps[currentStep - 1];
  const pasoInfo = obtenerInfoPaso(step);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[92vw] rounded-2xl border border-white/15 bg-ink-950/95 p-4 shadow-2xl text-slate-100 backdrop-blur">
      <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full border border-panpaya-400/30 bg-panpaya-500/10 text-panpaya-400">
              <span className="text-[12px]">📦</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Paso {currentStep} de {steps.length}</h3>
              <p className="text-xs text-slate-400">{step?.title ?? ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <span className="text-[14px]">✕</span>
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-sm text-slate-300 leading-relaxed">{step?.text ?? ''}</p>
          </div>

          {pasoInfo.detalle && (
            <div className="bg-amber-500/10 border border-amber-400/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-300 mb-1">▲ Detalle técnico</p>
              <p className="text-sm text-amber-200">{pasoInfo.detalle}</p>
            </div>
          )}

          {pasoInfo.vlanInfo && (
            <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-300 mb-1">📡 Estado de VLAN</p>
              <p className="text-sm text-blue-200">{pasoInfo.vlanInfo}</p>
            </div>
          )}

          {isCompleted && (
            <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-300 mb-1">✅ Resultado del ping</p>
              <p className="text-sm text-emerald-200">
                {originNodeName} → {destNodeName}<br />
                RTT: {formatNumber(rttMs ?? 0)} ms · Pérdida: {packetLoss}%
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-panpaya-400/30 bg-panpaya-500/10 text-sm font-semibold text-panpaya-200 transition hover:bg-panpaya-500/20"
          >
            Cerrar explicación
          </button>
        </div>
      </div>
    </div>
  );
}

function obtenerInfoPaso(step: PingStep | undefined) {
  const title = (step?.title ?? '').toLowerCase();
  const detail: Record<string, { detalle?: string; vlanInfo?: string }> = {
    'decisión en el host': {
      detalle: 'El host compara la máscara de red y decide si el destino está en su mismo segmento.',
    },
    'resolución arp': {
      detalle: 'El host origen envía un frame ARP broadcast para resolver la dirección MAC del siguiente salto.',
      vlanInfo: 'La solicitud ARP permanece dentro de la VLAN de origen.',
    },
    'salida por el switch': {
      detalle: 'El switch aprende la MAC de origen y reenvía la trama por el puerto de salida.',
    },
    'enrutamiento en el router': {
      detalle: 'El router reduce el TTL y consulta su tabla RIPv2 para elegir la siguiente ruta.',
    },
    'tránsito por la wan': {
      detalle: 'El paquete atraviesa el enlace WAN hacia la sede destino.',
    },
    'entrega en la sede destino': {
      detalle: 'El switch de la sede destino entrega la trama al equipo final.',
    },
    'respuesta del destino': {
      detalle: 'El destino responde con un Echo Reply y el ping se completa.',
    },
  };

  for (const [key, value] of Object.entries(detail)) {
    if (title.includes(key)) {
      return value;
    }
  }

  return {};
}
