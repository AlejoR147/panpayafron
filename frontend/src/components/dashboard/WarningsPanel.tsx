import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface WarningsPanelProps {
  advertencias: string[];
}

const PATRON_CRITICO = /(solap|inválid|invalid|error|crític|critic|sin margen)/i;

export function WarningsPanel({ advertencias }: WarningsPanelProps) {
  if (advertencias.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
        <CheckCircle2 className="size-5 shrink-0 text-emerald-300" aria-hidden="true" />
        <p className="text-sm font-medium text-emerald-200">
          Sin advertencias de direccionamiento
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {advertencias.map((advertencia, indice) => {
        const critica = PATRON_CRITICO.test(advertencia);

        return (
          <li
            key={`${indice}-${advertencia}`}
            className={`flex items-start gap-3 rounded-2xl border p-4 ${
              critica
                ? 'border-rose-400/20 bg-rose-500/10'
                : 'border-amber-400/20 bg-amber-400/10'
            }`}
          >
            <AlertTriangle
              className={`mt-0.5 size-5 shrink-0 ${
                critica ? 'text-rose-300' : 'text-amber-300'
              }`}
              aria-hidden="true"
            />
            <p
              className={`text-sm leading-relaxed ${
                critica ? 'text-rose-100' : 'text-amber-100'
              }`}
            >
              {advertencia}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
