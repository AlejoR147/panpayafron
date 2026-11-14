import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  mensaje: string;
  onReintentar?: () => void;
}

export function ErrorState({ mensaje, onReintentar }: ErrorStateProps) {
  return (
    <div
      className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-rose-400/20 bg-rose-500/5 p-10 text-center backdrop-blur"
      role="alert"
    >
      <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/10 text-rose-300">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <div className="max-w-lg">
        <h2 className="text-base font-semibold text-white">No fue posible cargar la información</h2>
        <p className="mt-1 text-sm leading-relaxed text-rose-200/80">{mensaje}</p>
      </div>
      {onReintentar ? (
        <button
          type="button"
          onClick={onReintentar}
          className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-400/50 hover:bg-rose-400/20"
        >
          <RefreshCw className="size-4" aria-hidden />
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
