import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  titulo: string;
  descripcion?: string;
  icono?: LucideIcon;
  accion?: ReactNode;
}

export function EmptyState({ titulo, descripcion, icono: Icono = Inbox, accion }: EmptyStateProps) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/15 bg-white/5 p-10 text-center backdrop-blur">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300">
        <Icono className="size-6" aria-hidden />
      </span>
      <div className="max-w-lg">
        <h2 className="text-base font-semibold text-white">{titulo}</h2>
        {descripcion ? <p className="mt-1 text-sm leading-relaxed text-slate-400">{descripcion}</p> : null}
      </div>
      {accion ? <div className="flex flex-wrap items-center justify-center gap-2">{accion}</div> : null}
    </div>
  );
}
