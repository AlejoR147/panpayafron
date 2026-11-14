using System.Text.Json;
using System.Text.Json.Serialization;
using Panpaya.Application.Ports;
using Panpaya.Domain.Topologia;

namespace Panpaya.Infrastructure.Persistence;

public sealed class JsonTopologiaRepository : ITopologyReader, ITopologyMutator
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly string _seedPath;
    private readonly Lazy<Topologia> _topologia;

    public JsonTopologiaRepository(string seedPath)
    {
        _seedPath = seedPath ?? throw new ArgumentNullException(nameof(seedPath));
        _topologia = new Lazy<Topologia>(
            () => CargarTopologia(Path.GetFullPath(_seedPath)),
            LazyThreadSafetyMode.ExecutionAndPublication);
    }

    public Topologia Obtener() => _topologia.Value;

    public bool CambiarEstadoEnlace(string enlaceId, EstadoEnlace estado)
    {
        var topologia = Obtener();
        return topologia.CambiarEstadoEnlace(enlaceId, estado);
    }

    private static Topologia CargarTopologia(string ruta)
    {
        if (!File.Exists(ruta))
        {
            throw new FileNotFoundException($"No se encontró el archivo de topología en la ruta '{ruta}'.", ruta);
        }

        var seed = JsonSerializer.Deserialize<TopologiaSeedDto>(File.ReadAllText(ruta), JsonOptions);

        if (seed is null || string.IsNullOrWhiteSpace(seed.Version))
        {
            throw new InvalidOperationException("El seed de topología debe contener una versión válida.");
        }

        var sedes = (seed.Sedes ?? new List<SedeSeedDto>()).Select(CrearSede).ToList();
        var dispositivos = (seed.Nodos ?? new List<NodoSeedDto>()).Select(CrearDispositivo).ToList();
        var enlaces = (seed.Enlaces ?? new List<EnlaceSeedDto>()).Select(CrearEnlace).ToList();

        return new Topologia(sedes, dispositivos, enlaces);
    }

    private static Sede CrearSede(SedeSeedDto seed)
    {
        var vlans = seed.Vlans.Select(v => new VlanSede(
            v.Numero,
            v.Nombre,
            v.Funcion,
            v.Prefijo,
            v.Red,
            new RangoIp(v.RangoUtilizable.Inicio, v.RangoUtilizable.Fin),
            v.Broadcast,
            v.Gateway,
            v.HostsActuales,
            v.HostsConCrecimiento)).ToList();

        var inventario = seed.Inventario.Select(i => new InventarioItem(
            i.Categoria,
            i.CantidadActual,
            i.CantidadConCrecimiento,
            i.VlanId,
            i.EsSupuesto)).ToList();

        return new Sede(
            seed.Id,
            seed.Nombre,
            seed.Tipo,
            seed.Habilitada,
            seed.Capacidades,
            seed.LayoutId,
            seed.BloqueCidr,
            seed.BroadcastBloque,
            seed.AreaM2,
            seed.Pisos,
            seed.RouterId,
            vlans,
            inventario);
    }

    private static Dispositivo CrearDispositivo(NodoSeedDto seed)
    {
        if (seed.Tipo == TipoNodo.Router)
        {
            return new Router(
                seed.Id,
                seed.Nombre,
                seed.SedeId,
                seed.WanIp,
                seed.InterfacesVlan?.Select(i => new InterfazVlan(i.VlanId, i.Ip, i.Prefijo, i.Red)).ToList() ?? new List<InterfazVlan>(),
                seed.Mac,
                seed.Estado,
                CrearPosicion2D(seed.Posicion2D));
        }

        if (seed.Tipo == TipoNodo.Switch)
        {
            return new Switch(
                seed.Id,
                seed.Nombre,
                seed.SedeId,
                seed.EsCore,
                seed.VlansTrunk,
                seed.Estado,
                CrearPosicion2D(seed.Posicion2D));
        }

        if (seed.Tipo == TipoNodo.Pc || seed.Tipo == TipoNodo.Servidor || seed.Tipo == TipoNodo.Ap ||
            seed.Tipo == TipoNodo.Telefono || seed.Tipo == TipoNodo.Camara || seed.Tipo == TipoNodo.Impresora ||
            seed.Tipo == TipoNodo.Pos || seed.Tipo == TipoNodo.Nvr)
        {
            return new Host(
                seed.Id,
                seed.Nombre,
                seed.Tipo,
                seed.SedeId,
                seed.VlanId,
                seed.Ip,
                seed.Mac,
                seed.Gateway,
                seed.Categoria,
                seed.Estado,
                CrearPosicion2D(seed.Posicion2D));
        }

        throw new InvalidOperationException($"El nodo '{seed.Id}' tiene un tipo no soportado '{seed.Tipo}'.");
    }

    private static Enlace CrearEnlace(EnlaceSeedDto seed) => new(
        seed.Id,
        seed.OrigenId,
        seed.DestinoId,
        seed.Tipo,
        seed.CapacidadMbps,
        seed.MetricaRip,
        seed.LatenciaMs,
        seed.Estado,
        seed.ProtocoloRouting);

    private static Posicion2D? CrearPosicion2D(Posicion2DSeedDto? posicion2D) =>
        posicion2D is null ? null : new Posicion2D(posicion2D.X, posicion2D.Y);
}
