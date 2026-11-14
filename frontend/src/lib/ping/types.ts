export type PingPhase = 'Procesando' | 'Exitoso' | 'Descartado';

export type PingStepKind =
  | 'decision'
  | 'arp'
  | 'switch'
  | 'router'
  | 'wan'
  | 'delivery'
  | 'response'
  | 'fail';

export interface PingFrame {
  l2?: {
    macOrigen: string;
    macDestino: string;
  };
  l3?: {
    ipOrigen: string;
    ipDestino: string;
    ttl: number;
  };
  vlan?: number | null;
  arp?: {
    operacion: 'solicitud' | 'respuesta';
    ipObjetivo: string;
  };
  icmp?: {
    tipo: 'solicitud' | 'respuesta';
  };
}

export interface PingStep {
  idx: number;
  phase: PingPhase;
  kind: PingStepKind;
  title: string;
  text: string;
  from: string | null;
  to: string | null;
  path: string[];
  flood: string[][] | null;
  focus: string[];
  frame: PingFrame;
  effects: string[];
  ms: number;
}

export interface PingPlan {
  originId: string;
  destId: string;
  steps: PingStep[];
  path: string[];
  rttMs: number;
  exito: boolean;
  motivoFallo?: string;
}

export interface PingOptions {
  enlacesCaidos?: string[];
  nodosCaidos?: string[];
  mostrarArp?: boolean;
}
