using System.Collections.Concurrent;
using Panpaya.Application.Ports;
using Panpaya.Application.Simulacion;

namespace Panpaya.Infrastructure.Simulation;

public sealed class InMemorySimulationStore : ISimulationStore
{
    private readonly ConcurrentDictionary<string, SimulacionActiva> _simulaciones = new(StringComparer.Ordinal);

    public void Guardar(SimulacionActiva simulacion) =>
        _simulaciones[simulacion.SimulacionId] = simulacion;

    public SimulacionActiva? Obtener(string simulacionId) =>
        _simulaciones.GetValueOrDefault(simulacionId);

    public bool Eliminar(string simulacionId) =>
        _simulaciones.TryRemove(simulacionId, out _);

    public IReadOnlyCollection<SimulacionActiva> ObtenerTodas() =>
        _simulaciones.Values.ToList().AsReadOnly();
}
