using Panpaya.Application.Contratos;
using Panpaya.Infrastructure.Persistence;

namespace Panpaya.Tests.Unit.Contratos;

public sealed class TopologiaQueryServiceTests
{
    [Fact]
    public void ObtenerMetricas_UsaInventarioYCoincideConLosTotalesPorSede()
    {
        var seed = Path.GetFullPath(
            Path.Combine(
                AppContext.BaseDirectory,
                "..",
                "..",
                "..",
                "..",
                "..",
                "data",
                "seed",
                "topologia.json"));

        var servicio = new TopologiaQueryService(new JsonTopologiaRepository(seed));

        var metricas = servicio.ObtenerMetricas();
        var sedes = servicio.ObtenerSedes();

        Assert.Equal(5, metricas.SedesActivas);
        Assert.Equal(813, metricas.HostsActuales);
        Assert.Equal(1005, metricas.HostsConCrecimiento);
        Assert.Equal(40, metricas.Subredes);
        Assert.Equal(5, metricas.EnlacesWan);
        Assert.Equal(
            metricas.HostsConCrecimiento,
            sedes.Sum(sede => sede.TotalHostsConCrecimiento));
        Assert.Equal(
            metricas.HostsConCrecimiento,
            metricas.PorSede.Sum(sede => sede.HostsConCrecimiento));
    }
}
