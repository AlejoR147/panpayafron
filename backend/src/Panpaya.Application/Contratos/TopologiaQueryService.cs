using Panpaya.Application.Ports;
using Panpaya.Domain.Topologia;

namespace Panpaya.Application.Contratos;

public interface ITopologiaQueryService
{
    TopologiaSnapshotDto ObtenerSnapshot();
    MetricasNacionalesDto ObtenerMetricas();
    IReadOnlyList<SedeDto> ObtenerSedes();
    SedeDto? ObtenerSede(string sedeId);
}

public sealed class TopologiaQueryService : ITopologiaQueryService
{
    private readonly ITopologyReader _reader;

    public TopologiaQueryService(ITopologyReader reader)
    {
        _reader = reader;
    }

    public TopologiaSnapshotDto ObtenerSnapshot()
    {
        var topologia = _reader.Obtener();
        var sedesActivas = topologia.Sedes.Where(s => s.Habilitada).ToList();

        return new TopologiaSnapshotDto(
            "1.0",
            DateTimeOffset.UtcNow,
            sedesActivas.Select(TopologiaMapper.ToDto).ToList(),
            topologia.Dispositivos.Select(TopologiaMapper.ToDto).ToList(),
            topologia.Enlaces.Select(TopologiaMapper.ToDto).ToList(),
            CalcularMetricas(topologia));
    }

    public MetricasNacionalesDto ObtenerMetricas() => CalcularMetricas(_reader.Obtener());

    public IReadOnlyList<SedeDto> ObtenerSedes() =>
        _reader.Obtener().Sedes
            .Where(s => s.Habilitada)
            .Select(TopologiaMapper.ToDto)
            .ToList();

    public SedeDto? ObtenerSede(string sedeId)
    {
        var sede = _reader.Obtener().Sedes
            .FirstOrDefault(s => s.Habilitada && string.Equals(s.Id, sedeId, StringComparison.OrdinalIgnoreCase));

        return sede is null ? null : TopologiaMapper.ToDto(sede);
    }

    private static MetricasNacionalesDto CalcularMetricas(Topologia topologia)
    {
        var sedesActivas = topologia.Sedes.Where(s => s.Habilitada).ToList();
        var metricasPorSede = sedesActivas.Select(CalcularMetricasSede).ToList();
        var enlacesWan = topologia.Enlaces.Count(e => e.Tipo is TipoEnlace.Wan or TipoEnlace.Respaldo);
        var advertencias = new List<string>();

        foreach (var sede in sedesActivas)
        {
            foreach (var vlan in sede.Vlans)
            {
                var capacidad = (long)Math.Pow(2, 32 - vlan.Prefijo) - 2;
                if (capacidad <= 0)
                {
                    advertencias.Add($"VLAN {vlan.Numero} de {sede.Nombre}: prefijo inválido.");
                    continue;
                }

                var utilizacion = vlan.HostsConCrecimiento * 100.0 / capacidad;
                if (utilizacion >= 100)
                {
                    advertencias.Add(
                        $"VLAN {vlan.Numero} de {sede.Nombre}: {vlan.HostsConCrecimiento}/{capacidad} hosts con crecimiento ({utilizacion:0.0}%). Sin margen adicional.");
                }
                else if (utilizacion >= 90)
                {
                    advertencias.Add(
                        $"VLAN {vlan.Numero} de {sede.Nombre}: {vlan.HostsConCrecimiento}/{capacidad} hosts con crecimiento ({utilizacion:0.0}%). Margen bajo.");
                }
            }
        }

        var equiposPorTipo = sedesActivas
            .SelectMany(s => s.Inventario)
            .GroupBy(i => i.Categoria)
            .Select(g => new ResumenInventarioDto(
                g.Key,
                g.Sum(i => i.CantidadActual),
                g.Sum(i => i.CantidadConCrecimiento)))
            .OrderByDescending(r => r.Actual)
            .ToList();

        return new MetricasNacionalesDto(
            sedesActivas.Count,
            metricasPorSede.Sum(m => m.HostsActuales),
            metricasPorSede.Sum(m => m.HostsConCrecimiento),
            sedesActivas.Sum(s => s.Vlans.Count),
            enlacesWan,
            equiposPorTipo,
            metricasPorSede,
            advertencias);
    }

    private static MetricasSedeDto CalcularMetricasSede(Sede sede)
    {
        var servidoresLocales = sede.Inventario
            .Where(i => i.VlanId == 80)
            .Sum(i => i.CantidadActual);

        return new MetricasSedeDto(
            sede.Id,
            sede.Nombre,
            sede.TotalHostsActuales,
            sede.TotalHostsConCrecimiento,
            sede.Vlans.Count,
            sede.Vlans.Count,
            sede.AreaM2,
            sede.Pisos,
            servidoresLocales,
            sede.Inventario.Select(TopologiaMapper.ToDto).ToList());
    }
}
