using Panpaya.Domain.Topologia;
using Panpaya.Infrastructure.Routing;

namespace Panpaya.Tests.Unit.Routing;

public sealed class RipV2RouteStrategyTests
{
    private readonly RipV2RouteStrategy _estrategia = new();

    [Fact]
    public void Calcular_RutaDirecta_EntrePcDeMedellinYServidorErp_UsaSieteSaltos()
    {
        var topologia = CrearTopologia();

        var ruta = _estrategia.Calcular(topologia, "pc-med-admin-01", "srv-bog-erp-01");

        Assert.NotNull(ruta);
        Assert.Equal(7, ruta!.Costo);
        Assert.Contains("rtr-med", ruta.Nodos);
        Assert.Contains("rtr-bog", ruta.Nodos);
        Assert.DoesNotContain("rtr-cal", ruta.Nodos);
    }

    [Fact]
    public void Calcular_SinEnlaceWANMedellinBogota_UsaRutaDeCaliConOchoSaltos()
    {
        var topologia = CrearTopologia();
        Assert.True(topologia.CambiarEstadoEnlace("wan-bog-med", EstadoEnlace.Caido));

        var ruta = _estrategia.Calcular(topologia, "pc-med-admin-01", "srv-bog-erp-01");

        Assert.NotNull(ruta);
        Assert.Equal(8, ruta!.Costo);
        Assert.Contains("rtr-cal", ruta.Nodos);
    }

    [Fact]
    public void Calcular_SinCaminosDisponibles_DevuelveNull()
    {
        var topologia = CrearTopologia();
        topologia.CambiarEstadoEnlace("wan-bog-med", EstadoEnlace.Caido);
        topologia.CambiarEstadoEnlace("wan-med-cal-backup", EstadoEnlace.Caido);

        var ruta = _estrategia.Calcular(topologia, "pc-med-admin-01", "srv-bog-erp-01");

        Assert.Null(ruta);
    }

    [Fact]
    public void Calcular_OrigenInexistente_DevuelveNull()
    {
        var topologia = CrearTopologia();

        var ruta = _estrategia.Calcular(topologia, "rtr-inexistente", "srv-bog-erp-01");

        Assert.Null(ruta);
    }

    [Fact]
    public void Calcular_RutaConMasDeQuinceSaltos_DevuelveNull()
    {
        var topologia = CrearCadenaLarga();

        var ruta = _estrategia.Calcular(topologia, "pc-origen", "srv-destino");

        Assert.Null(ruta);
    }

