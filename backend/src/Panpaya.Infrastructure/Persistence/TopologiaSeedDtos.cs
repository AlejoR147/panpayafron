using Panpaya.Domain.Topologia;

namespace Panpaya.Infrastructure.Persistence;

internal sealed class TopologiaSeedDto
{
    public string Version { get; set; } = string.Empty;
    public List<SedeSeedDto> Sedes { get; set; } = new();
    public List<NodoSeedDto> Nodos { get; set; } = new();
    public List<EnlaceSeedDto> Enlaces { get; set; } = new();
}

internal sealed class SedeSeedDto
{
    public string Id { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public TipoSede Tipo { get; set; }
    public bool Habilitada { get; set; }
    public List<string> Capacidades { get; set; } = new();
    public string LayoutId { get; set; } = string.Empty;
    public string BloqueCidr { get; set; } = string.Empty;
    public string BroadcastBloque { get; set; } = string.Empty;
    public int AreaM2 { get; set; }
    public int Pisos { get; set; }
    public string RouterId { get; set; } = string.Empty;
    public List<VlanSeedDto> Vlans { get; set; } = new();
    public List<InventarioSeedDto> Inventario { get; set; } = new();
}

internal sealed class VlanSeedDto
{
    public int Numero { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Funcion { get; set; } = string.Empty;
    public int Prefijo { get; set; }
    public string Red { get; set; } = string.Empty;
    public RangoIpSeedDto RangoUtilizable { get; set; } = new();
    public string Broadcast { get; set; } = string.Empty;
    public string Gateway { get; set; } = string.Empty;
    public int HostsActuales { get; set; }
    public int HostsConCrecimiento { get; set; }
}

internal sealed class RangoIpSeedDto
{
    public string Inicio { get; set; } = string.Empty;
    public string Fin { get; set; } = string.Empty;
}

internal sealed class InventarioSeedDto
{
    public string Categoria { get; set; } = string.Empty;
    public int CantidadActual { get; set; }
    public int CantidadConCrecimiento { get; set; }
    public int? VlanId { get; set; }
    public bool EsSupuesto { get; set; }
}

internal sealed class NodoSeedDto
{
    public string Id { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public TipoNodo Tipo { get; set; }
    public string SedeId { get; set; } = string.Empty;
    public EstadoNodo Estado { get; set; }
    public int? VlanId { get; set; }
    public string? Ip { get; set; }
    public string? Mac { get; set; }
    public bool EsInfraestructura { get; set; }
    public Posicion2DSeedDto? Posicion2D { get; set; }
    public string? WanIp { get; set; }
    public List<InterfazVlanSeedDto>? InterfacesVlan { get; set; }
    public bool EsCore { get; set; }
    public List<int>? VlansTrunk { get; set; }
    public string? Gateway { get; set; }
    public string? Categoria { get; set; }
}

internal sealed class InterfazVlanSeedDto
{
    public int VlanId { get; set; }
    public string Ip { get; set; } = string.Empty;
    public int Prefijo { get; set; }
    public string Red { get; set; } = string.Empty;
}

internal sealed class Posicion2DSeedDto
{
    public double X { get; set; }
    public double Y { get; set; }
}

internal sealed class EnlaceSeedDto
{
    public string Id { get; set; } = string.Empty;
    public string OrigenId { get; set; } = string.Empty;
    public string DestinoId { get; set; } = string.Empty;
    public TipoEnlace Tipo { get; set; }
    public int CapacidadMbps { get; set; }
    public int MetricaRip { get; set; }
    public int LatenciaMs { get; set; }
    public EstadoEnlace Estado { get; set; }
    public ProtocoloEnrutamiento ProtocoloRouting { get; set; } = ProtocoloEnrutamiento.RipV2;
}
