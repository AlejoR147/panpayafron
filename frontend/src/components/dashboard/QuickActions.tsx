import { Link } from 'react-router-dom';
import { ArrowUpRight, Boxes, Building2, PlayCircle, Share2 } from 'lucide-react';

const accesos = [
  {
    to: '/inventario',
    titulo: 'Inventario',
    descripcion: 'Consulta equipos por sede, categoría y proyección de crecimiento.',
    Icono: Boxes,
  },
  {
    to: '/sedes',
    titulo: 'Sedes',
    descripcion: 'Revisa el detalle de cada sede, sus VLANs y su direccionamiento.',
    Icono: Building2,
  },
  {
    to: '/topologia',
    titulo: 'Topología',
    descripcion: 'Explora la red nacional y los enlaces WAN entre sedes.',
    Icono: Share2,
  },
  {
    to: '/simulacion',
    titulo: 'Simulación',
    descripcion: 'Consulta el recorrido didáctico previsto para la simulación de paquetes.',
    Icono: PlayCircle,
  },
];

export function QuickActions() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {accesos.map(({ to, titulo, descripcion, Icono }) => (
        <Link
          key={to}
          to={to}
          className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-amber-400/40 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
        >
          <div className="flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
              <Icono className="size-5" aria-hidden="true" />
            </span>
            <ArrowUpRight
              className="size-4 text-slate-500 transition group-hover:text-amber-300"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="font-medium text-white">{titulo}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{descripcion}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
