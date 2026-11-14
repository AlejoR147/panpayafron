namespace Panpaya.Domain.Topologia;

public enum TipoNodo
{
    Router,
    Switch,
    Pc,
    Servidor,
    Ap,
    Telefono,
    Camara,
    Impresora,
    Pos,
    Nvr,
    Wan
}

public enum EstadoNodo
{
    Activo,
    Caido
}

public enum TipoEnlace
{
    Lan,
    Wan,
    Respaldo
}

public enum EstadoEnlace
{
    Activo,
    Caido
}

public enum ProtocoloEnrutamiento
{
    RipV2,
    Estatica
}

public enum TipoSede
{
    Principal,
    Regional
}

public sealed record Posicion2D(double X, double Y);

public sealed record InterfazVlan(int VlanId, string Ip, int Prefijo, string Red);

public sealed record RangoIp(string Inicio, string Fin);

public abstract class Dispositivo
{
    protected Dispositivo(
        string id,
        string nombre,
        TipoNodo tipo,
        string sedeId,
        EstadoNodo estado,
        int? vlanId,
        string? ip,
        string? mac,
        bool esInfraestructura,
        Posicion2D posicion2D)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            throw new ArgumentException("El Id del dispositivo es obligatorio.", nameof(id));
        }

        if (string.IsNullOrWhiteSpace(nombre))
        {
            throw new ArgumentException("El nombre del dispositivo es obligatorio.", nameof(nombre));
        }

        if (string.IsNullOrWhiteSpace(sedeId))
        {
            throw new ArgumentException("La sede del dispositivo es obligatoria.", nameof(sedeId));
        }

        Id = id.Trim();
        Nombre = nombre.Trim();
        Tipo = tipo;
        SedeId = sedeId.Trim();
        Estado = estado;
        VlanId = vlanId;
        Ip = ip;
        Mac = mac;
        EsInfraestructura = esInfraestructura;
        Posicion2D = posicion2D ?? new Posicion2D(0, 0);
    }

    public string Id { get; }
    public string Nombre { get; }
    public TipoNodo Tipo { get; }
    public string SedeId { get; }
    public EstadoNodo Estado { get; private set; }
    public int? VlanId { get; }
    public string? Ip { get; }
    public string? Mac { get; }
    public bool EsInfraestructura { get; }
    public Posicion2D Posicion2D { get; }

    public void CambiarEstado(EstadoNodo estado) => Estado = estado;
}

public sealed class Router : Dispositivo
{
    public Router(
        string id,
        string nombre,
        string sedeId,
        string? wanIp,
        IEnumerable<InterfazVlan> interfacesVlan,
        string? mac = null,
        EstadoNodo estado = EstadoNodo.Activo,
        Posicion2D? posicion2D = null)
        : base(id, nombre, TipoNodo.Router, sedeId, estado, null, null, mac, true, posicion2D ?? new Posicion2D(0, 0))
    {
        WanIp = wanIp;
        InterfacesVlan = (interfacesVlan ?? throw new ArgumentNullException(nameof(interfacesVlan))).ToList().AsReadOnly();
    }

    public string? WanIp { get; }
    public IReadOnlyList<InterfazVlan> InterfacesVlan { get; }

    public InterfazVlan? BuscarInterfazVlan(int vlanId) =>
        InterfacesVlan.FirstOrDefault(i => i.VlanId == vlanId);
}

public sealed class Switch : Dispositivo
{
    public Switch(
        string id,
        string nombre,
        string sedeId,
        bool esCore,
        IEnumerable<int>? vlansTrunk = null,
        EstadoNodo estado = EstadoNodo.Activo,
        Posicion2D? posicion2D = null)
        : base(id, nombre, TipoNodo.Switch, sedeId, estado, null, null, null, true, posicion2D ?? new Posicion2D(0, 0))
    {
        EsCore = esCore;
        VlansTrunk = (vlansTrunk ?? Array.Empty<int>()).Distinct().OrderBy(v => v).ToList().AsReadOnly();
    }

    public bool EsCore { get; }
    public IReadOnlyList<int> VlansTrunk { get; }
}

