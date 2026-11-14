using Panpaya.Domain.Topologia;

namespace Panpaya.Application.Contratos;

public sealed record NodoRedDto(
    string Id,
    string Nombre,
    TipoNodo Tipo,
    string SedeId,
    int? VlanId,
    string? Ip,
    string? Mac,
    Posicion2D Posicion2D,
    EstadoNodo Estado,
    bool EsInfraestructura,
    string? Gateway,
    string? Categoria,
    string? WanIp,
    IReadOnlyList<InterfazVlan>? InterfacesVlan,
    bool? EsCore,
    IReadOnlyList<int>? VlansTrunk);

public sealed record EnlaceRedDto(
    string Id,
    string OrigenId,
    string DestinoId,
    TipoEnlace Tipo,
    int CapacidadMbps,
    int MetricaRip,
    EstadoEnlace Estado,
    int LatenciaMs,
    ProtocoloEnrutamiento ProtocoloRouting = ProtocoloEnrutamiento.RipV2);

public sealed record VlanSedeDto(
    int Numero,
    string Nombre,
    string Funcion,
    int Prefijo,
    string Red,
    RangoIp RangoUtilizable,
    string Broadcast,
    string Gateway,
    int HostsActuales,
    int HostsConCrecimiento);

public sealed record InventarioItemDto(
    string Categoria,
    int CantidadActual,
    int CantidadConCrecimiento,
    int? VlanId,
    bool EsSupuesto);

public sealed record SedeDto(
    string Id,
    string Nombre,
    TipoSede Tipo,
    bool Habilitada,
    IReadOnlyList<string> Capacidades,
    string LayoutId,
    string BloqueCidr,
    string BroadcastBloque,
    int AreaM2,
    int Pisos,
    string RouterId,
    IReadOnlyList<VlanSedeDto> Vlans,
    IReadOnlyList<InventarioItemDto> Inventario,
    int TotalHostsActuales,
    int TotalHostsConCrecimiento);

public sealed record ResumenInventarioDto(string Categoria, int Actual, int ConCrecimiento);

public sealed record MetricasSedeDto(
    string SedeId,
    string Nombre,
    int HostsActuales,
    int HostsConCrecimiento,
    int Subredes,
    int Vlans,
    int AreaM2,
    int Pisos,
    int ServidoresLocales,
    IReadOnlyList<InventarioItemDto> Inventario);

public sealed record MetricasNacionalesDto(
    int SedesActivas,
    int HostsActuales,
    int HostsConCrecimiento,
    int Subredes,
    int EnlacesWan,
    IReadOnlyList<ResumenInventarioDto> EquiposPorTipo,
    IReadOnlyList<MetricasSedeDto> PorSede,
    IReadOnlyList<string> Advertencias);

public sealed record TopologiaSnapshotDto(
    string Version,
    DateTimeOffset GeneradoEn,
    IReadOnlyList<SedeDto> Sedes,
    IReadOnlyList<NodoRedDto> Nodos,
    IReadOnlyList<EnlaceRedDto> Enlaces,
    MetricasNacionalesDto Metricas);
