import { Handle, Position, type NodeProps } from 'reactflow';
import { Cloud, Router, Server } from 'lucide-react';
import type { WanCityNodeData } from './tipos';

const MANIJAS: Array<{ id: string; position: Position; type: 'source' | 'target' }> = [
  { id: 'st', position: Position.Top, type: 'source' },
  { id: 'sb', position: Position.Bottom, type: 'source' },
  { id: 'sl', position: Position.Left, type: 'source' },
  { id: 'sr', position: Position.Right, type: 'source' },
  { id: 'tt', position: Position.Top, type: 'target' },
  { id: 'tb', position: Position.Bottom, type: 'target' },
  { id: 'tl', position: Position.Left, type: 'target' },
  { id: 'tr', position: Position.Right, type: 'target' },
];

export function WanCityNode({ data, selected }: NodeProps<WanCityNodeData>) {
  const clases = ['wan-nodo'];
  if (data.esWan) clases.push('wan-nodo--wan');
  if (data.esPrincipal) clases.push('wan-nodo--principal');
  if (data.sinDatos) clases.push('wan-nodo--sin-datos');
  if (data.sedeActiva) clases.push('wan-nodo--sede');
  if (data.seleccionado || selected) clases.push('wan-nodo--sel');
  if (data.enRuta) clases.push('wan-nodo--ruta');
  if (data.enPaso) clases.push('wan-nodo--paso');

  const Icono = data.esWan ? Cloud : Router;

  return (
    <div className={clases.join(' ')}>
      <div className="wan-nodo__caja">
        <span className="wan-nodo__icono" aria-hidden>
          <Icono className="wan-nodo__icono-svg" />
        </span>
        <div className="wan-nodo__texto">
          <p className="wan-nodo__nombre">{data.nombre}</p>
          <p className="wan-nodo__subnet">{data.subnet}</p>
          {data.sinDatos ? (
            <span className="wan-nodo__badge">Sin datos en el snapshot</span>
          ) : null}
        </div>
        {data.esPrincipal ? (
          <span className="wan-nodo__servidores" title="Servidores corporativos">
            <Server className="wan-nodo__servidor-svg" />
          </span>
        ) : null}
      </div>
      {MANIJAS.map((manija) => (
        <Handle
          key={manija.id}
          type={manija.type}
          position={manija.position}
          id={manija.id}
          isConnectable={false}
        />
      ))}
    </div>
  );
}