public sealed class Host : Dispositivo
{
    private static readonly HashSet<TipoNodo> TiposValidos =
    [
        TipoNodo.Pc,
        TipoNodo.Servidor,
        TipoNodo.Ap,
        TipoNodo.Telefono,
        TipoNodo.Camara,
        TipoNodo.Impresora,
        TipoNodo.Pos,
        TipoNodo.Nvr
    ];

    public Host(
        string id,
        string nombre,
        TipoNodo tipo,
        string sedeId,
        int? vlanId,
        string? ip,
        string? mac,
        string? gateway,
        string? categoria = null,
        EstadoNodo estado = EstadoNodo.Activo,
        Posicion2D? posicion2D = null)
        : base(id, nombre, tipo, sedeId, estado, vlanId, ip, mac, false, posicion2D ?? new Posicion2D(0, 0))
    {
        if (!TiposValidos.Contains(tipo))
        {
            throw new ArgumentException($"El tipo {tipo} no corresponde a un host final.", nameof(tipo));
        }

        Gateway = gateway;
        Categoria = categoria;
    }

    public string? Gateway { get; }
    public string? Categoria { get; }
}

public sealed class Enlace
{
    public Enlace(
        string id,
        string origenId,
        string destinoId,
        TipoEnlace tipo,
        int capacidadMbps,
        int metricaRip,
        int latenciaMs,
        EstadoEnlace estado = EstadoEnlace.Activo,
        ProtocoloEnrutamiento protocoloRouting = ProtocoloEnrutamiento.RipV2)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            throw new ArgumentException("El Id del enlace es obligatorio.", nameof(id));
        }

        if (string.IsNullOrWhiteSpace(origenId) || string.IsNullOrWhiteSpace(destinoId))
        {
            throw new ArgumentException("Los extremos del enlace son obligatorios.");
        }

        if (string.Equals(origenId, destinoId, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Un enlace no puede conectar un dispositivo consigo mismo.", nameof(destinoId));
        }

        if (capacidadMbps <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(capacidadMbps), "La capacidad debe ser mayor que cero.");
        }

        if (metricaRip is < 1 or > 15)
        {
            throw new ArgumentOutOfRangeException(nameof(metricaRip), "La métrica RIPv2 debe estar entre 1 y 15 saltos.");
        }

        if (latenciaMs < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(latenciaMs), "La latencia no puede ser negativa.");
        }

        Id = id.Trim();
        OrigenId = origenId.Trim();
        DestinoId = destinoId.Trim();
        Tipo = tipo;
        CapacidadMbps = capacidadMbps;
        MetricaRip = metricaRip;
        LatenciaMs = latenciaMs;
        Estado = estado;
        ProtocoloRouting = protocoloRouting;
    }

    public string Id { get; }
    public string OrigenId { get; }
    public string DestinoId { get; }
    public TipoEnlace Tipo { get; }
    public int CapacidadMbps { get; }
    public int MetricaRip { get; }
    public int LatenciaMs { get; }
    public EstadoEnlace Estado { get; private set; }
    public ProtocoloEnrutamiento ProtocoloRouting { get; }

    public bool Conecta(string dispositivoId) =>
        string.Equals(OrigenId, dispositivoId, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(DestinoId, dispositivoId, StringComparison.OrdinalIgnoreCase);

    public string OtroExtremo(string dispositivoId) =>
        string.Equals(OrigenId, dispositivoId, StringComparison.OrdinalIgnoreCase) ? DestinoId : OrigenId;

    public void CambiarEstado(EstadoEnlace estado) => Estado = estado;
}

public sealed record VlanSede(
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

public sealed record InventarioItem(
    string Categoria,
    int CantidadActual,
    int CantidadConCrecimiento,
    int? VlanId,
    bool EsSupuesto = false);

public sealed record Sede(
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
    IReadOnlyList<VlanSede> Vlans,
    IReadOnlyList<InventarioItem> Inventario)
{
    public int TotalHostsActuales => Inventario.Sum(i => i.CantidadActual);
    public int TotalHostsConCrecimiento => Inventario.Sum(i => i.CantidadConCrecimiento);
}