    private static Topologia CrearTopologia()
    {
        var sedes = new List<Sede>
        {
            CrearSede("bogota", "Bogotá", TipoSede.Principal, "rtr-bog"),
            CrearSede("medellin", "Medellín", TipoSede.Regional, "rtr-med"),
            CrearSede("cali", "Cali", TipoSede.Regional, "rtr-cal"),
        };

        var dispositivos = new List<Dispositivo>
        {
            new Router("rtr-bog", "Router Bogotá", "bogota", "10.20.80.1", new List<InterfazVlan>()),
            new Router("rtr-med", "Router Medellín", "medellin", "10.20.80.2", new List<InterfazVlan>()),
            new Router("rtr-cal", "Router Cali", "cali", "10.20.80.6", new List<InterfazVlan>()),
            new Switch("sw-bog-core", "Switch Core Bogotá", "bogota", true),
            new Switch("sw-bog-srv", "Switch Servidores Bogotá", "bogota", false),
            new Switch("sw-med-core", "Switch Core Medellín", "medellin", true),
            new Switch("sw-med-p2", "Switch Acceso Medellín", "medellin", false),
            new Switch("sw-cal-core", "Switch Core Cali", "cali", true),
            new Switch("sw-cal-p1", "Switch Acceso Cali", "cali", false),
            new Host("pc-med-admin-01", "PC Administrativo Medellín", TipoNodo.Pc, "medellin", 10, "10.20.16.130", "02:00:00:00:10:01", "10.20.16.129", "PC administrativo"),
            new Host("srv-bog-erp-01", "Servidor ERP Bogotá", TipoNodo.Servidor, "bogota", 80, "10.20.2.194", "02:00:00:00:80:01", "10.20.2.193", "Servidor ERP"),
        };

        var enlaces = new List<Enlace>
        {
            new Enlace("lan-med-pc-sw", "pc-med-admin-01", "sw-med-p2", TipoEnlace.Lan, 1000, 1, 1),
            new Enlace("lan-med-sw-core", "sw-med-p2", "sw-med-core", TipoEnlace.Lan, 1000, 1, 1),
            new Enlace("lan-med-core-rtr", "sw-med-core", "rtr-med", TipoEnlace.Lan, 1000, 1, 1),
            new Enlace("lan-bog-rtr-core", "rtr-bog", "sw-bog-core", TipoEnlace.Lan, 1000, 1, 1),
            new Enlace("lan-bog-core-srvsw", "sw-bog-core", "sw-bog-srv", TipoEnlace.Lan, 1000, 1, 1),
            new Enlace("lan-bog-srvsw-srv", "sw-bog-srv", "srv-bog-erp-01", TipoEnlace.Lan, 1000, 1, 1),
            new Enlace("lan-cal-core-rtr", "rtr-cal", "sw-cal-core", TipoEnlace.Lan, 1000, 1, 1),
            new Enlace("lan-cal-core-p1", "sw-cal-core", "sw-cal-p1", TipoEnlace.Lan, 1000, 1, 1),
            new Enlace("wan-bog-med", "rtr-bog", "rtr-med", TipoEnlace.Wan, 100, 1, 18),
            new Enlace("wan-bog-cal", "rtr-bog", "rtr-cal", TipoEnlace.Wan, 100, 1, 20),
            new Enlace("wan-med-cal-backup", "rtr-med", "rtr-cal", TipoEnlace.Respaldo, 50, 1, 30),
        };

        return new Topologia(sedes, dispositivos, enlaces);
    }

    private static Topologia CrearCadenaLarga()
    {
        var sede = CrearSede("bogota", "Bogotá", TipoSede.Principal, "rtr-bog");
        var dispositivos = new List<Dispositivo>
        {
            new Router("rtr-bog", "Router Bogotá", "bogota", "10.20.80.1", new List<InterfazVlan>()),
            new Host("pc-origen", "PC Origen", TipoNodo.Pc, "bogota", 10, "10.20.1.10", "02:00:00:00:10:10", "10.20.1.1", "PC administrativo"),
            new Host("srv-destino", "Servidor Destino", TipoNodo.Servidor, "bogota", 80, "10.20.2.194", "02:00:00:00:80:01", "10.20.2.193", "Servidor"),
        };

        for (var i = 1; i <= 17; i++)
        {
            dispositivos.Add(new Switch($"sw-{i:00}", $"Switch {i}", "bogota", false));
        }

        var enlaces = new List<Enlace>
        {
            new Enlace("e-pc-sw01", "pc-origen", "sw-01", TipoEnlace.Lan, 1000, 1, 1)
        };

        for (var i = 1; i < 17; i++)
        {
            enlaces.Add(new Enlace($"e-sw{i:00}-sw{i + 1:00}", $"sw-{i:00}", $"sw-{i + 1:00}", TipoEnlace.Lan, 1000, 1, 1));
        }

        enlaces.Add(new Enlace("e-sw17-srv", "sw-17", "srv-destino", TipoEnlace.Lan, 1000, 1, 1));

        return new Topologia(new[] { sede }, dispositivos, enlaces);
    }

    private static Sede CrearSede(string id, string nombre, TipoSede tipo, string routerId) =>
        new(
            id,
            nombre,
            tipo,
            true,
            new List<string> { "hub" },
            id,
            "10.20.0.0/20",
            "10.20.15.255",
            1000,
            1,
            routerId,
            Array.Empty<VlanSede>(),
            Array.Empty<InventarioItem>());
}
