import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  mensaje?: string;
}

export function LoadingState({ mensaje = 'Cargando información de la red...' }: LoadingStateProps) {
  return (
    <div
      className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-7 animate-spin text-panpaya-400" aria-hidden />
      <p className="text-sm text-slate-300">{mensaje}</p>
    </div>
  );
}
