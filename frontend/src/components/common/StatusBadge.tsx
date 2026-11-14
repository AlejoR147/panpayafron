import type { ReactNode } from 'react';

type TonoBadge = 'ok' | 'warning' | 'danger' | 'neutral' | 'info';

interface StatusBadgeProps {
  tone?: TonoBadge;
  children: ReactNode;
  dot?: boolean;
}

const tonos: Record<TonoBadge, { contenedor: string; punto: string }> = {
  ok: {
    contenedor: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    punto: 'bg-emerald-400',
  },
  warning: {
    contenedor: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    punto: 'bg-amber-400',
  },
  danger: {
    contenedor: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
    punto: 'bg-rose-400',
  },
  neutral: {
    contenedor: 'border-white/10 bg-white/5 text-slate-300',
    punto: 'bg-slate-400',
  },
  info: {
    contenedor: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
    punto: 'bg-sky-400',
  },
};

export function StatusBadge({ tone = 'neutral', children, dot = false }: StatusBadgeProps) {
  const paleta = tonos[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${paleta.contenedor}`}
    >
      {dot ? <span className={`size-1.5 rounded-full ${paleta.punto}`} aria-hidden /> : null}
      {children}
    </span>
  );
}
