using Panpaya.Application.Ports;
using Panpaya.Domain.Simulacion;
using Panpaya.Domain.Topologia;

namespace Panpaya.Infrastructure.Routing;

public sealed class RipV2RouteStrategy : IRouteStrategy
{
    private const int MetricaMaxima = 15;

    public string Nombre => "RIPv2 (distance-vector)";

    public RutaCalculada? Calcular(Topologia topologia, string origenId, string destinoId)
    {
        var origen = topologia.BuscarDispositivo(origenId);
        var destino = topologia.BuscarDispositivo(destinoId);

        if (origen is null || destino is null)
        {
            return null;
        }

        if (string.Equals(origen.Id, destino.Id, StringComparison.Ordinal))
        {
            return new RutaCalculada(new[] { origen.Id }, 0);
        }

        var aristas = topologia.Enlaces
            .Where(e => e.Estado == EstadoEnlace.Activo)
            .OrderBy(e => e.OrigenId, StringComparer.Ordinal)
            .ThenBy(e => e.DestinoId, StringComparer.Ordinal)
            .ToList();

        var distancia = new Dictionary<string, int>(StringComparer.Ordinal)
        {
            [origen.Id] = 0
        };
        var predecesor = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            [origen.Id] = null
        };

        for (var iteracion = 0; iteracion < topologia.Dispositivos.Count - 1; iteracion++)
        {
            var huboCambio = false;

            foreach (var arista in aristas)
            {
                huboCambio |= Relajar(arista.OrigenId, arista.DestinoId, arista.MetricaRip, distancia, predecesor);
                huboCambio |= Relajar(arista.DestinoId, arista.OrigenId, arista.MetricaRip, distancia, predecesor);
            }

            if (!huboCambio)
            {
                break;
            }
        }

        if (!distancia.TryGetValue(destino.Id, out var metrica) || metrica > MetricaMaxima)
        {
            return null;
        }

        var nodos = ReconstruirRuta(predecesor, destino.Id);
        return nodos is null ? null : new RutaCalculada(nodos, metrica);
    }

    private static bool Relajar(
        string desde,
        string hasta,
        int metricaEnlace,
        Dictionary<string, int> distancia,
        Dictionary<string, string?> predecesor)
    {
        if (!distancia.TryGetValue(desde, out var distanciaDesde))
        {
            return false;
        }

        var candidata = distanciaDesde + metricaEnlace;
        if (candidata > MetricaMaxima)
        {
            return false;
        }

        if (distancia.TryGetValue(hasta, out var distanciaActual))
        {
            if (candidata > distanciaActual)
            {
                return false;
            }

            if (candidata == distanciaActual)
            {
                var predecesorActual = predecesor.GetValueOrDefault(hasta);
                if (predecesorActual is null || string.CompareOrdinal(desde, predecesorActual) >= 0)
                {
                    return false;
                }
            }
        }

        distancia[hasta] = candidata;
        predecesor[hasta] = desde;
        return true;
    }

    private static List<string>? ReconstruirRuta(Dictionary<string, string?> predecesor, string destinoId)
    {
        var nodos = new List<string>();
        var visitados = new HashSet<string>(StringComparer.Ordinal);
        string? actual = destinoId;

        while (actual is not null)
        {
            if (!visitados.Add(actual))
            {
                return null;
            }

            nodos.Add(actual);

            if (!predecesor.TryGetValue(actual, out actual))
            {
                return null;
            }
        }

        nodos.Reverse();
        return nodos;
    }
}
