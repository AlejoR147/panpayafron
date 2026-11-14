import { ArrowRight, CheckCircle2, Network, PlayCircle, Router, Search, Send, Signal, Timer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { KpiCard } from '../components/common/KpiCard';
import { SectionHeader } from '../components/common/SectionHeader';
import { StatusBadge } from '../components/common/StatusBadge';

interface PasoTimeline {
  numero: string;
  titulo: string;
  descripcion: string;
  icon: LucideIcon;
}

const pasos: PasoTimeline[] = [
  {
    numero: '01',
    titulo: 'ARP',
    descripcion:
      'El host origen resuelve la MAC del gateway dentro de su VLAN mediante una solicitud ARP broadcast.',
    icon: Search,
  },
  {
    numero: '02',
    titulo: 'Gateway',
    descripcion:
      'El switch entrega la trama al router de la sede; la IP destino pertenece a otra red y requiere enrutamiento.',
    icon: Router,
  },
  {
    numero: '03',
    titulo: 'RIPv2',
    descripcion:
      'El router consulta su tabla de rutas aprendida por RIPv2 y elige el camino con la menor métrica de saltos.',
    icon: Network,
  },
  {
    numero: '04',
    titulo: 'Entrega',
    descripcion:
      'El paquete atraviesa la WAN hasta la sede destino, donde el gateway lo entrega en la VLAN correcta.',
    icon: Send,
  },
  {
    numero: '05',
    titulo: 'Respuesta',
    descripcion:
      'El destino responde por el camino inverso y cada salto registra su explicación didáctica.',
    icon: CheckCircle2,
  },
];

const contratoSignalR = [
  { campo: 'paqueteId', detalle: 'Identificador único del paquete simulado.' },
  { campo: 'nodoActual', detalle: 'Equipo que procesa el paquete en este salto.' },
  { campo: 'siguienteSalto', detalle: 'Destino calculado por la tabla de rutas.' },
  { campo: 'estado', detalle: 'Procesando, Exitoso o Descartado.' },
  { campo: 'explicacionDidactica', detalle: 'Texto que se muestra en el panel de la simulación.' },
];

export function SimulacionPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        eyebrow="Fase 5 · Simulación"
        title="Simulación de paquetes"
        description="Recorrido didáctico de extremo a extremo: resolución ARP, salida por el gateway, decisión de RIPv2, entrega en la sede destino y respuesta."
        actions={
          <StatusBadge tone="warning" dot>
            Fase 5 en preparación
          </StatusBadge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Protocolo de enrutamiento"
          value="RIPv2"
          hint="Métrica por número de saltos"
          icon={Network}
          tone="amber"
        />
        <KpiCard
          label="Saltos máximos"
          value="15"
          hint="Límite del protocolo de distancia-vector"
          icon={Timer}
          tone="sky"
        />
        <KpiCard
          label="Canal en tiempo real"
          value="SignalR"
          hint="Eventos de cada salto por WebSocket"
          icon={Signal}
          tone="emerald"
        />
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-panpaya-500/15 text-panpaya-300 ring-1 ring-panpaya-400/25">
              <PlayCircle className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">Línea de tiempo del paquete</h2>
              <p className="text-xs text-slate-400">Secuencia estática prevista para la simulación real.</p>
            </div>
          </div>
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            ARP → Gateway → RIPv2 → Entrega → Respuesta
          </span>
        </div>

        <ol className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {pasos.map(({ numero, titulo, descripcion, icon: Icono }) => (
            <li
              key={numero}
              className="relative flex flex-col gap-3 rounded-xl border border-white/10 bg-ink-900/50 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-panpaya-300">
                  <Icono className="size-4" aria-hidden />
                </span>
                <span className="font-mono text-[11px] tracking-[0.18em] text-slate-600">{numero}</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">{titulo}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">{descripcion}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
              <Signal className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">SignalR listo en el backend</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
                El backend en C# calculará el ruteo y emitirá el avance de cada paquete por WebSocket.
                El frontend solo dibujará la interpolación entre nodos; no tomará decisiones de red.
              </p>
            </div>
          </div>
          <StatusBadge tone="ok" dot>
            Contrato definido
          </StatusBadge>
        </div>

        <dl className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {contratoSignalR.map(({ campo, detalle }) => (
            <div key={campo} className="rounded-xl border border-white/10 bg-ink-900/50 p-3">
              <dt className="font-mono text-[11px] font-semibold text-panpaya-300">{campo}</dt>
              <dd className="mt-1 text-[11px] leading-4 text-slate-400">{detalle}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-slate-500">
          La animación y el panel de explicaciones se habilitarán cuando el frontend se conecte al
          hub de SignalR. Esta vista no ejecuta simulaciones reales.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Continúa explorando</h2>
            <p className="mt-1 text-sm text-slate-400">
              Consulta la estructura de nodos y enlaces, o revisa los equipos por sede.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/topologia"
              className="inline-flex items-center gap-2 rounded-xl border border-panpaya-400/30 bg-panpaya-500/10 px-4 py-2 text-sm font-semibold text-panpaya-200 transition hover:border-panpaya-400/50 hover:bg-panpaya-500/20"
            >
              Ver topología
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              to="/inventario"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
            >
              Ver inventario
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
