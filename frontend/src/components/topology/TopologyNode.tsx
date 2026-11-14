import type { CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import {
  Box,
  Camera,
  CreditCard,
  Globe,
  Monitor,
  Network,
  Phone,
  Printer,
  Router,
  Server,
  Wifi,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import { DIMENSIONES, type FormaNodo, type IconoClave, type TopoNodeData } from './tipos';

const ICONOS: Record<IconoClave, LucideIcon> = {
  router: Router,
  switch: Network,
  pc: Monitor,
  servidor: Server,
  ap: Wifi,
  telefono: Phone,
  camara: Camera,
  impresora: Printer,
  pos: CreditCard,
  nvr: Box,
  wan: Waypoints,
  isp: Globe,
};

const CLIP: Record<FormaNodo, string | undefined> = {
  hexagono: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
  octagono: 'polygon(27% 0%, 73% 0%, 100% 27%, 100% 73%, 73% 100%, 27% 100%, 0% 73%, 0% 27%)',
  circulo: 'ellipse(50% 50% at 50% 50%)',
  rectangulo: undefined,
  redondeado: undefined,
  pastilla: undefined,
};

const RADIO: Record<FormaNodo, string | undefined> = {
  hexagono: undefined,
  octagono: undefined,
  circulo: undefined,
  rectangulo: '8px',
  redondeado: '14px',
  pastilla: '999px',
};

function formaEstilo(forma: FormaNodo): CSSProperties {
  const clipPath = CLIP[forma];
  if (clipPath) return { clipPath };
  const borderRadius = RADIO[forma];
  return borderRadius ? { borderRadius } : {};
}

export function TopologyNode({ data, selected }: NodeProps<TopoNodeData>) {
  const Icono = ICONOS[data.icono] ?? Box;
  const clases = ['topo-nodo'];
  if (data.esIsp) clases.push('topo-nodo--isp');
  if (data.caido) clases.push('topo-nodo--caido');
  if (data.sedeActiva) clases.push('topo-nodo--sede');
  if (data.seleccionado || selected) clases.push('topo-nodo--sel');
  if (data.enRuta) clases.push('topo-nodo--ruta');
  if (data.enPaso) clases.push('topo-nodo--paso');

  const caja = data.esIsp
    ? { width: DIMENSIONES.ispAncho, height: DIMENSIONES.ispAlto }
    : { width: DIMENSIONES.nodoAncho, height: DIMENSIONES.nodoAlto };
  const forma = formaEstilo(data.forma);

  return (
    <div className={clases.join(' ')} style={caja}>
      <span className="topo-nodo__halo" style={forma} aria-hidden />
      <div className="topo-nodo__cara" style={forma}>
        <div className="topo-nodo__contenido">
          <span
            className="topo-nodo__insignia"
            style={{
              backgroundColor: data.color,
              clipPath: CLIP[data.forma],
              borderRadius: RADIO[data.forma],
            }}
          >
            <Icono className="topo-nodo__icono" aria-hidden />
          </span>
          <div className="topo-nodo__texto">
            <p className="topo-nodo__nombre" title={data.titulo}>
              {data.nombre}
            </p>
            <p className="topo-nodo__ip">{data.linea2}</p>
            <p className="topo-nodo__meta">{data.linea3}</p>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Top} id="t" isConnectable={false} />
      <Handle type="source" position={Position.Bottom} id="b" isConnectable={false} />
      <Handle type="source" position={Position.Left} id="l" isConnectable={false} />
      <Handle type="source" position={Position.Right} id="r" isConnectable={false} />
    </div>
  );
}
