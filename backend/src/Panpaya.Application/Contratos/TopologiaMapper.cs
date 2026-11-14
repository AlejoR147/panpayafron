using Panpaya.Domain.Topologia;

namespace Panpaya.Application.Contratos;

public static class TopologiaMapper
{
    public static NodoRedDto ToDto(Dispositivo dispositivo) =>
        dispositivo switch
        {
            Host host => new(
                host.Id,
                host.Nombre,
                host.Tipo,
                host.SedeId,
                host.VlanId,
                host.Ip,
                host.Mac,
                host.Posicion2D,
                host.Estado,
                host.EsInfraestructura,
                host.Gateway,
                host.Categoria,
                null,
                null,
                null,
                null),
            Router router => new(
                router.Id,
                router.Nombre,
                router.Tipo,
                router.SedeId,
                router.VlanId,
                router.Ip,
                router.Mac,
                router.Posicion2D,
                router.Estado,
                router.EsInfraestructura,
                null,
                null,
                router.WanIp,
                router.InterfacesVlan,
                null,
                null),
            Switch sw => new(
                sw.Id,
                sw.Nombre,
                sw.Tipo,
                sw.SedeId,
                sw.VlanId,
                sw.Ip,
                sw.Mac,
                sw.Posicion2D,
                sw.Estado,
                sw.EsInfraestructura,
                null,
                null,
                null,
                null,
                sw.EsCore,
                sw.VlansTrunk),
            _ => new(
                dispositivo.Id,
                dispositivo.Nombre,
                dispositivo.Tipo,
                dispositivo.SedeId,
                dispositivo.VlanId,
                dispositivo.Ip,
                dispositivo.Mac,
                dispositivo.Posicion2D,
                dispositivo.Estado,
                dispositivo.EsInfraestructura,
                null,
                null,
                null,
                null,
                null,
                null),
        };

    public static EnlaceRedDto ToDto(Enlace enlace) =>
        new(
            enlace.Id,
            enlace.OrigenId,
            enlace.DestinoId,
            enlace.Tipo,
            enlace.CapacidadMbps,
            enlace.MetricaRip,
            enlace.Estado,
            enlace.LatenciaMs,
            enlace.ProtocoloRouting);

    public static VlanSedeDto ToDto(VlanSede vlan) =>
        new(
            vlan.Numero,
            vlan.Nombre,
            vlan.Funcion,
            vlan.Prefijo,
            vlan.Red,
            vlan.RangoUtilizable,
            vlan.Broadcast,
            vlan.Gateway,
            vlan.HostsActuales,
            vlan.HostsConCrecimiento);

    public static InventarioItemDto ToDto(InventarioItem item) =>
        new(
            item.Categoria,
            item.CantidadActual,
            item.CantidadConCrecimiento,
            item.VlanId,
            item.EsSupuesto);

    public static SedeDto ToDto(Sede sede) =>
        new(
            sede.Id,
            sede.Nombre,
            sede.Tipo,
            sede.Habilitada,
            sede.Capacidades,
            sede.LayoutId,
            sede.BloqueCidr,
            sede.BroadcastBloque,
            sede.AreaM2,
            sede.Pisos,
            sede.RouterId,
            sede.Vlans.Select(ToDto).ToList(),
            sede.Inventario.Select(ToDto).ToList(),
            sede.TotalHostsActuales,
            sede.TotalHostsConCrecimiento);
}
