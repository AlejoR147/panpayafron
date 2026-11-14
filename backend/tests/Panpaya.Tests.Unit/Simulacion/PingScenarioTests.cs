using Panpaya.Application.Simulacion;
using Panpaya.Domain.Simulacion;
using Panpaya.Domain.Topologia;
using Panpaya.Infrastructure.Explanations;
using Panpaya.Infrastructure.Persistence;
using Panpaya.Infrastructure.Routing;

namespace Panpaya.Tests.Unit.Simulacion;

public sealed class PingScenarioTests
{
    private readonly Topologia _topologia;
    private readonly RipV2RouteStrategy _routing = new();
    private readonly PingScenario _escenario = new(new TemplateExplanationProvider());

    public PingScenarioTests()
    {
        var rutaSeed = Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "..",
            "data", "seed", "topologia.json");

        _topologia = new JsonTopologiaRepository(rutaSeed).Obtener();
    }

    [Fact]
    public void CrearPlan_IncluyeArpIdaYRespuestaYUsaRutaDirecta()
    {
        var solicitud = new SolicitudSimulacion(
            "pc-med-admin-01",
            "srv-bog-erp-01",
            TipoPaquete.Icmp,
            IncluirArp: true,
            SimularRespuesta: true,
            Velocidad: 4);

        var ruta = _routing.Calcular(_topologia, solicitud.OrigenId, solicitud.DestinoId);
        Assert.NotNull(ruta);

        var plan = _escenario.CrearPlan(_topologia, solicitud, ruta!);

        Assert.NotEmpty(plan.Pasos);
        Assert.Equal(TipoEventoPaso.Arp, plan.Pasos[0].TipoEvento);
        Assert.Contains(plan.Pasos, p => p.TipoEvento == TipoEventoPaso.Wan);
        Assert.Contains(plan.Pasos, p => p.TipoEvento == TipoEventoPaso.Respuesta);
        Assert.All(plan.Pasos, p => Assert.Equal(plan.Pasos.Count, p.TotalPasos));
        Assert.All(plan.Pasos, p => Assert.NotNull(p.CabeceraIpv4));
        Assert.Equal(ruta!.Nodos, plan.Ruta.Nodos);
    }

    [Fact]
    public void CrearPlan_ReenvioSinArp_UsaRutaAlternaPorCali()
    {
        Assert.True(_topologia.CambiarEstadoEnlace("wan-bog-med", EstadoEnlace.Caido));

        var ruta = _routing.Calcular(_topologia, "rtr-med", "srv-bog-erp-01");
        Assert.NotNull(ruta);

        var solicitud = new SolicitudSimulacion(
            "pc-med-admin-01",
            "srv-bog-erp-01",
            TipoPaquete.Icmp,
            IncluirArp: true,
            SimularRespuesta: false,
            Velocidad: 4);

        var paquete = new PaqueteSimulacion(
            "paquete-prueba",
            "simulacion-prueba",
            TipoPaquete.Icmp,
            "pc-med-admin-01",
            "srv-bog-erp-01",
            "10.20.16.130",
            "10.20.2.194",
            "02:00:00:00:10:01",
            "02:00:00:00:80:01",
            63,
            84,
            EstadoPaso.Procesando,
            3);

        var plan = _escenario.CrearPlan(
            _topologia,
            solicitud,
            ruta!,
            nodoInicio: "rtr-med",
            paqueteExistente: paquete);

        Assert.DoesNotContain(plan.Pasos, p => p.TipoEvento == TipoEventoPaso.Arp);
        Assert.Contains(plan.Pasos, p => p.NodoActual == "rtr-med");
        Assert.Contains("rtr-cal", plan.Ruta.Nodos);
    }
}
