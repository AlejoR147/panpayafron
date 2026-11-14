import type { LucideIcon } from 'lucide-react';

type TonoKpi = 'amber' | 'emerald' | 'sky' | 'violet' | 'rose';

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: TonoKpi;
  trend?: string;
}

const tonos: Record<TonoKpi, { icono: string; linea: string }> = {
  amber: {
    icono: 'bg-panpaya-500/15 text-panpaya-300 ring-panpaya-400/25',
    linea: 'from-panpaya-500/70 via-panpaya-400/30 to-transparent',
  },
  emerald: {
    icono: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/25',
    linea: 'from-emerald-500/70 via-emerald-400/30 to-transparent',
  },
  sky: {
    icono: 'bg-sky-500/15 text-sky-300 ring-sky-400/25',
    linea: 'from-sky-500/70 via-sky-400/30 to-transparent',
  },
  violet: {
    icono: 'bg-violet-500/15 text-violet-300 ring-violet-400/25',
    linea: 'from-violet-500/70 via-violet-400/30 to-transparent',
  },
  rose: {
    icono: 'bg-rose-500/15 text-rose-300 ring-rose-400/25',
    linea: 'from-rose-500/70 via-rose-400/30 to-transparent',
  },
};

export function KpiCard({ label, value, hint, icon: Icono, tone = 'amber', trend }: KpiCardProps) {
  const paleta = tonos[tone];

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 backdrop-blur transition-colors hover:border-white/20">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${paleta.linea}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-2 truncate text-3xl font-semibold tracking-tight text-white">{value}</p>
          {hint ? <p className="mt-1 text-xs leading-5 text-slate-400">{hint}</p> : null}
        </div>
        <span
          className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ${paleta.icono}`}
        >
          <Icono className="size-5" aria-hidden />
        </span>
      </div>
      {trend ? (
        <p className="mt-4 inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
          {trend}
        </p>
      ) : null}
    </article>
  );
}
